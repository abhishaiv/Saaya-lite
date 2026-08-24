import type {
  ArmMode,
  HourBand,
  RiskTier,
  Rules,
} from "../model/session";
import { ruleKey, scaledSeconds } from "./rules";

const SECONDS_PER_MINUTE = 60; // GROUNDED-EXEMPT: SI unit conversion

export function checkInDelaySec(
  rules: Rules,
  armMode: ArmMode,
  tier: RiskTier | null,
  armedHourBand: HourBand | null,
): number {
  if (armMode === "MANUAL") {
    return scaledSeconds(
      rules.manualIntervalMin * SECONDS_PER_MINUTE,
      rules,
    );
  }

  if (tier === null || armedHourBand === null) {
    throw new Error("An active AUTO_ZONE session requires a tier and armedHourBand");
  }

  const intervalMin = rules.intervals[ruleKey(tier, armedHourBand)];
  if (intervalMin === undefined) {
    throw new Error("The frozen AUTO_ZONE band has no check-in interval");
  }

  return scaledSeconds(intervalMin * SECONDS_PER_MINUTE, rules);
}
