import { describe, expect, it } from "vitest";

import { selectHighestRiskZone } from "./armingEvaluator";
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

function makePersisted(
  state: PersistedSession["state"],
  overrides: Partial<PersistedSession> = {},
): PersistedSession {
  return {
    sessionId: "session",
    state,
    armMode: "AUTO_ZONE",
    zoneId: HIGH_ZONE.stationId,
    armedAtEpochMs: 0,
    armedHourBand: "NIGHT_DEEP",
    deadlineEpochMs: null,
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

function familyAlertCommands(commands: readonly Command[]): Command[] {
  return commands.filter((command) =>
    ["RequestFamilyAlert", "CancelFamilyAlert"].includes(command.kind),
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

  it("arms manually at the flat cadence without a zone", () => {
    const result = onEvent(
      "IDLE",
      { kind: "ManualArm" },
      context({ zone: null, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toEqual([
      {
        kind: "ScheduleTimer",
        id: "CHECKIN",
        delaySec: 5 * SECONDS_PER_MINUTE,
      },
      { kind: "StartLocationWatch" },
      { kind: "SetLocationSampling", intervalSec: DEFAULT_RULES.samplingShadowSec },
      { kind: "RequestWakeLock" },
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
    expect(familyAlertCommands(result.commands)).toEqual([]);
  });

  it("drives the full three-rung ladder at the exact frozen timings", () => {
    const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, context());
    const second = onEvent(
      first.state,
      { kind: "CountdownExpired", timer: "CD1" },
      context(),
    );
    const third = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      context(),
    );
    const sos = onEvent(
      third.state,
      { kind: "CountdownExpired", timer: "CD3" },
      context({ susEventWritten: true }),
    );

    expect(first.state).toBe("CHECKIN_1");
    expect(first.commands).toEqual([
      {
        kind: "ShowCheckIn",
        step: 1,
        countdownSec: 2 * SECONDS_PER_MINUTE,
        urgency: "GENTLE",
      },
      {
        kind: "ScheduleTimer",
        id: "CD1",
        delaySec: 2 * SECONDS_PER_MINUTE,
      },
    ]);
    expect(second.state).toBe("CHECKIN_2");
    expect(second.commands).toEqual([
      {
        kind: "ShowCheckIn",
        step: 2,
        countdownSec: SECONDS_PER_MINUTE,
        urgency: "URGENT",
      },
      { kind: "PlayUrgentAlert" },
      { kind: "RequestFamilyAlert" },
      { kind: "ScheduleTimer", id: "CD2", delaySec: SECONDS_PER_MINUTE },
    ]);
    expect(third.state).toBe("CHECKIN_3");
    expect(third.commands).toEqual([
      { kind: "WriteSusEvent" },
      {
        kind: "ShowCheckIn",
        step: 3,
        countdownSec: SECONDS_PER_MINUTE,
        urgency: "CRITICAL",
      },
      { kind: "ScheduleTimer", id: "CD3", delaySec: SECONDS_PER_MINUTE },
    ]);
    expect(sos.state).toBe("SOS_ACTIVE");
    expect(sos.commands).toContainEqual({ kind: "HideCheckIn" });
    expect(sos.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
    expect(sos.commands).toContainEqual({
      kind: "PatchSusOutcome",
      outcome: "ESCALATED_TO_SOS",
    });
    expect(sos.commands).toContainEqual({ kind: "ShowSos" });
    expect(sos.commands).toContainEqual({ kind: "RequirePinToStop" });
  });

  it("requests the family alert exactly once, at the first miss", () => {
    const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, context());
    const second = onEvent(
      first.state,
      { kind: "CountdownExpired", timer: "CD1" },
      context(),
    );
    const third = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      context(),
    );
    const sos = onEvent(
      third.state,
      { kind: "CountdownExpired", timer: "CD3" },
      context({ susEventWritten: true }),
    );

    expect(familyAlertCommands(first.commands)).toEqual([]);
    expect(familyAlertCommands(second.commands)).toEqual([
      { kind: "RequestFamilyAlert" },
    ]);
    expect(familyAlertCommands(third.commands)).toEqual([]);
    expect(familyAlertCommands(sos.commands)).toEqual([]);
  });

  it("writes nothing before the third rung and details only at SOS", () => {
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
    const third = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      context(),
    );
    const sos = onEvent(
      third.state,
      { kind: "CountdownExpired", timer: "CD3" },
      context({ susEventWritten: true }),
    );

    expect(
      backendCommands([...arm.commands, ...first.commands, ...second.commands]),
    ).toEqual([]);
    expect(backendCommands(third.commands)).toEqual([{ kind: "WriteSusEvent" }]);
    expect(
      third.commands.some((command) => command.kind === "WriteSosIncident"),
    ).toBe(false);
    expect(sos.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
  });

  it("keeps a manual ladder local through the third rung", () => {
    const manual = (overrides: Partial<EngineContext> = {}): EngineContext =>
      context({ armMode: "MANUAL", armedHourBand: null, zone: null, ...overrides });
    const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, manual());
    const second = onEvent(
      first.state,
      { kind: "CountdownExpired", timer: "CD1" },
      manual(),
    );
    const third = onEvent(
      second.state,
      { kind: "CountdownExpired", timer: "CD2" },
      manual(),
    );
    const sos = onEvent(
      third.state,
      { kind: "CountdownExpired", timer: "CD3" },
      manual({ susEventWritten: true }),
    );

    expect(third.state).toBe("CHECKIN_3");
    expect(backendCommands(third.commands)).toEqual([]);
    expect(sos.state).toBe("SOS_ACTIVE");
    expect(backendCommands(sos.commands)).toEqual([
      { kind: "WriteSosIncident", trigger: "LADDER_LAPSE" },
    ]);
  });

  it.each([
    ["CHECKIN_1", "CD1", false],
    ["CHECKIN_2", "CD2", true],
    ["CHECKIN_3", "CD3", true],
  ] as const)(
    "answers OK from %s and reschedules the episode",
    (state, timer, hasPendingFamilyAlert) => {
      const result = onEvent(state, { kind: "OkTapped" }, context());

      const expected: Command[] = [
        { kind: "CancelTimer", id: timer },
        { kind: "HideCheckIn" },
        ...(hasPendingFamilyAlert
          ? ([{ kind: "CancelFamilyAlert" }] as const)
          : []),
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
      ];
      expect(result.state).toBe("SHADOW");
      expect(result.commands).toEqual(expected);
    },
  );

  it("omits the cooldown when OK resolves outside a zone", () => {
    const result = onEvent("CHECKIN_3", { kind: "OkTapped" }, context({ zone: null }));

    expect(result.state).toBe("SHADOW");
    expect(
      result.commands.some((command) => command.kind === "StartCooldown"),
    ).toBe(false);
  });

  it.each([
    ["CHECKIN_1", "CD1"],
    ["CHECKIN_2", "CD2"],
    ["CHECKIN_3", "CD3"],
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
    expect(familyAlertCommands(result.commands)).toEqual([]);
    expect(result.commands.some((command) => command.kind === "RequirePinToStop")).toBe(
      false,
    );
  });

  it("disarms from Shadow without hiding a check-in", () => {
    const result = onEvent("SHADOW", { kind: "ManualDisarm" }, context());

    expect(result).toEqual({
      state: "RESOLVED",
      outcome: "DISARMED",
      commands: [
        { kind: "CancelTimer", id: "CHECKIN" },
        { kind: "StopLocationWatch" },
        { kind: "ReleaseWakeLock" },
        {
          kind: "StartCooldown",
          zoneId: HIGH_ZONE.stationId,
          minutes: 45,
        },
      ],
    });
  });

  it("ignores expiry events for superseded rung timers", () => {
    expect(
      onEvent("CHECKIN_2", { kind: "CountdownExpired", timer: "CD1" }, context()),
    ).toEqual({ state: "CHECKIN_2", commands: [] });
    expect(
      onEvent("CHECKIN_3", { kind: "CountdownExpired", timer: "CD2" }, context()),
    ).toEqual({ state: "CHECKIN_3", commands: [] });
    expect(
      onEvent("CHECKIN_1", { kind: "CountdownExpired", timer: "CD2" }, context()),
    ).toEqual({ state: "CHECKIN_1", commands: [] });
  });

  it("does not claim the civic write completed when the final rung reaches SOS", () => {
    const result = onEvent(
      "CHECKIN_3",
      { kind: "CountdownExpired", timer: "CD3" },
      context({ susEventWritten: false }),
    );

    expect(result.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
    expect(result.commands).not.toContainEqual({
      kind: "PatchSusOutcome",
      outcome: "ESCALATED_TO_SOS",
    });
  });

  it("leaves a live FAMILY_ESCALATED dispatch unchanged", () => {
    // FAMILY_ESCALATED is a legacy persisted state only; a live dispatch is an
    // engine bug and the engine defends by staying put.
    const ctx = context();
    expect(onEvent("FAMILY_ESCALATED", { kind: "OkTapped" }, ctx)).toEqual({
      state: "FAMILY_ESCALATED",
      commands: [],
    });
    expect(
      onEvent("FAMILY_ESCALATED", { kind: "CountdownExpired", timer: "CD3" }, ctx),
    ).toEqual({ state: "FAMILY_ESCALATED", commands: [] });
  });

  it("enters SOS directly from Shadow without fabricating a civic signal", () => {
    const result = onEvent("SHADOW", { kind: "HelpNowTapped" }, context());

    expect(result.state).toBe("SOS_ACTIVE");
    expect(result.commands).not.toContainEqual({ kind: "WriteSusEvent" });
    expect(result.commands).not.toContainEqual({
      kind: "PatchSusOutcome",
      outcome: "ESCALATED_TO_SOS",
    });
    expect(result.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "MANUAL_HELP_BUTTON",
    });
  });

  it.each(["CHECKIN_1", "CHECKIN_2", "CHECKIN_3"] as const)(
    "enters SOS from %s via the help button",
    (state) => {
      const result = onEvent(state, { kind: "HelpNowTapped" }, context());

      expect(result.state).toBe("SOS_ACTIVE");
      expect(result.commands).toContainEqual({ kind: "HideCheckIn" });
      expect(result.commands).toContainEqual({
        kind: "WriteSosIncident",
        trigger: "MANUAL_HELP_BUTTON",
      });
      expect(result.commands).toContainEqual({ kind: "ShowSos" });
      expect(result.commands).toContainEqual({ kind: "RequirePinToStop" });
      expect(result.commands).not.toContainEqual({ kind: "WriteSusEvent" });
    },
  );

  it("lets an idle user raise SOS directly and starts the browser-facing watch", () => {
    const result = onEvent(
      "IDLE",
      { kind: "HelpNowTapped" },
      context({ armedAtEpochMs: null, armedHourBand: null, zone: null }),
    );

    expect(result.state).toBe("SOS_ACTIVE");
    expect(result.commands).toContainEqual({ kind: "StartLocationWatch" });
    expect(result.commands).toContainEqual({ kind: "RequestWakeLock" });
    expect(result.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "MANUAL_HELP_BUTTON",
    });
    expect(result.commands).not.toContainEqual({ kind: "WriteSusEvent" });
  });

  it("keeps every manual ladder state running when location is revoked", () => {
    const states = [
      "SHADOW",
      "CHECKIN_1",
      "CHECKIN_2",
      "CHECKIN_3",
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

  it.each(["SHADOW", "CHECKIN_1", "CHECKIN_2", "CHECKIN_3"] as const)(
    "disarms an automatic session on revoked location from %s",
    (state) => {
      const result = onEvent(
        state,
        { kind: "PermissionRevoked", permission: "geolocation" },
        context(),
      );

      expect(result).toEqual({
        state: "RESOLVED",
        outcome: "DISARMED",
        commands: [
          { kind: "CancelTimer", id: "CHECKIN" },
          { kind: "CancelTimer", id: "CD1" },
          { kind: "CancelTimer", id: "CD2" },
          { kind: "CancelTimer", id: "CD3" },
          { kind: "HideCheckIn" },
          { kind: "StopLocationWatch" },
          { kind: "ReleaseWakeLock" },
          { kind: "ShowPermissionWarning", permission: "geolocation" },
        ],
      });
    },
  );

  it("keeps SOS sticky for every event except a valid PIN", () => {
    const persisted = makePersisted("SOS_ACTIVE", { susEventWritten: true });
    const ignored: readonly SessionEvent[] = [
      { kind: "ZoneEntered", zoneId: HIGH_ZONE.stationId },
      { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
      { kind: "ManualArm" },
      { kind: "ManualDisarm" },
      { kind: "CheckInTimerFired" },
      { kind: "CountdownExpired", timer: "CD3" },
      { kind: "OkTapped" },
      { kind: "HelpNowTapped" },
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
          persisted: makePersisted("IDLE"),
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

  it("does not resolve on a zone exit during a check-in rung", () => {
    expect(
      onEvent(
        "CHECKIN_2",
        { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
        context(),
      ),
    ).toEqual({ state: "CHECKIN_2", commands: [] });
    expect(
      onEvent(
        "CHECKIN_3",
        { kind: "ZoneExited", zoneId: HIGH_ZONE.stationId },
        context(),
      ),
    ).toEqual({ state: "CHECKIN_3", commands: [] });
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

  it("compresses the demo ladder to ten-second windows without changing writes", () => {
    const normal = context({ rules: DEFAULT_RULES });
    const demo = context({ rules: DEMO_RULES });

    const run = (ctx: EngineContext) => {
      const first = onEvent("SHADOW", { kind: "CheckInTimerFired" }, ctx);
      const second = onEvent(
        "CHECKIN_1",
        { kind: "CountdownExpired", timer: "CD1" },
        ctx,
      );
      const third = onEvent(
        "CHECKIN_2",
        { kind: "CountdownExpired", timer: "CD2" },
        ctx,
      );
      const sos = onEvent(
        "CHECKIN_3",
        { kind: "CountdownExpired", timer: "CD3" },
        { ...ctx, susEventWritten: true },
      );
      const all = [first, second, third, sos];
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
    expect(normalRun.delays).toEqual([
      2 * SECONDS_PER_MINUTE,
      SECONDS_PER_MINUTE,
      SECONDS_PER_MINUTE,
    ]);
    expect(demoRun.delays).toEqual([10, 10, 10]);
    expect(demoRun.writes).toEqual(normalRun.writes);

    const ok = onEvent("CHECKIN_2", { kind: "OkTapped" }, demo);
    expect(ok.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: 10,
    });
  });

  it("reschedules at the flat cadence after the current band changes", () => {
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
      delaySec: 5 * SECONDS_PER_MINUTE,
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

  it("recovers the remaining check-in window from the absolute deadline", () => {
    const moderate = makeZone("moderate", RiskTier.MODERATE);
    const deadlineEpochMs =
      12 * SECONDS_PER_MINUTE * EPOCH_MS_PER_SECOND;
    const persisted = makePersisted("SHADOW", {
      zoneId: moderate.stationId,
      deadlineEpochMs,
    });
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

  it.each([
    ["CHECKIN_1", "CD1", 1, "GENTLE"],
    ["CHECKIN_2", "CD2", 2, "URGENT"],
    ["CHECKIN_3", "CD3", 3, "CRITICAL"],
  ] as const)("recovers %s with its persisted remaining window", (state, timer, step, urgency) => {
    const persisted = makePersisted(state, { deadlineEpochMs: 45 * EPOCH_MS_PER_SECOND });
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe(state);
    expect(result.commands).toContainEqual({
      kind: "ShowCheckIn",
      step,
      countdownSec: 45,
      urgency,
    });
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: timer,
      delaySec: 45,
    });
  });

  it.each([
    ["SHADOW", "CHECKIN_1", null],
    ["CHECKIN_1", "CHECKIN_2", null],
    ["CHECKIN_2", "CHECKIN_3", { kind: "WriteSusEvent" }],
    [
      "CHECKIN_3",
      "SOS_ACTIVE",
      { kind: "WriteSosIncident", trigger: "LADDER_LAPSE" },
    ],
  ] as const)("advances an overdue recovered %s through its expiry event", (from, to, marker) => {
    const persisted = makePersisted(from, { deadlineEpochMs: 0 });
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ nowEpochMs: 1, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe(to);
    if (marker !== null) expect(result.commands).toContainEqual(marker);
  });

  it("migrates a legacy FAMILY_ESCALATED snapshot to the final rung", () => {
    const persisted = makePersisted("FAMILY_ESCALATED", {
      deadlineEpochMs: 45 * EPOCH_MS_PER_SECOND,
    });
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("CHECKIN_3");
    expect(result.commands).toContainEqual({
      kind: "ShowCheckIn",
      step: 3,
      countdownSec: 45,
      urgency: "CRITICAL",
    });
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CD3",
      delaySec: 45,
    });
  });

  it("sends a lapsed legacy FAMILY_ESCALATED snapshot straight to SOS", () => {
    const persisted = makePersisted("FAMILY_ESCALATED", { deadlineEpochMs: 0 });
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ nowEpochMs: 1, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("SOS_ACTIVE");
    expect(result.commands).toContainEqual({
      kind: "WriteSosIncident",
      trigger: "LADDER_LAPSE",
    });
  });

  it("hydrates recovery before validating the ambient active context", () => {
    const cadenceSec = DEFAULT_RULES.ladder.cadenceSec;
    const persisted = makePersisted("SHADOW", {
      deadlineEpochMs: cadenceSec * EPOCH_MS_PER_SECOND,
    });

    const result = onEvent(
      "SHADOW",
      { kind: "AppKilledRestart", persisted },
      context({ armedHourBand: null }),
    );

    expect(result.state).toBe("SHADOW");
    expect(result.commands).toContainEqual({
      kind: "ScheduleTimer",
      id: "CHECKIN",
      delaySec: cadenceSec,
    });
  });

  it("cleans up live effects when recovery restores an inactive snapshot", () => {
    const persisted = makePersisted("RESOLVED", {
      susEventWritten: true,
      outcome: "CANCELLED",
    });

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
    const persisted = makePersisted("SHADOW", { deadlineEpochMs: 0 });
    const result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context({ nowEpochMs: 1, armedHourBand: null, armedAtEpochMs: null }),
    );

    expect(result.state).toBe("CHECKIN_1");
    expect(result.commands).toContainEqual({
      kind: "ShowCheckIn",
      step: 1,
      countdownSec: 2 * SECONDS_PER_MINUTE - 1 / EPOCH_MS_PER_SECOND,
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

  it("keeps manual sessions on the flat cadence in every current band", () => {
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
        delaySec: 5 * SECONDS_PER_MINUTE,
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
    expect(familyAlertCommands(result.commands)).toEqual([]);
  });

  it("rejects invalid recovered automatic data without inventing a fallback", () => {
    const persisted = makePersisted("SHADOW", { armedHourBand: null, deadlineEpochMs: 0 });

    expect(() =>
      onEvent(
        "IDLE",
        { kind: "AppKilledRestart", persisted },
        context({ armedHourBand: null }),
      ),
    ).toThrow("armedHourBand");
  });
});
