import { describe, expect, it } from "vitest";

import {
  EMPTY_DWELL_STATE,
  PENDING_DWELL_SAMPLING,
  evaluateDwellFix,
  resetDwellEvidence,
  type DwellFix,
  type DwellState,
} from "./dwellEvaluator";
import {
  DEFAULT_RULES,
  MAX_CONTAINMENT_ACCURACY_M,
  MIN_ENTRY_FIXES,
  PENDING_DWELL_SAMPLING_SEC,
} from "./rules";
import { onEvent } from "./sessionEngine";
import { RiskTier, type Zone, type ZoneColorHex } from "../model/zone";
import type { EngineContext } from "../model/session";

const EPOCH_MS_PER_SECOND = 1000; // GROUNDED-EXEMPT: SI unit conversion in fake-clock tests
const EPOCH_MS_PER_MINUTE = 60_000; // GROUNDED-EXEMPT: SI unit conversion in cooldown fixture
const INERT_ZONE_SCORE = 1; // GROUNDED-EXEMPT: synthetic fixture plumbing, not a product risk score
const INERT_ZONE_NUMBER = 0; // GROUNDED-EXEMPT: synthetic fixture fields unused by dwell behavior

function colorFor(tier: RiskTier): ZoneColorHex {
  if (tier === RiskTier.HIGH) return "#FF3B30";
  if (tier === RiskTier.ELEVATED) return "#FFCC00";
  if (tier === RiskTier.MODERATE) return "#FF9500";
  return "#00000000";
}

function makeZone(
  stationId: string,
  riskTier: RiskTier = RiskTier.HIGH,
  riskScore = INERT_ZONE_SCORE,
): Zone {
  return {
    stationId,
    stationName: stationId,
    district: "Visakhapatnam",
    polygon: [],
    centroid: {
      latitude: INERT_ZONE_NUMBER,
      longitude: INERT_ZONE_NUMBER,
    },
    riskScore,
    riskTier,
    colorHex: colorFor(riskTier),
    opacity: INERT_ZONE_NUMBER,
    totalCases: INERT_ZONE_NUMBER,
    womenSafetyCases: INERT_ZONE_NUMBER,
    crimeBreakdown: {},
    geofenceRadiusM: INERT_ZONE_NUMBER,
    areasCovered: "Fixture",
    touristSpots: null,
    riskNotes: null,
  };
}

function fix(
  second: number,
  insideZones: readonly Zone[],
  activeZoneId: string | null = null,
  accuracyM = MAX_CONTAINMENT_ACCURACY_M,
): DwellFix {
  return {
    nowEpochMs: second * EPOCH_MS_PER_SECOND,
    accuracyM,
    insideZones,
    activeZoneId,
  };
}

function completedEntryProof(zone: Zone): ReturnType<typeof evaluateDwellFix> {
  let result = { state: EMPTY_DWELL_STATE } as ReturnType<
    typeof evaluateDwellFix
  >;
  for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
    result = evaluateDwellFix(
      result.state,
      fix(index * PENDING_DWELL_SAMPLING_SEC, [zone]),
      DEFAULT_RULES,
    );
  }
  return result;
}

describe("pure dwell evaluator", () => {
  const highZone = makeZone("high-zone");

  it("keeps the first inside fix private and pending", () => {
    const result = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [highZone]),
      DEFAULT_RULES,
    );

    expect(result.event).toBeUndefined();
    expect(result.state).toEqual({
      candidateZoneId: highZone.stationId,
      firstInsideEpochMs: 0,
      qualifyingInsideFixes: 1,
      outsideSinceEpochMs: null,
    });
  });

  it("requests the exact high-accuracy sampling mode", () => {
    expect(PENDING_DWELL_SAMPLING).toEqual({
      intervalSec: 15,
      enableHighAccuracy: true,
    });
  });

  it("emits one entry only after the full five-fix proof", () => {
    let state: DwellState = EMPTY_DWELL_STATE;
    const events = [];

    for (let index = 0; index < MIN_ENTRY_FIXES; index += 1) {
      const result = evaluateDwellFix(
        state,
        fix(index * PENDING_DWELL_SAMPLING_SEC, [highZone]),
        DEFAULT_RULES,
      );
      state = result.state;
      if (result.event !== undefined) events.push(result.event);
    }

    expect(events).toEqual([
      { kind: "ZoneEntered", zoneId: highZone.stationId },
    ]);
    expect(state).toEqual(EMPTY_DWELL_STATE);
  });

  it("resets accumulated evidence on a qualifying outside fix", () => {
    const first = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [highZone]),
      DEFAULT_RULES,
    );
    const second = evaluateDwellFix(
      first.state,
      fix(PENDING_DWELL_SAMPLING_SEC, [highZone]),
      DEFAULT_RULES,
    );
    const outside = evaluateDwellFix(
      second.state,
      fix(PENDING_DWELL_SAMPLING_SEC * 2, []),
      DEFAULT_RULES,
    );

    expect(outside).toEqual({ state: EMPTY_DWELL_STATE });
  });

  it("ignores an inaccurate fix without extending or clearing proof", () => {
    const first = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [highZone]),
      DEFAULT_RULES,
    );
    const inaccurate = evaluateDwellFix(
      first.state,
      fix(
        PENDING_DWELL_SAMPLING_SEC,
        [],
        null,
        MAX_CONTAINMENT_ACCURACY_M + 1,
      ),
      DEFAULT_RULES,
    );

    expect(inaccurate).toEqual({ state: first.state });
  });

  it("has no command, persistence or family-effect surface", () => {
    const pending = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [highZone]),
      DEFAULT_RULES,
    );

    expect("commands" in pending).toBe(false);
    expect("persisted" in pending).toBe(false);
    expect("family" in pending).toBe(false);
    expect(pending.event).toBeUndefined();
  });

  it("returns rejected arming outcomes to quiet IDLE", () => {
    const moderate = makeZone("moderate-zone", RiskTier.MODERATE);
    const proof = completedEntryProof(moderate);
    expect(proof.event).toEqual({
      kind: "ZoneEntered",
      zoneId: moderate.stationId,
    });
    expect(proof.state).toEqual(EMPTY_DWELL_STATE);

    const context: EngineContext = {
      nowEpochMs: 0,
      zone: moderate,
      hourBand: "DAWN",
      armedHourBand: null,
      rules: DEFAULT_RULES,
      armMode: "AUTO_ZONE",
      armedAtEpochMs: null,
      deadlineEpochMs: null,
      cooldowns: {},
      hasFavourite: false,
      susEventWritten: false,
    };
    const notApplicable = onEvent("IDLE", proof.event!, context);
    const onCooldown = onEvent("IDLE", proof.event!, {
      ...context,
      hourBand: "NIGHT_DEEP",
      cooldowns: {
        [moderate.stationId]:
          DEFAULT_RULES.manualDisarmCooldownMin * EPOCH_MS_PER_MINUTE,
      },
    });

    expect(notApplicable).toEqual({ state: "IDLE", commands: [] });
    expect(onCooldown).toEqual({ state: "IDLE", commands: [] });
  });

  it("discards every timestamp and fix on watch interruption", () => {
    const pending = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [highZone]),
      DEFAULT_RULES,
    );
    expect(pending.state.candidateZoneId).toBe(highZone.stationId);
    expect(resetDwellEvidence()).toEqual(EMPTY_DWELL_STATE);
  });

  it("emits exit only after continuous outside dwell", () => {
    const started = evaluateDwellFix(
      EMPTY_DWELL_STATE,
      fix(0, [], highZone.stationId),
      DEFAULT_RULES,
    );
    const before = evaluateDwellFix(
      started.state,
      fix(
        DEFAULT_RULES.exitDwellSec - 1,
        [],
        highZone.stationId,
      ),
      DEFAULT_RULES,
    );
    const complete = evaluateDwellFix(
      before.state,
      fix(DEFAULT_RULES.exitDwellSec, [], highZone.stationId),
      DEFAULT_RULES,
    );

    expect(before.event).toBeUndefined();
    expect(complete.event).toEqual({
      kind: "ZoneExited",
      zoneId: highZone.stationId,
    });
    expect(complete.state).toEqual(EMPTY_DWELL_STATE);
  });
});
