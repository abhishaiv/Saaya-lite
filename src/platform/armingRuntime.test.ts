import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../data/zone/zoneLoader";
import { containingHotspotZones } from "../data/zone/containment";
import { onEvent } from "../domain/engine/sessionEngine";
import {
  DEFAULT_RULES,
  DEMO_DIVISOR,
  DEMO_RULES,
  ENTER_DWELL_SEC,
  MAX_CONTAINMENT_ACCURACY_M,
  MIN_ENTRY_FIXES,
  PENDING_DWELL_SAMPLING_SEC,
} from "../domain/engine/rules";
import type {
  ArmMode,
  Command,
  EngineContext,
  HourBand,
  SessionEvent,
  SessionState,
} from "../domain/model/session";
import type { HeatmapHotspot } from "../domain/model/heatmapHotspot";
import { RiskTier, type LatLng, type Zone } from "../domain/model/zone";
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
  armMode: ArmMode = "AUTO_ZONE";
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
      armedHourBand:
        this.state === "IDLE" || this.armMode === "MANUAL"
          ? null
          : "NIGHT_DEEP",
      rules: DEFAULT_RULES,
      armMode: this.armMode,
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

function highHotspot(): HeatmapHotspot {
  const hotspot = bundledZoneData.heatmapHotspots.find(
    (candidate) => candidate.zone.riskTier === RiskTier.HIGH,
  );
  if (hotspot === undefined) throw new Error("Frozen HIGH hotspot is missing");
  return hotspot;
}

function proofFix(
  hotspot: HeatmapHotspot,
  index: number,
  totalSpanSec = ENTER_DWELL_SEC,
): LiveLocationFix {
  return proofFixAt(hotspot.center, index, totalSpanSec);
}

function proofFixAt(
  point: LatLng,
  index: number,
  totalSpanSec = ENTER_DWELL_SEC,
): LiveLocationFix {
  const proofSegments = MIN_ENTRY_FIXES - 1;
  const spanSec = (totalSpanSec * index) / proofSegments;
  return {
    source: "LIVE_WATCH",
    ...point,
    accuracyM: MAX_CONTAINMENT_ACCURACY_M,
    observedAtEpochMs: secondsToEpochMs(spanSec),
  };
}

describe("page-open automatic arming", () => {
  it("arms after a five-fix hotspot-circle proof without any tap", () => {
    const session = new EngineBridge();
    const sampling: LocationSampling[] = [];
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: (value) => sampling.push(value) },
    );
    const hotspot = highHotspot();
    runtime.start();

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      runtime.acceptLiveFix(proofFix(hotspot, index));
    }

    expect(session.state).toBe("SHADOW");
    expect(session.activeZoneId).toBe(hotspot.zone.stationId);
    expect(session.events).toEqual([
      { kind: "ZoneEntered", zoneId: hotspot.zone.stationId },
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
    const moderate = bundledZoneData.heatmapHotspots.find(
      (hotspot) => hotspot.zone.riskTier === RiskTier.MODERATE,
    );
    if (moderate === undefined) throw new Error("Frozen MODERATE zone is missing");
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
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

  it("does not arm from a former broad polygon point outside every hotspot", () => {
    const legacyOnlyZone = bundledZoneData.zones.find(
      (zone) =>
        zone.riskTier === RiskTier.HIGH &&
        containingHotspotZones(
          bundledZoneData.heatmapHotspots,
          zone.centroid,
        ).length === 0,
    );
    if (legacyOnlyZone === undefined) {
      throw new Error("Frozen HIGH parent lacks a polygon-only regression point");
    }
    const session = new EngineBridge();
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      runtime.acceptLiveFix(proofFixAt(legacyOnlyZone.centroid, index));
    }

    expect(session.state).toBe("IDLE");
    expect(session.events).toEqual([]);
  });

  it("applies demo timing to dwell after the global rules switch", () => {
    const session = new EngineBridge();
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );
    const hotspot = highHotspot();
    runtime.setRules(DEMO_RULES);

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      runtime.acceptLiveFix(
        proofFix(hotspot, index, ENTER_DWELL_SEC / DEMO_DIVISOR),
      );
    }

    expect(session.state).toBe("SHADOW");
  });

  it("discards pending proof when the watch is interrupted", () => {
    const session = new EngineBridge();
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );
    const hotspot = highHotspot();
    const incompleteFixCount = MIN_ENTRY_FIXES - 1;
    for (let index = 0; index < incompleteFixCount; index += 1) {
      runtime.acceptLiveFix(proofFix(hotspot, index));
    }

    runtime.interruptWatch("PAGE_HIDDEN", 0);
    runtime.acceptLiveFix(proofFix(hotspot, MIN_ENTRY_FIXES - 1));

    expect(session.state).toBe("IDLE");
    expect(session.events).toEqual([]);
  });

  it("resolves an automatic session honestly when location permission is revoked", () => {
    const session = new EngineBridge();
    const hotspot = highHotspot();
    session.state = "SHADOW";
    session.activeZoneId = hotspot.zone.stationId;
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
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

  it("keeps a manual session and its ladder alive when location is revoked", () => {
    const session = new EngineBridge();
    session.state = "SHADOW";
    session.armMode = "MANUAL";
    const runtime = new LocationArmingRuntime(
      bundledZoneData.heatmapHotspots,
      DEFAULT_RULES,
      session,
      { onSamplingChanged: () => undefined },
    );

    runtime.interruptWatch("PERMISSION_DENIED", 0);

    expect(session.state).toBe("SHADOW");
    expect(session.events).toEqual([
      { kind: "PermissionRevoked", permission: "geolocation" },
    ]);
    expect(session.commands).toEqual([
      { kind: "ShowPermissionWarning", permission: "geolocation" },
    ]);
  });
});
