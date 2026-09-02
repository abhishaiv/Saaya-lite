import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  pendingRecords,
  type EnqueueIfAbsentResult,
  type QueuedRecord,
  type QueuedRecordInput,
  type QueueRepository,
} from "../repository/queueRepository";

interface QueueDatabaseSchema extends DBSchema {
  queued_event: {
    indexes: {
      by_operation_id: string;
      by_dedupe_key: string;
      by_session_and_type: [string, string];
      by_status: string;
    };
    key: number;
    value: QueuedRecord;
  };
}

const DATABASE_NAME = "saaya-lite-queue";
const DATABASE_VERSION = 2; // GROUNDED-EXEMPT: adds a unique local idempotency key.
const STORE_NAME = "queued_event";

export class IndexedDbQueueRepository implements QueueRepository {
  private databasePromise: Promise<IDBPDatabase<QueueDatabaseSchema>> | null =
    null;

  async clear(): Promise<void> {
    await (await this.database()).clear(STORE_NAME);
  }

  async enqueue(item: QueuedRecordInput): Promise<number> {
    return (await (await this.database()).add(STORE_NAME, item as QueuedRecord)) as number;
  }

  async enqueueIfAbsent(
    item: QueuedRecordInput,
  ): Promise<EnqueueIfAbsentResult> {
    const database = await this.database();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const index = transaction.store.index("by_dedupe_key");
      const existing = await index.get(item.dedupeKey);
      if (existing !== undefined) {
        await transaction.done;
        return { created: false, record: existing as QueuedRecord };
      }
      const id = (await transaction.store.add(item as QueuedRecord)) as number;
      const record = await transaction.store.get(id);
      await transaction.done;
      if (record === undefined) {
        throw new Error("Queue transaction did not return its record");
      }
      return { created: true, record: record as QueuedRecord };
    } catch (error: unknown) {
      // A concurrent transaction can lose the unique-index race. Resolve the
      // winner rather than creating a second remote document id.
      const existing = await this.getByDedupeKey(item.dedupeKey);
      if (existing !== null) return { created: false, record: existing };
      throw error;
    }
  }

  async getAll(): Promise<QueuedRecord[]> {
    return (await (await this.database()).getAll(STORE_NAME)) as QueuedRecord[];
  }

  async getByDedupeKey(dedupeKey: string): Promise<QueuedRecord | null> {
    return (
      ((await (await this.database()).getFromIndex(
        STORE_NAME,
        "by_dedupe_key",
        dedupeKey,
      )) as QueuedRecord | undefined) ?? null
    );
  }

  async getById(id: number): Promise<QueuedRecord | null> {
    return ((await (await this.database()).get(STORE_NAME, id)) as QueuedRecord | undefined) ?? null;
  }

  async getByOperationId(operationId: string): Promise<QueuedRecord | null> {
    return (
      ((await (await this.database()).getFromIndex(
        STORE_NAME,
        "by_operation_id",
        operationId,
      )) as QueuedRecord | undefined) ?? null
    );
  }

  async getBySessionAndType(
    localSessionId: string,
    type: QueuedRecord["type"],
  ): Promise<QueuedRecord | null> {
    return (
      ((await (await this.database()).getFromIndex(
        STORE_NAME,
        "by_session_and_type",
        [localSessionId, type],
      )) as QueuedRecord | undefined) ?? null
    );
  }

  async getPending(nowEpochMs: number): Promise<QueuedRecord[]> {
    return pendingRecords(await this.getAll(), nowEpochMs);
  }

  async markFailed(
    id: number,
    attempts: number,
    nextAttemptEpochMs: number | null,
    error?: string,
  ): Promise<void> {
    const record = await this.getById(id);
    if (record === null) return;
    await (await this.database()).put(STORE_NAME, {
      ...record,
      attempts,
      lastError: error,
      nextAttemptEpochMs: nextAttemptEpochMs ?? record.nextAttemptEpochMs,
      status: nextAttemptEpochMs === null ? "FAILED_PERMANENT" : "PENDING",
    });
  }

  async markSending(id: number, nowEpochMs: number): Promise<void> {
    const record = await this.getById(id);
    if (record === null) return;
    await (await this.database()).put(STORE_NAME, {
      ...record,
      lastAttemptEpochMs: nowEpochMs,
      status: "SENDING",
    });
  }

  async markSent(id: number): Promise<void> {
    const record = await this.getById(id);
    if (record === null) return;
    await (await this.database()).put(STORE_NAME, { ...record, status: "SENT" });
  }

  async recoverInFlight(): Promise<void> {
    const database = await this.database();
    const records = await this.getAll();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    for (const record of records) {
      if (record.status !== "SENDING") continue;
      await transaction.store.put({ ...record, status: "PENDING" });
    }
    await transaction.done;
  }

  private database(): Promise<IDBPDatabase<QueueDatabaseSchema>> {
    this.databasePromise ??= openDB<QueueDatabaseSchema>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database, _oldVersion, _newVersion, transaction) {
          const store = database.objectStoreNames.contains(STORE_NAME)
            ? transaction.objectStore(STORE_NAME)
            : database.createObjectStore(STORE_NAME, {
                autoIncrement: true,
                keyPath: "id",
              });
          if (!store.indexNames.contains("by_status")) {
            store.createIndex("by_status", "status");
          }
          if (!store.indexNames.contains("by_operation_id")) {
            store.createIndex("by_operation_id", "operationId", { unique: true });
          }
          if (!store.indexNames.contains("by_dedupe_key")) {
            store.createIndex("by_dedupe_key", "dedupeKey", { unique: true });
          }
          if (!store.indexNames.contains("by_session_and_type")) {
            store.createIndex("by_session_and_type", ["localSessionId", "type"]);
          }
        },
      },
    );
    return this.databasePromise;
  }
}
