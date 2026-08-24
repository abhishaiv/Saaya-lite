import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { PersistedSession } from "../../domain/model/session";
import type {
  RuntimeHeartbeat,
  SessionRepository,
} from "../repository/sessionRepository";

interface SaayaSessionDatabase extends DBSchema {
  current_session: {
    key: "current";
    value: PersistedSession;
  };
  runtime_heartbeat: {
    key: "runtime";
    value: RuntimeHeartbeat;
  };
}

const DATABASE_NAME = "saaya-lite-session";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial IndexedDB schema version.
const CURRENT_SESSION_KEY = "current";
const RUNTIME_HEARTBEAT_KEY = "runtime";

export class IndexedDbSessionRepository implements SessionRepository {
  private databasePromise: Promise<IDBPDatabase<SaayaSessionDatabase>> | null =
    null;

  async loadCurrent(): Promise<PersistedSession | null> {
    return (
      (await (await this.database()).get(
        "current_session",
        CURRENT_SESSION_KEY,
      )) ?? null
    );
  }

  async saveCurrent(session: PersistedSession): Promise<void> {
    await (await this.database()).put(
      "current_session",
      session,
      CURRENT_SESSION_KEY,
    );
  }

  async clearCurrent(): Promise<void> {
    await (await this.database()).delete(
      "current_session",
      CURRENT_SESSION_KEY,
    );
  }

  async loadHeartbeat(): Promise<RuntimeHeartbeat | null> {
    return (
      (await (await this.database()).get(
        "runtime_heartbeat",
        RUNTIME_HEARTBEAT_KEY,
      )) ?? null
    );
  }

  async saveHeartbeat(heartbeat: RuntimeHeartbeat): Promise<void> {
    await (await this.database()).put(
      "runtime_heartbeat",
      heartbeat,
      RUNTIME_HEARTBEAT_KEY,
    );
  }

  private database(): Promise<IDBPDatabase<SaayaSessionDatabase>> {
    this.databasePromise ??= openDB<SaayaSessionDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains("current_session")) {
            database.createObjectStore("current_session");
          }
          if (!database.objectStoreNames.contains("runtime_heartbeat")) {
            database.createObjectStore("runtime_heartbeat");
          }
        },
      },
    );
    return this.databasePromise;
  }
}
