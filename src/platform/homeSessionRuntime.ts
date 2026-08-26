import type { SessionRepository } from "../data/repository/sessionRepository";
import type {
  Command,
  PersistedSession,
  SessionEvent,
  SessionState,
  TimerId,
} from "../domain/model/session";
import type { Zone } from "../domain/model/zone";
import type {
  RuntimeSessionBridge,
  RuntimeSessionSnapshot,
} from "./armingRuntime";
import {
  browserClock,
  browserScheduler,
  type Clock,
  type Scheduler,
} from "./clock";
import { AbsoluteDeadlineTimer } from "./deadlineTimer";

export interface PersistableSessionBridge extends RuntimeSessionBridge {
  persistedSession(): PersistedSession | null;
  setDeadlineEpochMs(deadlineEpochMs: number | null): void;
}

export interface HomeSessionRuntimeCallbacks {
  onCommand(command: Command): void;
  onError(error: unknown): void;
}

export interface HomeLocationSessionLifecycle {
  startAfterConsent(): void;
  stop(): void;
  synchronizeSessionState(): void;
}

export interface HomeWakeLockLifecycle {
  setArmed(armed: boolean): Promise<void>;
}

/**
 * Executes the pure engine's browser-facing intents. The engine remains the
 * only state machine; this class owns browser clocks, IndexedDB, geolocation,
 * and Wake Lock side effects.
 */
export class HomeSessionRuntime {
  private readonly deadlineTimer: AbsoluteDeadlineTimer;
  private work: Promise<void> = Promise.resolve();

  constructor(
    private readonly session: PersistableSessionBridge,
    private readonly sessions: SessionRepository,
    private readonly zones: readonly Zone[],
    private readonly location: HomeLocationSessionLifecycle,
    private readonly wakeLock: HomeWakeLockLifecycle,
    private readonly callbacks: HomeSessionRuntimeCallbacks,
    private readonly clock: Clock = browserClock,
    scheduler: Scheduler = browserScheduler,
  ) {
    this.deadlineTimer = new AbsoluteDeadlineTimer(
      sessions,
      (timerId) => this.fire(timerId),
      clock,
      scheduler,
    );
  }

  handle(commands: readonly Command[], resultingState: SessionState): void {
    for (const command of commands) {
      this.callbacks.onCommand(command);
    }
    const schedule = commands.find(
      (command): command is Extract<Command, { kind: "ScheduleTimer" }> =>
        command.kind === "ScheduleTimer",
    );

    this.enqueue(async () => {
      for (const command of commands) {
        await this.applyEffect(command);
      }
      this.location.synchronizeSessionState();

      const persisted = this.session.persistedSession();
      const currentState = this.session.snapshot().state;
      if (
        resultingState === "RESOLVED" ||
        persisted === null ||
        currentState === "IDLE"
      ) {
        await this.sessions.clearCurrent();
        return;
      }

      // A synchronous browser failure can dispatch a new engine event while a
      // command batch is being applied. The newer batch owns persistence.
      if (currentState !== resultingState) return;

      if (schedule === undefined) {
        await this.sessions.saveCurrent(persisted);
        return;
      }

      const updated = await this.deadlineTimer.schedule(
        persisted,
        schedule.id,
        schedule.delaySec,
      );
      const current = this.session.persistedSession();
      if (current?.sessionId === updated.sessionId) {
        this.session.setDeadlineEpochMs(updated.deadlineEpochMs);
      }
    });
  }

  restoreDeadline(session: PersistedSession, timerId: TimerId): void {
    this.deadlineTimer.restoreHint(session, timerId);
  }

  async waitForIdle(): Promise<void> {
    await this.work;
  }

  dispose(): void {
    this.deadlineTimer.cancel();
    void this.wakeLock.setArmed(false);
  }

  private async applyEffect(command: Command): Promise<void> {
    switch (command.kind) {
      case "CancelTimer":
        this.deadlineTimer.cancel();
        this.session.setDeadlineEpochMs(null);
        return;
      case "StartLocationWatch":
        this.location.startAfterConsent();
        return;
      case "StopLocationWatch":
        this.location.stop();
        return;
      case "SetLocationSampling":
        // The location runtime derives the same frozen rate from the resulting
        // state; synchronizeSessionState runs once after the command batch.
        return;
      case "RequestWakeLock":
        await this.wakeLock.setArmed(true);
        return;
      case "ReleaseWakeLock":
        await this.wakeLock.setArmed(false);
        return;
      default:
        return;
    }
  }

  private fire(timerId: TimerId): void {
    this.session.setDeadlineEpochMs(null);
    const event: SessionEvent =
      timerId === "CHECKIN"
        ? { kind: "CheckInTimerFired" }
        : { kind: "CountdownExpired", timer: timerId };
    const snapshot = this.session.snapshot();
    this.session.dispatch(event, {
      nowEpochMs: this.clock.nowEpochMs(),
      zone: this.zoneById(snapshot),
    });
  }

  private zoneById(snapshot: RuntimeSessionSnapshot): Zone | null {
    if (snapshot.activeZoneId === null) return null;
    return (
      this.zones.find((zone) => zone.stationId === snapshot.activeZoneId) ??
      null
    );
  }

  private enqueue(task: () => Promise<void>): void {
    this.work = this.work.then(task).catch((error: unknown) => {
      this.callbacks.onError(error);
    });
  }
}

export function createLocalSessionId(): string {
  return crypto.randomUUID();
}
