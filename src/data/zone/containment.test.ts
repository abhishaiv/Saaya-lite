import { describe, expect, it } from "vitest";

import { haversineDistanceM } from "../../domain/engine/nearestStation";
import type { HeatmapHotspot } from "../../domain/model/heatmapHotspot";
import { RiskTier, type LatLng, type Zone } from "../../domain/model/zone";
import { buildHeatmapHotspots } from "./heatmapHotspots";
import { bundledZoneData } from "./zoneLoader";
import {
  containingHotspotZones,
  hotspotContainsPoint,
  polygonContainsPoint,
} from "./containment";

const EXPECTED_VISIBLE_HOTSPOT_COUNT = 70; // fact: heatmap.points.visible
const EXPECTED_SAFE_EXCLUDED_COUNT = 18; // fact: heatmap.points.safe.excluded
const EXPECTED_OUTSIDE_EXCLUDED_COUNT = 16; // fact: heatmap.points.outside.excluded

describe("localized hotspot containment", () => {
  it("renders and arms only the approved red, orange, and yellow hotspot circles", () => {
    const { heatmapHotspots, heatmapPoints, zones } = bundledZoneData;
    expect(heatmapPoints).toHaveLength(104); // fact: heatmap.points.total
    expect(heatmapHotspots).toHaveLength(EXPECTED_VISIBLE_HOTSPOT_COUNT);
    expect(
      heatmapHotspots.filter(({ zone }) => zone.riskTier === RiskTier.HIGH),
    ).toHaveLength(10); // fact: heatmap.points.high
    expect(
      heatmapHotspots.filter(({ zone }) => zone.riskTier === RiskTier.MODERATE),
    ).toHaveLength(41); // fact: heatmap.points.moderate
    expect(
      heatmapHotspots.filter(({ zone }) => zone.riskTier === RiskTier.ELEVATED),
    ).toHaveLength(19); // fact: heatmap.points.elevated

    for (const hotspot of heatmapHotspots) {
      expect(hotspot.zone.riskTier).not.toBe(RiskTier.SAFE);
      expect(hotspotContainsPoint(hotspot, hotspot.center)).toBe(true);
      expect(polygonContainsPoint(hotspot.zone.polygon, hotspot.center)).toBe(
        true,
      );
    }

    const safePoints = heatmapPoints.filter((point) =>
      zones.some(
        (zone) =>
          zone.riskTier === RiskTier.SAFE &&
          polygonContainsPoint(zone.polygon, point),
      ),
    );
    const unclassifiedPoints = heatmapPoints.filter(
      (point) =>
        !zones.some((zone) => polygonContainsPoint(zone.polygon, point)),
    );
    expect(safePoints).toHaveLength(EXPECTED_SAFE_EXCLUDED_COUNT);
    expect(unclassifiedPoints).toHaveLength(EXPECTED_OUTSIDE_EXCLUDED_COUNT);
  });

  it("treats the circle boundary as inside and a point beyond it as outside", () => {
    const hotspot = bundledZoneData.heatmapHotspots[0];
    if (hotspot === undefined) throw new Error("Frozen hotspots are missing");
    const boundary = northOf(hotspot.center, hotspot.radiusM);
    const boundaryRadius = haversineDistanceM(hotspot.center, boundary);
    const boundaryHotspot: HeatmapHotspot = {
      ...hotspot,
      radiusM: boundaryRadius,
    };
    const outside = northOf(hotspot.center, hotspot.radiusM * 2); // GROUNDED-EXEMPT: deliberately farther than the tested boundary.

    expect(hotspotContainsPoint(boundaryHotspot, boundary)).toBe(true);
    expect(hotspotContainsPoint(boundaryHotspot, outside)).toBe(false);
  });

  it("deduplicates multiple overlapping hotspot circles to their parent zone", () => {
    const first = bundledZoneData.heatmapHotspots[0];
    if (first === undefined) throw new Error("Frozen hotspots are missing");
    const duplicate: HeatmapHotspot = { ...first, id: `${first.id}-duplicate` };

    expect(
      containingHotspotZones([first, duplicate], first.center),
    ).toEqual([first.zone]);
  });

  it("never reads the legacy geofence radius while building or testing hotspots", () => {
    const source = bundledZoneData.zones.find(
      (zone) => zone.riskTier !== RiskTier.SAFE,
    );
    const point = bundledZoneData.heatmapPoints[0];
    if (source === undefined || point === undefined) {
      throw new Error("Frozen hotspot source is missing");
    }
    let radiusRead = false;
    const guardedZone = new Proxy(source, {
      get(target, property, receiver) {
        if (property === "geofenceRadiusM") radiusRead = true;
        return Reflect.get(target, property, receiver) as Zone[keyof Zone];
      },
    });

    const hotspots = buildHeatmapHotspots([guardedZone], [point]);
    containingHotspotZones(hotspots, point);

    expect(radiusRead).toBe(false);
  });
});

function northOf(center: LatLng, distanceM: number): LatLng {
  const reference = { latitude: center.latitude + 1, longitude: center.longitude }; // GROUNDED-EXEMPT: reference degree used only to derive a test-only geographic offset.
  const metresPerDegree = haversineDistanceM(center, reference);
  return {
    latitude: center.latitude + distanceM / metresPerDegree,
    longitude: center.longitude,
  };
}
