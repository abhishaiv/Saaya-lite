import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  sortQueueByPriority,
} from "../../domain/queue/backoffPolicy";
import type {
  QueuedRecord,
  QueueRepository,
} from "../repository/queueRepository";

interface QueueDatabaseSchema extends DBSchema {
  queued_event: {
    key: number;
    value: QueuedRecord;
    indexes: {
      by_status: string;
    };
  };
}

const DATABASE_NAME = "saaya-lite-queue";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial IndexedDB schema version.
const OBJECT_STORE_NAME = "queued_event";

export class IndexedDbQueueRepository implements QueueRepository {
  private databasePromise: Promise<IDBPDatabase<QueueDatabaseSchema>> | null =
    null;

  async enqueue(item: Omit<QueuedRecord, "id">): Promise<number> {
    const database = await this.database();
    const id = (await database.add(
      OBJECT_STORE_NAME,
      item as QueuedRecord,
    )) as number;
    return id;
  }

  async getPending(nowEpochMs: number): Promise<QueuedRecord[]> {
    const database = await this.database();
    const all = await database.getAll(OBJECT_STORE_NAME);
    const pending = all.filter(
      (item) =>
        (item.status === "PENDING" || item.status === "SENDING") &&
        item.nextAttemptEpochMs <= nowEpochMs,
    );
    return sortQueueByPriority(pending);
  }

  async markSending(id: number, nowEpochMs: number): Promise<void> {
    const database = await this.database();
    const item = await database.get(OBJECT_STORE_NAME, id);
    if (!item) return;
    await database.put(OBJECT_STORE_NAME, {
      ...item,
      status: "SENDING",
      lastAttemptEpochMs: nowEpochMs,
    });
  }

  async markSent(id: number, remoteId?: string): Promise<void> {
    const database = await this.database();
    const item = await database.get(OBJECT_STORE_NAME, id);
    if (!item) return;
    await database.put(OBJECT_STORE_NAME, {
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
    const database = await this.database();
    const item = await database.get(OBJECT_STORE_NAME, id);
    if (!item) return;

    if (nextAttemptEpochMs === null) {
      await database.put(OBJECT_STORE_NAME, {
        ...item,
        status: "FAILED_PERMANENT",
        attempts,
        lastError: error,
      });
    } else {
      await database.put(OBJECT_STORE_NAME, {
        ...item,
        status: "PENDING",
        attempts,
        nextAttemptEpochMs,
        lastError: error,
      });
    }
  }

  async getById(id: number): Promise<QueuedRecord | null> {
    const database = await this.database();
    return (await database.get(OBJECT_STORE_NAME, id)) ?? null;
  }

  async getAll(): Promise<QueuedRecord[]> {
    const database = await this.database();
    return await database.getAll(OBJECT_STORE_NAME);
  }

  async clear(): Promise<void> {
    const database = await this.database();
    await database.clear(OBJECT_STORE_NAME);
  }

  private database(): Promise<IDBPDatabase<QueueDatabaseSchema>> {
    this.databasePromise ??= openDB<QueueDatabaseSchema>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            const store = database.createObjectStore(OBJECT_STORE_NAME, {
              keyPath: "id",
              autoIncrement: true,
            });
            store.createIndex("by_status", "status");
          }
        },
      },
    );
    return this.databasePromise;
  }
}
