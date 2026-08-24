import { describe, expect, it } from "vitest";

import {
  DAWN_START_HOUR,
  DAY_START_HOUR,
  MINUTES_PER_HOUR,
} from "../domain/engine/rules";
import { minutesToEpochMs } from "./clock";
import { SAAYA_TIME_ZONE, hourBandAtEpochMs } from "./hourBandClock";

describe("Visakhapatnam wall clock", () => {
  it("hardcodes Asia/Kolkata rather than the device timezone", () => {
    expect(SAAYA_TIME_ZONE).toBe("Asia/Kolkata");
    expect(hourBandAtEpochMs(0)).toBe("DAWN");
  });

  it("passes the resolved wall-clock components through the canonical bands", () => {
    const epochAtDawnHalfPast = 0;
    const minutesPastDawn = MINUTES_PER_HOUR / 2; // GROUNDED-EXEMPT: half-hour fixture offset.
    const previousBandEpochMs =
      epochAtDawnHalfPast - minutesToEpochMs(minutesPastDawn + 1);
    const dayStartEpochMs =
      epochAtDawnHalfPast +
      minutesToEpochMs(
        (DAY_START_HOUR - DAWN_START_HOUR) * MINUTES_PER_HOUR -
          minutesPastDawn,
      );

    expect(hourBandAtEpochMs(previousBandEpochMs)).toBe("NIGHT_DEEP");
    expect(hourBandAtEpochMs(dayStartEpochMs)).toBe("DAY");
  });
});
