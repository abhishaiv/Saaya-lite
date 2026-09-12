import { displayRiskLabel } from "../../domain/engine/rules";
import type { M4Copy } from "./strings";

/**
 * The localized name of a risk band.
 *
 * `displayRiskLabel` answers in the engine's English ("Low", "Moderate", ...); every
 * surface that shows a band to her needs the COPY.md row for it instead. This lived
 * inside `ZoneDetailSheet.tsx` until the walk view needed the same mapping for its zone
 * labels, at which point a second copy of the switch was the wrong answer.
 */
export function localizedRiskBand(
  copy: M4Copy,
  label: ReturnType<typeof displayRiskLabel>,
): string {
  switch (label) {
    case "Low":
      return copy.riskBandLow;
    case "Moderate":
      return copy.riskBandModerate;
    case "Elevated":
      return copy.riskBandElevated;
    case "High":
      return copy.riskBandHigh;
  }
}
