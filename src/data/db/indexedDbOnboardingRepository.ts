import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { PinHasher, StoredPinHash } from "../../platform/pinHash";
import type {
  Favourite,
  OnboardingRepository,
  StoredLocale,
} from "../repository/onboardingRepository";

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
    key: string;
    value: OnboardingSettings | string;
  };
}

const DATABASE_NAME = "saaya-lite-onboarding";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial isolated IndexedDB schema version.
const SETTINGS_KEY = "current";
const PRIMARY_FAVOURITE_KEY = "primary";
const USER_NAME_KEY = "user_name";
const LANGUAGE_KEY = "language";

/** IndexedDB-backed local-only onboarding data. It never has a remote dependency. */
export class IndexedDbOnboardingRepository implements OnboardingRepository {
  private databasePromise: Promise<IDBPDatabase<OnboardingDatabase>> | null =
    null;

  constructor(private readonly pinHasher: PinHasher) {}

  async loadOnboarded(): Promise<boolean> {
    return (await this.settings()).onboarded;
  }

  async loadLanguage(): Promise<StoredLocale | null> {
    const value = await (await this.database()).get("settings", LANGUAGE_KEY);
    return value === "en" || value === "te" ? value : null;
  }

  async loadPrimaryFavourite(): Promise<Favourite | null> {
    return (
      (await (await this.database()).get("favourite", PRIMARY_FAVOURITE_KEY)) ??
      null
    );
  }

  async loadUserName(): Promise<string | null> {
    const value = await (await this.database()).get("settings", USER_NAME_KEY);
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  async saveOnboarded(): Promise<void> {
    const database = await this.database();
    const settings = await this.settings();
    await database.put("settings", { ...settings, onboarded: true }, SETTINGS_KEY);
  }

  async saveLanguage(locale: StoredLocale): Promise<void> {
    await (await this.database()).put("settings", locale, LANGUAGE_KEY);
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

  async saveUserName(userName: string | null): Promise<void> {
    const database = await this.database();
    if (userName === null) {
      await database.delete("settings", USER_NAME_KEY);
      return;
    }
    await database.put("settings", userName, USER_NAME_KEY);
  }

  async verifyPin(pin: string): Promise<boolean> {
    const stored = (await this.settings()).pin;
    return stored === null ? false : this.pinHasher.verify(pin, stored);
  }

  private async settings(): Promise<OnboardingSettings> {
    const value = await (await this.database()).get("settings", SETTINGS_KEY);
    return isOnboardingSettings(value)
      ? value
      : { onboarded: false, pin: null };
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

function isOnboardingSettings(
  value: OnboardingSettings | string | undefined,
): value is OnboardingSettings {
  return typeof value === "object" && value !== null && "onboarded" in value;
}
