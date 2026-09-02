import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  DeliveryTraceEntry,
  DeliveryTraceRepository,
} from "../repository/deliveryTraceRepository";

interface DeliveryTraceDatabaseSchema extends DBSchema {
  trace: {
    key: string;
    value: readonly DeliveryTraceEntry[];
  };
}

const DATABASE_NAME = "saaya-lite-delivery-trace";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial isolated delivery-trace schema version.
const STORE_NAME = "trace";

/** Local-only trace for the exact SOS timeline. It is never sent before SOS. */
export class IndexedDbDeliveryTraceRepository
  implements DeliveryTraceRepository
{
  private databasePromise: Promise<IDBPDatabase<DeliveryTraceDatabaseSchema>> | null =
    null;

  async append(sessionId: string, entry: DeliveryTraceEntry): Promise<void> {
    const database = await this.database();
    const existing = (await database.get(STORE_NAME, sessionId)) ?? [];
    await database.put(STORE_NAME, [...existing, entry], sessionId);
  }

  async clear(sessionId: string): Promise<void> {
    await (await this.database()).delete(STORE_NAME, sessionId);
  }

  async load(sessionId: string): Promise<readonly DeliveryTraceEntry[]> {
    return (await (await this.database()).get(STORE_NAME, sessionId)) ?? [];
  }

  private database(): Promise<IDBPDatabase<DeliveryTraceDatabaseSchema>> {
    this.databasePromise ??= openDB<DeliveryTraceDatabaseSchema>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        },
      },
    );
    return this.databasePromise;
  }
}
