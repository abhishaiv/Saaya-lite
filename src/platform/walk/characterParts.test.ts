import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  axisIdForPart,
  CHARACTER_AXES,
  DEFAULT_CHARACTER,
  isBodyCoveringPart,
  parseCharacterSelection,
  partFileUrl,
  partsForSelection,
  withAxis,
} from "./characterParts";

/**
 * The art on disk, and the only source of truth for what exists.
 *
 * `MAP_SPEC.md`: "Every option in an axis list must have a part that exists ... The
 * customiser's option lists are generated from the parts present, so the two cannot
 * drift." This test is that guarantee: an axis option with no file, or a file no axis
 * offers, fails the build rather than shipping as a combination the customiser offers
 * and the view cannot draw.
 */
const ASSET_DIRECTORY = join(
  process.cwd(),
  "public",
  "assets",
  "character",
);

/**
 * `anims.glb` holds the clips, not a body part, so it is not an axis option and must
 * not be offered as one. Everything else in the directory must be reachable from an
 * axis.
 */
const NOT_A_PART = "anims";

function partIdsOnDisk(): readonly string[] {
  return readdirSync(ASSET_DIRECTORY)
    .filter((name) => name.endsWith(".glb"))
    .map((name) => name.slice(0, -".glb".length))
    .filter((id) => id !== NOT_A_PART)
    .sort();
}

describe("character axes match the art on disk", () => {
  it("offers every part that exists", () => {
    const offered = CHARACTER_AXES.flatMap((axis) => [...axis.options]).sort();
    const missingFromAxes = partIdsOnDisk().filter(
      (id) => !offered.includes(id),
    );
    expect(missingFromAxes).toEqual([]);
  });

  it("exists for every part it offers", () => {
    const onDisk = partIdsOnDisk();
    const invented = CHARACTER_AXES.flatMap((axis) => [...axis.options]).filter(
      (id) => !onDisk.includes(id),
    );
    expect(invented).toEqual([]);
  });

  it("gives every axis at least one option", () => {
    for (const axis of CHARACTER_AXES) {
      expect(axis.options.length).toBeGreaterThan(0);
    }
  });

  it("uses parts exactly once across the axes", () => {
    const offered = CHARACTER_AXES.flatMap((axis) => [...axis.options]);
    expect(new Set(offered).size).toBe(offered.length);
  });

  it("has seven axes, as DATA_MODEL.md records seven selections", () => {
    expect(CHARACTER_AXES).toHaveLength(7);
  });
});

describe("default character", () => {
  it("resolves to parts that exist", () => {
    const onDisk = partIdsOnDisk();
    for (const partId of partsForSelection(DEFAULT_CHARACTER)) {
      expect(onDisk).toContain(partId);
    }
  });

  it("uses the first option of each axis", () => {
    for (const axis of CHARACTER_AXES) {
      expect(DEFAULT_CHARACTER[axis.id]).toBe(axis.options[0]);
    }
  });
});

describe("partFileUrl", () => {
  it("points at the asset directory", () => {
    expect(partFileUrl("hair_long")).toBe("/assets/character/hair_long.glb");
  });
});

describe("parseCharacterSelection", () => {
  it("accepts a complete, known selection", () => {
    expect(parseCharacterSelection(DEFAULT_CHARACTER)).toEqual(DEFAULT_CHARACTER);
  });

  it("rejects a part that no longer exists instead of defaulting it", () => {
    const stale = { ...DEFAULT_CHARACTER, hair: "hair_mohawk" };
    expect(parseCharacterSelection(stale)).toBeNull();
  });

  it("rejects an incomplete record", () => {
    const { hair, ...missing } = DEFAULT_CHARACTER;
    expect(hair).toBeTypeOf("string");
    expect(parseCharacterSelection(missing)).toBeNull();
  });

  it("rejects a non-object", () => {
    expect(parseCharacterSelection(null)).toBeNull();
    expect(parseCharacterSelection("hair_long")).toBeNull();
    expect(parseCharacterSelection(undefined)).toBeNull();
  });

  it("ignores axes it does not know about", () => {
    const extra = { ...DEFAULT_CHARACTER, hat: "top_hat" };
    expect(parseCharacterSelection(extra)).toEqual(DEFAULT_CHARACTER);
  });
});

describe("withAxis", () => {
  it("replaces one axis and leaves the rest", () => {
    const next = withAxis(DEFAULT_CHARACTER, "hair", "hair_buns");
    expect(next.hair).toBe("hair_buns");
    expect(next.body).toBe(DEFAULT_CHARACTER.body);
    expect(next.eyes).toBe(DEFAULT_CHARACTER.eyes);
  });

  it("ignores a part the axis does not offer", () => {
    const next = withAxis(DEFAULT_CHARACTER, "hair", "top_tee");
    expect(next).toBe(DEFAULT_CHARACTER);
  });

  it("ignores an axis that does not exist", () => {
    const next = withAxis(DEFAULT_CHARACTER, "hat", "top_tee");
    expect(next).toBe(DEFAULT_CHARACTER);
  });
});

describe("isBodyCoveringPart", () => {
  it("is true for every top and every bottom, and nothing else", () => {
    const covering = CHARACTER_AXES.filter(
      (axis) => axis.id === "top" || axis.id === "bottom",
    ).flatMap((axis) => axis.options);
    for (const partId of partIdsOnDisk()) {
      expect(isBodyCoveringPart(partId)).toBe(covering.includes(partId));
    }
  });

  it("is false for the hair and the accessories, which already stand off the skin", () => {
    for (const partId of ["hair_long", "acc_scarf", "acc_bag", "acc_glasses", "body_base"]) {
      expect(isBodyCoveringPart(partId)).toBe(false);
    }
  });

  it("is false for a part that does not exist", () => {
    expect(isBodyCoveringPart("top_parka")).toBe(false);
  });
});

describe("axisIdForPart", () => {
  it("names the axis that offers the part, for every part on disk", () => {
    for (const axis of CHARACTER_AXES) {
      for (const partId of axis.options) {
        expect(axisIdForPart(partId)).toBe(axis.id);
      }
    }
  });

  it("is null for a part that no axis offers, so nothing is painted by accident", () => {
    expect(axisIdForPart("top_parka")).toBeNull();
    expect(axisIdForPart("anims")).toBeNull();
    expect(axisIdForPart("")).toBeNull();
  });
});
