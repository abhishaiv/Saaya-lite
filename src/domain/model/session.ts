import type { Zone } from "./zone";

export type SessionState =
  | "IDLE"
  | "SHADOW"
  | "CHECKIN_1"
  | "CHECKIN_2"
  | "CHECKIN_3"
  // Legacy persisted state only (pre-the founder-approved demo-day policy two-rung ladder). No transition
  // enters it; recovery maps a saved FAMILY_ESCALATED session to CHECKIN_3.
  | "FAMILY_ESCALATED"
  | "SOS_ACTIVE"
  | "RESOLVED";

export type Outcome =
  | "RESOLVED_OK"
  | "CANCELLED"
  | "ESCALATED_SOS"
  | "DISARMED";
export type ArmMode = "AUTO_ZONE" | "MANUAL";
export type Urgency = "GENTLE" | "URGENT" | "CRITICAL";
export type TimerId = "CHECKIN" | "CD1" | "CD2" | "CD3";
export type HourBand =
  | "NIGHT_DEEP"
  | "DAWN"
  | "DAY"
  | "NIGHT_EARLY"
  | "NIGHT_LATE";
export type RiskTier = "HIGH" | "ELEVATED" | "MODERATE" | "SAFE";
export type SosTrigger = "LADDER_LAPSE" | "MANUAL_HELP_BUTTON";
export type SosStatus = "ACTIVE" | "STOPPED";
export type SusOutcome =
  | "PENDING"
  | "CANCELLED_BY_USER"
  | "ESCALATED_TO_SOS"
  | "RESOLVED_LATE";

export type SessionEvent =
  | { kind: "ZoneEntered"; zoneId: string }
  | { kind: "ZoneExited"; zoneId: string }
  | { kind: "ManualArm" }
  | { kind: "ManualDisarm" }
  | { kind: "CheckInTimerFired" }
  | { kind: "CountdownExpired"; timer: TimerId }
  | { kind: "OkTapped" }
  | { kind: "HelpNowTapped" }
  | { kind: "PinAccepted" }
  | { kind: "PermissionRevoked"; permission: string }
  | { kind: "AppKilledRestart"; persisted: PersistedSession };

// Commands carry intent only. Payload construction stays outside the domain
// so neither favourites nor precise coordinates enter the engine context.
export type Command =
  | {
      kind: "ShowCheckIn";
      step: 1 | 2 | 3;
      countdownSec: number;
      urgency: Urgency;
    }
  | { kind: "HideCheckIn" }
  | { kind: "ShowArmBanner"; zoneId: string; band: HourBand }
  | { kind: "ShowSos" }
  // First-miss family-alert intents (founder the founder-approved demo-day policy). Intent only: no
  // recipient, message text or contact rides in the command. RequestFamilyAlert
  // asks the runtime to attempt the configured first-miss messaging;
  // CancelFamilyAlert cancels any still-pending request when I'm OK resolves
  // the episode. A provider-accepted message cannot be recalled.
  | { kind: "RequestFamilyAlert" }
  | { kind: "CancelFamilyAlert" }
  | { kind: "WriteSusEvent" }
  | { kind: "PatchSusOutcome"; outcome: Exclude<SusOutcome, "PENDING"> }
  | { kind: "WriteSosIncident"; trigger: SosTrigger }
  | { kind: "PatchSosStatus"; status: SosStatus }
  | { kind: "ScheduleTimer"; id: TimerId; delaySec: number }
  | { kind: "CancelTimer"; id: TimerId }
  | { kind: "StartLocationWatch" }
  | { kind: "StopLocationWatch" }
  | { kind: "SetLocationSampling"; intervalSec: number }
  | { kind: "RequestWakeLock" }
  | { kind: "ReleaseWakeLock" }
  | { kind: "LogSessionEvent"; type: string; detail?: string }
  | { kind: "StartCooldown"; zoneId: string; minutes: number }
  | { kind: "PlayUrgentAlert" }
  | { kind: "RequirePinToStop" }
  | { kind: "ShowPermissionWarning"; permission: string };

export interface PersistedSession {
  sessionId: string;
  state: SessionState;
  armMode: ArmMode;
  zoneId: string | null;
  armedAtEpochMs: number;
  armedHourBand: HourBand | null;
  deadlineEpochMs: number | null;
  susEventWritten: boolean;
  outcome?: Outcome;
}

// The explicit timing profile (founder decision the founder-approved demo-day policy). cadenceSec runs
// from arming to check-in 1; okResetSec runs from I'm OK to the next check-in 1.
export interface LadderTiming {
  interCheckInGapSec?: number;
  cadenceSec: number;
  window1Sec: number;
  window2Sec: number;
  window3Sec: number;
  okResetSec: number;
}

export interface Rules {
  ladder: LadderTiming;
  enterDwellSec: number;
  exitDwellSec: number;
  manualDisarmCooldownMin: number;
  okCooldownMin: number;
  demoDivisor: number; // retained for dwell scaling only; both profiles use 1 since the founder-approved demo-day policy
  armingMatrix: Record<string, boolean>;
  samplingShadowSec: number;
  samplingSosSec: number;
}

export interface EngineContext {
  nowEpochMs: number;
  zone: Zone | null;
  hourBand: HourBand;
  armedHourBand: HourBand | null;
  rules: Rules;
  armMode: ArmMode;
  armedAtEpochMs: number | null;
  deadlineEpochMs: number | null;
  cooldowns: Record<string, number>;
  hasFavourite: boolean;
  susEventWritten: boolean;
}

export interface EngineResult {
  state: SessionState;
  commands: Command[];
  outcome?: Outcome;
}
