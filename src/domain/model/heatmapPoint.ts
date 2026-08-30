/**
 * A frozen, aggregate locality anchor. It is deliberately not an incident,
 * address, person, or live report.
 */
export interface HeatmapPoint {
  readonly crimeCount: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly name: string;
  readonly weight: number;
  readonly womenSafetyCount: number;
}
