import type { PoliceStation } from "../model/policeStation";
import type { LatLng } from "../model/zone";
import {
  EARTH_RADIUS_M,
  MAX_STATION_DISTANCE_M,
  METRES_PER_KILOMETRE,
} from "./rules";

const DEGREES_PER_HALF_TURN = 180; // GROUNDED-EXEMPT: angular unit conversion.

export interface StationDistance {
  readonly distanceM: number;
  readonly station: PoliceStation;
}

export type StationDistanceDisplay =
  | Readonly<{ unit: "m"; value: number }>
  | Readonly<{ unit: "km"; value: string }>;

function radians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

/** Pure Haversine distance over the coordinates frozen in the bundled assets. */
export function haversineDistanceM(from: LatLng, to: LatLng): number {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const latitudeTerm = Math.sin(latitudeDelta / 2) ** 2;
  const longitudeTerm =
    Math.cos(fromLatitude) *
    Math.cos(toLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle =
    2 * Math.atan2(
      Math.sqrt(latitudeTerm + longitudeTerm),
      Math.sqrt(1 - latitudeTerm - longitudeTerm),
    );

  return EARTH_RADIUS_M * centralAngle;
}

export function nearestStation(
  point: LatLng,
  stations: readonly PoliceStation[],
): StationDistance | null {
  let nearest: StationDistance | null = null;

  for (const station of stations) {
    const distanceM = haversineDistanceM(point, {
      latitude: station.latitude,
      longitude: station.longitude,
    });
    if (nearest === null || distanceM < nearest.distanceM) {
      nearest = { distanceM, station };
    }
  }

  return nearest !== null && nearest.distanceM <= MAX_STATION_DISTANCE_M
    ? nearest
    : null;
}

/** Returns a COPY-ready value; Western digits are deliberate on both language paths. */
export function stationDistanceDisplay(
  distanceM: number,
): StationDistanceDisplay {
  if (distanceM < METRES_PER_KILOMETRE) {
    return { unit: "m", value: Math.round(distanceM) };
  }

  return {
    unit: "km",
    value: (distanceM / METRES_PER_KILOMETRE).toFixed(1),
  };
}
