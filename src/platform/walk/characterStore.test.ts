import { describe, expect, it } from "vitest";

import {
  CHARACTER_AXES,
  DEFAULT_CHARACTER,
  type CharacterSelection,
} from "./characterParts";
import {
  characterOrDefault,
  loadCharacterSelection,
  needsCharacter,
  saveCharacter,
  type CharacterStorage,
} from "./characterStore";

/** An in-memory stand-in for the device store. */
function fakeStorage(initial: string | null = null): CharacterStorage & {
  readonly value: () => string | null;
} {
  let value = initial;
  return {
    read: async () => value,
    write: async (next: string) => {
      value = next;
    },
    value: () => value,
  };
}

/** A storage the browser refuses to open, which is a real case on a locked-down device. */
const DENIED_STORAGE: CharacterStorage = {
  read: async () => {
    throw new Error("denied");
  },
  write: async () => {
    throw new Error("denied");
  },
};

const SELECTED: CharacterSelection = { ...DEFAULT_CHARACTER, hair: "hair_buns" };

describe("loadCharacterSelection", () => {
  it("reports an absent character rather than inventing a default", async () => {
    expect(await loadCharacterSelection(fakeStorage())).toEqual({ kind: "absent" });
  });

  it("reads back a character that was saved", async () => {
    const storage = fakeStorage();
    await saveCharacter(storage, SELECTED);
    expect(await loadCharacterSelection(storage)).toEqual({
      kind: "loaded",
      selection: SELECTED,
    });
  });

  it("rejects a value that is not JSON rather than defaulting silently", async () => {
    expect(await loadCharacterSelection(fakeStorage("not json at all"))).toEqual({
      kind: "invalid",
    });
  });

  it("rejects a character naming a part that no longer exists", async () => {
    const stale = { ...DEFAULT_CHARACTER, hair: "hair_mohawk" };
    expect(await loadCharacterSelection(fakeStorage(JSON.stringify(stale)))).toEqual({
      kind: "invalid",
    });
  });

  it("rejects a character missing an axis", async () => {
    const partial: Record<string, string> = { ...DEFAULT_CHARACTER };
    delete partial.hair;
    expect(await loadCharacterSelection(fakeStorage(JSON.stringify(partial)))).toEqual({
      kind: "invalid",
    });
  });

  it("rejects a character stored as an array or a bare string", async () => {
    expect(await loadCharacterSelection(fakeStorage("[1,2,3]"))).toEqual({ kind: "invalid" });
    expect(await loadCharacterSelection(fakeStorage('"hair_buns"'))).toEqual({
      kind: "invalid",
    });
  });

  it("treats a storage the browser refuses to open as no character yet", async () => {
    // Not a throw: an unopenable store is recoverable, and taking the screen down for it
    // would cost her the whole walk view.
    expect(await loadCharacterSelection(DENIED_STORAGE)).toEqual({ kind: "absent" });
  });

  it("saves one id per axis and nothing else", async () => {
    const storage = fakeStorage();
    await saveCharacter(storage, SELECTED);
    const stored = JSON.parse(storage.value() ?? "null") as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(
      CHARACTER_AXES.map((axis) => axis.id).sort(),
    );
    for (const axis of CHARACTER_AXES) {
      expect(axis.options).toContain(stored[axis.id]);
    }
  });
});

describe("what the caller does with a load", () => {
  it("asks her only when there is no usable character", () => {
    expect(needsCharacter({ kind: "absent" })).toBe(true);
    expect(needsCharacter({ kind: "invalid" })).toBe(true);
    expect(needsCharacter({ kind: "loaded", selection: SELECTED })).toBe(false);
  });

  it("draws with her character when there is one, and the default when there is not", () => {
    expect(characterOrDefault({ kind: "loaded", selection: SELECTED })).toEqual(
      SELECTED,
    );
    expect(characterOrDefault({ kind: "absent" })).toEqual(DEFAULT_CHARACTER);
    expect(characterOrDefault({ kind: "invalid" })).toEqual(DEFAULT_CHARACTER);
  });
});
