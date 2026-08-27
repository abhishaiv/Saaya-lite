import type { SessionEvent, SessionState } from "../../../domain/model/session";
import { RiskTier, type Zone } from "../../../domain/model/zone";

export function simulatedZoneEntryEvent(zone: Zone): SessionEvent | null {
  if (zone.riskTier === RiskTier.SAFE) return null;
  return { kind: "ZoneEntered", zoneId: zone.stationId };
}

export function nextMissedCheckInEvent(
  state: SessionState,
): SessionEvent | null {
  if (state === "SHADOW") return { kind: "CheckInTimerFired" };
  if (state === "CHECKIN_1") {
    return { kind: "CountdownExpired", timer: "CD1" };
  }
  if (state === "CHECKIN_2") {
    return { kind: "CountdownExpired", timer: "CD2" };
  }
  return null;
}

export function eventsToFamilyEscalation(
  state: SessionState,
): readonly SessionEvent[] {
  switch (state) {
    case "IDLE":
    case "RESOLVED":
      return [
        { kind: "ManualArm" },
        { kind: "CheckInTimerFired" },
        { kind: "CountdownExpired", timer: "CD1" },
        { kind: "CountdownExpired", timer: "CD2" },
      ];
    case "SHADOW":
      return [
        { kind: "CheckInTimerFired" },
        { kind: "CountdownExpired", timer: "CD1" },
        { kind: "CountdownExpired", timer: "CD2" },
      ];
    case "CHECKIN_1":
      return [
        { kind: "CountdownExpired", timer: "CD1" },
        { kind: "CountdownExpired", timer: "CD2" },
      ];
    case "CHECKIN_2":
      return [{ kind: "CountdownExpired", timer: "CD2" }];
    case "FAMILY_ESCALATED":
    case "SOS_ACTIVE":
      return [];
  }
}

export function eventsToSos(state: SessionState): readonly SessionEvent[] {
  if (state === "SOS_ACTIVE") return [];
  if (state === "IDLE" || state === "RESOLVED") {
    return [{ kind: "ManualArm" }, { kind: "HelpNowTapped" }];
  }
  return [{ kind: "HelpNowTapped" }];
}
