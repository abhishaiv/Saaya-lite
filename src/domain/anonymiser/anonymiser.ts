import type { HourBand } from "../model/session";

export type RiskTierString = "high" | "moderate" | "elevated" | "safe";
export type SusOutcome =
  | "PENDING"
  | "CANCELLED_BY_USER"
  | "ESCALATED_TO_SOS"
  | "RESOLVED_LATE";
export type SusArmMode = "AUTO_ZONE" | "MANUAL";
export type SusSource = "APP" | "CONSOLE_DEMO";
export type SosTrigger = "LADDER_LAPSE" | "MANUAL_HELP_BUTTON";
export type SosStatus = "ACTIVE" | "STOPPED";

export interface AnonymiserSusInput {
  readonly zoneId: string;
  readonly riskTier: RiskTierString;
  readonly hourBand: HourBand;
  readonly hourLocal: number;
  readonly dateLocal: string;
  readonly armMode: SusArmMode;
  readonly source?: SusSource;
  readonly createdAt?: unknown;
}

export interface SusEventPayload {
  readonly zoneId: string;
  readonly riskTier: RiskTierString;
  readonly hourBand: HourBand;
  readonly hourLocal: number;
  readonly dateLocal: string;
  readonly createdAt: unknown;
  readonly outcome: SusOutcome;
  readonly armMode: SusArmMode;
  readonly source: SusSource;
  readonly appVersion: string;
}

export interface SosLocation {
  readonly lat: number;
  readonly lon: number;
  readonly accuracyM: number;
}

export interface SosNearestStation {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly distanceM: number;
}

export interface SosTimelineEntry {
  readonly at: string;
  readonly type: string;
  readonly detail?: string;
}

export interface AnonymiserSosInput {
  readonly uid: string;
  readonly trigger: SosTrigger;
  readonly location: SosLocation;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
  readonly riskTier: string | null;
  readonly hourLocal: number;
  readonly nearestStation: SosNearestStation | null;
  readonly timeline: readonly SosTimelineEntry[];
  readonly contactsNotified: number;
  readonly source?: SusSource;
  readonly triggeredAt?: unknown;
}

export interface SosIncidentPayload {
  readonly uid: string;
  readonly triggeredAt: unknown;
  readonly trigger: SosTrigger;
  readonly location: SosLocation;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
  readonly riskTier: string | null;
  readonly hourLocal: number;
  readonly nearestStation: SosNearestStation | null;
  readonly timeline: readonly SosTimelineEntry[];
  readonly contactsNotified: number;
  readonly status: SosStatus;
  readonly stoppedAt: unknown | null;
  readonly source: SusSource;
  readonly appVersion: string;
}

export const SAAYA_APP_VERSION = "1.0.0";

const FORBIDDEN_SUS_KEYS = [
  "latitude",
  "longitude",
  "lat",
  "lon",
  "sessionId",
  "uid",
  "deviceId",
  "name",
  "phone",
  "contact",
  "contacts",
] as const;

/**
 * Creates the pure anonymised civic signal (SUS event).
 * Written when family escalation fires, never at arming or check-in.
 * 
 * Invariant: ABSOLUTELY NO coordinate, sessionId, uid, deviceId, contact or name.
 */
export function createSusEventPayload(
  input: AnonymiserSusInput,
  serverTimestampSentinel: unknown = "SERVER_TIMESTAMP",
): SusEventPayload {
  // Validate hourLocal is an integer hour (0-23)
  const hour = Math.floor(input.hourLocal);
  if (hour < 0 || hour > 23) { // GROUNDED-EXEMPT: 24-hour clock domain bounds (0..23).
    throw new Error(`Invalid hourLocal: ${input.hourLocal}. Must be integer 0..23.`);
  }

  // Validate dateLocal format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(input.dateLocal)) {
    throw new Error(`Invalid dateLocal: ${input.dateLocal}. Must match YYYY-MM-DD.`);
  }

  const payload: SusEventPayload = {
    zoneId: input.zoneId,
    riskTier: input.riskTier,
    hourBand: input.hourBand,
    hourLocal: hour,
    dateLocal: input.dateLocal,
    createdAt: input.createdAt ?? serverTimestampSentinel,
    outcome: "PENDING",
    armMode: input.armMode,
    source: input.source ?? "APP",
    appVersion: SAAYA_APP_VERSION,
  };

  // Explicit safety check against forbidden fields
  const rawInput = input as unknown as Record<string, unknown>;
  for (const forbidden of FORBIDDEN_SUS_KEYS) {
    if (forbidden in rawInput) {
      throw new Error(`Trust boundary violation: input contains forbidden key '${forbidden}'.`);
    }
  }

  return payload;
}

/**
 * Creates the acute SOS incident payload.
 * Written ONLY when SOS triggers.
 * 
 * Invariant: contactsNotified is an integer count, never names or phone numbers.
 */
export function createSosIncidentPayload(
  input: AnonymiserSosInput,
  serverTimestampSentinel: unknown = "SERVER_TIMESTAMP",
): SosIncidentPayload {
  const hour = Math.floor(input.hourLocal);
  const contactsCount = Math.max(0, Math.floor(input.contactsNotified));

  const payload: SosIncidentPayload = {
    uid: input.uid,
    triggeredAt: input.triggeredAt ?? serverTimestampSentinel,
    trigger: input.trigger,
    location: {
      lat: input.location.lat,
      lon: input.location.lon,
      accuracyM: input.location.accuracyM,
    },
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    riskTier: input.riskTier,
    hourLocal: hour,
    nearestStation: input.nearestStation
      ? {
          id: input.nearestStation.id,
          name: input.nearestStation.name,
          phone: input.nearestStation.phone,
          distanceM: input.nearestStation.distanceM,
        }
      : null,
    timeline: input.timeline.map((entry) => ({
      at: entry.at,
      type: entry.type,
      ...(entry.detail !== undefined ? { detail: entry.detail } : {}),
    })),
    contactsNotified: contactsCount,
    status: "ACTIVE",
    stoppedAt: null,
    source: input.source ?? "APP",
    appVersion: SAAYA_APP_VERSION,
  };

  return payload;
}

export function createStoppedSosPatch(
  stoppedAtSentinel: unknown = "SERVER_TIMESTAMP",
): { status: "STOPPED"; stoppedAt: unknown } {
  return {
    status: "STOPPED",
    stoppedAt: stoppedAtSentinel,
  };
}

export function createSusOutcomePatch(
  outcome: SusOutcome,
): { outcome: SusOutcome } {
  return { outcome };
}
