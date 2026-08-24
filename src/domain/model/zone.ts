export enum RiskTier {
  HIGH = "HIGH",
  ELEVATED = "ELEVATED",
  MODERATE = "MODERATE",
  SAFE = "SAFE",
}

export type ZoneColorHex =
  | "#FF3B30"
  | "#FF9500"
  | "#FFCC00"
  | "#00000000";

/** A coordinate in domain order, deliberately unlike GeoJSON's [longitude, latitude]. */
export interface LatLng {
  readonly latitude: number;
  readonly longitude: number;
}

export type CrimeBreakdown = Readonly<Record<string, number>>;

export interface Zone {
  readonly stationId: string;
  readonly stationName: string;
  readonly district: string;
  readonly polygon: readonly LatLng[];
  readonly centroid: LatLng;
  readonly riskScore: number;
  readonly riskTier: RiskTier;
  readonly colorHex: ZoneColorHex;
  readonly opacity: number;
  readonly totalCases: number;
  readonly womenSafetyCases: number;
  readonly crimeBreakdown: CrimeBreakdown;
  readonly geofenceRadiusM: number;
  readonly areasCovered: string;
  readonly touristSpots: string | null;
  readonly riskNotes: string | null;
}
