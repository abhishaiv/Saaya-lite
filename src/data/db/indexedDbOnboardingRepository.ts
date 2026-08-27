import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { PinHasher, StoredPinHash } from "../../platform/pinHash";
import type { Favourite, OnboardingRepository } from "../repository/onboardingRepository";

interface OnboardingSettings {
  readonly onboarded: boolean;
  readonly pin: StoredPinHash | null;
}

interface OnboardingDatabase extends DBSchema {
  favourite: {
    key: "primary";
    value: Favourite;
  };
  settings: {
    key: "current";
    value: OnboardingSettings;
  };
}

const DATABASE_NAME = "saaya-lite-onboarding";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial isolated IndexedDB schema version.
const SETTINGS_KEY = "current";
const PRIMARY_FAVOURITE_KEY = "primary";

/** IndexedDB-backed local-only onboarding data. It never has a remote dependency. */
export class IndexedDbOnboardingRepository implements OnboardingRepository {
  private databasePromise: Promise<IDBPDatabase<OnboardingDatabase>> | null =
    null;

  constructor(private readonly pinHasher: PinHasher) {}

  async loadOnboarded(): Promise<boolean> {
    return (await this.settings()).onboarded;
  }

  async loadPrimaryFavourite(): Promise<Favourite | null> {
    return (
      (await (await this.database()).get("favourite", PRIMARY_FAVOURITE_KEY)) ??
      null
    );
  }

  async saveOnboarded(): Promise<void> {
    const database = await this.database();
    const settings = await this.settings();
    await database.put("settings", { ...settings, onboarded: true }, SETTINGS_KEY);
  }

  async savePin(pin: string): Promise<void> {
    const database = await this.database();
    const settings = await this.settings();
    await database.put(
      "settings",
      { ...settings, pin: await this.pinHasher.create(pin) },
      SETTINGS_KEY,
    );
  }

  async savePrimaryFavourite(favourite: Favourite): Promise<void> {
    await (await this.database()).put(
      "favourite",
      favourite,
      PRIMARY_FAVOURITE_KEY,
    );
  }

  async verifyPin(pin: string): Promise<boolean> {
    const stored = (await this.settings()).pin;
    return stored === null ? false : this.pinHasher.verify(pin, stored);
  }

  private async settings(): Promise<OnboardingSettings> {
    return (
      (await (await this.database()).get("settings", SETTINGS_KEY)) ?? {
        onboarded: false,
        pin: null,
      }
    );
  }

  private database(): Promise<IDBPDatabase<OnboardingDatabase>> {
    this.databasePromise ??= openDB<OnboardingDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains("settings")) {
            database.createObjectStore("settings");
          }
          if (!database.objectStoreNames.contains("favourite")) {
            database.createObjectStore("favourite");
          }
        },
      },
    );
    return this.databasePromise;
  }
}
