import type { SessionRepository } from "../data/repository/sessionRepository";
import type { PersistedSession, SessionState } from "../domain/model/session";
import { browserClock, type Clock } from "./clock";

export interface LocationLifecycle {
  resumePreviouslyConsented(): void;
  pauseForHiddenPage(): void;
  stop(): void;
}

export interface WakeLockLifecycle {
  setArmed(armed: boolean): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
}

export interface VisibilitySource {
  readonly visibilityState: "visible" | "hidden";
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

export interface SessionRecoveryBridge {
  recover(
    persisted: PersistedSession,
    nowEpochMs: number,
  ): Promise<{ readonly state: SessionState }>;
  mayResumeLocation(): boolean;
}

export interface TabLifecycleCallbacks {
  onPageStopped(): void;
  onRecoveryError(error: unknown): void;
}

export class TabLifecycleController {
  private started = false;
  private visibilityWork: Promise<void> = Promise.resolve();

  constructor(
    private readonly visibility: VisibilitySource,
    private readonly sessions: SessionRepository,
    private readonly recovery: SessionRecoveryBridge,
    private readonly location: LocationLifecycle,
    private readonly wakeLock: WakeLockLifecycle,
    private readonly pageOwnerId: string,
    private readonly callbacks: TabLifecycleCallbacks,
    private readonly clock: Clock = browserClock,
  ) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.visibility.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    if (this.visibility.visibilityState === "visible") {
      await this.recoverVisiblePage(true);
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.visibility.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    await this.visibilityWork;
    await this.markHeartbeat();
    this.location.stop();
    await this.wakeLock.setArmed(false);
  }

  private readonly handleVisibilityChange = (): void => {
    this.visibilityWork = this.visibilityWork
      .then(() => this.applyVisibility())
      .catch((error: unknown) => {
        this.callbacks.onRecoveryError(error);
      });
  };

  async waitForIdle(): Promise<void> {
    await this.visibilityWork;
  }

  private async applyVisibility(): Promise<void> {
    if (this.visibility.visibilityState === "hidden") {
      await this.markHeartbeat();
      this.location.pauseForHiddenPage();
      await this.wakeLock.setVisible(false);
      return;
    }
    await this.wakeLock.setVisible(true);
    await this.recoverVisiblePage(false);
  }

  private async recoverVisiblePage(firstLoad: boolean): Promise<void> {
    const nowEpochMs = this.clock.nowEpochMs();
    const [persisted, heartbeat] = await Promise.all([
      this.sessions.loadCurrent(),
      this.sessions.loadHeartbeat(),
    ]);
    if (persisted === null || !isActive(persisted.state)) {
      await this.sessions.saveHeartbeat({
        ownerId: this.pageOwnerId,
        lastSeenEpochMs: nowEpochMs,
      });
      return;
    }

    const ownerChanged =
      firstLoad &&
      (heartbeat === null || heartbeat.ownerId !== this.pageOwnerId);
    const deadlinePassed =
      persisted.deadlineEpochMs !== null &&
      persisted.deadlineEpochMs <= nowEpochMs;
    if (
      (ownerChanged || deadlinePassed) &&
      isBeforeOutboundBoundary(persisted.state)
    ) {
      this.callbacks.onPageStopped();
    }

    const recovered = await this.recovery.recover(persisted, nowEpochMs);
    const active = isActive(recovered.state);
    await this.wakeLock.setArmed(active);
    if (active && this.recovery.mayResumeLocation()) {
      this.location.resumePreviouslyConsented();
    }
    await this.sessions.saveHeartbeat({
      ownerId: this.pageOwnerId,
      lastSeenEpochMs: nowEpochMs,
    });
  }

  private async markHeartbeat(): Promise<void> {
    await this.sessions.saveHeartbeat({
      ownerId: this.pageOwnerId,
      lastSeenEpochMs: this.clock.nowEpochMs(),
    });
  }
}

export function browserVisibilitySource(): VisibilitySource {
  return document;
}

export function createPageOwnerId(): string {
  return crypto.randomUUID();
}

function isActive(state: SessionState): boolean {
  return state !== "IDLE" && state !== "RESOLVED";
}

function isBeforeOutboundBoundary(state: SessionState): boolean {
  return (
    state === "SHADOW" || state === "CHECKIN_1" || state === "CHECKIN_2"
  );
}
