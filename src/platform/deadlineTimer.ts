import type { SessionRepository } from "../data/repository/sessionRepository";
import type { PersistedSession, TimerId } from "../domain/model/session";
import {
  browserClock,
  browserScheduler,
  secondsToEpochMs,
  type Clock,
  type Scheduler,
} from "./clock";

export class AbsoluteDeadlineTimer {
  private hint: unknown = null;
  private timerId: TimerId | null = null;
  private generation = 0;

  constructor(
    private readonly sessions: SessionRepository,
    private readonly onDeadline: (timerId: TimerId) => void,
    private readonly clock: Clock = browserClock,
    private readonly scheduler: Scheduler = browserScheduler,
  ) {}

  async schedule(
    session: PersistedSession,
    timerId: TimerId,
    delaySec: number,
  ): Promise<PersistedSession> {
    this.cancelHint();
    const generation = this.generation;
    const deadlineEpochMs =
      this.clock.nowEpochMs() + secondsToEpochMs(delaySec);
    const persisted = { ...session, deadlineEpochMs };
    await this.sessions.saveCurrent(persisted);
    if (this.generation !== generation) return persisted;
    this.timerId = timerId;
    this.scheduleHint(deadlineEpochMs);
    return persisted;
  }

  restoreHint(session: PersistedSession, timerId: TimerId): void {
    this.cancelHint();
    if (session.deadlineEpochMs === null) return;
    this.timerId = timerId;
    this.scheduleHint(session.deadlineEpochMs);
  }

  cancel(): void {
    this.cancelHint();
    this.timerId = null;
  }

  private scheduleHint(deadlineEpochMs: number): void {
    const generation = this.generation;
    const remainingEpochMs = Math.max(
      0,
      deadlineEpochMs - this.clock.nowEpochMs(),
    );
    this.hint = this.scheduler.schedule(() => {
      if (this.generation !== generation) return;
      this.hint = null;
      if (this.clock.nowEpochMs() < deadlineEpochMs) {
        this.scheduleHint(deadlineEpochMs);
        return;
      }
      const timerId = this.timerId;
      this.timerId = null;
      if (timerId !== null) this.onDeadline(timerId);
    }, remainingEpochMs);
  }

  private cancelHint(): void {
    this.generation += 1;
    if (this.hint === null) return;
    this.scheduler.cancel(this.hint);
    this.hint = null;
  }
}
