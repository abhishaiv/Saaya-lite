import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../../../data/zone/zoneLoader";
import {
  DEFAULT_RULES,
  DEMO_ARM_TIME,
  DEMO_RULES,
  DEMO_WINDOW_SEC,
  LADDER_CADENCE_SEC,
  LADDER_WINDOW_1_SEC,
  LADDER_WINDOW_2_SEC,
  LADDER_WINDOW_3_SEC,
} from "../../../domain/engine/rules";
import type { Command } from "../../../domain/model/session";
import { RiskTier } from "../../../domain/model/zone";
import { startDemoEventSequence } from "./demoControls";
import { HomeEngineBridge, type HomeEngineView } from "./homeEngineBridge";

function highZone() {
  const zone = bundledZoneData.zones.find(
    (candidate) => candidate.riskTier === RiskTier.HIGH,
  );
  if (zone === undefined) throw new Error("Frozen HIGH zone is missing");
  return zone;
}

function harness() {
  const commandBatches: Command[][] = [];
  const views: HomeEngineView[] = [];
  const bridge = new HomeEngineBridge(
    DEFAULT_RULES,
    () => "NIGHT_DEEP",
    {
      onCommands(commands) {
        commandBatches.push([...commands]);
      },
      onView(view) {
        views.push(view);
      },
    },
    () => "local-session",
  );
  return { bridge, commandBatches, views };
}

describe("M4 Home engine bridge", () => {
  it("projects a manual arm as SHADOW without an armed hour band", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: 0, zone: null },
    );

    expect(bridge.view()).toMatchObject({
      activeZoneId: null,
      armMode: "MANUAL",
      armedHourBand: null,
      state: "SHADOW",
    });
    expect(bridge.persistedSession()).toMatchObject({
      sessionId: "local-session",
      armMode: "MANUAL",
      armedHourBand: null,
      state: "SHADOW",
    });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: LADDER_CADENCE_SEC,
    });
    expect(commandBatches.at(-1)).not.toContainEqual(
      expect.objectContaining({ kind: "ShowArmBanner" }),
    );
  });

  it("persists a direct SOS raised from idle so PIN recovery remains possible", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch(
      { kind: "HelpNowTapped" },
      { nowEpochMs: 0, zone: null },
    );

    expect(bridge.view()).toMatchObject({
      armMode: "MANUAL",
      armedHourBand: null,
      state: "SOS_ACTIVE",
    });
    expect(bridge.persistedSession()).toMatchObject({
      sessionId: "local-session",
      state: "SOS_ACTIVE",
      susEventWritten: false,
    });
    expect(commandBatches.at(-1)).toContainEqual({ kind: "StartLocationWatch" });
  });

  it("projects an automatic arm with the frozen band and exact banner intent", () => {
    const { bridge, commandBatches } = harness();
    const zone = highZone();

    bridge.dispatch(
      { kind: "ZoneEntered", zoneId: zone.stationId },
      { nowEpochMs: 0, zone },
    );

    expect(bridge.view()).toMatchObject({
      activeZoneId: zone.stationId,
      armMode: "AUTO_ZONE",
      armedHourBand: "NIGHT_DEEP",
      state: "SHADOW",
    });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ShowArmBanner",
      zoneId: zone.stationId,
      band: "NIGHT_DEEP",
    });
  });

  it("keeps the local zone cooldown when a resolved session returns Home to IDLE", () => {
    const { bridge } = harness();
    const zone = highZone();

    bridge.dispatch(
      { kind: "ZoneEntered", zoneId: zone.stationId },
      { nowEpochMs: 0, zone },
    );
    bridge.dispatch(
      { kind: "ManualDisarm" },
      { nowEpochMs: 0, zone },
    );
    bridge.dispatch(
      { kind: "ZoneEntered", zoneId: zone.stationId },
      { nowEpochMs: 0, zone },
    );

    expect(bridge.snapshot()).toEqual({ activeZoneId: null, state: "IDLE" });
  });

  it("walks the three-check-in ladder through the CD1/CD2/CD3 timers", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("CHECKIN_1");
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD1",
      delaySec: LADDER_WINDOW_1_SEC,
    });

    bridge.dispatch(
      { kind: "CountdownExpired", timer: "CD1" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("CHECKIN_2");
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "RequestFamilyAlert",
    });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD2",
      delaySec: LADDER_WINDOW_2_SEC,
    });

    bridge.dispatch(
      { kind: "CountdownExpired", timer: "CD2" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("CHECKIN_3");
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD3",
      delaySec: LADDER_WINDOW_3_SEC,
    });

    bridge.dispatch(
      { kind: "CountdownExpired", timer: "CD3" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("SOS_ACTIVE");
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });

    // The 2026-09-06 ladder has no CANCEL timer and no CancelTapped event:
    // every scheduled timer is one of the four ladder timers.
    for (const command of commandBatches.flat()) {
      if (command.kind !== "ScheduleTimer") continue;
      expect(["CHECKIN", "CD1", "CD2", "CD3"]).toContain(command.id);
    }
  });

  it("lets I'm OK cancel a still-pending family alert and reset the ladder", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    bridge.dispatch(
      { kind: "CountdownExpired", timer: "CD1" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("CHECKIN_2");

    bridge.dispatch({ kind: "OkTapped" }, { nowEpochMs: 0, zone: null });

    expect(bridge.snapshot().state).toBe("SHADOW");
    expect(commandBatches.at(-1)).toContainEqual({ kind: "CancelTimer", id: "CD2" });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "CancelFamilyAlert",
    });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: DEFAULT_RULES.ladder.okResetSec,
    });
  });

  it("refuses the demo reset during SOS so the PIN stays the only exit", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch(
      { kind: "HelpNowTapped" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("SOS_ACTIVE");
    const batchesBeforeRefusal = commandBatches.length;

    expect(bridge.resetForDemo()).toBe(false);
    expect(bridge.snapshot().state).toBe("SOS_ACTIVE");
    expect(commandBatches).toHaveLength(batchesBeforeRefusal);
  });

  it("resets an active ladder by cancelling every ladder timer and the family alert", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    expect(bridge.snapshot().state).toBe("CHECKIN_1");

    expect(bridge.resetForDemo()).toBe(true);
    expect(bridge.snapshot()).toEqual({ activeZoneId: null, state: "IDLE" });
    expect(bridge.persistedSession()).toBeNull();

    const cleanup = commandBatches.at(-1) ?? [];
    for (const id of ["CHECKIN", "CD1", "CD2", "CD3"] as const) {
      expect(cleanup).toContainEqual({ kind: "CancelTimer", id });
    }
    expect(cleanup).toContainEqual({ kind: "CancelFamilyAlert" });
    expect(cleanup).toContainEqual({ kind: "HideCheckIn" });
    expect(cleanup).toContainEqual({ kind: "StopLocationWatch" });
    expect(cleanup).toContainEqual({ kind: "ReleaseWakeLock" });
    expect(
      cleanup.some((command) =>
        ["WriteSusEvent", "WriteSosIncident"].includes(command.kind),
      ),
    ).toBe(false);
  });

  it("uses the ten-second demo windows only when the demo rules are set", () => {
    const defaultRules = harness();
    defaultRules.bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: 0, zone: null },
    );
    defaultRules.bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    expect(defaultRules.commandBatches.at(-1)).toContainEqual({
      kind: "ShowCheckIn",
      step: 1,
      countdownSec: LADDER_WINDOW_1_SEC,
      urgency: "GENTLE",
    });

    const demoRules = harness();
    demoRules.bridge.setRules(DEMO_RULES);
    demoRules.bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: 0, zone: null },
    );
    demoRules.bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    expect(demoRules.commandBatches.at(-1)).toContainEqual({
      kind: "ShowCheckIn",
      step: 1,
      countdownSec: DEMO_WINDOW_SEC,
      urgency: "GENTLE",
    });
    expect(demoRules.commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD1",
      delaySec: DEMO_WINDOW_SEC,
    });
  });

  it("applies a mid-session demo toggle only to the next timer", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: LADDER_CADENCE_SEC,
    });
    const batchesBeforeToggle = commandBatches.length;

    bridge.setRules(DEMO_RULES);
    expect(commandBatches).toHaveLength(batchesBeforeToggle);

    bridge.dispatch(
      { kind: "CheckInTimerFired" },
      { nowEpochMs: 0, zone: null },
    );
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD1",
      delaySec: DEMO_WINDOW_SEC,
    });
  });

  it("persists the demo hour's derived band for every downstream record", () => {
    const { bridge } = harness();
    const zone = highZone();
    bridge.setRules(DEMO_RULES);

    bridge.dispatch(
      { kind: "ZoneEntered", zoneId: zone.stationId },
      {
        hourBand: DEMO_ARM_TIME.hourBand,
        nowEpochMs: Date.now(),
        zone,
      },
    );

    expect(bridge.persistedSession()).toMatchObject({
      armedHourBand: DEMO_ARM_TIME.hourBand,
    });
  });

  it("opens check-in 1 at Start by replaying the Start Demo sequence", () => {
    const { bridge } = harness();
    const zone = highZone();
    bridge.setRules(DEMO_RULES);

    const [entry, checkInTimer] = startDemoEventSequence(zone.stationId);
    bridge.dispatch(entry, {
      hourBand: DEMO_ARM_TIME.hourBand,
      nowEpochMs: 0,
      zone,
    });
    expect(bridge.snapshot().state).toBe("SHADOW");

    bridge.dispatch(checkInTimer, { nowEpochMs: 0, zone });
    expect(bridge.snapshot().state).toBe("CHECKIN_1");
    expect(bridge.persistedSession()).toMatchObject({
      armMode: "AUTO_ZONE",
      armedHourBand: DEMO_ARM_TIME.hourBand,
      zoneId: zone.stationId,
    });
  });
});