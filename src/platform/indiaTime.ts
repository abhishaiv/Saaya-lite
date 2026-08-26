import { SAAYA_TIME_ZONE } from "./hourBandClock";
import type { SaayaLocale } from "../ui/copy/strings";

const FORMAT_LOCALES: Readonly<Record<SaayaLocale, string>> = {
  en: "en-IN",
  te: "te-IN",
};

export function formatIndiaHour(
  epochMs: number,
  locale: SaayaLocale,
): string {
  return new Intl.DateTimeFormat(FORMAT_LOCALES[locale], {
    hour: "numeric",
    hour12: true,
    timeZone: SAAYA_TIME_ZONE,
  }).format(epochMs);
}
