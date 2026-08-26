import { onEvent } from "../../../domain/engine/sessionEngine";
import type {
  ArmMode,
  Command,
  HourBand,
  Outcome,
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
  state: SessionState;
  susEventWritten: boolean;
}

export class HomeEngineBridge implements RuntimeSessionBridge {
  private memory: HomeEngineMemory = {
    activeZoneId: null,
    armedAtEpochMs: null,
    armedHourBand: null,
    armMode: "MANUAL",
    state: "IDLE",
    susEventWritten: false,
  };

  constructor(
    private readonly rules: Rules,
    private readonly hourBandAt: (epochMs: number) => HourBand,
    private readonly callbacks: HomeEngineCallbacks,
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

  dispatch(
    event: SessionEvent,
    input: { readonly nowEpochMs: number; readonly zone: Zone | null },
  ): RuntimeSessionSnapshot {
    const hourBand = this.hourBandAt(input.nowEpochMs);
    const result = onEvent(this.memory.state, event, {
      armMode: this.memory.armMode,
      armedAtEpochMs: this.memory.armedAtEpochMs,
      armedHourBand: this.memory.armedHourBand,
      cooldowns: {},
      deadlineEpochMs: null,
      hasFavourite: false,
      hourBand,
      nowEpochMs: input.nowEpochMs,
      rules: this.rules,
      susEventWritten: this.memory.susEventWritten,
      zone: input.zone,
    });

    if (result.state === "SHADOW" && this.memory.state === "IDLE") {
      const auto = event.kind === "ZoneEntered";
      this.memory = {
        activeZoneId: auto ? event.zoneId : input.zone?.stationId ?? null,
        armedAtEpochMs: input.nowEpochMs,
        armedHourBand: auto ? hourBand : null,
        armMode: auto ? "AUTO_ZONE" : "MANUAL",
        state: "SHADOW",
        susEventWritten: false,
      };
    } else {
      this.memory.state = result.state;
      if (result.commands.some(({ kind }) => kind === "WriteSusEvent")) {
        this.memory.susEventWritten = true;
      }
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
      outcome,
      state: this.memory.state,
    };
  }
}
