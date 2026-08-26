import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../../../data/zone/zoneLoader";
import { DEFAULT_RULES } from "../../../domain/engine/rules";
import type { Command } from "../../../domain/model/session";
import { RiskTier } from "../../../domain/model/zone";
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
});
