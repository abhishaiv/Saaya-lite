import type * as Leaflet from "leaflet";

import type { MapZone } from "../data/repository/zoneRepository";
import type { SessionState } from "../domain/model/session";
import type { LiveLocationFix } from "./locationWatch";

export type TileAvailability = "loading" | "online" | "offline";

export interface LeafletMapCallbacks {
  ariaZone(areaName: string, riskLevel: string): string;
  onReady(): void;
  onTileAvailability(status: TileAvailability): void;
  onZoneSelected(zoneId: string | null): void;
}

export interface LeafletMapView {
  readonly location: LiveLocationFix | null;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
}

export interface LeafletMapController {
  destroy(): void;
  recenter(): void;
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
const MAP_ZOOM_DEFAULT = 12.5; // fact: map.zoom.default
const MAP_ZOOM_SNAP = 0.5; // fact: map.zoom.snap
const MAP_ZOOM_MINIMUM = 10; // fact: map.zoom.min
const MAP_ZOOM_MAXIMUM = 17; // fact: map.zoom.max
const LABELS_HIDDEN_BELOW_ZOOM = 12; // fact: map.label.hide_below
const ALL_LABELS_FROM_ZOOM = 14; // fact: map.label.all_tiers.from
const TILE_TIMEOUT_SEC = 4; // fact: map.tile.timeout
const ZONE_STROKE_PX = 1.5; // fact: map.zone.stroke
const ZONE_SELECTED_STROKE_PX = 3; // fact: map.zone.stroke.sel
const ZONE_SELECTED_OPACITY_RAISE = 0.1; // fact: alpha.map.zone.selected.raise
const ZONE_GLOW_STROKE_PX = 6; // fact: map.zone.glow
const ZONE_GLOW_OPACITY = 0.15; // fact: alpha.map.zone.glow
const LABEL_COLLISION_PADDING_PX = 4; // fact: scale.4
const LOCATION_DOT_PX = 14; // fact: map.dot
const ACCURACY_CIRCLE_AFTER_M = 30; // fact: loc.map.accuracy.circle.after
const ACCURACY_CIRCLE_OPACITY = 0.12; // fact: alpha.map.accuracy
const MAP_CAMERA_DURATION_MS = 400; // fact: motion.400ms
const MILLISECONDS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI unit conversion.
const TILE_TIMEOUT_MS = TILE_TIMEOUT_SEC * MILLISECONDS_PER_SECOND;
const HALF = 2; // GROUNDED-EXEMPT: radius and anchor are half the specified diameter.

export const OPEN_STREET_MAP_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

type ZoneLayers = Readonly<{
  fill: Leaflet.Polygon;
  glow: Leaflet.Polygon;
}>;

type LabelMarker = Readonly<{
  marker: Leaflet.Marker;
  riskScore: number;
  riskTier: string;
}>;

export async function mountLeafletMap(
  host: HTMLElement,
  mapZones: readonly MapZone[],
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

  const zoneLayers = new Map<string, ZoneLayers>();
  const labelMarkers: LabelMarker[] = [];
  const sortedZones = [...mapZones].sort(
    (left, right) => left.zone.riskScore - right.zone.riskScore,
  );

  for (const { areaName, riskLevel, zone } of sortedZones) {
    const points = zone.polygon.map(
      ({ latitude, longitude }) => [latitude, longitude] as Leaflet.LatLngTuple,
    );
    const glow = L.polygon(points, {
      color: zone.colorHex,
      fill: false,
      interactive: false,
      opacity: 0, // No glow until this zone is selected.
      weight: ZONE_GLOW_STROKE_PX,
    }).addTo(map);
    const fill = L.polygon(points, {
      bubblingMouseEvents: false,
      color: zone.colorHex,
      fillColor: zone.colorHex,
      fillOpacity: 0, // Outline-first until the user selects this zone.
      opacity: 1, // GROUNDED-EXEMPT: full-strength stroke is the structural opacity ceiling.
      weight: ZONE_STROKE_PX,
    }).addTo(map);
    const selectZone = () => {
      map.flyTo(
        [zone.centroid.latitude, zone.centroid.longitude],
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
    zoneLayers.set(zone.stationId, { fill, glow });

    const label = L.marker(
      [zone.centroid.latitude, zone.centroid.longitude],
      {
        icon: L.divIcon({
          className: "saaya-map-label-shell",
          html: `<span class="saaya-map-label">${escapeHtml(areaName)}</span>`,
        }),
        interactive: false,
      },
    );
    labelMarkers.push({
      marker: label,
      riskScore: zone.riskScore,
      riskTier: zone.riskTier,
    });
  }

  let currentView: LeafletMapView = {
    location: null,
    selectedZoneId: null,
    sessionState: "IDLE",
  };
  let locationMarker: Leaflet.Marker | null = null;
  let accuracyCircle: Leaflet.Circle | null = null;

  function updateSelection(selectedZoneId: string | null): void {
    for (const [zoneId, layers] of zoneLayers) {
      const selected = zoneId === selectedZoneId;
      const mapZone = mapZones.find(({ zone }) => zone.stationId === zoneId);
      if (mapZone === undefined) continue;
      layers.fill.setStyle({
        fillOpacity: selected
          ? Math.min(
              1, // GROUNDED-EXEMPT: CSS/Leaflet opacity ceiling.
              mapZone.zone.opacity + ZONE_SELECTED_OPACITY_RAISE,
            )
          : 0,
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

  function layoutLabels(): void {
    const zoom = map.getZoom();
    for (const { marker } of labelMarkers) marker.remove();
    if (zoom < LABELS_HIDDEN_BELOW_ZOOM) return;

    const candidates = labelMarkers
      .filter(
        ({ riskTier }) =>
          zoom >= ALL_LABELS_FROM_ZOOM || riskTier === "HIGH",
      )
      .sort((left, right) => right.riskScore - left.riskScore);
    for (const { marker } of candidates) marker.addTo(map);

    globalThis.requestAnimationFrame(() => {
      const placed: DOMRect[] = [];
      for (const { marker } of candidates) {
        const element = marker.getElement();
        if (element === undefined || element === null) continue;
        element.style.display = "";
        const box = element.getBoundingClientRect();
        const padded = new DOMRect(
          box.x - LABEL_COLLISION_PADDING_PX,
          box.y - LABEL_COLLISION_PADDING_PX,
          box.width + LABEL_COLLISION_PADDING_PX * HALF,
          box.height + LABEL_COLLISION_PADDING_PX * HALF,
        );
        if (placed.some((other) => rectanglesIntersect(padded, other))) {
          element.style.display = "none";
        } else {
          placed.push(padded);
        }
      }
    });
  }

  map.on("click", () => callbacks.onZoneSelected(null));
  map.on("zoomend", layoutLabels);
  layoutLabels();
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
    update(view) {
      currentView = view;
      updateSelection(view.selectedZoneId);
      updateLocation(view);
    },
  };
}

function rectanglesIntersect(left: DOMRect, right: DOMRect): boolean {
  return !(
    left.right < right.left ||
    left.left > right.right ||
    left.bottom < right.top ||
    left.top > right.bottom
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
