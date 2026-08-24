import { describe, expect, it } from "vitest";

import { shouldAutoArm } from "./armingEvaluator";
import { checkInDelaySec } from "./intervalCalculator";
import {
  DEFAULT_RULES,
  DAWN_START_HOUR,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  NIGHT_DEEP_START_HOUR,
  NIGHT_EARLY_START_HOUR,
  NIGHT_LATE_START_HOUR,
  PIN_LENGTH,
  WESTERN_DIGIT_MIN,
  displayRisk,
  displayRiskLabel,
  hourBandForLocalTime,
  isWeakPin,
} from "./rules";
import type { HourBand, RiskTier } from "../model/session";

const SECONDS_PER_MINUTE = 60; // GROUNDED-EXEMPT: SI unit conversion in test expectations
const ALL_BANDS: readonly HourBand[] = [
  "DAY",
  "NIGHT_EARLY",
  "NIGHT_LATE",
  "NIGHT_DEEP",
  "DAWN",
];

const EXPECTED_ARMING: Readonly<Record<RiskTier, readonly HourBand[]>> = {
  HIGH: ["NIGHT_EARLY", "NIGHT_LATE", "NIGHT_DEEP", "DAWN"],
  ELEVATED: ["NIGHT_LATE", "NIGHT_DEEP", "DAWN"],
  MODERATE: ["NIGHT_DEEP"],
  SAFE: [],
};

describe("frozen business rules", () => {
  it("resolves every inclusive hour-band boundary", () => {
    const lastMinute = MINUTES_PER_HOUR - 1;
    expect(hourBandForLocalTime(HOURS_PER_DAY - 1, lastMinute)).toBe(
      "NIGHT_LATE",
    );
    expect(hourBandForLocalTime(NIGHT_DEEP_START_HOUR, 0)).toBe("NIGHT_DEEP");
    expect(hourBandForLocalTime(DAWN_START_HOUR - 1, lastMinute)).toBe(
      "NIGHT_DEEP",
    );
    expect(hourBandForLocalTime(DAWN_START_HOUR, 0)).toBe("DAWN");
    expect(hourBandForLocalTime(NIGHT_EARLY_START_HOUR - 1, lastMinute)).toBe(
      "DAY",
    );
    expect(hourBandForLocalTime(NIGHT_EARLY_START_HOUR, 0)).toBe(
      "NIGHT_EARLY",
    );
    expect(hourBandForLocalTime(NIGHT_LATE_START_HOUR, 0)).toBe("NIGHT_LATE");
  });

  it("matches every arming-matrix cell", () => {
    (Object.keys(EXPECTED_ARMING) as RiskTier[]).forEach((tier) => {
      ALL_BANDS.forEach((band) => {
        expect(shouldAutoArm(DEFAULT_RULES, tier, band, undefined, 0)).toBe(
          EXPECTED_ARMING[tier].includes(band),
        );
      });
    });
  });

  it("never auto-arms a safe zone", () => {
    ALL_BANDS.forEach((band) => {
      expect(shouldAutoArm(DEFAULT_RULES, "SAFE", band, undefined, 0)).toBe(
        false,
      );
    });
  });

  it("selects the specified automatic and manual intervals", () => {
    expect(
      checkInDelaySec(DEFAULT_RULES, "AUTO_ZONE", "HIGH", "NIGHT_DEEP"),
    ).toBe(5 * SECONDS_PER_MINUTE);
    expect(
      checkInDelaySec(
        DEFAULT_RULES,
        "AUTO_ZONE",
        "MODERATE",
        "NIGHT_DEEP",
      ),
    ).toBe(12 * SECONDS_PER_MINUTE);

    ALL_BANDS.forEach((band) => {
      expect(checkInDelaySec(DEFAULT_RULES, "MANUAL", null, band)).toBe(
        10 * SECONDS_PER_MINUTE,
      );
    });
  });

  it("modulates, labels and clamps display risk", () => {
    const nightRisk = displayRisk(0.5, "NIGHT_DEEP");
    expect(nightRisk).toBe(0.65);
    expect(displayRiskLabel(nightRisk)).toBe("Elevated");
    expect(displayRisk(1, "NIGHT_DEEP")).toBe(1);
  });

  it("rejects every frozen weak PIN example", () => {
    const repeatedZeroPin = WESTERN_DIGIT_MIN.repeat(PIN_LENGTH);
    expect(isWeakPin(repeatedZeroPin)).toBe(true);
    expect(isWeakPin("1234")).toBe(true);
    expect(isWeakPin("1111")).toBe(true);
    expect(isWeakPin("7777")).toBe(true);
    expect(isWeakPin("4062")).toBe(false);
  });
});
