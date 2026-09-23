import { describe, expect, it } from "vitest";

import { indiaWallClockAt, parseOpeningHours } from "./openingHours";

/**
 * Probe clocks. The weekday/minute pairs are the test's own fixtures, not product
 * values - 0 is Sunday, and the minuteOfDay is minutes from midnight.
 */
const MON_1200 = { weekday: 1, minuteOfDay: 12 * 60 };
const SUN_1200 = { weekday: 0, minuteOfDay: 12 * 60 };
const SAT_2200 = { weekday: 6, minuteOfDay: 22 * 60 };
const MON_2130 = { weekday: 1, minuteOfDay: 21 * 60 + 30 }; // GROUNDED-EXEMPT: a probe clock, not a product value.
const MON_0030 = { weekday: 1, minuteOfDay: 30 };

describe("parseOpeningHours", () => {
  it("reads a plain weekly rule open inside its span and closed outside it", () => {
    const hours = "Mo-Sa 10:00-21:30"; // GROUNDED-EXEMPT: a probe rule string, not a product value.
    expect(parseOpeningHours(hours, { weekday: 3, minuteOfDay: 10 * 60 })).toEqual({ open: true });
    expect(parseOpeningHours(hours, SUN_1200)).toEqual({ open: false });
    // The end minute is not inside: a place that shuts at 21:30 is closed at 21:30.
    expect(parseOpeningHours(hours, MON_2130)).toEqual({ open: false });
  });

  it("starts a span exactly at its start minute", () => {
    expect(
      parseOpeningHours("Mo-Fr 09:00-18:00", { weekday: 1, minuteOfDay: 9 * 60 }),
    ).toEqual({ open: true });
  });

  it("reads 24/7 as always open", () => {
    expect(parseOpeningHours("24/7", SUN_1200)).toEqual({ open: true });
    expect(parseOpeningHours("24/7", { weekday: 4, minuteOfDay: 3 * 60 + 17 })).toEqual({
      open: true,
    });
  });

  it("reads several rules on one line and opens when any of them covers now", () => {
    const hours = "Mo-Fr 09:00-18:00; Sa 10:00-14:00";
    expect(parseOpeningHours(hours, SAT_2200)).toEqual({ open: false });
    expect(parseOpeningHours(hours, { weekday: 6, minuteOfDay: 11 * 60 })).toEqual({ open: true });
    expect(parseOpeningHours(hours, MON_1200)).toEqual({ open: true });
  });

  it("reads a list of single days and a day range that wraps the week", () => {
    expect(parseOpeningHours("Mo,We-Fr 10:00-20:00", { weekday: 2, minuteOfDay: 12 * 60 })).toEqual({
      open: false,
    });
    expect(parseOpeningHours("Mo,We-Fr 10:00-20:00", { weekday: 3, minuteOfDay: 12 * 60 })).toEqual({
      open: true,
    });
    // Fr-Mo runs forward from Friday through Sunday to Monday.
    const hours = "Fr-Mo 09:00-17:00";
    expect(parseOpeningHours(hours, SUN_1200)).toEqual({ open: true });
    expect(parseOpeningHours(hours, { weekday: 2, minuteOfDay: 12 * 60 })).toEqual({ open: false });
  });

  it("reads a span that crosses midnight", () => {
    // Open from 18:00 until 02:00 the next morning: late evening and the small hours.
    const hours = "Mo-Su 18:00-02:00";
    expect(parseOpeningHours(hours, { weekday: 5, minuteOfDay: 20 * 60 })).toEqual({ open: true });
    expect(parseOpeningHours(hours, MON_0030)).toEqual({ open: true });
    expect(parseOpeningHours(hours, { weekday: 5, minuteOfDay: 12 * 60 })).toEqual({ open: false });
  });

  it("refuses text it does not parse rather than guessing a state", () => {
    // The recorded rule: the caller shows these hours verbatim with no open state.
    for (const hours of ["by appointment", "Mo-Fr 09:00", "sunrise-sunset", "Mo-Th 09:00-18:00; PH off", ""]) {
      expect(parseOpeningHours(hours, MON_1200)).toBeNull();
    }
  });

  it("refuses a minute outside the day rather than wrapping it", () => {
    expect(parseOpeningHours("Mo-Fr 09:00-24:30", MON_1200)).toBeNull();
  });
});

describe("indiaWallClockAt", () => {
  it("resolves her own wall clock from an instant, on the session's clock", () => {
    // 2026-09-23T06:30:00Z is 12:00 in India on a Wednesday.
    const clock = indiaWallClockAt(Date.UTC(2026, 8, 23, 6, 30, 0)); // GROUNDED-EXEMPT: a probe instant, not a product value.
    expect(clock.weekday).toBe(3);
    expect(clock.minuteOfDay).toBe(12 * 60);
  });
});