import type { MapZone } from "../../../data/repository/zoneRepository";
import { EARTH_RADIUS_M } from "../../../domain/engine/rules";
import type { HeatmapHotspot } from "../../../domain/model/heatmapHotspot";
import type { LatLng } from "../../../domain/model/zone";

const SVG_EXTENT = 1_000; // GROUNDED-EXEMPT: normalized structural SVG coordinate space.
const DEGREES_PER_HALF_TURN = 180; // GROUNDED-EXEMPT: angular unit conversion.

export interface ProjectedMapHotspot {
  readonly areaName: string;
  readonly colorHex: string;
  readonly fillOpacity: number;
  readonly id: string;
  readonly radius: number;
  readonly riskLevel: string;
  readonly riskScore: number;
  readonly zoneId: string;
  readonly x: number;
  readonly y: number;
}

interface ProjectionBounds {
  readonly minimumLatitude: number;
  readonly maximumLatitude: number;
  readonly minimumLongitude: number;
  readonly maximumLongitude: number;
}

function circleBounds(hotspot: HeatmapHotspot): ProjectionBounds {
  const angularRadius = hotspot.radiusM / EARTH_RADIUS_M;
  const latitudeDelta =
    (angularRadius * DEGREES_PER_HALF_TURN) / Math.PI;
  const longitudeDelta =
    latitudeDelta /
    Math.max(
      Math.abs(
        Math.cos(
          (hotspot.center.latitude * Math.PI) / DEGREES_PER_HALF_TURN,
        ),
      ),
      Number.EPSILON,
    );

  return {
    minimumLatitude: hotspot.center.latitude - latitudeDelta,
    maximumLatitude: hotspot.center.latitude + latitudeDelta,
    minimumLongitude: hotspot.center.longitude - longitudeDelta,
    maximumLongitude: hotspot.center.longitude + longitudeDelta,
  };
}

function boundsFor(hotspots: readonly HeatmapHotspot[]): ProjectionBounds {
  const first = hotspots[0];
  if (first === undefined) {
    throw new Error("Cannot project an empty hotspot collection");
  }

  return hotspots.reduce<ProjectionBounds>((bounds, hotspot) => {
    const circle = circleBounds(hotspot);
    return {
      minimumLatitude: Math.min(bounds.minimumLatitude, circle.minimumLatitude),
      maximumLatitude: Math.max(bounds.maximumLatitude, circle.maximumLatitude),
      minimumLongitude: Math.min(bounds.minimumLongitude, circle.minimumLongitude),
      maximumLongitude: Math.max(bounds.maximumLongitude, circle.maximumLongitude),
    };
  }, circleBounds(first));
}

function project(
  point: LatLng,
  bounds: ProjectionBounds,
): readonly [number, number] {
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

function projectRadius(
  hotspot: HeatmapHotspot,
  bounds: ProjectionBounds,
): number {
  const latitudeOffset =
    ((hotspot.radiusM / EARTH_RADIUS_M) * DEGREES_PER_HALF_TURN) / Math.PI;
  const [, centerY] = project(hotspot.center, bounds);
  const [, edgeY] = project(
    {
      latitude: hotspot.center.latitude + latitudeOffset,
      longitude: hotspot.center.longitude,
    },
    bounds,
  );
  return Math.abs(edgeY - centerY);
}

/** Precompute fallback circles from the same localized records as Leaflet. */
export function projectMapHotspots(
  mapZones: readonly MapZone[],
  hotspots: readonly HeatmapHotspot[],
): readonly ProjectedMapHotspot[] {
  const bounds = boundsFor(hotspots);
  const mapZonesById = new Map(
    mapZones.map((mapZone) => [mapZone.zone.stationId, mapZone]),
  );
  return [...hotspots]
    .sort((left, right) => left.zone.riskScore - right.zone.riskScore)
    .flatMap((hotspot) => {
      const mapZone = mapZonesById.get(hotspot.zone.stationId);
      if (mapZone === undefined) return [];
      const [x, y] = project(hotspot.center, bounds);
      return [
        {
          areaName: mapZone.areaName,
          colorHex: hotspot.zone.colorHex,
          fillOpacity: hotspot.zone.opacity,
          id: hotspot.id,
          radius: projectRadius(hotspot, bounds),
          riskLevel: mapZone.riskLevel,
          riskScore: hotspot.zone.riskScore,
          zoneId: hotspot.zone.stationId,
          x,
          y,
        },
      ];
    });
}

export const STATIC_MAP_VIEW_BOX = `0 0 ${SVG_EXTENT} ${SVG_EXTENT}`;
