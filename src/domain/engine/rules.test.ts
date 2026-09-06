import { describe, expect, it } from "vitest";

import { shouldAutoArm } from "./armingEvaluator";
import {
  DEFAULT_RULES,
  DAWN_START_HOUR,
  DEMO_ARM_HOUR,
  DEMO_ARM_TIME,
  DEMO_DIVISOR,
  DEMO_RULES,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  NIGHT_DEEP_START_HOUR,
  NIGHT_EARLY_START_HOUR,
  NIGHT_LATE_START_HOUR,
  NORMAL_DEMO_DIVISOR,
  PIN_LENGTH,
  WESTERN_DIGIT_MIN,
  displayRisk,
  displayRiskLabel,
  hourBandForLocalTime,
  isWeakPin,
  scaledSeconds,
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

  it("keeps DAY non-arming and derives the demo band from its frozen hour", () => {
    (Object.keys(EXPECTED_ARMING) as RiskTier[]).forEach((tier) => {
      expect(shouldAutoArm(DEFAULT_RULES, tier, "DAY", undefined, 0)).toBe(
        false,
      );
    });
    expect(DEMO_ARM_HOUR).toBe(4);
    expect(DEMO_ARM_TIME).toEqual({
      hourBand: hourBandForLocalTime(DEMO_ARM_HOUR, 0),
      hourOfDay: DEMO_ARM_HOUR,
    });
    expect(DEMO_ARM_TIME.hourBand).toBe("NIGHT_DEEP");
  });

  it("never auto-arms a safe zone", () => {
    ALL_BANDS.forEach((band) => {
      expect(shouldAutoArm(DEFAULT_RULES, "SAFE", band, undefined, 0)).toBe(
        false,
      );
    });
  });

  it("freezes the normal three-check-in ladder timing profile", () => {
    expect(DEFAULT_RULES.ladder).toEqual({
      cadenceSec: 5 * MINUTES_PER_HOUR,
      window1Sec: 2 * MINUTES_PER_HOUR,
      window2Sec: 1 * MINUTES_PER_HOUR,
      window3Sec: SECONDS_PER_MINUTE,
      okResetSec: 5 * MINUTES_PER_HOUR,
    });
  });

  it("compresses only the demo windows and OK reset, keeping the cadence", () => {
    expect(DEMO_RULES.ladder).toEqual({
      cadenceSec: 5 * MINUTES_PER_HOUR,
      window1Sec: 10,
      window2Sec: 10,
      window3Sec: 10,
      okResetSec: 10,
    });
  });

  it("runs both profiles unscaled since the divisor was retired", () => {
    expect(DEMO_DIVISOR).toBe(1);
    expect(NORMAL_DEMO_DIVISOR).toBe(1);
    expect(DEFAULT_RULES.demoDivisor).toBe(1);
    expect(DEMO_RULES.demoDivisor).toBe(1);
    expect(scaledSeconds(SECONDS_PER_MINUTE, DEMO_RULES)).toBe(
      SECONDS_PER_MINUTE,
    );
    expect(scaledSeconds(SECONDS_PER_MINUTE, DEFAULT_RULES)).toBe(
      SECONDS_PER_MINUTE,
    );
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