/**
 * Reading "open now" from OSM's `opening_hours`, deterministically.
 *
 * The grammar OSM carries is large; this reads the subset that covers the plain
 * weekly hours the bake's places actually carry, and refuses to guess anything
 * outside it. A string this module cannot parse comes back `null`, and the caller
 * shows the hours verbatim without an open/closed state - a state that would be a
 * guess. The recorded rule: a place with no hours reports no hours, and a place
 * whose hours cannot be parsed report the hours and no state. Never a guess.
 *
 * The wall clock is India's (`const.tz`), the same clock the session engine runs
 * on, so "open now" means open at the time she actually sees.
 */

import { SAAYA_TIME_ZONE } from "../hourBandClock";

/** Her wall clock, resolved: 0 is Sunday through 6 is Saturday, minutes from midnight. */
export interface IndiaWallClock {
  readonly weekday: number;
  readonly minuteOfDay: number;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/** The day names `Intl` writes, in the same Sunday-first order as the day indices. */
const INTL_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const WALL_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SAAYA_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function indiaWallClockAt(epochMs: number): IndiaWallClock {
  const parts = WALL_CLOCK_FORMATTER.formatToParts(epochMs);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const weekday = INTL_DAYS.indexOf(weekdayName as (typeof INTL_DAYS)[number]);
  if (weekdayName === undefined || weekday < 0 || hour === undefined || minute === undefined) {
    throw new Error("Could not resolve the Asia/Kolkata wall clock");
  }
  return { weekday, minuteOfDay: Number(hour) * 60 + Number(minute) };
}

/** One interval of a day, in minutes from midnight. An end at or before the start spans midnight. */
interface Span {
  readonly startMinute: number;
  readonly endMinute: number;
}

function parseMinuteOfDay(token: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(token);
  if (match === null) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  // A 24-hour clock's own bounds, not a product value: anything above them is a string
  // OSM does not mean as a time, which is the case this guard exists for.
  if (hour > 23 || minute > 59) return null; // GROUNDED-EXEMPT: the clock's own bounds in an OSM rule string.
  return hour * 60 + minute;
}

function parseSpans(text: string): Span[] | null {
  const spans: Span[] = [];
  for (const part of text.split(",")) {
    const range = part.trim().split("-");
    if (range.length !== 2) return null;
    const start = parseMinuteOfDay(range[0]?.trim() ?? "");
    const end = parseMinuteOfDay(range[1]?.trim() ?? "");
    if (start === null || end === null) return null;
    spans.push({ startMinute: start, endMinute: end });
  }
  return spans.length > 0 ? spans : null;
}

function parseDays(text: string): readonly number[] | null {
  const days: number[] = [];
  for (const part of text.split(",")) {
    const token = part.trim();
    if (token === "") return null;
    const ends = token.split("-");
    const start = DAYS.indexOf(ends[0] as (typeof DAYS)[number]);
    if (start < 0) return null;
    if (ends.length === 1) {
      days.push(start);
      continue;
    }
    if (ends.length !== 2) return null;
    const end = DAYS.indexOf(ends[1] as (typeof DAYS)[number]);
    if (end < 0) return null;
    // A day range can wrap the week ("Fr-Mo"); the span runs forward from the start.
    for (let offset = 0; ; offset += 1) {
      const day = (start + offset) % 7;
      days.push(day);
      if (day === end) break;
      if (offset >= 7) return null;
    }
  }
  return days;
}

/**
 * Is the place open at the given wall clock, or `null` when the text says something
 * this reader does not parse?
 *
 * The interval semantics are the everyday reading: the start minute is inside, the end
 * minute is not, so a place that shuts at 21:30 reads closed at 21:30.
 */
export function parseOpeningHours(
  text: string,
  clock: IndiaWallClock,
): { readonly open: boolean } | null {
  const trimmed = text.trim();
  if (trimmed === "24/7") {
    return { open: true };
  }
  let open = false;
  for (const rule of trimmed.split(";")) {
    // Rules are separated by ";", and OSM writes a space after it, so the space is part
    // of the next rule until it is trimmed.
    const segments = rule.trim().split(" ");
    if (segments.length !== 2) return null;
    const [dayText, timeText] = segments as [string, string];
    if (dayText === "24/7") {
      open = true;
      continue;
    }
    const days = parseDays(dayText);
    if (days === null) return null;
    if (!days.includes(clock.weekday)) continue;
    const spans = parseSpans(timeText);
    if (spans === null) return null;
    for (const span of spans) {
      if (span.startMinute <= span.endMinute) {
        if (
          clock.minuteOfDay >= span.startMinute &&
          clock.minuteOfDay < span.endMinute
        ) {
          open = true;
        }
      } else {
        // Past midnight: open from the start minute, or until the end minute.
        if (
          clock.minuteOfDay >= span.startMinute ||
          clock.minuteOfDay < span.endMinute
        ) {
          open = true;
        }
      }
    }
  }
  return { open };
}