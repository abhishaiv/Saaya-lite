import { describe, expect, it } from "vitest";

import { selectHighestRiskZone } from "./armingEvaluator";
import { checkInDelaySec } from "./intervalCalculator";
import { DEFAULT_RULES, DEMO_RULES } from "./rules";
import { onEvent } from "./sessionEngine";
import { RiskTier, type Zone, type ZoneColorHex } from "../model/zone";
import type {
  Command,
  EngineContext,
  HourBand,
  PersistedSession,
  SessionEvent,
} from "../model/session";

const EPOCH_MS_PER_SECOND = 1000; // GROUNDED-EXEMPT: SI unit conversion in fake-clock tests
const SECONDS_PER_MINUTE = 60; // GROUNDED-EXEMPT: SI unit conversion in test expectations
const INERT_ZONE_SCORE = 1; // GROUNDED-EXEMPT: synthetic fixture plumbing, not a product risk score
const INERT_ZONE_NUMBER = 0; // GROUNDED-EXEMPT: synthetic fixture fields unused by engine behavior

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

const HIGH_ZONE = makeZone("high-zone");

function context(overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    nowEpochMs: 0,
    zone: HIGH_ZONE,
    hourBand: "NIGHT_DEEP",
    armedHourBand: "NIGHT_DEEP",
    rules: DEFAULT_RULES,
    armMode: "AUTO_ZONE",
    armedAtEpochMs: 0,
    deadlineEpochMs: null,
    cooldowns: {},
    hasFavourite: true,
    susEventWritten: false,
    ...overrides,
  };
}

function backendCommands(commands: readonly Command[]): Command[] {
  return commands.filter((command) =>
    ["WriteSusEvent", "PatchSusOutcome", "WriteSosIncident", "PatchSosStatus"].includes(
      command.kind,
    ),
  );
}

function notificationCommands(commands: readonly Command[]): Command[] {
  return commands.filter((command) =>
    ["NotifyFamily", "CancelFamilyNotification"].includes(command.kind),
  );
}

describe("pure session engine", () => {
  it("automatically arms an eligible high zone and schedules once", () => {
    const result = onEvent(
      "IDLE",
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      context({ armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("SHADOW");
    expect(
      result.commands.filter((command) => command.kind === "ScheduleTimer"),
    ).toEqual([
      {
        kind: "ScheduleTimer",
        id: "CHECKIN",
        delaySec: 5 * SECONDS_PER_MINUTE,
      },
    ]);
  });

  it("keeps a safe zone silent and idle", () => {
    const safe = makeZone("safe-zone", RiskTier.SAFE);
    const result = onEvent(
      "IDLE",
      { kind: "ZoneEntered", zoneId: safe.stationId },
      context({ zone: safe, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result).toEqual({ state: "IDLE", commands: [] });
    expect(notificationCommands(result.commands)).toEqual([]);
  });

  it("drives the full ladder at the exact frozen timings", () => {
    const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, context());
    const second = onEvent(
      first.state,
      { kind: "CountdownExpired", timer: "CD1" },
      context(),
    );
    const family = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      context(),
    );
    const sos = onEvent(
      family.state,
      { kind: "CountdownExpired", timer: "CANCEL" },
      context({ susEventWritten: true }),
    );

    expect(first.state).toBe("CHECKIN_1");
    expect(first.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD1",
      delaySec: 90,
    });
    expect(second.state).toBe("CHECKIN_2");
    expect(second.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD2",
      delaySec: 60,
    });
    expect(family.state).toBe("FAMILY_ESCALATED");
    expect(family.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CANCEL",
      delaySec: 60,
    });
    expect(sos.state).toBe("SOS_ACTIVE");
    expect(backendCommands([...first.commands, ...second.commands])).toEqual([]);
    expect(backendCommands(family.commands)).toEqual([{ kind: "WriteSusEvent" }]);
    expect(backendCommands(sos.commands)).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
  });

  it("writes nothing before family escalation and details only at SOS", () => {
    const arm = onEvent(
      "IDLE",
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      context({ armedHourBand: null, armedAtEpochMs: null }),
    );
    const first = onEvent(
      arm.state,
      { kind: "CheckInTimerFired" },
      context(),
    );
    const second = onEvent(
      first.state,
      { kind: "CountdownExpired", timer: "CD1" },
      context(),
    );
    const family = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      context(),
    );
    const sos = onEvent(
      family.state,
      { kind: "CountdownExpired", timer: "CANCEL" },
      context({ susEventWritten: true }),
    );

    expect(
      backendCommands([...arm.commands, ...first.commands, ...second.commands]),
    ).toEqual([]);
    expect(backendCommands(family.commands)).toEqual([{ kind: "WriteSusEvent" }]);
    expect(
      family.commands.some((command) => command.kind === "WriteSosIncident"),
    ).toBe(false);
    expect(sos.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
  });

  it.each([
    ["CHECKIN_1", "CD1"],
    ["CHECKIN_2", "CD2"],
  ] as const)("answers OK from %s and reschedules", (state, timer) => {
    const result = onEvent(state, { kind: "OkTapped" }, context());

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toEqual([
      { kind: "CancelTimer", id: timer },
      { kind: "HideCheckIn" },
      {
        kind: "ScheduleTimer",
        id: "CHECKIN",
        delaySec: 5 * SECONDS_PER_MINUTE,
      },
      {
        kind: "StartCooldown",
        zoneId: HIGH_ZONE.stationId,
        minutes: 20,
      },
    ]);
  });

  it.each([
    ["CHECKIN_1", "CD1"],
    ["CHECKIN_2", "CD2"],
  ] as const)("manually disarms %s with exact local cleanup", (state, timer) => {
    const result = onEvent(state, { kind: "ManualDisarm" }, context());

    expect(result).toEqual({
      state: "RESOLVED",
      outcome: "DISARMED",
      commands: [
        { kind: "CancelTimer", id: timer },
        { kind: "HideCheckIn" },
        { kind: "StopLocationWatch" },
        { kind: "ReleaseWakeLock" },
        {
          kind: "StartCooldown",
          zoneId: HIGH_ZONE.stationId,
          minutes: 45,
        },
      ],
    });
    expect(backendCommands(result.commands)).toEqual([]);
    expect(notificationCommands(result.commands)).toEqual([]);
    expect(result.commands.some((command) => command.kind === "RequirePinToStop")).toBe(
      false,
    );
  });

  it("cancels family escalation and patches only the anonymous event", () => {
    const result = onEvent(
      "FAMILY_ESCALATED",
      { kind: "CancelTapped" },
      context({ susEventWritten: true }),
    );

    expect(result.state).toBe("RESOLVED");
    expect(result.outcome).toBe("CANCELLED");
    expect(result.commands).toContainEqual({
      kind: "PatchSusOutcome",
      outcome: "CANCELLED_BY_USER",
    });
    expect(result.commands).toContainEqual({ kind: "StopLocationWatch" });
    expect(result.commands).toContainEqual({ kind: "ReleaseWakeLock" });
  });

  it("enters SOS directly from Shadow and preserves the civic signal", () => {
    const result = onEvent("SHADOW", { kind: "HelpNowTapped" }, context());

    expect(result.state).toBe("SOS_ACTIVE");
    expect(result.commands).toContainEqual({ kind: "WriteSusEvent" });
    expect(result.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "MANUAL_HELP_BUTTON",
    });
  });

  it("keeps every manual ladder state running when location is revoked", () => {
    const states = [
      "SHADOW",
      "CHECKIN_1",
      "CHECKIN_2",
      "FAMILY_ESCALATED",
    ] as const;

    for (const state of states) {
      const result = onEvent(
        state,
        { kind: "PermissionRevoked", permission: "geolocation" },
        context({ armMode: "MANUAL", armedHourBand: null, zone: null }),
      );

      expect(result).toEqual({
        state,
        commands: [
          { kind: "ShowPermissionWarning", permission: "geolocation" },
        ],
      });
    }
  });

  it("keeps SOS sticky for every event except a valid PIN", () => {
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "SOS_ACTIVE",
      armMode: "AUTO_ZONE",
      zoneId: HIGH_ZONE.stationId,
      armedAtEpochMs: 0,
      armedHourBand: "NIGHT_DEEP",
      deadlineEpochMs: null,
      susEventWritten: true,
    };
    const ignored: readonly SessionEvent[] = [
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
      { kind: "ManualArm" },
      { kind: "ManualDisarm" },
      { kind: "CheckInTimerFired" },
      { kind: "CountdownExpired", timer: "CANCEL" },
      { kind: "OkTapped" },
      { kind: "HelpNowTapped" },
      { kind: "CancelTapped" },
      { kind: "PermissionRevoked", permission: "geolocation" },
      { kind: "AppKilledRestart", persisted },
    ];

    ignored.forEach((event) => {
      expect(onEvent("SOS_ACTIVE", event, context()).state).toBe("SOS_ACTIVE");
    });

    expect(
      onEvent(
        "SOS_ACTIVE",
        {
          kind: "AppKilledRestart",
          persisted: { ...persisted, state: "IDLE" },
        },
        context(),
      ),
    ).toEqual({ state: "SOS_ACTIVE", commands: [] });

    const recoveredSos = onEvent(
      "SOS_ACTIVE",
      { kind: "AppKilledRestart", persisted },
      context(),
    );
    expect(recoveredSos.state).toBe("SOS_ACTIVE");
    expect(recoveredSos.commands).toContainEqual({ kind: "StartLocationWatch" });
    expect(recoveredSos.commands).toContainEqual({ kind: "ShowSos" });
    expect(recoveredSos.commands).toContainEqual({ kind: "RequirePinToStop" });

    expect(onEvent("SOS_ACTIVE", { kind: "PinAccepted" }, context())).toEqual({
      state: "RESOLVED",
      outcome: "ESCALATED_SOS",
      commands: [
        { kind: "PatchSosStatus", status: "STOPPED" },
        { kind: "StopLocationWatch" },
        { kind: "ReleaseWakeLock" },
      ],
    });
  });

  it("does not resolve on a zone exit during check-in two", () => {
    expect(
      onEvent(
        "CHECKIN_2",
        { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
        context(),
      ),
    ).toEqual({ state: "CHECKIN_2", commands: [] });
  });

  it("does not bind a manually armed session to a zone exit", () => {
    expect(
      onEvent(
        "SHADOW",
        { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
        context({ armMode: "MANUAL", armedHourBand: null }),
      ),
    ).toEqual({ state: "SHADOW", commands: [] });
  });

  it("treats a completed automatic exit-dwell event as authoritative", () => {
    const result = onEvent(
      "SHADOW",
      { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
      context({ zone: null }),
    );

    expect(result.state).toBe("RESOLVED");
    expect(result.outcome).toBe("DISARMED");
    expect(result.commands).toContainEqual({
      kind: "LogSessionEvent",
      type: "ZONE_EXIT",
      detail: HIGH_ZONE.stationId,
    });
  });

  it("selects the higher tier, then the higher score on a tie", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE, 0.75); // GROUNDED-EXEMPT: synthetic comparison fixture, not a risk threshold
    const elevatedLow = makeZone("elevated-low", RiskTier.ELEVATED, 0.25); // GROUNDED-EXEMPT: synthetic lower tie score
    const elevatedHigh = makeZone("elevated-high", RiskTier.ELEVATED, 0.5); // GROUNDED-EXEMPT: synthetic higher tie score

    expect(selectHighestRiskZone([moderate, elevatedLow])).toBe(elevatedLow);
    expect(selectHighestRiskZone([elevatedLow, elevatedHigh])).toBe(elevatedHigh);
  });

  it("honours the full manual-disarm cooldown before re-entry", () => {
    const cooldownUntil =
      DEFAULT_RULES.manualDisarmCooldownMin *
      SECONDS_PER_MINUTE *
      EPOCH_MS_PER_SECOND;
    const result = onEvent(
      "IDLE",
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      context({
        armedHourBand: null,
        armedAtEpochMs: null,
        cooldowns: { [HIGH_ZONE.stationId]: cooldownUntil },
      }),
    );

    expect(result).toEqual({ state: "IDLE", commands: [] });
  });

  it("scales the demo ladder to thirty-five seconds without changing writes", () => {
    const normal = context({ rules: DEFAULT_RULES });
    const demo = context({ rules: DEMO_RULES });

    const run = (ctx: EngineContext) => {
      const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, ctx);
      const second = onEvent(
        "CHECKIN_1",
        { kind: "CountdownExpired", timer: "CD1" },
        ctx,
      );
      const family = onEvent(
        "CHECKIN_2",
        { kind: "CountdownExpired", timer: "CD2" },
        ctx,
      );
      const sos = onEvent(
        "FAMILY_ESCALATED",
        { kind: "CountdownExpired", timer: "CANCEL" },
        { ...ctx, susEventWritten: true },
      );
      const all = [first, second, family, sos];
      return {
        delays: all.flatMap((result) =>
          result.commands.flatMap((command) =>
            command.kind === "ScheduleTimer" ? [command.delaySec] : [],
          ),
        ),
        writes: all.flatMap((result) => backendCommands(result.commands)),
      };
    };

    const normalRun = run(normal);
    const demoRun = run(demo);
    expect(demoRun.delays.reduce((sum, delay) => sum + delay, 0)).toBe(35);
    expect(demoRun.writes).toEqual(normalRun.writes);
  });

  it("reschedules from the frozen arm band after the current band changes", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE);
    const result = onEvent(
      "CHECKIN_1",
      { kind: "OkTapped" },
      context({
        zone: moderate,
        hourBand: "DAWN",
        armedHourBand: "NIGHT_DEEP",
      }),
    );

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: 12 * SECONDS_PER_MINUTE,
    });
  });

  it("does not interrupt an active session in a current n-a band", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE);
    const result = onEvent(
      "SHADOW",
      { kind: "ZoneEntered", zoneId: moderate.stationId },
      context({
        zone: moderate,
        hourBand: "DAWN",
        armedHourBand: "NIGHT_DEEP",
      }),
    );

    expect(result).toEqual({ state: "SHADOW", commands: [] });
  });

  it("recovers with the persisted frozen band and absolute deadline", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE);
    const deadlineEpochMs =
      12 * SECONDS_PER_MINUTE * EPOCH_MS_PER_SECOND;
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "SHADOW",
      armMode: "AUTO_ZONE",
      zoneId: moderate.stationId,
      armedAtEpochMs: 0,
      armedHourBand: "NIGHT_DEEP",
      deadlineEpochMs,
      susEventWritten: false,
    };
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({
        zone: moderate,
        hourBand: "DAWN",
        armedHourBand: null,
        armedAtEpochMs: null,
      }),
    );

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: 12 * SECONDS_PER_MINUTE,
    });
  });

  it("hydrates recovery before validating the ambient active context", () => {
    const automaticIntervalSec = checkInDelaySec(
      DEFAULT_RULES,
      "AUTO_ZONE",
      "HIGH",
      "NIGHT_DEEP",
    );
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "SHADOW",
      armMode: "AUTO_ZONE",
      zoneId: HIGH_ZONE.stationId,
      armedAtEpochMs: 0,
      armedHourBand: "NIGHT_DEEP",
      deadlineEpochMs: automaticIntervalSec * EPOCH_MS_PER_SECOND,
      susEventWritten: false,
    };

    const result = onEvent(
      "SHADOW",
      { kind: "AppKilledRestart", persisted },
      context({ armedHourBand: null }),
    );

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: automaticIntervalSec,
    });
  });

  it("cleans up live effects when recovery restores an inactive snapshot", () => {
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "RESOLVED",
      armMode: "AUTO_ZONE",
      zoneId: HIGH_ZONE.stationId,
      armedAtEpochMs: 0,
      armedHourBand: "NIGHT_DEEP",
      deadlineEpochMs: null,
      susEventWritten: true,
      outcome: "CANCELLED",
    };

    const result = onEvent(
      "SHADOW",
      { kind: "AppKilledRestart", persisted },
      context({ armedHourBand: null }),
    );

    expect(result).toEqual({
      state: "RESOLVED",
      outcome: "CANCELLED",
      commands: [{ kind: "StopLocationWatch" }, { kind: "ReleaseWakeLock" }],
    });
  });

  it("fires an overdue recovered Shadow deadline immediately", () => {
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "SHADOW",
      armMode: "AUTO_ZONE",
      zoneId: HIGH_ZONE.stationId,
      armedAtEpochMs: 0,
      armedHourBand: "NIGHT_DEEP",
      deadlineEpochMs: 0,
      susEventWritten: false,
    };
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ nowEpochMs: 1, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("CHECKIN_1");
    expect(result.commands).toContainEqual({
      kind: "ShowCheckIn",
      step: 1,
      countdownSec: 90,
      urgency: "GENTLE",
    });
  });

  it("keeps a fresh moderate Dawn attempt idle after resolution", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE);
    const result = onEvent(
      "IDLE",
      { kind: "ZoneEntered", zoneId: moderate.stationId },
      context({
        zone: moderate,
        hourBand: "DAWN",
        armedHourBand: null,
        armedAtEpochMs: null,
      }),
    );

    expect(result).toEqual({ state: "IDLE", commands: [] });
  });

  it("keeps manual sessions at ten minutes in every current band", () => {
    const bands: readonly HourBand[] = [
      "NIGHT_DEEP",
      "DAWN",
      "DAY",
      "NIGHT_EARLY",
      "NIGHT_LATE",
    ];

    bands.forEach((hourBand) => {
      const result = onEvent(
        "CHECKIN_1",
        { kind: "OkTapped" },
        context({ armMode: "MANUAL", armedHourBand: null, hourBand }),
      );
      expect(result.commands).toContainEqual({
        kind: "ScheduleTimer",
        id: "CHECKIN",
        delaySec: 10 * SECONDS_PER_MINUTE,
      });
    });
  });

  it("emits nothing merely because the current hour band changes", () => {
    const result = onEvent(
      "SHADOW",
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      context({ hourBand: "DAY", armedHourBand: "NIGHT_DEEP" }),
    );

    expect(result).toEqual({ state: "SHADOW", commands: [] });
    expect(backendCommands(result.commands)).toEqual([]);
    expect(notificationCommands(result.commands)).toEqual([]);
  });

  it("rejects invalid recovered automatic data without inventing a fallback", () => {
    const persisted: PersistedSession = {
      sessionId: "session",
      state: "SHADOW",
      armMode: "AUTO_ZONE",
      zoneId: HIGH_ZONE.stationId,
      armedAtEpochMs: 0,
      armedHourBand: null,
      deadlineEpochMs: 0,
      susEventWritten: false,
    };

    expect(() =>
      onEvent(
        "IDLE",
        { kind: "AppKilledRestart", persisted },
        context({ armedHourBand: null }),
      ),
    ).toThrow("armedHourBand");
  });
});
