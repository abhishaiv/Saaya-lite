import type {
  SosIncidentPayload,
  SusEventPayload,
} from "../../domain/anonymiser/anonymiser";
import {
  calculateNextRetryEpochMs,
  sortQueueByPriority,
  type QueueItemType,
} from "../../domain/queue/backoffPolicy";

export type QueuedItemStatus =
  | "PENDING"
  | "SENDING"
  | "FAILED_PERMANENT"
  | "SENT";

export interface QueuedRecord {
  readonly id?: number;
  readonly type: QueueItemType;
  readonly payload: SusEventPayload | SosIncidentPayload;
  readonly status: QueuedItemStatus;
  readonly attempts: number;
  readonly nextAttemptEpochMs: number;
  readonly lastAttemptEpochMs?: number;
  readonly lastError?: string;
  readonly remoteId?: string;
  readonly createdAtEpochMs: number;
}

export interface QueueRepository {
  enqueue(item: Omit<QueuedRecord, "id">): Promise<number>;
  getPending(nowEpochMs: number): Promise<QueuedRecord[]>;
  markSending(id: number, nowEpochMs: number): Promise<void>;
  markSent(id: number, remoteId?: string): Promise<void>;
  markFailed(
    id: number,
    attempts: number,
    nextAttemptEpochMs: number | null,
    error?: string,
  ): Promise<void>;
  getById(id: number): Promise<QueuedRecord | null>;
  getAll(): Promise<QueuedRecord[]>;
  clear(): Promise<void>;
}

export class FakeQueueRepository implements QueueRepository {
  private items = new Map<number, QueuedRecord>();
  private nextId = 1; // GROUNDED-EXEMPT: initial auto-increment ID.

  async enqueue(item: Omit<QueuedRecord, "id">): Promise<number> {
    const id = this.nextId++;
    const record: QueuedRecord = { ...item, id };
    this.items.set(id, record);
    return id;
  }

  async getPending(nowEpochMs: number): Promise<QueuedRecord[]> {
    const pending = Array.from(this.items.values()).filter(
      (item) =>
        (item.status === "PENDING" || item.status === "SENDING") &&
        item.nextAttemptEpochMs <= nowEpochMs,
    );
    return sortQueueByPriority(pending);
  }

  async markSending(id: number, nowEpochMs: number): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;
    this.items.set(id, {
      ...item,
      status: "SENDING",
      lastAttemptEpochMs: nowEpochMs,
    });
  }

  async markSent(id: number, remoteId?: string): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;
    this.items.set(id, {
      ...item,
      status: "SENT",
      remoteId: remoteId ?? item.remoteId,
    });
  }

  async markFailed(
    id: number,
    attempts: number,
    nextAttemptEpochMs: number | null,
    error?: string,
  ): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;

    if (nextAttemptEpochMs === null) {
      this.items.set(id, {
        ...item,
        status: "FAILED_PERMANENT",
        attempts,
        lastError: error,
      });
    } else {
      this.items.set(id, {
        ...item,
        status: "PENDING",
        attempts,
        nextAttemptEpochMs,
        lastError: error,
      });
    }
  }

  async getById(id: number): Promise<QueuedRecord | null> {
    return this.items.get(id) ?? null;
  }

  async getAll(): Promise<QueuedRecord[]> {
    return Array.from(this.items.values());
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}
