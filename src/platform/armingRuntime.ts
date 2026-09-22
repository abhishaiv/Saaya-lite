import {
  PENDING_DWELL_SAMPLING,
  evaluateDwellFix,
  resetDwellEvidence,
  type DwellState,
} from "../domain/engine/dwellEvaluator";
import {
  IDLE_SAMPLING_SEC,
  SHADOW_SAMPLING_SEC,
  SOS_SAMPLING_SEC,
} from "../domain/engine/rules";
import type {
  Rules,
  SessionEvent,
  SessionState,
} from "../domain/model/session";
import type { HeatmapHotspot } from "../domain/model/heatmapHotspot";
import type { Zone } from "../domain/model/zone";
import {
  containingHotspotZones,
} from "../data/zone/containment";
import type {
  LiveLocationFix,
  LocationSampling,
  WatchInterruption,
} from "./locationWatch";

export interface RuntimeSessionSnapshot {
  readonly state: SessionState;
  readonly activeZoneId: string | null;
}

export interface RuntimeSessionBridge {
  snapshot(): RuntimeSessionSnapshot;
  dispatch(
    event: SessionEvent,
    input: {
      readonly nowEpochMs: number;
      readonly zone: Zone | null;
    },
  ): RuntimeSessionSnapshot;
}

export interface ArmingRuntimeCallbacks {
  onSamplingChanged(sampling: LocationSampling): void;
  onLiveFix?(fix: LiveLocationFix): void;
}

export class LocationArmingRuntime {
  private dwellState: DwellState = resetDwellEvidence();
  private sampling: LocationSampling | null = null;
  private walkViewVisible = false;

  constructor(
    private readonly hotspots: readonly HeatmapHotspot[],
    private rules: Rules,
    private readonly session: RuntimeSessionBridge,
    private readonly callbacks: ArmingRuntimeCallbacks,
  ) {}

  start(): void {
    this.synchronizeSampling();
  }

  setRules(rules: Rules): void {
    this.rules = rules;
    this.dwellState = resetDwellEvidence();
    this.synchronizeSampling();
  }

  /**
   * The view she is looking at, which is not a session state and not evidence.
   *
   * Kept here rather than in the watch so that a later `synchronizeSessionState` cannot
   * overwrite it - every state change re-derives the sampling request through
   * `samplingForSession`, and this is one of its inputs.
   */
  setWalkViewVisible(visible: boolean): void {
    if (this.walkViewVisible === visible) return;
    this.walkViewVisible = visible;
    this.synchronizeSampling();
  }

  acceptLiveFix(fix: LiveLocationFix): void {
    this.callbacks.onLiveFix?.(fix);
    const before = this.session.snapshot();

    if (before.state === "SOS_ACTIVE") {
      this.synchronizeSampling();
      return;
    }

    const evaluation = evaluateDwellFix(
      this.dwellState,
      {
        nowEpochMs: fix.observedAtEpochMs,
        accuracyM: fix.accuracyM,
        insideZones: containingHotspotZones(this.hotspots, fix),
        activeZoneId: before.activeZoneId,
      },
      this.rules,
    );
    this.dwellState = evaluation.state;

    if (evaluation.event !== undefined) {
      const zone = this.zoneForEvent(evaluation.event, before.activeZoneId);
      this.session.dispatch(evaluation.event, {
        nowEpochMs: fix.observedAtEpochMs,
        zone,
      });
    }

    this.synchronizeSampling();
  }

  interruptWatch(reason: WatchInterruption, nowEpochMs: number): void {
    this.dwellState = resetDwellEvidence();
    const snapshot = this.session.snapshot();
    if (reason === "PERMISSION_DENIED" && isActive(snapshot.state)) {
      this.session.dispatch(
        { kind: "PermissionRevoked", permission: "geolocation" },
        { nowEpochMs, zone: this.zoneById(snapshot.activeZoneId) },
      );
    }
    this.synchronizeSampling();
  }

  synchronizeSessionState(): void {
    this.synchronizeSampling();
  }

  pendingZoneId(): string | null {
    return this.dwellState.candidateZoneId;
  }

  private synchronizeSampling(): void {
    const snapshot = this.session.snapshot();
    const next = samplingForSession(
      snapshot.state,
      this.dwellState.candidateZoneId !== null,
      this.walkViewVisible,
    );
    if (
      this.sampling?.intervalSec === next.intervalSec &&
      this.sampling.enableHighAccuracy === next.enableHighAccuracy &&
      this.sampling.forwardEveryFix === next.forwardEveryFix
    ) {
      return;
    }
    this.sampling = next;
    this.callbacks.onSamplingChanged(next);
  }

  private zoneForEvent(
    event: SessionEvent,
    activeZoneId: string | null,
  ): Zone | null {
    if (event.kind === "ZoneEntered") return this.zoneById(event.zoneId);
    if (event.kind === "ZoneExited") return this.zoneById(event.zoneId);
    return this.zoneById(activeZoneId);
  }

  private zoneById(zoneId: string | null): Zone | null {
    if (zoneId === null) return null;
    return (
      this.hotspots.find((hotspot) => hotspot.zone.stationId === zoneId)?.zone ??
      null
    );
  }
}

/**
 * What the watch is asked for.
 *
 * The first half is the recorded cadence for the state, unchanged: `BUSINESS_RULES.md`
 * section 12 and the sampling facts in `rules.ts` still decide what counts as a sample of
 * her position, and the walk view is not allowed to touch that. The second half is what
 * the walk view adds on top of it, and it adds two things that are not cadence at all:
 *
 * 1. `enableHighAccuracy`, because the view draws her at her own coordinates and a
 *    network-located fix can be a kilometre out - she chose "use my live GPS in the app",
 *    and the idle cadence is coarse because the phone is usually in her pocket.
 * 2. `forwardEveryFix`, so the map she is looking at moves at the rate the browser
 *    delivers instead of the rate the ladder samples. See `LocationSampling`.
 *
 * It never shortens the interval, so a tighter recorded cadence (SOS, 5 s) is never
 * loosened and no escalation input changes. Added 2026-09-23.
 */
export function samplingForSession(
  state: SessionState,
  pendingDwell: boolean,
  walkViewVisible = false,
): LocationSampling {
  const base = baseSamplingForSession(state, pendingDwell);
  if (!walkViewVisible) return base;
  return { ...base, enableHighAccuracy: true, forwardEveryFix: true };
}

function baseSamplingForSession(
  state: SessionState,
  pendingDwell: boolean,
): LocationSampling {
  if (state === "SOS_ACTIVE") {
    return {
      intervalSec: SOS_SAMPLING_SEC,
      enableHighAccuracy: true,
      forwardEveryFix: false,
    };
  }
  if (isActive(state)) {
    return {
      intervalSec: SHADOW_SAMPLING_SEC,
      enableHighAccuracy: true,
      forwardEveryFix: false,
    };
  }
  if (pendingDwell) return { ...PENDING_DWELL_SAMPLING, forwardEveryFix: false };
  return {
    intervalSec: IDLE_SAMPLING_SEC,
    enableHighAccuracy: false,
    forwardEveryFix: false,
  };
}

function isActive(state: SessionState): boolean {
  return state !== "IDLE" && state !== "RESOLVED";
}
