import type { HeatmapPoint } from "./heatmapPoint";
import type { LatLng, Zone } from "./zone";

/** A localized circle that both the map and location runtime use. */
export interface HeatmapHotspot {
  readonly center: LatLng;
  readonly id: string;
  readonly point: HeatmapPoint;
  readonly radiusM: number;
  readonly zone: Zone;
}
