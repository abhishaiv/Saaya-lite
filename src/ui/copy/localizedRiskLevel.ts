import type { M4Copy } from "./strings";

/**
 * Frozen ZoneCard categories are source data, not display copy. Keeping this
 * mapping here prevents English source labels leaking into the Telugu UI while
 * preserving their distinction from the hour-aware risk band.
 */
export function localizedStaticRiskLevel(
  copy: M4Copy,
  riskLevel: string,
): string {
  switch (riskLevel) {
    case "High Risk":
      return copy.riskLevelHigh;
    case "Moderate Risk":
      return copy.riskLevelModerate;
    case "Elevated Risk":
      return copy.riskLevelElevated;
    default:
      throw new Error(`Unexpected frozen ZoneCard.riskLevel: ${riskLevel}`);
  }
}
