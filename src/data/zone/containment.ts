import { haversineDistanceM } from "../../domain/engine/nearestStation";
import type { HeatmapHotspot } from "../../domain/model/heatmapHotspot";
import type { LatLng, Zone } from "../../domain/model/zone";

/**
 * Live containment is intentionally based on these localized circles, not
 * the broad source-classification polygons below.
 */
export function hotspotContainsPoint(
  hotspot: HeatmapHotspot,
  point: LatLng,
): boolean {
  return haversineDistanceM(hotspot.center, point) <= hotspot.radiusM;
}

export function containingHotspotZones(
  hotspots: readonly HeatmapHotspot[],
  point: LatLng,
): readonly Zone[] {
  const zones = new Map<string, Zone>();
  for (const hotspot of hotspots) {
    if (hotspotContainsPoint(hotspot, point)) {
      zones.set(hotspot.zone.stationId, hotspot.zone);
    }
  }
  return [...zones.values()];
}

export function polygonContainsPoint(
  polygon: readonly LatLng[],
  point: LatLng,
): boolean {
  if (polygon.length < 3) {
    // GROUNDED-EXEMPT: a polygon is structurally defined by at least three vertices.
    return false;
  }

  let inside = false;
  let previous = polygon[polygon.length - 1];
  if (previous === undefined) return false;

  for (const current of polygon) {
    if (pointIsOnSegment(point, previous, current)) return true;

    const crossesLatitude =
      current.latitude > point.latitude !== previous.latitude > point.latitude;
    if (crossesLatitude) {
      const crossingLongitude =
        ((previous.longitude - current.longitude) *
          (point.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
        current.longitude;
      if (point.longitude < crossingLongitude) inside = !inside;
    }

    previous = current;
  }

  return inside;
}

function pointIsOnSegment(
  point: LatLng,
  start: LatLng,
  end: LatLng,
): boolean {
  if (
    point.latitude === start.latitude &&
    point.longitude === start.longitude
  ) {
    return true;
  }
  if (point.latitude === end.latitude && point.longitude === end.longitude) {
    return true;
  }

  const latitudeDelta = end.latitude - start.latitude;
  const longitudeDelta = end.longitude - start.longitude;
  const pointLatitudeDelta = point.latitude - start.latitude;
  const pointLongitudeDelta = point.longitude - start.longitude;
  const crossProduct =
    pointLongitudeDelta * latitudeDelta -
    pointLatitudeDelta * longitudeDelta;
  const precisionScale = Math.max(
    1,
    Math.abs(latitudeDelta),
    Math.abs(longitudeDelta),
  );
  if (Math.abs(crossProduct) > Number.EPSILON * precisionScale) return false;

  return (
    point.latitude >= Math.min(start.latitude, end.latitude) &&
    point.latitude <= Math.max(start.latitude, end.latitude) &&
    point.longitude >= Math.min(start.longitude, end.longitude) &&
    point.longitude <= Math.max(start.longitude, end.longitude)
  );
}
