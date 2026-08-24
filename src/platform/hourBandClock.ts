import { hourBandForLocalTime } from "../domain/engine/rules";
import type { HourBand } from "../domain/model/session";

export const SAAYA_TIME_ZONE = "Asia/Kolkata"; // fact: const.tz

const HOUR_BAND_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SAAYA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function hourBandAtEpochMs(epochMs: number): HourBand {
  const parts = HOUR_BAND_FORMATTER.formatToParts(epochMs);
  const hourPart = parts.find((part) => part.type === "hour")?.value;
  const minutePart = parts.find((part) => part.type === "minute")?.value;
  if (hourPart === undefined || minutePart === undefined) {
    throw new Error("Could not resolve the Asia/Kolkata wall clock");
  }
  return hourBandForLocalTime(Number(hourPart), Number(minutePart));
}
