import type {
  HourBand,
  SosStatus,
  SosTrigger,
  SusOutcome,
} from "../model/session";

export type RecordSource = "APP" | "CONSOLE_DEMO";
export type RecordRiskTier = "high" | "moderate" | "elevated" | "safe";
export type FamilyMessageDelivery = "DISPLAYED_ONLY" | "HANDED_TO_DEVICE";

export interface AnonymiserSusInput {
  readonly appVersion: string;
  readonly armMode: "AUTO_ZONE";
  readonly dateLocal: string;
  readonly hourBand: HourBand;
  readonly hourLocal: number;
  readonly riskTier: RecordRiskTier;
  readonly source: RecordSource;
  readonly zoneId: string;
}

/**
 * The civic record deliberately has no identifier, coordinate, or fine-grained
 * timestamp. Those absences are the trust boundary, not optional redaction.
 */
export interface SusEventPayload {
  readonly appVersion: string;
  readonly armMode: "AUTO_ZONE";
  readonly dateLocal: string;
  readonly hourBand: HourBand;
  readonly hourLocal: number;
  readonly outcome: "PENDING";
  readonly riskTier: RecordRiskTier;
  readonly source: RecordSource;
  readonly zoneId: string;
}

export interface SosLocation {
  readonly accuracyM: number;
  readonly lat: number;
  readonly lon: number;
}

export interface SosNearestStation {
  readonly distanceM: number;
  readonly id: string;
  readonly name: string;
  readonly phone: string;
}

export type SosTimelineType =
  | "ARMED"
  | "CHECKIN_1_SHOWN"
  | "CHECKIN_1_MISSED"
  | "CHECKIN_2_SHOWN"
  | "CHECKIN_2_MISSED"
  | "FAMILY_MESSAGE_SHOWN"
  | "SOS_TRIGGERED"
  | "SOS_STOPPED";

export interface SosTimelineEntry {
  readonly at: string;
  readonly type: SosTimelineType;
}

export interface AnonymiserSosDraftInput {
  readonly appVersion: string;
  readonly familyMessageDelivery: FamilyMessageDelivery;
  readonly favouritesConfigured: number;
  readonly hourLocal: number;
  readonly location: SosLocation;
  readonly nearestStation: SosNearestStation | null;
  readonly riskTier: RecordRiskTier | null;
  readonly source: RecordSource;
  readonly timeline: readonly SosTimelineEntry[];
  readonly trigger: SosTrigger;
  readonly triggeredAtEpochMs: number;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
}

/** Durable before authentication: the exact SOS content, without an identity yet. */
export interface SosIncidentDraft {
  readonly appVersion: string;
  readonly familyMessageDelivery: FamilyMessageDelivery;
  readonly favouritesConfigured: number;
  readonly hourLocal: number;
  readonly location: SosLocation;
  readonly nearestStation: SosNearestStation | null;
  readonly riskTier: RecordRiskTier | null;
  readonly source: RecordSource;
  readonly status: "ACTIVE";
  readonly timeline: readonly SosTimelineEntry[];
  readonly trigger: SosTrigger;
  readonly triggeredAtEpochMs: number;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
}

/** The acute record is the only outbound payload allowed to include identity and location. */
export interface SosIncidentPayload extends SosIncidentDraft {
  readonly uid: string;
}

export interface AnonymiserSosInput extends AnonymiserSosDraftInput {
  readonly uid: string;
}

export interface SusOutcomePatch {
  readonly outcome: Exclude<SusOutcome, "PENDING">;
}

export interface SosStatusPatch {
  readonly status: Extract<SosStatus, "STOPPED">;
  readonly stoppedAtEpochMs: number;
}

const SUS_INPUT_KEYS = new Set([
  "appVersion",
  "armMode",
  "dateLocal",
  "hourBand",
  "hourLocal",
  "riskTier",
  "source",
  "zoneId",
]);

const SOS_DRAFT_INPUT_KEYS = new Set([
  "appVersion",
  "familyMessageDelivery",
  "favouritesConfigured",
  "hourLocal",
  "location",
  "nearestStation",
  "riskTier",
  "source",
  "timeline",
  "trigger",
  "triggeredAtEpochMs",
  "zoneId",
  "zoneName",
]);

const SOS_LOCATION_KEYS = new Set(["accuracyM", "lat", "lon"]);
const SOS_NEAREST_STATION_KEYS = new Set(["distanceM", "id", "name", "phone"]);
const SOS_TIMELINE_KEYS = new Set(["at", "type"]);
const SOS_TIMELINE_TYPES = new Set<SosTimelineType>([
  "ARMED",
  "CHECKIN_1_SHOWN",
  "CHECKIN_1_MISSED",
  "CHECKIN_2_SHOWN",
  "CHECKIN_2_MISSED",
  "FAMILY_MESSAGE_SHOWN",
  "SOS_TRIGGERED",
  "SOS_STOPPED",
]);

export function createSusEventPayload(
  input: AnonymiserSusInput,
): SusEventPayload {
  assertOnlyAllowedKeys(input, SUS_INPUT_KEYS, "SUS");
  if (input.armMode !== "AUTO_ZONE") {
    throw new Error("SUS trust boundary violation: civic records require AUTO_ZONE");
  }
  assertHour(input.hourLocal);
  assertLocalDate(input.dateLocal);

  return {
    appVersion: input.appVersion,
    armMode: input.armMode,
    dateLocal: input.dateLocal,
    hourBand: input.hourBand,
    hourLocal: input.hourLocal,
    outcome: "PENDING",
    riskTier: input.riskTier,
    source: input.source,
    zoneId: input.zoneId,
  };
}

export function createSosIncidentPayload(
  input: AnonymiserSosInput,
): SosIncidentPayload {
  const { uid, ...draftInput } = input;
  return attachAnonymousUid(createSosIncidentDraft(draftInput), uid);
}

export function createSosIncidentDraft(
  input: AnonymiserSosDraftInput,
): SosIncidentDraft {
  assertOnlyAllowedKeys(input, SOS_DRAFT_INPUT_KEYS, "SOS");
  assertFamilyMessageDelivery(input.familyMessageDelivery);
  assertFavouritesConfigured(input.favouritesConfigured);
  assertHour(input.hourLocal);

  return {
    appVersion: input.appVersion,
    familyMessageDelivery: input.familyMessageDelivery,
    favouritesConfigured: input.favouritesConfigured,
    hourLocal: input.hourLocal,
    location: cloneLocation(input.location),
    nearestStation: cloneNearestStation(input.nearestStation),
    riskTier: input.riskTier,
    source: input.source,
    status: "ACTIVE",
    timeline: cloneTimeline(input.timeline),
    trigger: input.trigger,
    triggeredAtEpochMs: input.triggeredAtEpochMs,
    zoneId: input.zoneId,
    zoneName: input.zoneName,
  };
}

export function attachAnonymousUid(
  draft: SosIncidentDraft,
  uid: string,
): SosIncidentPayload {
  if (uid.length === 0) throw new Error("SOS requires an anonymous uid");
  return { ...draft, uid };
}

export function createSusOutcomePatch(
  outcome: Exclude<SusOutcome, "PENDING">,
): SusOutcomePatch {
  return { outcome };
}

export function createSosStatusPatch(
  stoppedAtEpochMs: number,
): SosStatusPatch {
  return { status: "STOPPED", stoppedAtEpochMs };
}

function assertOnlyAllowedKeys(
  input: object,
  allowedKeys: ReadonlySet<string>,
  recordKind: string,
): void {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${recordKind} trust boundary violation: ${key}`);
    }
  }
}

function cloneLocation(location: SosLocation): SosLocation {
  assertOnlyAllowedKeys(location, SOS_LOCATION_KEYS, "SOS location");
  assertFiniteNumber(location.accuracyM, "SOS location accuracyM");
  assertFiniteNumber(location.lat, "SOS location lat");
  assertFiniteNumber(location.lon, "SOS location lon");
  return {
    accuracyM: location.accuracyM,
    lat: location.lat,
    lon: location.lon,
  };
}

function cloneNearestStation(
  station: SosNearestStation | null,
): SosNearestStation | null {
  if (station === null) return null;
  assertOnlyAllowedKeys(station, SOS_NEAREST_STATION_KEYS, "SOS nearestStation");
  assertFiniteNumber(station.distanceM, "SOS nearestStation distanceM");
  return {
    distanceM: station.distanceM,
    id: station.id,
    name: station.name,
    phone: station.phone,
  };
}

function cloneTimeline(
  timeline: readonly SosTimelineEntry[],
): readonly SosTimelineEntry[] {
  return timeline.map((entry) => {
    assertOnlyAllowedKeys(entry, SOS_TIMELINE_KEYS, "SOS timeline");
    if (!SOS_TIMELINE_TYPES.has(entry.type)) {
      throw new Error(`SOS timeline type is not allowed: ${entry.type}`);
    }
    if (entry.at.length === 0) {
      throw new Error("SOS timeline time must not be empty");
    }
    return { at: entry.at, type: entry.type };
  });
}

function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite`);
  }
}

function assertHour(hour: number): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) { // GROUNDED-EXEMPT: inclusive 24-hour clock domain is structural validation.
    throw new Error("hourLocal must be an integer in the 24-hour clock domain"); // GROUNDED-EXEMPT: validation text describes a structural clock domain.
  }
}

function assertFavouritesConfigured(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("favouritesConfigured must be a non-negative integer");
  }
}

function assertFamilyMessageDelivery(value: FamilyMessageDelivery): void {
  if (value !== "DISPLAYED_ONLY" && value !== "HANDED_TO_DEVICE") {
    throw new Error("familyMessageDelivery is not allowed");
  }
}

function assertLocalDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { // GROUNDED-EXEMPT: date-format grammar has structural regex quantifiers.
    throw new Error("dateLocal must use yyyy-MM-dd"); // GROUNDED-EXEMPT: validation text names a date-format grammar.
  }
}
