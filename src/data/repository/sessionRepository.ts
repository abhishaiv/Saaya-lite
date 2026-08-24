import type { PersistedSession } from "../../domain/model/session";

export interface RuntimeHeartbeat {
  readonly ownerId: string;
  readonly lastSeenEpochMs: number;
}

export interface SessionRepository {
  loadCurrent(): Promise<PersistedSession | null>;
  saveCurrent(session: PersistedSession): Promise<void>;
  clearCurrent(): Promise<void>;
  loadHeartbeat(): Promise<RuntimeHeartbeat | null>;
  saveHeartbeat(heartbeat: RuntimeHeartbeat): Promise<void>;
}

export class FakeSessionRepository implements SessionRepository {
  current: PersistedSession | null = null;
  heartbeat: RuntimeHeartbeat | null = null;

  async loadCurrent(): Promise<PersistedSession | null> {
    return this.current;
  }

  async saveCurrent(session: PersistedSession): Promise<void> {
    this.current = session;
  }

  async clearCurrent(): Promise<void> {
    this.current = null;
  }

  async loadHeartbeat(): Promise<RuntimeHeartbeat | null> {
    return this.heartbeat;
  }

  async saveHeartbeat(heartbeat: RuntimeHeartbeat): Promise<void> {
    this.heartbeat = heartbeat;
  }
}
