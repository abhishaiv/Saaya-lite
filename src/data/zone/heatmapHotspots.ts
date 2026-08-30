import { selectHighestRiskZone } from "../../domain/engine/armingEvaluator";
import type { HeatmapHotspot } from "../../domain/model/heatmapHotspot";
import type { HeatmapPoint } from "../../domain/model/heatmapPoint";
import { RiskTier, type Zone } from "../../domain/model/zone";
import { polygonContainsPoint } from "./containment";

const HIGH_HOTSPOT_RADIUS_M = 200; // fact: heatmap.radius.high
const MODERATE_HOTSPOT_RADIUS_M = 150; // fact: heatmap.radius.moderate
const ELEVATED_HOTSPOT_RADIUS_M = 100; // fact: heatmap.radius.elevated

/**
 * The historical polygons are used exactly once here to join an immutable
 * aggregate anchor to its parent locality. They are not live containment.
 */
export function buildHeatmapHotspots(
  zones: readonly Zone[],
  points: readonly HeatmapPoint[],
): readonly HeatmapHotspot[] {
  return points.flatMap((point, index) => {
    const parent = selectHighestRiskZone(
      zones.filter(
        (zone) =>
          zone.riskTier !== RiskTier.SAFE &&
          polygonContainsPoint(zone.polygon, point),
      ),
    );
    if (parent === null) return [];

    const radiusM = hotspotRadiusM(parent.riskTier);
    if (radiusM === null) return [];

    return [
      {
        id: `hotspot-${index}`,
        center: { latitude: point.latitude, longitude: point.longitude },
        point,
        radiusM,
        zone: parent,
      },
    ];
  });
}

export function hotspotRadiusM(riskTier: RiskTier): number | null {
  switch (riskTier) {
    case RiskTier.HIGH:
      return HIGH_HOTSPOT_RADIUS_M;
    case RiskTier.MODERATE:
      return MODERATE_HOTSPOT_RADIUS_M;
    case RiskTier.ELEVATED:
      return ELEVATED_HOTSPOT_RADIUS_M;
    case RiskTier.SAFE:
      return null;
  }
}
