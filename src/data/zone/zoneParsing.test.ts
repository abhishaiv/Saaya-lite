import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { RiskTier } from "../../domain/model/zone";
import { loadZoneData } from "./zoneLoader";

const EXPECTED_COORDINATE_COUNT = 189; // GROUNDED-EXEMPT: frozen-asset structural cardinality; CODEX_TASKS.md:49.

const EXPECTED_TIER_COUNTS: Readonly<Record<RiskTier, number>> = {
  [RiskTier.HIGH]: 6, // fact: zones.high
  [RiskTier.MODERATE]: 9, // fact: zones.moderate
  [RiskTier.ELEVATED]: 4, // fact: zones.elevated
  [RiskTier.SAFE]: 5, // fact: zones.safe
};

const DISTRICT_ENVELOPE = {
  latitude: { minimum: 17.4, maximum: 18.1 }, // facts: zone.coordinate.lat.min/max
  longitude: { minimum: 82.9, maximum: 83.7 }, // facts: zone.coordinate.lon.min/max
} as const;

describe("bundled zone parsing", () => {
  it("parses every frozen asset with the exact counts and tier split", () => {
    const data = loadZoneData();
    const tierCounts: Record<RiskTier, number> = {
      [RiskTier.HIGH]: 0,
      [RiskTier.MODERATE]: 0,
      [RiskTier.ELEVATED]: 0,
      [RiskTier.SAFE]: 0,
    };

    data.zones.forEach((zone) => {
      tierCounts[zone.riskTier] += 1;
    });

    expect(data.zones).toHaveLength(24); // fact: zones.total
    expect(data.cardsByStationId.size).toBe(19); // fact: cards.total
    expect(data.policeStations).toHaveLength(37); // fact: stations.total
    expect(tierCounts).toEqual(EXPECTED_TIER_COUNTS);
  });

  it("keeps every centroid and polygon vertex inside the district envelope", () => {
    const { zones } = loadZoneData();
    let coordinateCount = 0;

    for (const zone of zones) {
      for (const coordinate of [zone.centroid, ...zone.polygon]) {
        coordinateCount += 1;
        expect(coordinate.latitude).toBeGreaterThanOrEqual(
          DISTRICT_ENVELOPE.latitude.minimum,
        );
        expect(coordinate.latitude).toBeLessThanOrEqual(
          DISTRICT_ENVELOPE.latitude.maximum,
        );
        expect(coordinate.longitude).toBeGreaterThanOrEqual(
          DISTRICT_ENVELOPE.longitude.minimum,
        );
        expect(coordinate.longitude).toBeLessThanOrEqual(
          DISTRICT_ENVELOPE.longitude.maximum,
        );
      }
    }

    expect(coordinateCount).toBe(EXPECTED_COORDINATE_COUNT);
  });

  it("parses the immutable localized hotspot source inside the same district envelope", () => {
    const { heatmapHotspots, heatmapPoints } = loadZoneData();
    expect(heatmapPoints).toHaveLength(104); // fact: heatmap.points.total
    expect(heatmapHotspots).toHaveLength(70); // fact: heatmap.points.visible
    heatmapPoints.forEach((point) => {
      expect(point.latitude).toBeGreaterThanOrEqual(
        DISTRICT_ENVELOPE.latitude.minimum,
      );
      expect(point.latitude).toBeLessThanOrEqual(
        DISTRICT_ENVELOPE.latitude.maximum,
      );
      expect(point.longitude).toBeGreaterThanOrEqual(
        DISTRICT_ENVELOPE.longitude.minimum,
      );
      expect(point.longitude).toBeLessThanOrEqual(
        DISTRICT_ENVELOPE.longitude.maximum,
      );
    });
  });

  it("joins every non-safe zone to a card and every station to a phone", () => {
    const data = loadZoneData();
    const nonSafeZones = data.zones.filter(
      (zone) => zone.riskTier !== RiskTier.SAFE,
    );

    expect(nonSafeZones).toHaveLength(19); // fact: zones.drawn
    nonSafeZones.forEach((zone) => {
      expect(data.cardsByStationId.has(zone.stationId)).toBe(true);
    });
    data.policeStations.forEach((station) => {
      expect(station.phone.trim().length).toBeGreaterThan(0);
    });
  });

  it("publishes byte-identical copies of the four frozen assets", () => {
    const copies = [
      ["assets/vizag_heatmap.geojson", "public/assets/vizag_heatmap.geojson"],
      ["assets/zone_info_cards.json", "public/assets/zone_info_cards.json"],
      [
        "assets/vizag_police_points.json",
        "public/assets/vizag_police_points.json",
      ],
      [
        "assets/vizag_heatmap_points.json",
        "public/assets/vizag_heatmap_points.json",
      ],
      [
        "assets/vizag_heatmap_points.json",
        "src/data/zone/assets/vizag_heatmap_points.json",
      ],
    ] as const;

    copies.forEach(([source, published]) => {
      expect(readFileSync(join(process.cwd(), published))).toEqual(
        readFileSync(join(process.cwd(), source)),
      );
    });

    const localizedSource = readFileSync(
      join(process.cwd(), "assets/vizag_heatmap_points.json"),
    );
    expect(createHash("sha256").update(localizedSource).digest("hex")).toBe(
      "c35870b194851f5ed2d25840c17bb0669781c439bbad1b246e8c366118c4f5ec", // fact: heatmap.source.sha256
    );
  });
});
