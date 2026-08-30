import zoneCardsSource from "./assets/zone_info_cards.json";
import heatmapPointsSource from "./assets/vizag_heatmap_points.json";
import policeStationsSource from "./assets/vizag_police_points.json";
import zonesSource from "./assets/vizag_heatmap.json";

import type { HeatmapHotspot } from "../../domain/model/heatmapHotspot";
import type { HeatmapPoint } from "../../domain/model/heatmapPoint";
import type { PoliceStation } from "../../domain/model/policeStation";
import { RiskTier, type LatLng, type Zone } from "../../domain/model/zone";
import type { ZoneCard } from "../../domain/model/zoneCard";
import { parseZoneCards } from "./cardParser";
import { buildHeatmapHotspots } from "./heatmapHotspots";
import { parseHeatmapPoints } from "./heatmapPointParser";
import { parsePoliceStations } from "./stationParser";
import { parseZones } from "./zoneParser";

const EXPECTED_ZONE_COUNT = 24; // fact: zones.total
const EXPECTED_CARD_COUNT = 19; // fact: cards.total
const EXPECTED_STATION_COUNT = 37; // fact: stations.total
const EXPECTED_HEATMAP_POINT_COUNT = 104; // fact: heatmap.points.total
const EXPECTED_VISIBLE_HOTSPOT_COUNT = 70; // fact: heatmap.points.visible
const EXPECTED_COORDINATE_COUNT = 189; // GROUNDED-EXEMPT: frozen-asset structural cardinality; CODEX_TASKS.md:49.

const EXPECTED_TIER_COUNTS: Readonly<Record<RiskTier, number>> = {
  [RiskTier.HIGH]: 6, // fact: zones.high
  [RiskTier.MODERATE]: 9, // fact: zones.moderate
  [RiskTier.ELEVATED]: 4, // fact: zones.elevated
  [RiskTier.SAFE]: 5, // fact: zones.safe
};

const EXPECTED_HOTSPOT_TIER_COUNTS: Readonly<
  Record<Exclude<RiskTier, RiskTier.SAFE>, number>
> = {
  [RiskTier.HIGH]: 10, // fact: heatmap.points.high
  [RiskTier.MODERATE]: 41, // fact: heatmap.points.moderate
  [RiskTier.ELEVATED]: 19, // fact: heatmap.points.elevated
};

const DISTRICT_ENVELOPE = {
  latitude: { minimum: 17.4, maximum: 18.1 }, // facts: zone.coordinate.lat.min/max
  longitude: { minimum: 82.9, maximum: 83.7 }, // facts: zone.coordinate.lon.min/max
} as const;

export interface ZoneData {
  readonly zones: readonly Zone[];
  readonly cardsByStationId: ReadonlyMap<string, ZoneCard>;
  readonly heatmapHotspots: readonly HeatmapHotspot[];
  readonly heatmapPoints: readonly HeatmapPoint[];
  readonly policeStations: readonly PoliceStation[];
}

export class ZoneDataError extends Error {
  constructor(message: string) {
    super(`Invalid bundled zone data: ${message}`);
    this.name = "ZoneDataError";
  }
}

function assertCount(actual: number, expected: number, label: string): void {
  if (actual !== expected) {
    throw new ZoneDataError(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertCoordinateInDistrict(
  coordinate: LatLng,
  label: string,
): void {
  const latitudeInside =
    coordinate.latitude >= DISTRICT_ENVELOPE.latitude.minimum &&
    coordinate.latitude <= DISTRICT_ENVELOPE.latitude.maximum;
  const longitudeInside =
    coordinate.longitude >= DISTRICT_ENVELOPE.longitude.minimum &&
    coordinate.longitude <= DISTRICT_ENVELOPE.longitude.maximum;

  if (!latitudeInside || !longitudeInside) {
    throw new ZoneDataError(
      `${label} (${coordinate.latitude}, ${coordinate.longitude}) is outside the Visakhapatnam district envelope`,
    );
  }
}

function assertZoneContract(
  zones: readonly Zone[],
  cardsByStationId: ReadonlyMap<string, ZoneCard>,
): void {
  assertCount(zones.length, EXPECTED_ZONE_COUNT, "zone count");

  const tierCounts: Record<RiskTier, number> = {
    [RiskTier.HIGH]: 0,
    [RiskTier.MODERATE]: 0,
    [RiskTier.ELEVATED]: 0,
    [RiskTier.SAFE]: 0,
  };
  const stationIds = new Set<string>();
  let coordinateCount = 0;

  for (const zone of zones) {
    if (stationIds.has(zone.stationId)) {
      throw new ZoneDataError(`duplicate zone stationId ${zone.stationId}`);
    }
    stationIds.add(zone.stationId);
    tierCounts[zone.riskTier] += 1;

    assertCoordinateInDistrict(zone.centroid, `${zone.stationId} centroid`);
    coordinateCount += 1;
    zone.polygon.forEach((vertex, index) => {
      coordinateCount += 1;
      assertCoordinateInDistrict(
        vertex,
        `${zone.stationId} polygon vertex ${index}`,
      );
    });

    if (
      zone.riskTier !== RiskTier.SAFE &&
      !cardsByStationId.has(zone.stationId)
    ) {
      throw new ZoneDataError(
        `non-safe zone ${zone.stationId} has no zone information card`,
      );
    }
  }

  for (const tier of Object.values(RiskTier)) {
    assertCount(
      tierCounts[tier],
      EXPECTED_TIER_COUNTS[tier],
      `${tier} tier count`,
    );
  }

  assertCount(
    coordinateCount,
    EXPECTED_COORDINATE_COUNT,
    "centroid and polygon coordinate count",
  );
  assertCount(cardsByStationId.size, EXPECTED_CARD_COUNT, "zone card count");
  for (const stationId of cardsByStationId.keys()) {
    if (!stationIds.has(stationId)) {
      throw new ZoneDataError(`zone card ${stationId} has no matching zone`);
    }
  }
}

function assertStationContract(stations: readonly PoliceStation[]): void {
  assertCount(stations.length, EXPECTED_STATION_COUNT, "police station count");
  for (const station of stations) {
    if (!station.phone.trim()) {
      throw new ZoneDataError(`police station ${station.id} has no phone`);
    }
  }
}

function assertHeatmapHotspotContract(
  points: readonly HeatmapPoint[],
  hotspots: readonly HeatmapHotspot[],
): void {
  assertCount(points.length, EXPECTED_HEATMAP_POINT_COUNT, "heatmap point count");
  for (const point of points) {
    assertCoordinateInDistrict(point, `${point.name} heatmap point`);
  }

  assertCount(
    hotspots.length,
    EXPECTED_VISIBLE_HOTSPOT_COUNT,
    "visible heatmap hotspot count",
  );
  const tierCounts: Record<Exclude<RiskTier, RiskTier.SAFE>, number> = {
    [RiskTier.HIGH]: 0,
    [RiskTier.MODERATE]: 0,
    [RiskTier.ELEVATED]: 0,
  };
  for (const hotspot of hotspots) {
    if (hotspot.zone.riskTier === RiskTier.SAFE) {
      throw new ZoneDataError(`SAFE hotspot ${hotspot.id} must not render or arm`);
    }
    tierCounts[hotspot.zone.riskTier] += 1;
  }
  for (const tier of Object.keys(EXPECTED_HOTSPOT_TIER_COUNTS) as Array<
    Exclude<RiskTier, RiskTier.SAFE>
  >) {
    assertCount(
      tierCounts[tier],
      EXPECTED_HOTSPOT_TIER_COUNTS[tier],
      `${tier} heatmap hotspot count`,
    );
  }
}

export function loadZoneData(
  zoneSource: unknown = zonesSource,
  cardSource: unknown = zoneCardsSource,
  stationSource: unknown = policeStationsSource,
  heatmapPointSource: unknown = heatmapPointsSource,
): ZoneData {
  const zones = parseZones(zoneSource);
  const cardsByStationId = parseZoneCards(cardSource);
  const policeStations = parsePoliceStations(stationSource);
  const heatmapPoints = parseHeatmapPoints(heatmapPointSource);
  const heatmapHotspots = buildHeatmapHotspots(zones, heatmapPoints);

  assertZoneContract(zones, cardsByStationId);
  assertStationContract(policeStations);
  assertHeatmapHotspotContract(heatmapPoints, heatmapHotspots);

  return {
    zones,
    cardsByStationId,
    heatmapHotspots,
    heatmapPoints,
    policeStations,
  };
}

export const bundledZoneData = loadZoneData();
