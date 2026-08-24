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
import type { Zone } from "../domain/model/zone";
import {
  containingZones,
  prepareContainmentZones,
  type ContainmentZone,
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
  private readonly containmentZones: readonly ContainmentZone[];
  private sampling: LocationSampling | null = null;

  constructor(
    zones: readonly Zone[],
    private readonly rules: Rules,
    private readonly session: RuntimeSessionBridge,
    private readonly callbacks: ArmingRuntimeCallbacks,
  ) {
    this.containmentZones = prepareContainmentZones(zones);
  }

  start(): void {
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
        insideZones: containingZones(this.containmentZones, fix),
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
    );
    if (
      this.sampling?.intervalSec === next.intervalSec &&
      this.sampling.enableHighAccuracy === next.enableHighAccuracy
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
      this.containmentZones.find(({ zone }) => zone.stationId === zoneId)
        ?.zone ?? null
    );
  }
}

export function samplingForSession(
  state: SessionState,
  pendingDwell: boolean,
): LocationSampling {
  if (state === "SOS_ACTIVE") {
    return { intervalSec: SOS_SAMPLING_SEC, enableHighAccuracy: true };
  }
  if (isActive(state)) {
    return { intervalSec: SHADOW_SAMPLING_SEC, enableHighAccuracy: true };
  }
  if (pendingDwell) return PENDING_DWELL_SAMPLING;
  return { intervalSec: IDLE_SAMPLING_SEC, enableHighAccuracy: false };
}

function isActive(state: SessionState): boolean {
  return state !== "IDLE" && state !== "RESOLVED";
}
