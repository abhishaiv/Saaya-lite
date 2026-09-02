import type {
  SosIncidentDraft,
  SosStatusPatch,
  SusEventPayload,
  SusOutcomePatch,
} from "../../domain/anonymiser/anonymiser";
import {
  sortQueueByPriority,
  type QueueItemType,
} from "../../domain/queue/backoffPolicy";

export type QueuedItemStatus =
  | "PENDING"
  | "SENDING"
  | "FAILED_PERMANENT"
  | "SENT";

interface QueueRecordBase<T extends QueueItemType, Payload> {
  readonly attempts: number;
  readonly createdAtEpochMs: number;
  /** Unique locally; it prevents concurrent command batches from duplicating a remote write. */
  readonly dedupeKey: string;
  readonly dependsOnOperationId?: string;
  /** Stable before enqueue: this is also the remote document id for a create. */
  readonly documentId: string;
  readonly id?: number;
  readonly lastAttemptEpochMs?: number;
  readonly lastError?: string;
  /** Device-local lookup key only. Writers never receive this field. */
  readonly localSessionId: string;
  readonly nextAttemptEpochMs: number;
  readonly operationId: string;
  readonly payload: Payload;
  readonly status: QueuedItemStatus;
  readonly type: T;
}

export type QueuedRecord =
  | QueueRecordBase<"SUS_CREATE", SusEventPayload>
  | QueueRecordBase<"SUS_OUTCOME_PATCH", SusOutcomePatch>
  | QueueRecordBase<"SOS_CREATE", SosIncidentDraft>
  | QueueRecordBase<"SOS_STATUS_PATCH", SosStatusPatch>;

type DistributiveOmit<T, Key extends PropertyKey> =
  T extends unknown ? Omit<T, Key> : never;

/** Keep `type` and `payload` inseparable at compile time. */
export type QueuedRecordInput = DistributiveOmit<QueuedRecord, "id">;

export interface EnqueueIfAbsentResult {
  readonly created: boolean;
  readonly record: QueuedRecord;
}

export interface QueueRepository {
  clear(): Promise<void>;
  enqueue(item: QueuedRecordInput): Promise<number>;
  enqueueIfAbsent(item: QueuedRecordInput): Promise<EnqueueIfAbsentResult>;
  getAll(): Promise<QueuedRecord[]>;
  getByDedupeKey(dedupeKey: string): Promise<QueuedRecord | null>;
  getById(id: number): Promise<QueuedRecord | null>;
  getByOperationId(operationId: string): Promise<QueuedRecord | null>;
  getBySessionAndType(
    localSessionId: string,
    type: QueueItemType,
  ): Promise<QueuedRecord | null>;
  getPending(nowEpochMs: number): Promise<QueuedRecord[]>;
  markFailed(
    id: number,
    attempts: number,
    nextAttemptEpochMs: number | null,
    error?: string,
  ): Promise<void>;
  markSending(id: number, nowEpochMs: number): Promise<void>;
  markSent(id: number): Promise<void>;
  recoverInFlight(): Promise<void>;
}

export class FakeQueueRepository implements QueueRepository {
  private records = new Map<number, QueuedRecord>();
  private readonly inFlightDedupe = new Map<
    string,
    Promise<EnqueueIfAbsentResult>
  >();
  private nextId = 1; // GROUNDED-EXEMPT: initial auto-increment id for the in-memory test double.

  async clear(): Promise<void> {
    this.records.clear();
  }

  async enqueue(item: QueuedRecordInput): Promise<number> {
    const id = this.nextId++;
    this.records.set(id, { ...item, id } as QueuedRecord);
    return id;
  }

  async enqueueIfAbsent(item: QueuedRecordInput): Promise<EnqueueIfAbsentResult> {
    const inFlight = this.inFlightDedupe.get(item.dedupeKey);
    if (inFlight !== undefined) {
      await inFlight;
      const existing = await this.getByDedupeKey(item.dedupeKey);
      if (existing === null) throw new Error("Concurrent queue insert lost its record");
      return { created: false, record: existing };
    }
    const operation = this.enqueueIfAbsentUnlocked(item).finally(() => {
      this.inFlightDedupe.delete(item.dedupeKey);
    });
    this.inFlightDedupe.set(item.dedupeKey, operation);
    return operation;
  }

  private async enqueueIfAbsentUnlocked(
    item: QueuedRecordInput,
  ): Promise<EnqueueIfAbsentResult> {
    const existing = await this.getByDedupeKey(item.dedupeKey);
    if (existing !== null) return { created: false, record: existing };
    const id = await this.enqueue(item);
    const record = await this.getById(id);
    if (record === null) throw new Error("Queue insert did not return its record");
    return { created: true, record };
  }

  async getAll(): Promise<QueuedRecord[]> {
    return Array.from(this.records.values());
  }

  async getByDedupeKey(dedupeKey: string): Promise<QueuedRecord | null> {
    return (
      Array.from(this.records.values()).find(
        (record) => record.dedupeKey === dedupeKey,
      ) ?? null
    );
  }

  async getById(id: number): Promise<QueuedRecord | null> {
    return this.records.get(id) ?? null;
  }

  async getByOperationId(operationId: string): Promise<QueuedRecord | null> {
    return (
      Array.from(this.records.values()).find(
        (record) => record.operationId === operationId,
      ) ?? null
    );
  }

  async getBySessionAndType(
    localSessionId: string,
    type: QueueItemType,
  ): Promise<QueuedRecord | null> {
    return (
      Array.from(this.records.values()).find(
        (record) =>
          record.localSessionId === localSessionId && record.type === type,
      ) ?? null
    );
  }

  async getPending(nowEpochMs: number): Promise<QueuedRecord[]> {
    return pendingRecords(Array.from(this.records.values()), nowEpochMs);
  }

  async markFailed(
    id: number,
    attempts: number,
    nextAttemptEpochMs: number | null,
    error?: string,
  ): Promise<void> {
    const existing = this.records.get(id);
    if (existing === undefined) return;
    this.records.set(id, {
      ...existing,
      attempts,
      lastError: error,
      nextAttemptEpochMs: nextAttemptEpochMs ?? existing.nextAttemptEpochMs,
      status: nextAttemptEpochMs === null ? "FAILED_PERMANENT" : "PENDING",
    } as QueuedRecord);
  }

  async markSending(id: number, nowEpochMs: number): Promise<void> {
    const existing = this.records.get(id);
    if (existing === undefined) return;
    this.records.set(id, {
      ...existing,
      lastAttemptEpochMs: nowEpochMs,
      status: "SENDING",
    } as QueuedRecord);
  }

  async markSent(id: number): Promise<void> {
    const existing = this.records.get(id);
    if (existing === undefined) return;
    this.records.set(id, { ...existing, status: "SENT" } as QueuedRecord);
  }

  async recoverInFlight(): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.status !== "SENDING") continue;
      this.records.set(id, { ...record, status: "PENDING" } as QueuedRecord);
    }
  }
}

export function pendingRecords(
  records: readonly QueuedRecord[],
  nowEpochMs: number,
): QueuedRecord[] {
  const byOperationId = new Map(
    records.map((record) => [record.operationId, record]),
  );
  return sortQueueByPriority(
    records.filter((record) => {
      if (
        record.status !== "PENDING" ||
        record.nextAttemptEpochMs > nowEpochMs
      ) {
        return false;
      }
      if (record.dependsOnOperationId === undefined) return true;
      return byOperationId.get(record.dependsOnOperationId)?.status === "SENT";
    }),
  );
}
