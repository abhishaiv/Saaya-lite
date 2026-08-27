import { SAAYA_TIME_ZONE } from "./hourBandClock";
import { DEMO_ARM_TIME } from "../domain/engine/rules";
import type { SaayaLocale } from "../ui/copy/strings";

const FORMAT_LOCALES: Readonly<Record<SaayaLocale, string>> = {
  en: "en-IN",
  te: "te-IN",
};

const MILLISECONDS_PER_HOUR = 3_600_000; // GROUNDED-EXEMPT: structural SI conversion for formatting a wall-clock hour.

export function formatIndiaUiTime(
  epochMs: number,
  locale: SaayaLocale,
): string {
  return new Intl.DateTimeFormat(FORMAT_LOCALES[locale], {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: SAAYA_TIME_ZONE,
  }).format(epochMs);
}

/** The frozen English format used inside the composed family message. */
export function formatIndiaFamilyTime(epochMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    hourCycle: "h12",
    minute: "2-digit",
    timeZone: SAAYA_TIME_ZONE,
  })
    .format(epochMs)
    .toUpperCase();
}

/** The family message is readable prose, so its day is a full English weekday. */
export function formatIndiaFamilyDay(epochMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SAAYA_TIME_ZONE,
    weekday: "long",
  }).format(epochMs);
}

/** Formats an already-IST wall-clock hour without changing the real session clock. */
export function formatIndiaUiTimeOfDay(
  hourOfDay: number,
  locale: SaayaLocale,
): string {
  return new Intl.DateTimeFormat(FORMAT_LOCALES[locale], {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(hourOfDay * MILLISECONDS_PER_HOUR);
}

/** One formatting path for both the arm banner and later check-in reason. */
export function formatSessionArmTime(
  armedAtEpochMs: number,
  locale: SaayaLocale,
  demoArmedSession: boolean,
): string {
  return demoArmedSession
    ? formatIndiaUiTimeOfDay(DEMO_ARM_TIME.hourOfDay, locale)
    : formatIndiaUiTime(armedAtEpochMs, locale);
}
