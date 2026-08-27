import { describe, expect, it } from "vitest";

import {
  DEMO_ARM_HOUR,
  DEMO_ARM_TIME,
  hourBandForLocalTime,
} from "../../../domain/engine/rules";
import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import { RiskTier } from "../../../domain/model/zone";
import {
  eventsToFamilyEscalation,
  eventsToSos,
  nextMissedCheckInEvent,
  simulatedZoneEntryEvent,
} from "./demoControls";

describe("M4 demo engine controls", () => {
  it("derives the simulated zone-entry band from the single frozen demo hour", () => {
    expect(DEMO_ARM_HOUR).toBe(4); // fact: demo.arm.hour
    expect(DEMO_ARM_TIME.hourBand).toBe(
      hourBandForLocalTime(DEMO_ARM_HOUR, 0),
    );
    expect(DEMO_ARM_TIME.hourBand).toBe("NIGHT_DEEP");
    expect(DEMO_ARM_TIME.hourOfDay).toBe(DEMO_ARM_HOUR);
  });

  it("advances one missed check-in through the real timer events", () => {
    expect(nextMissedCheckInEvent("SHADOW")).toEqual({
      kind: "CheckInTimerFired",
    });
    expect(nextMissedCheckInEvent("CHECKIN_1")).toEqual({
      kind: "CountdownExpired",
      timer: "CD1",
    });
    expect(nextMissedCheckInEvent("CHECKIN_2")).toEqual({
      kind: "CountdownExpired",
      timer: "CD2",
    });
    expect(nextMissedCheckInEvent("IDLE")).toBeNull();
  });

  it("never turns a SAFE picker selection into an arming event", () => {
    const zones = bundledZoneRepository
      .snapshot()
      .zoneDetails.map(({ zone }) => zone);
    const safeZone = zones.find(({ riskTier }) => riskTier === RiskTier.SAFE);
    const armedZone = zones.find(({ riskTier }) => riskTier !== RiskTier.SAFE);

    expect(safeZone).toBeDefined();
    expect(armedZone).toBeDefined();
    if (safeZone === undefined || armedZone === undefined) return;

    expect(simulatedZoneEntryEvent(safeZone)).toBeNull();
    expect(simulatedZoneEntryEvent(armedZone)).toEqual({
      kind: "ZoneEntered",
      zoneId: armedZone.stationId,
    });
  });

  it("reaches family and SOS by dispatching only canonical engine events", () => {
    expect(eventsToFamilyEscalation("CHECKIN_1")).toEqual([
      { kind: "CountdownExpired", timer: "CD1" },
      { kind: "CountdownExpired", timer: "CD2" },
    ]);
    expect(eventsToSos("IDLE")).toEqual([
      { kind: "ManualArm" },
      { kind: "HelpNowTapped" },
    ]);
    expect(eventsToSos("SOS_ACTIVE")).toEqual([]);
  });
});
