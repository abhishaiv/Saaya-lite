import type * as Leaflet from "leaflet";

import type { MapZone } from "../data/repository/zoneRepository";
import type { SessionState } from "../domain/model/session";
import type { LiveLocationFix } from "./locationWatch";

export type TileAvailability = "loading" | "online" | "offline";

export interface LeafletMapCallbacks {
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

const MAP_CENTER_LATITUDE = 17.71; // fact: map.center.lat
const MAP_CENTER_LONGITUDE = 83.3; // fact: map.center.lon
const MAP_ZOOM_DEFAULT = 12.5; // fact: map.zoom.default
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
): Promise<LeafletMapController> {
  const L = await import("leaflet");
  const map = L.map(host, {
    attributionControl: false,
    maxZoom: MAP_ZOOM_MAXIMUM,
    minZoom: MAP_ZOOM_MINIMUM,
    zoomControl: false,
  }).setView(
    [MAP_CENTER_LATITUDE, MAP_CENTER_LONGITUDE],
    MAP_ZOOM_DEFAULT,
  );

  const retinaSuffix = globalThis.devicePixelRatio > 1 ? "@2x" : "";
  const tiles = L.tileLayer(
    `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${retinaSuffix}.png`,
    { maxZoom: MAP_ZOOM_MAXIMUM, minZoom: MAP_ZOOM_MINIMUM },
  );
  let firstTileArrived = false;
  let destroyed = false;
  const tileTimeout = globalThis.setTimeout(() => {
    if (!firstTileArrived && !destroyed) {
      callbacks.onTileAvailability("offline");
    }
  }, TILE_TIMEOUT_MS);
  tiles.once("tileload", () => {
    firstTileArrived = true;
    globalThis.clearTimeout(tileTimeout);
    callbacks.onTileAvailability("online");
  });
  tiles.addTo(map);

  const zoneLayers = new Map<string, ZoneLayers>();
  const labelMarkers: LabelMarker[] = [];
  const sortedZones = [...mapZones].sort(
    (left, right) => left.zone.riskScore - right.zone.riskScore,
  );

  for (const { areaName, zone } of sortedZones) {
    const points = zone.polygon.map(
      ({ latitude, longitude }) => [latitude, longitude] as Leaflet.LatLngTuple,
    );
    const glow = L.polygon(points, {
      color: zone.colorHex,
      fill: false,
      interactive: false,
      opacity: ZONE_GLOW_OPACITY,
      weight: ZONE_GLOW_STROKE_PX,
    }).addTo(map);
    const fill = L.polygon(points, {
      color: zone.colorHex,
      fillColor: zone.colorHex,
      fillOpacity: zone.opacity,
      opacity: 1, // GROUNDED-EXEMPT: full-strength stroke is the structural opacity ceiling.
      weight: ZONE_STROKE_PX,
    }).addTo(map);
    fill.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      callbacks.onZoneSelected(zone.stationId);
    });
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
        fillOpacity: Math.min(
          1, // GROUNDED-EXEMPT: CSS/Leaflet opacity ceiling.
          mapZone.zone.opacity + (selected ? ZONE_SELECTED_OPACITY_RAISE : 0),
        ),
        weight: selected ? ZONE_SELECTED_STROKE_PX : ZONE_STROKE_PX,
      });
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
  callbacks.onTileAvailability("loading");
  callbacks.onReady();

  return {
    destroy() {
      destroyed = true;
      globalThis.clearTimeout(tileTimeout);
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
