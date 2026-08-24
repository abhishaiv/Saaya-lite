/**
 * Display-ready detail for a non-safe zone.
 *
 * Text fields intentionally preserve the bundled asset verbatim: they are
 * already formatted for presentation and are not derived by the parser.
 */
export interface ZoneCard {
  readonly stationId: string;
  readonly areaName: string;
  readonly fullAreas: string;
  readonly riskLevel: string;
  readonly riskTier: string;
  readonly incidentCount: number;
  readonly womenSafetyCount: number;
  readonly topCrimes: string;
  readonly riskNotes: string;
  readonly touristSpots: string;
}
