import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../../../data/zone/zoneLoader";
import {
  CHECK_IN_1_SEC,
  DEFAULT_RULES,
  DEMO_ARM_TIME,
  DEMO_DIVISOR,
  DEMO_RULES,
  MANUAL_INTERVAL_MIN,
  MINUTES_PER_HOUR,
} from "../../../domain/engine/rules";
import type { Command } from "../../../domain/model/session";
import { RiskTier } from "../../../domain/model/zone";
import { eventsToFamilyEscalation, eventsToSos } from "./demoControls";
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
    expect(commandBatches.at(-1)).not.toContainEqual(
      expect.objectContaining({ kind: "ShowArmBanner" }),
    );
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

  it("uses demo timing only when explicitly enabled, then resets locally", () => {
    const { bridge, commandBatches } = harness();
    bridge.setRules(DEMO_RULES);
    bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: 0, zone: null },
    );

    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec:
        (MANUAL_INTERVAL_MIN * MINUTES_PER_HOUR) / DEMO_DIVISOR,
    });

    bridge.resetForDemo();
    expect(bridge.snapshot()).toEqual({ activeZoneId: null, state: "IDLE" });
    expect(bridge.persistedSession()).toBeNull();
    const cleanup = commandBatches.at(-1) ?? [];
    expect(cleanup).toContainEqual({ kind: "StopLocationWatch" });
    expect(cleanup).toContainEqual({ kind: "ReleaseWakeLock" });
    expect(
      cleanup.some((command) =>
        ["WriteSusEvent", "WriteSosIncident", "NotifyFamily"].includes(
          command.kind,
        ),
      ),
    ).toBe(false);
  });

  it("applies a mid-session demo toggle only to the next timer", () => {
    const { bridge, commandBatches } = harness();

    bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: 0, zone: null },
    );
    expect(commandBatches.at(-1)).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: MANUAL_INTERVAL_MIN * MINUTES_PER_HOUR,
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
      delaySec: CHECK_IN_1_SEC / DEMO_DIVISOR,
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

  it("lets demo controls reach family and SOS through canonical transitions", () => {
    const { bridge } = harness();

    for (const event of eventsToFamilyEscalation("IDLE")) {
      bridge.dispatch(event, { nowEpochMs: 0, zone: null });
    }
    expect(bridge.snapshot().state).toBe("FAMILY_ESCALATED");

    bridge.resetForDemo();
    for (const event of eventsToSos("IDLE")) {
      bridge.dispatch(event, { nowEpochMs: 0, zone: null });
    }
    expect(bridge.snapshot().state).toBe("SOS_ACTIVE");
  });
});
