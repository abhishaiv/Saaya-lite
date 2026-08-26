import type { MapZone } from "../../../data/repository/zoneRepository";
import type { LatLng } from "../../../domain/model/zone";

const SVG_EXTENT = 1_000; // GROUNDED-EXEMPT: normalized structural SVG coordinate space.

export interface ProjectedMapZone {
  readonly areaName: string;
  readonly colorHex: string;
  readonly fillOpacity: number;
  readonly id: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly path: string;
  readonly riskScore: number;
  readonly riskLevel: string;
  readonly riskTier: string;
}

interface ProjectionBounds {
  readonly minimumLatitude: number;
  readonly maximumLatitude: number;
  readonly minimumLongitude: number;
  readonly maximumLongitude: number;
}

function boundsFor(mapZones: readonly MapZone[]): ProjectionBounds {
  const coordinates = mapZones.flatMap(({ zone }) => zone.polygon);
  const first = coordinates[0];
  if (first === undefined) {
    throw new Error("Cannot project an empty map-zone collection");
  }

  return coordinates.reduce<ProjectionBounds>(
    (bounds, coordinate) => ({
      minimumLatitude: Math.min(bounds.minimumLatitude, coordinate.latitude),
      maximumLatitude: Math.max(bounds.maximumLatitude, coordinate.latitude),
      minimumLongitude: Math.min(bounds.minimumLongitude, coordinate.longitude),
      maximumLongitude: Math.max(bounds.maximumLongitude, coordinate.longitude),
    }),
    {
      minimumLatitude: first.latitude,
      maximumLatitude: first.latitude,
      minimumLongitude: first.longitude,
      maximumLongitude: first.longitude,
    },
  );
}

function project(point: LatLng, bounds: ProjectionBounds): readonly [number, number] {
  const longitudeSpan = bounds.maximumLongitude - bounds.minimumLongitude;
  const latitudeSpan = bounds.maximumLatitude - bounds.minimumLatitude;
  if (longitudeSpan === 0 || latitudeSpan === 0) {
    throw new Error("Cannot project degenerate map bounds");
  }

  return [
    ((point.longitude - bounds.minimumLongitude) / longitudeSpan) * SVG_EXTENT,
    ((bounds.maximumLatitude - point.latitude) / latitudeSpan) * SVG_EXTENT,
  ];
}

function pathFor(polygon: readonly LatLng[], bounds: ProjectionBounds): string {
  return polygon
    .map((point, index) => {
      const [x, y] = project(point, bounds);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

export function projectMapZones(
  mapZones: readonly MapZone[],
): readonly ProjectedMapZone[] {
  const bounds = boundsFor(mapZones);
  return [...mapZones]
    .sort((left, right) => left.zone.riskScore - right.zone.riskScore)
    .map(({ areaName, riskLevel, zone }) => {
      const [labelX, labelY] = project(zone.centroid, bounds);
      return {
        areaName,
        colorHex: zone.colorHex,
        fillOpacity: zone.opacity,
        id: zone.stationId,
        labelX,
        labelY,
        path: pathFor(zone.polygon, bounds),
        riskScore: zone.riskScore,
        riskLevel,
        riskTier: zone.riskTier,
      };
    });
}

export const STATIC_MAP_VIEW_BOX = `0 0 ${SVG_EXTENT} ${SVG_EXTENT}`;
