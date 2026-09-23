import type * as Leaflet from "leaflet";

import type { MapZone } from "../data/repository/zoneRepository";
import {
  type LabelBoxSize,
  type LabelRect,
  placeLabels,
} from "../domain/labels/labelPlacement";
import type { HeatmapHotspot } from "../domain/model/heatmapHotspot";
import type { SessionState } from "../domain/model/session";
import type { LiveLocationFix } from "./locationWatch";

export type TileAvailability = "loading" | "online" | "offline";

export interface LeafletMapCallbacks {
  ariaZone(areaName: string, riskLevel: string): string;
  onReady(): void;
  /** A place pill was tapped. The id is the bake's own. */
  onPlaceSelected(placeId: string): void;
  onTileAvailability(status: TileAvailability): void;
  onZoneSelected(zoneId: string | null): void;
}

/** A baked place reduced to what the flat map's own pill needs to stand. */
export interface MapPlacePin {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

export interface LeafletMapView {
  readonly location: LiveLocationFix | null;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
}

export interface LeafletMapController {
  destroy(): void;
  recenter(): void;
  /**
   * The place pills to draw, already filtered to the active category, the ceiling on how
   * many stand at once, and the chrome boxes over the map that no pill may land under.
   *
   * The map keeps the ranking rule itself: a pill stands only for a place inside the frame,
   * and the budget goes to the nearest of those to the centre of the frame - the same
   * reading the walk view takes, in the flat map's own terms. Where a pill stands once it is
   * drawn is `placeLabels`' decision, the same pass the walk view places its own with, so a
   * cluster of places reads the same in both views. The rectangles are in the map
   * container's own pixels.
   */
  setPlaces(
    pins: readonly MapPlacePin[],
    budget: number,
    chrome: readonly LabelRect[],
  ): void;
  update(view: LeafletMapView): void;
}

/**
 * Keeps the offline disclosure tied to tile evidence rather than the
 * browser's optimistic connection hint. `online` can prompt a retry, but a
 * tile is the only proof that the map is usable again.
 */
export interface TileAvailabilityReporter {
  browserOffline(): void;
  browserOnlineHint(): void;
  noTileWithinTimeout(): void;
  tileError(): void;
  tileLoaded(): void;
}

export function createTileAvailabilityReporter(
  onChange: (availability: TileAvailability) => void,
): TileAvailabilityReporter {
  let availability: TileAvailability = "loading";

  const report = (next: TileAvailability): void => {
    if (availability === next) return;
    availability = next;
    onChange(next);
  };

  return {
    browserOffline: () => report("offline"),
    // A browser's `online` signal only means it may be worth retrying. It
    // deliberately does not clear the note; tileLoaded is the proof.
    browserOnlineHint: () => undefined,
    noTileWithinTimeout: () => report("offline"),
    tileError: () => report("offline"),
    tileLoaded: () => report("online"),
  };
}

const MAP_CENTER_LATITUDE = 17.71; // fact: map.center.lat
const MAP_CENTER_LONGITUDE = 83.3; // fact: map.center.lon
const MAP_ZOOM_DEFAULT = 14; // fact: map.zoom.default
const MAP_ZOOM_SNAP = 0.5; // fact: map.zoom.snap
const MAP_ZOOM_MINIMUM = 10; // fact: map.zoom.min
const MAP_ZOOM_MAXIMUM = 17; // fact: map.zoom.max
const TILE_TIMEOUT_SEC = 4; // fact: map.tile.timeout
const ZONE_STROKE_PX = 1.5; // fact: map.zone.stroke
const ZONE_SELECTED_STROKE_PX = 3; // fact: map.zone.stroke.sel
const ZONE_SELECTED_OPACITY_RAISE = 0.1; // fact: alpha.map.zone.selected.raise
const ZONE_GLOW_STROKE_PX = 6; // fact: map.zone.glow
const ZONE_GLOW_OPACITY = 0.15; // fact: alpha.map.zone.glow
const LOCATION_DOT_PX = 14; // fact: map.dot
const ACCURACY_CIRCLE_AFTER_M = 30; // fact: loc.map.accuracy.circle.after
const ACCURACY_CIRCLE_OPACITY = 0.12; // fact: alpha.map.accuracy
const MAP_CAMERA_DURATION_MS = 400; // fact: motion.400ms
const MILLISECONDS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI unit conversion.
const TILE_TIMEOUT_MS = TILE_TIMEOUT_SEC * MILLISECONDS_PER_SECOND;
const HALF = 2; // GROUNDED-EXEMPT: radius and anchor are half the specified diameter.
const DEGREES_PER_HALF_TURN = 180; // GROUNDED-EXEMPT: geometry conversion, degrees to radians.

export const OPEN_STREET_MAP_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

type HotspotLayers = Readonly<{
  fill: Leaflet.Circle;
  glow: Leaflet.Circle;
  hotspot: HeatmapHotspot;
}>;

export async function mountLeafletMap(
  host: HTMLElement,
  mapZones: readonly MapZone[],
  hotspots: readonly HeatmapHotspot[],
  callbacks: LeafletMapCallbacks,
  cancelled: () => boolean = () => false,
): Promise<LeafletMapController | null> {
  const L = await import("leaflet");
  if (cancelled()) return null;
  const map = L.map(host, {
    attributionControl: false,
    maxZoom: MAP_ZOOM_MAXIMUM,
    minZoom: MAP_ZOOM_MINIMUM,
    zoomSnap: MAP_ZOOM_SNAP,
    zoomControl: false,
  }).setView(
    [MAP_CENTER_LATITUDE, MAP_CENTER_LONGITUDE],
    MAP_ZOOM_DEFAULT,
  );

  const tiles = L.tileLayer(
    OPEN_STREET_MAP_TILE_URL,
    { maxZoom: MAP_ZOOM_MAXIMUM, minZoom: MAP_ZOOM_MINIMUM },
  );
  let firstTileArrived = false;
  let destroyed = false;
  const tileAvailability = createTileAvailabilityReporter(
    callbacks.onTileAvailability,
  );
  const tileTimeout = globalThis.setTimeout(() => {
    if (!firstTileArrived && !destroyed) {
      tileAvailability.noTileWithinTimeout();
    }
  }, TILE_TIMEOUT_MS);
  const onTileLoad = () => {
    firstTileArrived = true;
    globalThis.clearTimeout(tileTimeout);
    tileAvailability.tileLoaded();
  };
  const onTileError = () => tileAvailability.tileError();
  const onBrowserOffline = () => tileAvailability.browserOffline();
  const onBrowserOnline = () => {
    tileAvailability.browserOnlineHint();
    tiles.redraw();
  };
  tiles.on("tileload", onTileLoad);
  tiles.on("tileerror", onTileError);
  globalThis.addEventListener("offline", onBrowserOffline);
  globalThis.addEventListener("online", onBrowserOnline);
  callbacks.onTileAvailability("loading");
  tiles.addTo(map);

  const zonesById = new Map(
    mapZones.map((mapZone) => [mapZone.zone.stationId, mapZone]),
  );
  const hotspotLayers: HotspotLayers[] = [];
  const sortedHotspots = [...hotspots].sort(
    (left, right) => left.zone.riskScore - right.zone.riskScore,
  );

  for (const hotspot of sortedHotspots) {
    const mapZone = zonesById.get(hotspot.zone.stationId);
    if (mapZone === undefined) continue;
    const { areaName, riskLevel, zone } = mapZone;
    const center: Leaflet.LatLngTuple = [
      hotspot.center.latitude,
      hotspot.center.longitude,
    ];
    const glow = L.circle(center, {
      color: zone.colorHex,
      fill: false,
      interactive: false,
      opacity: 0, // No glow until this zone is selected.
      radius: hotspot.radiusM,
      weight: ZONE_GLOW_STROKE_PX,
    }).addTo(map);
    const fill = L.circle(center, {
      bubblingMouseEvents: false,
      color: zone.colorHex,
      fillColor: zone.colorHex,
      fillOpacity: zone.opacity,
      opacity: 1, // GROUNDED-EXEMPT: full-strength stroke is the structural opacity ceiling.
      radius: hotspot.radiusM,
      weight: ZONE_STROKE_PX,
    }).addTo(map);
    const selectZone = () => {
      map.flyTo(
        center,
        map.getZoom(),
        {
          duration: MAP_CAMERA_DURATION_MS / MILLISECONDS_PER_SECOND,
        },
      );
      callbacks.onZoneSelected(zone.stationId);
    };
    fill.on("click", selectZone);
    const fillElement = fill.getElement();
    if (fillElement !== undefined && fillElement !== null) {
      fillElement.setAttribute(
        "aria-label",
        callbacks.ariaZone(areaName, riskLevel),
      );
      fillElement.setAttribute("role", "button");
      fillElement.setAttribute("tabindex", "0");
      fillElement.addEventListener("keydown", (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;
        keyboardEvent.preventDefault();
        selectZone();
      });
    }
    hotspotLayers.push({ fill, glow, hotspot });
  }

  // --- the place layer. The bake ships 1444 rows and the flat map can pan anywhere inside
  // a window that covers Visakhapatnam, so the pills are not "the nearest N full stop":
  // they are the nearest N *inside the frame*, re-chosen on every settle. A pill stands for
  // a place she can see, which is the same ceiling the walk view's own budget reads.
  //
  // The same two placement inputs the walk view uses, read as numbers rather than from the
  // stylesheet because this side of the app has no CSS to read: `--screen-padding` and
  // `--space-4`. Named here rather than inlined so the family is visible.
  const PLACE_FRAME_INSET_PX = 20; // GROUNDED-EXEMPT: structural frame inset, the pixel value of --screen-padding.
  const PLACE_LABEL_GAP_PX = 4; // GROUNDED-EXEMPT: structural label gap, the pixel value of --space-4.

  let placePins: readonly MapPlacePin[] = [];
  let placePinBudget = 0;
  let placeChrome: readonly LabelRect[] = [];
  interface StandingPin {
    readonly element: HTMLButtonElement;
    readonly marker: Leaflet.Marker;
  }
  const placeMarkers = new Map<string, StandingPin>();
  /** Each pill's painted box, measured once and kept: it only changes with its words. */
  const placeSizes = new Map<string, LabelBoxSize>();

  /** The pill's own box, measured the first time it stands. */
  function placeSize(pin: MapPlacePin, element: HTMLButtonElement): LabelBoxSize {
    const cached = placeSizes.get(pin.id);
    if (cached !== undefined) return cached;
    const size: LabelBoxSize = {
      heightPx: element.offsetHeight,
      widthPx: element.offsetWidth,
    };
    // A zero box means the pill has not been laid out yet, so it is not worth keeping.
    if (size.heightPx !== 0 && size.widthPx !== 0) placeSizes.set(pin.id, size);
    return size;
  }

  /**
   * The shell's own anchor, which is what puts a pill where the pass placed it.
   *
   * Leaflet hangs the icon off its point with a margin of minus the anchor, so an anchor of
   * half the pill puts the pill's centre on the place; anything else moves it by the
   * difference. The pill inside keeps its own intrinsic size - the box the anchor speaks of
   * is the shell's, not the words'.
   */
  function placeIcon(
    element: HTMLButtonElement,
    size: LabelBoxSize,
    displacement: { readonly xPx: number; readonly yPx: number },
  ): Leaflet.DivIcon {
    return L.divIcon({
      className: "saaya-place-pin-shell",
      html: element,
      iconAnchor: [
        size.widthPx / 2 - displacement.xPx,
        size.heightPx / 2 - displacement.yPx,
      ],
      iconSize: [size.widthPx, size.heightPx],
    });
  }

  function addPlacePin(pin: MapPlacePin): StandingPin {
    // Built as nodes rather than markup: the name is OSM's own text, and a string of it
    // interpolated into innerHTML would be the one place external data becomes script.
    const element = document.createElement("button");
    element.className = "saaya-place-pin";
    element.type = "button";
    const dot = document.createElement("span");
    dot.className = "saaya-place-pin__dot";
    dot.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "saaya-place-pin__name";
    name.textContent = pin.name;
    element.append(dot, name);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      callbacks.onPlaceSelected(pin.id);
    });
    const marker = L.marker([pin.lat, pin.lon], {
      bubblingMouseEvents: false,
      icon: L.divIcon({
        className: "saaya-place-pin-shell",
        html: element,
        iconAnchor: [0, 0],
        iconSize: [0, 0],
      }),
      // The pill is the control and takes its own focus; a marker that also claims the
      // keyboard would put two stops on one place.
      keyboard: false,
    }).addTo(map);
    return { element, marker };
  }

  /** Choose the pills that stand, and stand them. Cheap enough to run on every settle. */
  function drawPlacePins(): void {
    const frame = map.getCenter();
    // East-west degrees are shorter than north-south ones away from the equator, so the
    // ranking scales longitude by the cosine of the frame's own latitude. This is an
    // ordering, never a distance claim - every distance the product shows is haversine.
    const eastScale = Math.cos((frame.lat * Math.PI) / DEGREES_PER_HALF_TURN);
    const bounds = map.getBounds();
    const ranked = placePins
      .filter((pin) => bounds.contains([pin.lat, pin.lon]))
      .map((pin) => {
        const north = pin.lat - frame.lat;
        const east = (pin.lon - frame.lng) * eastScale;
        return { pin, rank: north * north + east * east };
      })
      .sort((left, right) => left.rank - right.rank)
      .slice(0, Math.max(0, placePinBudget));

    const keep = new Set(ranked.map((entry) => entry.pin.id));
    for (const [id, standing] of placeMarkers) {
      if (keep.has(id)) continue;
      standing.marker.remove();
      placeMarkers.delete(id);
    }
    for (const entry of ranked) {
      if (placeMarkers.has(entry.pin.id)) continue;
      placeMarkers.set(entry.pin.id, addPlacePin(entry.pin));
    }

    // Every pill that is going to stand is in the DOM now, so each has a box to place with.
    // The anchors are the places' own points, the sizes are the pills' own, and the chrome
    // rectangles are what the caller measured over the map.
    const points = ranked.map((entry) =>
      map.latLngToContainerPoint([entry.pin.lat, entry.pin.lon]),
    );
    const sizes = ranked.map((entry) => {
      const standing = placeMarkers.get(entry.pin.id);
      return standing === undefined
        ? { heightPx: 0, widthPx: 0 }
        : placeSize(entry.pin, standing.element);
    });
    const container = map.getSize();
    const placed = placeLabels(
      points.map((point) => ({ xPx: point.x, yPx: point.y })),
      sizes,
      {
        heightPx: container.y,
        insetPx: PLACE_FRAME_INSET_PX,
        widthPx: container.x,
      },
      PLACE_LABEL_GAP_PX,
      placeChrome,
    );

    ranked.forEach((entry, index) => {
      const standing = placeMarkers.get(entry.pin.id);
      const spot = placed[index];
      const point = points[index];
      const size = sizes[index];
      if (
        standing === undefined ||
        spot === undefined ||
        point === undefined ||
        size === undefined
      ) {
        return;
      }
      standing.marker.setIcon(
        placeIcon(standing.element, size, {
          xPx: spot.xPx - point.x,
          yPx: spot.yPx - point.y,
        }),
      );
    });
  }

  map.on("moveend", drawPlacePins);
  map.on("zoomend", drawPlacePins);

  let currentView: LeafletMapView = {
    location: null,
    selectedZoneId: null,
    sessionState: "IDLE",
  };
  let locationMarker: Leaflet.Marker | null = null;
  let accuracyCircle: Leaflet.Circle | null = null;

  function updateSelection(selectedZoneId: string | null): void {
    for (const layers of hotspotLayers) {
      const { zone } = layers.hotspot;
      const selected = zone.stationId === selectedZoneId;
      layers.fill.setStyle({
        fillOpacity: selected
          ? Math.min(
              1, // GROUNDED-EXEMPT: CSS/Leaflet opacity ceiling.
              zone.opacity + ZONE_SELECTED_OPACITY_RAISE,
            )
          : zone.opacity,
        weight: selected ? ZONE_SELECTED_STROKE_PX : ZONE_STROKE_PX,
      });
      layers.glow.setStyle({ opacity: selected ? ZONE_GLOW_OPACITY : 0 });
    }
  }

  function updateLocation(view: LeafletMapView): void {
    locationMarker?.remove();
    accuracyCircle?.remove();
    locationMarker = null;
    accuracyCircle = null;
    if (view.location === null) return;

    const locationClass =
      view.sessionState === "SHADOW"
        ? "saaya-location-marker saaya-location-marker--shadow"
        : "saaya-location-marker";
    locationMarker = L.marker(
      [view.location.latitude, view.location.longitude],
      {
        icon: L.divIcon({
          className: "saaya-location-marker-shell",
          html: `<span class="${locationClass}"></span>`,
          iconAnchor: [LOCATION_DOT_PX / HALF, LOCATION_DOT_PX / HALF],
          iconSize: [LOCATION_DOT_PX, LOCATION_DOT_PX],
        }),
        interactive: false,
      },
    ).addTo(map);

    if (view.location.accuracyM > ACCURACY_CIRCLE_AFTER_M) {
      accuracyCircle = L.circle(
        [view.location.latitude, view.location.longitude],
        {
          color: "#A78BFA", // fact: color.brand
          fillColor: "#A78BFA", // fact: color.brand
          fillOpacity: ACCURACY_CIRCLE_OPACITY,
          radius: view.location.accuracyM,
          stroke: false,
        },
      ).addTo(map);
    }
  }

  map.on("click", () => callbacks.onZoneSelected(null));
  callbacks.onReady();

  return {
    destroy() {
      destroyed = true;
      globalThis.clearTimeout(tileTimeout);
      tiles.off("tileload", onTileLoad);
      tiles.off("tileerror", onTileError);
      globalThis.removeEventListener("offline", onBrowserOffline);
      globalThis.removeEventListener("online", onBrowserOnline);
      map.remove();
    },
    recenter() {
      if (currentView.location === null) return;
      map.flyTo(
        [currentView.location.latitude, currentView.location.longitude],
        map.getZoom(),
        {
          duration: MAP_CAMERA_DURATION_MS / MILLISECONDS_PER_SECOND,
        },
      );
    },
    setPlaces(pins, budget, chrome) {
      placePins = pins;
      placePinBudget = budget;
      placeChrome = chrome;
      drawPlacePins();
    },
    update(view) {
      currentView = view;
      updateSelection(view.selectedZoneId);
      updateLocation(view);
    },
  };
}
