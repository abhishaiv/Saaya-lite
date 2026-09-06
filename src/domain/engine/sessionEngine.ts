import { shouldAutoArm } from "./armingEvaluator";
import type {
  Command,
  EngineContext,
  EngineResult,
  PersistedSession,
  RiskTier,
  SessionEvent,
  SessionState,
  SosTrigger,
  TimerId,
} from "../model/session";

export function onEvent(
  state: SessionState,
  event: SessionEvent,
  ctx: EngineContext,
): EngineResult {
  if (state === "SOS_ACTIVE") {
    if (
      event.kind === "AppKilledRestart" &&
      event.persisted.state === "SOS_ACTIVE"
    ) {
      return recoverSession(event.persisted, ctx);
    }
    if (event.kind !== "PinAccepted") return unchanged(state);
    return resolved("ESCALATED_SOS", [
      { kind: "PatchSosStatus", status: "STOPPED" },
      { kind: "StopLocationWatch" },
      { kind: "ReleaseWakeLock" },
    ]);
  }

  if (event.kind === "AppKilledRestart") {
    const recovered = recoverSession(event.persisted, ctx);
    if (isActive(state) && !isActive(recovered.state)) {
      return {
        ...recovered,
        commands: [
          ...recovered.commands,
          { kind: "StopLocationWatch" },
          { kind: "ReleaseWakeLock" },
        ],
      };
    }
    return recovered;
  }

  validateActiveContext(state, ctx);

  if (event.kind === "PermissionRevoked" && isActive(state)) {
    return resolvePermissionLoss(state, event.permission, ctx);
  }

  switch (state) {
    case "IDLE":
      return fromIdle(event, ctx);
    case "SHADOW":
      return fromShadow(event, ctx);
    case "CHECKIN_1":
      return fromCheckInOne(event, ctx);
    case "CHECKIN_2":
      return fromCheckInTwo(event, ctx);
    case "CHECKIN_3":
      return fromCheckInThree(event, ctx);
    case "FAMILY_ESCALATED":
      // Legacy persisted state only. Recovery normalizes it to CHECKIN_3 before
      // dispatch, so reaching this live would be an engine bug; stay put rather
      // than guess a transition.
      return unchanged(state);
    case "RESOLVED":
      return unchanged(state);
  }
}

function fromIdle(event: SessionEvent, ctx: EngineContext): EngineResult {
  if (event.kind === "HelpNowTapped") {
    return enterSos("MANUAL_HELP_BUTTON", ctx, false, true);
  }

  if (event.kind === "ManualArm") {
    const delaySec = ctx.rules.ladder.cadenceSec;
    return {
      state: "SHADOW",
      commands: [
        { kind: "ScheduleTimer", id: "CHECKIN", delaySec },
        { kind: "StartLocationWatch" },
        {
          kind: "SetLocationSampling",
          intervalSec: ctx.rules.samplingShadowSec,
        },
        { kind: "RequestWakeLock" },
      ],
    };
  }

  if (event.kind !== "ZoneEntered" || ctx.zone === null) {
    return unchanged("IDLE");
  }
  if (ctx.zone.stationId !== event.zoneId) return unchanged("IDLE");

  const tier = ctx.zone.riskTier as RiskTier;
  if (
    !shouldAutoArm(
      ctx.rules,
      tier,
      ctx.hourBand,
      ctx.cooldowns[event.zoneId],
      ctx.nowEpochMs,
    )
  ) {
    return unchanged("IDLE");
  }

  const delaySec = ctx.rules.ladder.cadenceSec;
  return {
    state: "SHADOW",
    commands: [
      { kind: "ScheduleTimer", id: "CHECKIN", delaySec },
      { kind: "ShowArmBanner", zoneId: event.zoneId, band: ctx.hourBand },
      { kind: "StartLocationWatch" },
      {
        kind: "SetLocationSampling",
        intervalSec: ctx.rules.samplingShadowSec,
      },
      { kind: "RequestWakeLock" },
    ],
  };
}

function fromShadow(event: SessionEvent, ctx: EngineContext): EngineResult {
  if (event.kind === "CheckInTimerFired") {
    const countdownSec = ctx.rules.ladder.window1Sec;
    return {
      state: "CHECKIN_1",
      commands: [
        { kind: "ShowCheckIn", step: 1, countdownSec, urgency: "GENTLE" },
        { kind: "ScheduleTimer", id: "CD1", delaySec: countdownSec },
      ],
    };
  }

  if (event.kind === "ZoneExited" && ctx.armMode === "AUTO_ZONE") {
    return resolved("DISARMED", [
      { kind: "CancelTimer", id: "CHECKIN" },
      { kind: "StopLocationWatch" },
      { kind: "ReleaseWakeLock" },
      { kind: "LogSessionEvent", type: "ZONE_EXIT", detail: event.zoneId },
    ]);
  }

  if (event.kind === "ManualDisarm") {
    return resolved("DISARMED", manualDisarmCommands("CHECKIN", false, ctx));
  }

  if (event.kind === "HelpNowTapped") {
    return enterSos("MANUAL_HELP_BUTTON", ctx);
  }

  return unchanged("SHADOW");
}

function fromCheckInOne(event: SessionEvent, ctx: EngineContext): EngineResult {
  // No family alert has been requested yet at step 1, so an OK here has
  // nothing to cancel.
  if (event.kind === "OkTapped") return resolveOk("CD1", ctx, false);

  if (event.kind === "CountdownExpired" && event.timer === "CD1") {
    // The first miss is the automatic family-alert trigger (founder 2026-09-06).
    // RequestFamilyAlert is an intent: the runtime may perform it as a real
    // server-mediated alert, and its failure must never suppress the ladder.
    const countdownSec = ctx.rules.ladder.window2Sec;
    return {
      state: "CHECKIN_2",
      commands: [
        { kind: "ShowCheckIn", step: 2, countdownSec, urgency: "URGENT" },
        { kind: "PlayUrgentAlert" },
        { kind: "RequestFamilyAlert" },
        { kind: "ScheduleTimer", id: "CD2", delaySec: countdownSec },
      ],
    };
  }

  if (event.kind === "ManualDisarm") {
    return resolved("DISARMED", manualDisarmCommands("CD1", true, ctx));
  }

  if (event.kind === "HelpNowTapped") {
    return enterSos("MANUAL_HELP_BUTTON", ctx, true);
  }

  return unchanged("CHECKIN_1");
}

function fromCheckInTwo(event: SessionEvent, ctx: EngineContext): EngineResult {
  if (event.kind === "OkTapped") return resolveOk("CD2", ctx, true);

  if (event.kind === "CountdownExpired" && event.timer === "CD2") {
    const countdownSec = ctx.rules.ladder.window3Sec;
    return {
      state: "CHECKIN_3",
      commands: [
        // Successor of the old FAMILY_ESCALATED position: two unanswered
        // check-ins, so only AUTO_ZONE carries the anonymous civic intent.
        ...(ctx.armMode === "AUTO_ZONE" ? ([{ kind: "WriteSusEvent" }] as const) : []),
        { kind: "ShowCheckIn", step: 3, countdownSec, urgency: "CRITICAL" },
        { kind: "ScheduleTimer", id: "CD3", delaySec: countdownSec },
      ],
    };
  }

  if (event.kind === "ManualDisarm") {
    return resolved("DISARMED", manualDisarmCommands("CD2", true, ctx));
  }

  if (event.kind === "HelpNowTapped") {
    return enterSos("MANUAL_HELP_BUTTON", ctx, true);
  }

  return unchanged("CHECKIN_2");
}

function fromCheckInThree(event: SessionEvent, ctx: EngineContext): EngineResult {
  if (event.kind === "OkTapped") return resolveOk("CD3", ctx, true);

  if (event.kind === "CountdownExpired" && event.timer === "CD3") {
    return enterSos("LADDER_LAPSE", ctx, true);
  }

  if (event.kind === "ManualDisarm") {
    return resolved("DISARMED", manualDisarmCommands("CD3", true, ctx));
  }

  if (event.kind === "HelpNowTapped") {
    return enterSos("MANUAL_HELP_BUTTON", ctx, true);
  }

  return unchanged("CHECKIN_3");
}

function resolveOk(
  timer: TimerId,
  ctx: EngineContext,
  hasPendingFamilyAlert: boolean,
): EngineResult {
  const delaySec = ctx.rules.ladder.okResetSec;
  const commands: Command[] = [
    { kind: "CancelTimer", id: timer },
    { kind: "HideCheckIn" },
    // I'm OK resets the consecutive-miss episode and invalidates any
    // still-pending family-alert request. A provider-accepted message
    // cannot be recalled; the runtime decides what is still pending.
    ...(hasPendingFamilyAlert
      ? ([{ kind: "CancelFamilyAlert" }] as const)
      : []),
    { kind: "ScheduleTimer", id: "CHECKIN", delaySec },
  ];
  if (ctx.zone !== null) {
    commands.push({
      kind: "StartCooldown",
      zoneId: ctx.zone.stationId,
      minutes: ctx.rules.okCooldownMin,
    });
  }
  return { state: "SHADOW", commands };
}

function manualDisarmCommands(
  timer: TimerId,
  hideCheckIn: boolean,
  ctx: EngineContext,
): Command[] {
  const commands: Command[] = [{ kind: "CancelTimer", id: timer }];
  if (hideCheckIn) commands.push({ kind: "HideCheckIn" });
  commands.push({ kind: "StopLocationWatch" }, { kind: "ReleaseWakeLock" });
  if (ctx.zone !== null) {
    commands.push({
      kind: "StartCooldown",
      zoneId: ctx.zone.stationId,
      minutes: ctx.rules.manualDisarmCooldownMin,
    });
  }
  return commands;
}

function enterSos(
  trigger: SosTrigger,
  ctx: EngineContext,
  hideCheckIn = false,
  startFreshWatch = false,
): EngineResult {
  const commands: Command[] = [];
  if (hideCheckIn) commands.push({ kind: "HideCheckIn" });
  if (startFreshWatch) {
    commands.push(
      { kind: "StartLocationWatch" },
      { kind: "RequestWakeLock" },
    );
  }
  commands.push(
    { kind: "LogSessionEvent", type: "SOS_TRIGGERED" },
    { kind: "WriteSosIncident", trigger },
  );
  if (ctx.armMode === "AUTO_ZONE" && ctx.susEventWritten) {
    commands.push({ kind: "PatchSusOutcome", outcome: "ESCALATED_TO_SOS" });
  }
  commands.push(
    { kind: "ShowSos" },
    {
      kind: "SetLocationSampling",
      intervalSec: ctx.rules.samplingSosSec,
    },
    { kind: "RequirePinToStop" },
  );
  return { state: "SOS_ACTIVE", commands };
}

function resolvePermissionLoss(
  state: SessionState,
  permission: string,
  ctx: EngineContext,
): EngineResult {
  if (ctx.armMode === "MANUAL") {
    return {
      state,
      commands: [{ kind: "ShowPermissionWarning", permission }],
    };
  }

  const commands: Command[] = [
    { kind: "CancelTimer", id: "CHECKIN" },
    { kind: "CancelTimer", id: "CD1" },
    { kind: "CancelTimer", id: "CD2" },
    { kind: "CancelTimer", id: "CD3" },
    { kind: "HideCheckIn" },
    { kind: "StopLocationWatch" },
    { kind: "ReleaseWakeLock" },
    { kind: "ShowPermissionWarning", permission },
  ];
  return resolved("DISARMED", commands);
}

function recoverSession(
  persistedRaw: PersistedSession,
  ctx: EngineContext,
): EngineResult {
  // Explicit legacy migration (founder 2026-09-06): a session saved under the
  // pre-2026-09-06 two-rung ladder in FAMILY_ESCALATED represented "two
  // check-ins missed, one final window before SOS", which is CHECKIN_3 now.
  // Its persisted 60 s cancel-window deadline is reused as the final window.
  // A saved state is never silently reinterpreted or reset beyond this mapping.
  const persisted: PersistedSession =
    persistedRaw.state === "FAMILY_ESCALATED"
      ? { ...persistedRaw, state: "CHECKIN_3" }
      : persistedRaw;

  validatePersistedSession(persisted);
  if (persisted.state === "IDLE") return unchanged("IDLE");
  if (persisted.state === "RESOLVED") {
    return {
      state: "RESOLVED",
      commands: [],
      ...(persisted.outcome === undefined ? {} : { outcome: persisted.outcome }),
    };
  }

  const recoveredContext: EngineContext = {
    ...ctx,
    armMode: persisted.armMode,
    armedAtEpochMs: persisted.armedAtEpochMs,
    armedHourBand: persisted.armedHourBand,
    deadlineEpochMs: persisted.deadlineEpochMs,
    susEventWritten: persisted.susEventWritten,
  };
  const resumeCommands = locationResumeCommands(persisted.state, ctx);

  if (persisted.state === "SOS_ACTIVE") {
    return {
      state: "SOS_ACTIVE",
      commands: [
        ...resumeCommands,
        { kind: "ShowSos" },
        { kind: "RequirePinToStop" },
      ],
    };
  }

  const remainingSec = remainingDeadlineSec(
    persisted.deadlineEpochMs,
    ctx.nowEpochMs,
  );
  if (remainingSec <= 0) {
    const recoveredEvent = recoveryExpiryEvent(persisted.state);
    const advanced = onEvent(persisted.state, recoveredEvent, recoveredContext);
    return {
      ...advanced,
      commands: [
        ...locationResumeCommands(advanced.state, ctx),
        ...advanced.commands,
      ],
    };
  }

  if (persisted.state === "SHADOW") {
    return {
      state: "SHADOW",
      commands: [
        ...resumeCommands,
        { kind: "ScheduleTimer", id: "CHECKIN", delaySec: remainingSec },
      ],
    };
  }

  if (persisted.state === "CHECKIN_1") {
    return {
      state: "CHECKIN_1",
      commands: [
        ...resumeCommands,
        {
          kind: "ShowCheckIn",
          step: 1,
          countdownSec: remainingSec,
          urgency: "GENTLE",
        },
        { kind: "ScheduleTimer", id: "CD1", delaySec: remainingSec },
      ],
    };
  }

  if (persisted.state === "CHECKIN_2") {
    return {
      state: "CHECKIN_2",
      commands: [
        ...resumeCommands,
        {
          kind: "ShowCheckIn",
          step: 2,
          countdownSec: remainingSec,
          urgency: "URGENT",
        },
        { kind: "ScheduleTimer", id: "CD2", delaySec: remainingSec },
      ],
    };
  }

  return {
    state: "CHECKIN_3",
    commands: [
      ...resumeCommands,
      {
        kind: "ShowCheckIn",
        step: 3,
        countdownSec: remainingSec,
        urgency: "CRITICAL",
      },
      { kind: "ScheduleTimer", id: "CD3", delaySec: remainingSec },
    ],
  };
}

function locationResumeCommands(
  state: SessionState,
  ctx: EngineContext,
): Command[] {
  return [
    { kind: "StartLocationWatch" },
    {
      kind: "SetLocationSampling",
      intervalSec:
        state === "SOS_ACTIVE"
          ? ctx.rules.samplingSosSec
          : ctx.rules.samplingShadowSec,
    },
    { kind: "RequestWakeLock" },
  ];
}

function remainingDeadlineSec(
  deadlineEpochMs: number | null,
  nowEpochMs: number,
): number {
  if (deadlineEpochMs === null) {
    throw new Error("Recovered ladder state is missing its absolute deadline");
  }
  const epochMsPerSecond = 1000; // GROUNDED-EXEMPT: SI unit conversion
  return Math.ceil((deadlineEpochMs - nowEpochMs) / epochMsPerSecond);
}

function recoveryExpiryEvent(state: SessionState): SessionEvent {
  if (state === "SHADOW") return { kind: "CheckInTimerFired" };
  if (state === "CHECKIN_1") {
    return { kind: "CountdownExpired", timer: "CD1" };
  }
  if (state === "CHECKIN_2") {
    return { kind: "CountdownExpired", timer: "CD2" };
  }
  if (state === "CHECKIN_3") {
    return { kind: "CountdownExpired", timer: "CD3" };
  }
  throw new Error("Only a timed state can expire during recovery");
}

function validateActiveContext(state: SessionState, ctx: EngineContext): void {
  if (!isActive(state)) return;
  if (ctx.armMode === "AUTO_ZONE" && ctx.armedHourBand === null) {
    throw new Error("An active AUTO_ZONE session requires armedHourBand");
  }
  if (ctx.armMode === "MANUAL" && ctx.armedHourBand !== null) {
    throw new Error("A MANUAL session must not carry armedHourBand");
  }
}

function validatePersistedSession(persisted: PersistedSession): void {
  if (!isActive(persisted.state)) return;
  if (
    persisted.armMode === "AUTO_ZONE" &&
    persisted.armedHourBand === null
  ) {
    throw new Error("Recovered AUTO_ZONE session is missing armedHourBand");
  }
  if (persisted.armMode === "MANUAL" && persisted.armedHourBand !== null) {
    throw new Error("Recovered MANUAL session must not carry armedHourBand");
  }
}

function isActive(state: SessionState): boolean {
  return state !== "IDLE" && state !== "RESOLVED";
}

function resolved(
  outcome: "CANCELLED" | "ESCALATED_SOS" | "DISARMED",
  commands: Command[],
): EngineResult {
  return { state: "RESOLVED", outcome, commands };
}

function unchanged(state: SessionState): EngineResult {
  return { state, commands: [] };
}
