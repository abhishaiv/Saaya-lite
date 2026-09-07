import { onEvent } from "../../../domain/engine/sessionEngine";
import { DEFAULT_RULES, DEMO_RULES } from "../../../domain/engine/rules";
import type {
  ArmMode,
  Command,
  HourBand,
  Outcome,
  PersistedSession,
  Rules,
  SessionEvent,
  SessionState,
} from "../../../domain/model/session";
import type { Zone } from "../../../domain/model/zone";
import type {
  RuntimeSessionBridge,
  RuntimeSessionSnapshot,
} from "../../../platform/armingRuntime";

export interface HomeEngineView extends RuntimeSessionSnapshot {
  readonly armMode: ArmMode;
  readonly armedAtEpochMs: number | null;
  readonly armedHourBand: HourBand | null;
  readonly deadlineEpochMs: number | null;
  readonly outcome: Outcome | null;
}

export interface HomeEngineCallbacks {
  onCommands(commands: readonly Command[], view: HomeEngineView): void;
  onView(view: HomeEngineView): void;
}

interface HomeEngineMemory {
  activeZoneId: string | null;
  armedAtEpochMs: number | null;
  armedHourBand: HourBand | null;
  armMode: ArmMode;
  cooldowns: Record<string, number>;
  deadlineEpochMs: number | null;
  sessionId: string | null;
  state: SessionState;
  susEventWritten: boolean;
}

export class HomeEngineBridge implements RuntimeSessionBridge {
  private alertEpisodeEpochMs: number | null = null;
  private liveCooldowns: Record<string, number> | null = null;

  familyAlertOperationId(): string | null {
    return this.memory.sessionId === null || this.alertEpisodeEpochMs === null
      ? null : `${this.memory.sessionId}:${this.alertEpisodeEpochMs}:family-alert`;
  }
  private memory: HomeEngineMemory = {
    activeZoneId: null,
    armedAtEpochMs: null,
    armedHourBand: null,
    armMode: "MANUAL",
    cooldowns: {},
    deadlineEpochMs: null,
    sessionId: null,
    state: "IDLE",
    susEventWritten: false,
  };

  constructor(
    private rules: Rules,
    private readonly hourBandAt: (epochMs: number) => HourBand,
    private readonly callbacks: HomeEngineCallbacks,
    private readonly createSessionId: () => string,
  ) {}

  snapshot(): RuntimeSessionSnapshot {
    return {
      activeZoneId: this.memory.activeZoneId,
      state: this.memory.state,
    };
  }

  view(): HomeEngineView {
    return this.currentView(null);
  }

  setRules(rules: Rules): void {
    if (rules === DEMO_RULES && this.rules !== DEMO_RULES) {
      this.liveCooldowns = { ...this.memory.cooldowns };
      this.memory.cooldowns = {};
    } else if (rules === DEFAULT_RULES && this.rules === DEMO_RULES) {
      this.memory.cooldowns = this.liveCooldowns ?? {};
      this.liveCooldowns = null;
    }
    this.rules = rules;
  }

  resetForDemo(): boolean {
    if (this.memory.state === "IDLE") return true;
    // The demo reset must never bypass the PIN: refusing while SOS is active
    // keeps the only exit from SOS on the PIN path (plan §B, 2026-09-06).
    if (this.memory.state === "SOS_ACTIVE") return false;
    const cleanup: Command[] = [
      { kind: "CancelTimer", id: "CHECKIN" },
      { kind: "CancelTimer", id: "CD1" },
      { kind: "CancelTimer", id: "CD2" },
      { kind: "CancelTimer", id: "CD3" },
      { kind: "CancelFamilyAlert" },
      { kind: "HideCheckIn" },
      { kind: "StopLocationWatch" },
      { kind: "ReleaseWakeLock" },
    ];
    this.callbacks.onCommands(cleanup, {
      ...this.currentView("CANCELLED"),
      state: "RESOLVED",
    });
    this.memory = {
      activeZoneId: null,
      armedAtEpochMs: null,
      armedHourBand: null,
      armMode: "MANUAL",
      cooldowns: this.memory.cooldowns,
      deadlineEpochMs: null,
      sessionId: null,
      state: "IDLE",
      susEventWritten: false,
    };
    this.callbacks.onView(this.currentView("CANCELLED"));
    return true;
  }

  persistedSession(): PersistedSession | null {
    if (
      this.memory.sessionId === null ||
      this.memory.armedAtEpochMs === null ||
      this.memory.state === "IDLE"
    ) {
      return null;
    }
    return {
      sessionId: this.memory.sessionId,
      state: this.memory.state,
      armMode: this.memory.armMode,
      zoneId: this.memory.activeZoneId,
      armedAtEpochMs: this.memory.armedAtEpochMs,
      armedHourBand: this.memory.armedHourBand,
      deadlineEpochMs: this.memory.deadlineEpochMs,
      susEventWritten: this.memory.susEventWritten,
    };
  }

  setDeadlineEpochMs(deadlineEpochMs: number | null): void {
    if (this.memory.state === "IDLE") return;
    this.memory.deadlineEpochMs = deadlineEpochMs;
    this.callbacks.onView(this.currentView(null));
  }

  recover(
    persisted: PersistedSession,
    input: { readonly nowEpochMs: number; readonly zone: Zone | null },
  ): RuntimeSessionSnapshot {
    // Lite has no writer in this round. A stale persisted flag must not resurrect the
    // future delivery contract into the local-only runtime after a reload.
    const localPersisted: PersistedSession = {
      ...persisted,
      susEventWritten: false,
    };
    this.memory = {
      activeZoneId: localPersisted.zoneId,
      armedAtEpochMs: localPersisted.armedAtEpochMs,
      armedHourBand: localPersisted.armedHourBand,
      armMode: localPersisted.armMode,
      cooldowns: this.memory.cooldowns,
      deadlineEpochMs: localPersisted.deadlineEpochMs,
      sessionId: localPersisted.sessionId,
      state: localPersisted.state,
      susEventWritten: false,
    };
    return this.dispatch({ kind: "AppKilledRestart", persisted: localPersisted }, input);
  }

  dispatch(
    event: SessionEvent,
    input: {
      readonly nowEpochMs: number;
      readonly zone: Zone | null;
      readonly hourBand?: HourBand;
    },
  ): RuntimeSessionSnapshot {
    const hourBand = input.hourBand ?? this.hourBandAt(input.nowEpochMs);
    const result = onEvent(this.memory.state, event, {
      armMode: this.memory.armMode,
      armedAtEpochMs: this.memory.armedAtEpochMs,
      armedHourBand: this.memory.armedHourBand,
      cooldowns: this.memory.cooldowns,
      deadlineEpochMs: this.memory.deadlineEpochMs,
      hasFavourite: false,
      hourBand,
      nowEpochMs: input.nowEpochMs,
      rules: this.rules,
      susEventWritten: this.memory.susEventWritten,
      zone: input.zone,
    });
    if (result.commands.some((command) => command.kind === "RequestFamilyAlert")) {
      if (event.kind === "AppKilledRestart") {
        const millisPerSecond = 1000; // GROUNDED-EXEMPT: SI conversion for a private episode identity.
        this.alertEpisodeEpochMs = event.persisted.deadlineEpochMs === null ? null :
          event.persisted.deadlineEpochMs + (event.persisted.state === "SHADOW"
            ? this.rules.ladder.window1Sec * millisPerSecond : 0);
      } else this.alertEpisodeEpochMs = this.memory.deadlineEpochMs;
    }

    if (
      (result.state === "SHADOW" || result.state === "SOS_ACTIVE") &&
      this.memory.state === "IDLE"
    ) {
      const auto = event.kind === "ZoneEntered";
      this.memory = {
        activeZoneId: auto ? event.zoneId : input.zone?.stationId ?? null,
        armedAtEpochMs: input.nowEpochMs,
        armedHourBand: auto ? hourBand : null,
        armMode: auto ? "AUTO_ZONE" : "MANUAL",
        cooldowns: this.memory.cooldowns,
        deadlineEpochMs: null,
        sessionId: this.createSessionId(),
        state: result.state,
        susEventWritten: false,
      };
    } else {
      this.memory.state = result.state;
    }

    const scheduled = result.commands.find((command) => command.kind === "ScheduleTimer");
    if (scheduled?.kind === "ScheduleTimer") {
      const millisPerSecond = 1000; // GROUNDED-EXEMPT: SI conversion of the approved timing profile.
      this.memory.deadlineEpochMs = input.nowEpochMs + scheduled.delaySec * millisPerSecond;
    } else if (result.state === "SOS_ACTIVE" || result.state === "RESOLVED") {
      this.memory.deadlineEpochMs = null;
    }

    for (const command of result.commands) {
      if (command.kind !== "StartCooldown") continue;
      const epochMsPerMinute = 60_000; // GROUNDED-EXEMPT: SI conversion for the already-frozen cooldown duration.
      this.memory.cooldowns[command.zoneId] =
        input.nowEpochMs + command.minutes * epochMsPerMinute;
    }

    const resolvedOutcome = result.outcome ?? null;
    const view = this.currentView(resolvedOutcome);
    this.callbacks.onCommands(result.commands, view);
    this.callbacks.onView(view);

    if (result.state === "RESOLVED") {
      // RESOLVED closes one session. Home returns to quiet IDLE for the next
      // independent session; the terminal outcome remains in the callback view.
      this.memory = {
        activeZoneId: null,
        armedAtEpochMs: null,
        armedHourBand: null,
        armMode: "MANUAL",
        cooldowns: this.memory.cooldowns,
        deadlineEpochMs: null,
        sessionId: null,
        state: "IDLE",
        susEventWritten: false,
      };
      this.callbacks.onView(this.currentView(resolvedOutcome));
    }

    return this.snapshot();
  }

  private currentView(outcome: Outcome | null): HomeEngineView {
    return {
      activeZoneId: this.memory.activeZoneId,
      armMode: this.memory.armMode,
      armedAtEpochMs: this.memory.armedAtEpochMs,
      armedHourBand: this.memory.armedHourBand,
      deadlineEpochMs: this.memory.deadlineEpochMs,
      outcome,
      state: this.memory.state,
    };
  }
}
