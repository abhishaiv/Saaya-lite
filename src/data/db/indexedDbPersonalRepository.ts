import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  EMPTY_PERSONAL_STATE,
  nextTopSpots,
  type PersonalRepository,
  type PersonalState,
  type SavedPlace,
} from "../repository/personalRepository";

/** Everything except the saved places, which are one record each. */
interface PersonalSettings {
  readonly checkInsAccepted: number;
  readonly firstUsedAtEpochMs: number | null;
  readonly picks: readonly string[];
  readonly topSpots: readonly string[];
}

interface PersonalDatabase extends DBSchema {
  places: {
    key: string;
    value: SavedPlace;
  };
  settings: {
    key: "current";
    value: PersonalSettings;
  };
}

const DATABASE_NAME = "saaya-lite-personal";
const DATABASE_VERSION = 1;
const SETTINGS_KEY = "current";

/**
 * Her lists, in her browser's own database, and nowhere else. This repository has no network
 * call in it and no method that could grow one: `save` writes a key, `load` reads the keys,
 * and the only thing that ever leaves the device is what she chooses to share from a sheet.
 *
 * The split between the two stores is the one the shape asks for: a place is a record per
 * place because there can be many of them and each carries its own stamp, while the counters,
 * the picks and the stars are one small record she either has or does not.
 */
export class IndexedDbPersonalRepository implements PersonalRepository {
  private databasePromise: Promise<IDBPDatabase<PersonalDatabase>> | null = null;

  async load(): Promise<PersonalState> {
    const database = await this.database();
    const [saved, settings] = await Promise.all([
      database.getAll("places"),
      this.settings(),
    ]);
    return {
      checkInsAccepted: settings.checkInsAccepted,
      firstUsedAtEpochMs: settings.firstUsedAtEpochMs,
      picks: settings.picks,
      savedPlaces: [...saved].sort(
        (a, b) => b.savedAtEpochMs - a.savedAtEpochMs,
      ),
      topSpots: settings.topSpots,
    };
  }

  async markFirstUse(epochMs: number): Promise<void> {
    const settings = await this.settings();
    if (settings.firstUsedAtEpochMs !== null) return;
    await this.saveSettings({ ...settings, firstUsedAtEpochMs: epochMs });
  }

  async recordCheckInAccepted(): Promise<void> {
    const settings = await this.settings();
    await this.saveSettings({
      ...settings,
      checkInsAccepted: settings.checkInsAccepted + 1,
    });
  }

  async savePlace(placeId: string, epochMs: number): Promise<void> {
    await (await this.database()).put("places", {
      placeId,
      savedAtEpochMs: epochMs,
    });
  }

  async unsavePlace(placeId: string): Promise<void> {
    const database = await this.database();
    await database.delete("places", placeId);
    const settings = await this.settings();
    await this.saveSettings({
      ...settings,
      topSpots: settings.topSpots.filter((id) => id !== placeId),
    });
  }

  async setTopSpot(placeId: string, starred: boolean): Promise<void> {
    const settings = await this.settings();
    await this.saveSettings({
      ...settings,
      topSpots: nextTopSpots(settings.topSpots, placeId, starred),
    });
  }

  async setPicks(picks: readonly string[]): Promise<void> {
    const settings = await this.settings();
    await this.saveSettings({ ...settings, picks: [...picks] });
  }

  private async saveSettings(settings: PersonalSettings): Promise<void> {
    await (await this.database()).put("settings", settings, SETTINGS_KEY);
  }

  private async settings(): Promise<PersonalSettings> {
    const value = await (await this.database()).get("settings", SETTINGS_KEY);
    return isPersonalSettings(value)
      ? value
      : {
          checkInsAccepted: EMPTY_PERSONAL_STATE.checkInsAccepted,
          firstUsedAtEpochMs: EMPTY_PERSONAL_STATE.firstUsedAtEpochMs,
          picks: EMPTY_PERSONAL_STATE.picks,
          topSpots: EMPTY_PERSONAL_STATE.topSpots,
        };
  }

  private database(): Promise<IDBPDatabase<PersonalDatabase>> {
    this.databasePromise ??= openDB<PersonalDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains("places")) {
            database.createObjectStore("places", { keyPath: "placeId" });
          }
          if (!database.objectStoreNames.contains("settings")) {
            database.createObjectStore("settings");
          }
        },
      },
    );
    return this.databasePromise;
  }
}

function isPersonalSettings(
  value: PersonalSettings | undefined,
): value is PersonalSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value.picks) &&
    Array.isArray(value.topSpots) &&
    typeof value.checkInsAccepted === "number"
  );
}
