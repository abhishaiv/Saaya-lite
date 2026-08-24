import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../data/zone/zoneLoader";
import { onEvent } from "../domain/engine/sessionEngine";
import {
  DEFAULT_RULES,
  ENTER_DWELL_SEC,
  MAX_CONTAINMENT_ACCURACY_M,
  MIN_ENTRY_FIXES,
  PENDING_DWELL_SAMPLING_SEC,
} from "../domain/engine/rules";
import type {
  Command,
  EngineContext,
  HourBand,
  SessionEvent,
  SessionState,
} from "../domain/model/session";
import { RiskTier, type Zone } from "../domain/model/zone";
import { secondsToEpochMs } from "./clock";
import {
  LocationArmingRuntime,
  type RuntimeSessionBridge,
  type RuntimeSessionSnapshot,
} from "./armingRuntime";
import type { LiveLocationFix, LocationSampling } from "./locationWatch";

class EngineBridge implements RuntimeSessionBridge {
  state: SessionState = "IDLE";
  activeZoneId: string | null = null;
  hourBand: HourBand = "NIGHT_DEEP";
  cooldowns: Record<string, number> = {};
  readonly events: SessionEvent[] = [];
  readonly commands: Command[] = [];

  snapshot(): RuntimeSessionSnapshot {
    return { state: this.state, activeZoneId: this.activeZoneId };
  }

  dispatch(
    event: SessionEvent,
    input: { readonly nowEpochMs: number; readonly zone: Zone | null },
  ): RuntimeSessionSnapshot {
    const context: EngineContext = {
      nowEpochMs: input.nowEpochMs,
      zone: input.zone,
      hourBand: this.hourBand,
      armedHourBand: this.state === "IDLE" ? null : "NIGHT_DEEP",
      rules: DEFAULT_RULES,
      armMode: "AUTO_ZONE",
      armedAtEpochMs: this.state === "IDLE" ? null : 0,
      deadlineEpochMs: null,
      cooldowns: this.cooldowns,
      hasFavourite: true,
      susEventWritten: false,
    };
    const result = onEvent(this.state, event, context);
    this.events.push(event);
    this.commands.push(...result.commands);
    this.state = result.state;
    if (event.kind === "ZoneEntered" && result.state === "SHADOW") {
      this.activeZoneId = event.zoneId;
    }
    if (result.state === "RESOLVED") this.activeZoneId = null;
    return this.snapshot();
  }
}

function highZone(): Zone {
  const zone = bundledZoneData.zones.find(
    (candidate) => candidate.riskTier === RiskTier.HIGH,
  );
  if (zone === undefined) throw new Error("Frozen HIGH zone is missing");
  return zone;
}

function proofFix(zone: Zone, index: number): LiveLocationFix {
  const proofSegments = MIN_ENTRY_FIXES - 1;
  const spanSec = (ENTER_DWELL_SEC * index) / proofSegments;
  return {
    source: "LIVE_WATCH",
    ...zone.centroid,
    accuracyM: MAX_CONTAINMENT_ACCURACY_M,
    observedAtEpochMs: secondsToEpochMs(spanSec),
  };
}

describe("page-open automatic arming", () => {
  it("arms after a five-fix polygon proof without any tap", () => {
    const session = new EngineBridge();
    const sampling: LocationSampling[] = [];
    const runtime = new LocationArmingRuntime(
      bundledZoneData.zones,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: (value) => sampling.push(value) },
    );
    const zone = highZone();
    runtime.start();

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      runtime.acceptLiveFix(proofFix(zone, index));
    }

    expect(session.state).toBe("SHADOW");
    expect(session.activeZoneId).toBe(zone.stationId);
    expect(session.events).toEqual([
      { kind: "ZoneEntered", zoneId: zone.stationId },
    ]);
    expect(session.events.some((event) => event.kind.includes("Tapped"))).toBe(
      false,
    );
    expect(
      session.commands.some((command) =>
        ["WriteSusEvent", "WriteSosIncident", "NotifyFamily"].includes(
          command.kind,
        ),
      ),
    ).toBe(false);
    expect(sampling).toContainEqual({
      intervalSec: PENDING_DWELL_SAMPLING_SEC,
      enableHighAccuracy: true,
    });
  });

  it("returns to quiet idle when the arming matrix rejects the completed proof", () => {
    const session = new EngineBridge();
    session.hourBand = "DAWN";
    const moderate = bundledZoneData.zones.find(
      (zone) => zone.riskTier === RiskTier.MODERATE,
    );
    if (moderate === undefined) throw new Error("Frozen MODERATE zone is missing");
    const runtime = new LocationArmingRuntime(
      bundledZoneData.zones,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      runtime.acceptLiveFix(proofFix(moderate, index));
    }

    expect(session.state).toBe("IDLE");
    expect(session.commands).toEqual([]);
    expect(runtime.pendingZoneId()).toBeNull();
  });

  it("discards pending proof when the watch is interrupted", () => {
    const session = new EngineBridge();
    const runtime = new LocationArmingRuntime(
      bundledZoneData.zones,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );
    const zone = highZone();
    const incompleteFixCount = MIN_ENTRY_FIXES - 1;
    for (let index = 0; index < incompleteFixCount; index += 1) {
      runtime.acceptLiveFix(proofFix(zone, index));
    }

    runtime.interruptWatch("PAGE_HIDDEN", 0);
    runtime.acceptLiveFix(proofFix(zone, MIN_ENTRY_FIXES - 1));

    expect(session.state).toBe("IDLE");
    expect(session.events).toEqual([]);
  });

  it("resolves an active session honestly when location permission is revoked", () => {
    const session = new EngineBridge();
    const zone = highZone();
    session.state = "SHADOW";
    session.activeZoneId = zone.stationId;
    const runtime = new LocationArmingRuntime(
      bundledZoneData.zones,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );

    runtime.interruptWatch("PERMISSION_DENIED", 0);

    expect(session.state).toBe("RESOLVED");
    expect(session.events).toEqual([
      { kind: "PermissionRevoked", permission: "geolocation" },
    ]);
    expect(session.commands).toContainEqual({ kind: "StopLocationWatch" });
    expect(session.commands).toContainEqual({ kind: "ReleaseWakeLock" });
    expect(session.commands).toContainEqual({
      kind: "ShowPermissionWarning",
      permission: "geolocation",
    });
  });
});
