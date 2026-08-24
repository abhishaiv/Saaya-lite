import { selectHighestRiskZone } from "./armingEvaluator";
import {
  MAX_CONTAINMENT_ACCURACY_M,
  MIN_ENTRY_FIXES,
  PENDING_DWELL_SAMPLING_SEC,
  scaledSeconds,
} from "./rules";
import type { Zone } from "../model/zone";
import type { Rules, SessionEvent } from "../model/session";

export interface DwellState {
  readonly candidateZoneId: string | null;
  readonly firstInsideEpochMs: number | null;
  readonly qualifyingInsideFixes: number;
  readonly outsideSinceEpochMs: number | null;
}

export interface DwellFix {
  readonly nowEpochMs: number;
  readonly accuracyM: number;
  readonly insideZones: readonly Zone[];
  readonly activeZoneId: string | null;
}

export interface DwellEvaluation {
  readonly state: DwellState;
  readonly event?: SessionEvent;
}

export interface DwellSamplingRequest {
  readonly intervalSec: number;
  readonly enableHighAccuracy: true;
}

export const EMPTY_DWELL_STATE: DwellState = {
  candidateZoneId: null,
  firstInsideEpochMs: null,
  qualifyingInsideFixes: 0,
  outsideSinceEpochMs: null,
};

export const PENDING_DWELL_SAMPLING: DwellSamplingRequest = {
  intervalSec: PENDING_DWELL_SAMPLING_SEC,
  enableHighAccuracy: true,
};

export function resetDwellEvidence(): DwellState {
  return EMPTY_DWELL_STATE;
}

export function evaluateDwellFix(
  state: DwellState,
  fix: DwellFix,
  rules: Rules,
): DwellEvaluation {
  if (fix.accuracyM > MAX_CONTAINMENT_ACCURACY_M) {
    return { state };
  }

  if (fix.activeZoneId !== null) {
    return evaluateExit(state, fix, rules);
  }

  const candidate = selectHighestRiskZone(fix.insideZones);
  if (candidate === null) {
    return { state: EMPTY_DWELL_STATE };
  }

  if (state.candidateZoneId !== candidate.stationId) {
    return {
      state: {
        candidateZoneId: candidate.stationId,
        firstInsideEpochMs: fix.nowEpochMs,
        qualifyingInsideFixes: 1,
        outsideSinceEpochMs: null,
      },
    };
  }

  if (state.firstInsideEpochMs === null) {
    throw new Error("Candidate dwell is missing its first qualifying timestamp");
  }

  const qualifyingInsideFixes = state.qualifyingInsideFixes + 1;
  const spanEpochMs = fix.nowEpochMs - state.firstInsideEpochMs;
  const minimumSpanEpochMs = secondsToEpochMs(
    scaledSeconds(rules.enterDwellSec, rules),
  );

  if (
    qualifyingInsideFixes >= MIN_ENTRY_FIXES &&
    spanEpochMs >= minimumSpanEpochMs
  ) {
    return {
      state: EMPTY_DWELL_STATE,
      event: { kind: "ZoneEntered", zoneId: candidate.stationId },
    };
  }

  return {
    state: {
      ...state,
      qualifyingInsideFixes,
    },
  };
}

function evaluateExit(
  state: DwellState,
  fix: DwellFix,
  rules: Rules,
): DwellEvaluation {
  const activeZoneId = fix.activeZoneId;
  if (activeZoneId === null) {
    throw new Error("Exit dwell requires an active zone");
  }
  const remainsInside = fix.insideZones.some(
    (zone) => zone.stationId === activeZoneId,
  );
  if (remainsInside) {
    return {
      state: {
        ...EMPTY_DWELL_STATE,
        outsideSinceEpochMs: null,
      },
    };
  }

  if (state.outsideSinceEpochMs === null) {
    return {
      state: {
        ...EMPTY_DWELL_STATE,
        outsideSinceEpochMs: fix.nowEpochMs,
      },
    };
  }

  const outsideSpanEpochMs = fix.nowEpochMs - state.outsideSinceEpochMs;
  const exitDwellEpochMs = secondsToEpochMs(
    scaledSeconds(rules.exitDwellSec, rules),
  );
  if (outsideSpanEpochMs < exitDwellEpochMs) {
    return { state };
  }

  return {
    state: EMPTY_DWELL_STATE,
    event: { kind: "ZoneExited", zoneId: activeZoneId },
  };
}

function secondsToEpochMs(seconds: number): number {
  const epochMsPerSecond = 1000; // GROUNDED-EXEMPT: SI unit conversion
  return seconds * epochMsPerSecond;
}
