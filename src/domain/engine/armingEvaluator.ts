import type { Zone } from "../model/zone";
import type { HourBand, RiskTier, Rules } from "../model/session";
import { ruleKey } from "./rules";

const TIER_ORDER: readonly RiskTier[] = [
  "SAFE",
  "MODERATE",
  "ELEVATED",
  "HIGH",
];

export function shouldAutoArm(
  rules: Rules,
  tier: RiskTier,
  band: HourBand,
  cooldownUntilEpochMs: number | undefined,
  nowEpochMs: number,
): boolean {
  if ((cooldownUntilEpochMs ?? 0) > nowEpochMs) return false;
  return rules.armingMatrix[ruleKey(tier, band)] === true;
}

export function selectHighestRiskZone(zones: readonly Zone[]): Zone | null {
  return (
    zones.reduce<Zone | null>((selected, zone) => {
      if (selected === null) return zone;

      const selectedTier = TIER_ORDER.indexOf(selected.riskTier as RiskTier);
      const candidateTier = TIER_ORDER.indexOf(zone.riskTier as RiskTier);
      if (candidateTier > selectedTier) return zone;
      if (candidateTier < selectedTier) return selected;
      return zone.riskScore > selected.riskScore ? zone : selected;
    }, null)
  );
}
