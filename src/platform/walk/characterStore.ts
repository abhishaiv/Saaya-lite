/**
 * Where her character lives, and what happens when it does not.
 *
 * `DATA_MODEL.md`: the character is a field on the `settings` record, **device only, never
 * uploaded**, and absent is valid. `MAP_SPEC.md`: she is asked to make one on the first
 * switch, and only if no character exists.
 *
 * The load is a discriminated result rather than a nullable selection, because an absent
 * character and a rejected one lead to the same screen for different reasons. An absent
 * one means she has never made a choice. A rejected one means she made a choice that no
 * longer resolves, and `characterParts.ts` requires that case to be *rejected* rather than
 * defaulted: rendering a stale selection as a silent default would show her a character
 * that looks like her choice and is not.
 *
 * **Storage is behind an interface so the logic is testable without a browser.** The suite
 * runs in the node environment; IndexedDB is not there. The same shape `demoModeStore.ts`
 * uses, for the same reason.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  DEFAULT_CHARACTER,
  parseCharacterSelection,
  type CharacterSelection,
} from "./characterParts";

interface SaayaSettingsDatabase extends DBSchema {
  settings: {
    key: string;
    value: string;
  };
}

/** The narrow slice of storage this needs. */
export interface CharacterStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

export type CharacterLoad =
  | { readonly kind: "absent" }
  | { readonly kind: "invalid" }
  | { readonly kind: "loaded"; readonly selection: CharacterSelection };

/**
 * The database the character is stored in.
 *
 * **A separate database, deliberately.** `DATA_MODEL.md` puts the character in the
 * `settings` store and warns in the same breath against a version bump, because the
 * upgrade handler it documents drops every store on a mismatch and that would take her
 * favourites, her PIN hash and any session in flight with it. The web schema as shipped
 * has no `settings` store at all, so honouring the name would mean bumping the session
 * database to version 2. Opening a second database instead is the version bump's intent
 * without its risk: `saaya-lite-session` is never opened here, never upgraded, and cannot
 * be touched by anything in this file. Recorded in progress.md, 2026-09-12.
 */
const DATABASE_NAME = "saaya-lite-settings";
const DATABASE_VERSION = 1; // GROUNDED-EXEMPT: initial IndexedDB schema version for the settings database.
const SETTINGS_STORE = "settings";
const CHARACTER_KEY = "character";

/**
 * Read and classify the stored character.
 *
 * Named for what it returns rather than plain `loadCharacter`, because `walkCharacter.ts`
 * already exports that for building the rig. Two different loads of two different things
 * should not share a name in one directory.
 */
export async function loadCharacterSelection(
  storage: CharacterStorage,
): Promise<CharacterLoad> {
  let raw: string | null;
  try {
    raw = await storage.read();
  } catch {
    // A storage the browser refuses to open is the same as no character yet, which asks
    // her once and is recoverable. Throwing would take the whole screen down instead.
    return { kind: "absent" };
  }
  if (raw === null) return { kind: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "invalid" };
  }
  const selection = parseCharacterSelection(parsed);
  if (selection === null) return { kind: "invalid" };
  return { kind: "loaded", selection };
}

/**
 * The character to draw with, given a load result.
 *
 * A rejected selection falls back to the default *for drawing* while the screen still
 * asks her, so the walk view is never unrenderable and the loss is never silent.
 */
export function characterOrDefault(load: CharacterLoad): CharacterSelection {
  return load.kind === "loaded" ? load.selection : DEFAULT_CHARACTER;
}

/** Whether she has to be asked. True for both an absent and a rejected character. */
export function needsCharacter(load: CharacterLoad): boolean {
  return load.kind !== "loaded";
}

export async function saveCharacter(
  storage: CharacterStorage,
  selection: CharacterSelection,
): Promise<void> {
  await storage.write(JSON.stringify(selection));
}

/** The IndexedDB-backed storage, or `null` on a browser that has none. */
export function browserCharacterStorage(): CharacterStorage | null {
  if (typeof indexedDB === "undefined") return null;
  let databasePromise: Promise<IDBPDatabase<SaayaSettingsDatabase>> | null = null;
  const database = (): Promise<IDBPDatabase<SaayaSettingsDatabase>> => {
    databasePromise ??= openDB<SaayaSettingsDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(db) {
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE);
          }
        },
      },
    );
    return databasePromise;
  };
  return {
    async read(): Promise<string | null> {
      const value: unknown = await (
        await database()
      ).get(SETTINGS_STORE, CHARACTER_KEY);
      return typeof value === "string" ? value : null;
    },
    async write(value: string): Promise<void> {
      await (await database()).put(SETTINGS_STORE, value, CHARACTER_KEY);
    },
  };
}
