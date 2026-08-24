import { RiskTier, type LatLng, type Zone } from "../../domain/model/zone";

export interface PolygonBounds {
  readonly minimumLatitude: number;
  readonly maximumLatitude: number;
  readonly minimumLongitude: number;
  readonly maximumLongitude: number;
}

export interface ContainmentZone {
  readonly zone: Zone;
  readonly bounds: PolygonBounds;
}

export function polygonBounds(polygon: readonly LatLng[]): PolygonBounds {
  const first = polygon[0];
  if (first === undefined) {
    throw new Error("Cannot compute containment bounds for an empty polygon");
  }

  let minimumLatitude = first.latitude;
  let maximumLatitude = first.latitude;
  let minimumLongitude = first.longitude;
  let maximumLongitude = first.longitude;

  for (const point of polygon) {
    minimumLatitude = Math.min(minimumLatitude, point.latitude);
    maximumLatitude = Math.max(maximumLatitude, point.latitude);
    minimumLongitude = Math.min(minimumLongitude, point.longitude);
    maximumLongitude = Math.max(maximumLongitude, point.longitude);
  }

  return {
    minimumLatitude,
    maximumLatitude,
    minimumLongitude,
    maximumLongitude,
  };
}

export function boundsContainPoint(
  bounds: PolygonBounds,
  point: LatLng,
): boolean {
  return (
    point.latitude >= bounds.minimumLatitude &&
    point.latitude <= bounds.maximumLatitude &&
    point.longitude >= bounds.minimumLongitude &&
    point.longitude <= bounds.maximumLongitude
  );
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

export function prepareContainmentZones(
  zones: readonly Zone[],
): readonly ContainmentZone[] {
  return zones
    .filter((zone) => zone.riskTier !== RiskTier.SAFE)
    .map((zone) => ({ zone, bounds: polygonBounds(zone.polygon) }));
}

export function containingZones(
  preparedZones: readonly ContainmentZone[],
  point: LatLng,
): readonly Zone[] {
  const matches: Zone[] = [];
  for (const prepared of preparedZones) {
    if (!boundsContainPoint(prepared.bounds, point)) continue;
    if (polygonContainsPoint(prepared.zone.polygon, point)) {
      matches.push(prepared.zone);
    }
  }
  return matches;
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
