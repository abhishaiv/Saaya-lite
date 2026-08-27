import type { HourBand, RiskTier, Rules } from "../model/session";

export const CHECK_IN_1_SEC = 90;
export const CHECK_IN_2_SEC = 60;
export const CANCEL_WINDOW_SEC = 60;
export const LADDER_TOTAL_SEC =
  CHECK_IN_1_SEC + CHECK_IN_2_SEC + CANCEL_WINDOW_SEC; // fact: ladder.total
export const ENTER_DWELL_SEC = 60;
export const EXIT_DWELL_SEC = 180;
export const MANUAL_DISARM_COOLDOWN_MIN = 45;
export const OK_COOLDOWN_MIN = 20;
export const MANUAL_INTERVAL_MIN = 10;
export const SHADOW_SAMPLING_SEC = 15; // fact: loc.sample.shadow
export const SOS_SAMPLING_SEC = 5; // fact: loc.sample.sos
export const IDLE_SAMPLING_SEC = 30; // fact: loc.sample.idle.fg
export const PENDING_DWELL_SAMPLING_SEC = 15; // fact: candidate.sample.interval
export const MAX_CONTAINMENT_ACCURACY_M = 100; // fact: loc.accuracy.reject
export const MIN_ENTRY_FIXES = 5; // fact: candidate.dwell.min_fixes
export const LAST_KNOWN_CENTERING_MAX_AGE_MIN = 5; // fact: loc.last_known.centering.max_age
export const FIRST_FIX_SLOW_AFTER_SEC = 60; // fact: loc.first_fix.slow_after
export const DEMO_DIVISOR = 6; // fact: demo.divisor
export const NORMAL_DEMO_DIVISOR = 1; // fact: demo.normal.divisor
export const DEMO_TOTAL_SEC = LADDER_TOTAL_SEC / DEMO_DIVISOR; // fact: demo.total
export const DEMO_ARM_HOUR = 4; // fact: demo.arm.hour
export const EARTH_RADIUS_M = 6_371_008.8; // fact: const.earth
export const MAX_STATION_DISTANCE_KM = 20; // fact: dist.station.max
export const METRES_PER_KILOMETRE = 1_000; // GROUNDED-EXEMPT: SI unit conversion.
export const MAX_STATION_DISTANCE_M =
  MAX_STATION_DISTANCE_KM * METRES_PER_KILOMETRE;

export const NIGHT_DEEP_START_HOUR = 0;
export const DAWN_START_HOUR = 5;
export const DAY_START_HOUR = 7;
export const NIGHT_EARLY_START_HOUR = 20;
export const NIGHT_LATE_START_HOUR = 22;
export const HOURS_PER_DAY = 24; // GROUNDED-EXEMPT: structural clock-domain size
export const MINUTES_PER_HOUR = 60; // GROUNDED-EXEMPT: structural clock-domain size
export const PIN_LENGTH = 4;
export const WESTERN_DIGIT_MIN = "0";

const DISPLAY_MULTIPLIERS: Readonly<Record<HourBand, number>> = {
  DAY: 0.6,
  NIGHT_EARLY: 0.9,
  DAWN: 1,
  NIGHT_LATE: 1.15,
  NIGHT_DEEP: 1.3,
};

const DISPLAY_LOW_MAX = 0.25;
const DISPLAY_MODERATE_MAX = 0.5;
const DISPLAY_ELEVATED_MAX = 0.75;

const INTERVALS: Record<string, number> = {
  "HIGH:NIGHT_DEEP": 5,
  "HIGH:NIGHT_LATE": 8,
  "HIGH:DAWN": 8,
  "HIGH:NIGHT_EARLY": 10,
  "ELEVATED:NIGHT_DEEP": 8,
  "ELEVATED:NIGHT_LATE": 10,
  "ELEVATED:DAWN": 10,
  "MODERATE:NIGHT_DEEP": 12,
};

const ARMING_MATRIX: Record<string, boolean> = {
  "HIGH:DAY": false,
  "HIGH:NIGHT_EARLY": true,
  "HIGH:NIGHT_LATE": true,
  "HIGH:NIGHT_DEEP": true,
  "HIGH:DAWN": true,
  "ELEVATED:DAY": false,
  "ELEVATED:NIGHT_EARLY": false,
  "ELEVATED:NIGHT_LATE": true,
  "ELEVATED:NIGHT_DEEP": true,
  "ELEVATED:DAWN": true,
  "MODERATE:DAY": false,
  "MODERATE:NIGHT_EARLY": false,
  "MODERATE:NIGHT_LATE": false,
  "MODERATE:NIGHT_DEEP": true,
  "MODERATE:DAWN": false,
  "SAFE:DAY": false,
  "SAFE:NIGHT_EARLY": false,
  "SAFE:NIGHT_LATE": false,
  "SAFE:NIGHT_DEEP": false,
  "SAFE:DAWN": false,
};

export const DEFAULT_RULES: Rules = {
  checkIn1Sec: CHECK_IN_1_SEC,
  checkIn2Sec: CHECK_IN_2_SEC,
  cancelWindowSec: CANCEL_WINDOW_SEC,
  enterDwellSec: ENTER_DWELL_SEC,
  exitDwellSec: EXIT_DWELL_SEC,
  manualDisarmCooldownMin: MANUAL_DISARM_COOLDOWN_MIN,
  okCooldownMin: OK_COOLDOWN_MIN,
  manualIntervalMin: MANUAL_INTERVAL_MIN,
  demoDivisor: NORMAL_DEMO_DIVISOR,
  intervals: INTERVALS,
  armingMatrix: ARMING_MATRIX,
  samplingShadowSec: SHADOW_SAMPLING_SEC,
  samplingSosSec: SOS_SAMPLING_SEC,
};

export const DEMO_RULES: Rules = {
  ...DEFAULT_RULES,
  demoDivisor: DEMO_DIVISOR,
};

export type DisplayRiskLabel = "Low" | "Moderate" | "Elevated" | "High";

export function ruleKey(tier: RiskTier, band: HourBand): string {
  return `${tier}:${band}`;
}

export function hourBandForLocalTime(hour: number, minute: number): HourBand {
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < NIGHT_DEEP_START_HOUR ||
    hour >= HOURS_PER_DAY ||
    minute < 0 ||
    minute >= MINUTES_PER_HOUR
  ) {
    throw new RangeError("Local clock components are outside their valid range");
  }

  if (hour >= NIGHT_LATE_START_HOUR) return "NIGHT_LATE";
  if (hour >= NIGHT_EARLY_START_HOUR) return "NIGHT_EARLY";
  if (hour >= DAY_START_HOUR) return "DAY";
  if (hour >= DAWN_START_HOUR) return "DAWN";
  return "NIGHT_DEEP";
}

/** Every demo-session hour consumer reads this one derived clock value. */
export const DEMO_ARM_TIME = Object.freeze({
  hourBand: hourBandForLocalTime(DEMO_ARM_HOUR, 0),
  hourOfDay: DEMO_ARM_HOUR,
});

export function scaledSeconds(seconds: number, rules: Rules): number {
  return seconds / rules.demoDivisor;
}

export function displayRisk(score: number, band: HourBand): number {
  return Math.min(1, Math.max(0, score * DISPLAY_MULTIPLIERS[band]));
}

export function displayRiskLabel(score: number): DisplayRiskLabel {
  if (score < DISPLAY_LOW_MAX) return "Low";
  if (score < DISPLAY_MODERATE_MAX) return "Moderate";
  if (score < DISPLAY_ELEVATED_MAX) return "Elevated";
  return "High";
}

export function isWeakPin(pin: string): boolean {
  if (pin.length !== PIN_LENGTH || !/^[0-9]+$/.test(pin)) return true;
  if (new Set(pin).size === 1) return true;
  return pin === "1234";
}
