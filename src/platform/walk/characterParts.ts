/**
 * The seven axes of the character, and how an axis selection becomes a file.
 *
 * Pure data and pure functions: no `three`, no DOM, no fetch. The customiser screen
 * and the walk runtime both read this, which is what stops them disagreeing about
 * what a character is. `MAP_SPEC.md` requires exactly that: the preview and the
 * world show "the same assembled rig, never a second implementation".
 *
 * The axis option id IS the part id, so a stored selection either names a part that
 * exists or it does not. That is a correctness choice, not a convenience:
 * `DATA_MODEL.md` records seven fixed option ids rather than values, so a character
 * saved against an older part list is *rejected* instead of silently rendering as a
 * default that looks like her choice but is not.
 *
 * `characterParts.test.ts` asserts these lists against the files actually present in
 * `public/assets/character/`, in both directions. The spec asks for lists "generated
 * from the parts present"; a bidirectional test is the same guarantee enforced at
 * build time instead of discovered at runtime on a phone, so the lists stay literal
 * and the test carries the burden.
 */

/** One axis of the character, and the parts that satisfy it. */
export interface CharacterAxis {
  readonly id: string;
  readonly label: string;
  /** Part ids. The first is the default. */
  readonly options: readonly string[];
}

/**
 * The axes, in the order the customiser shows them.
 *
 * Two of the seven carry a single option. That is not an oversight and the UI should
 * not pretend otherwise: the free asset tier ships one body build, so `Body` has
 * exactly one entry, and the pack ships one brow mesh. An axis with one option is a
 * fixed part, and the pickers render it as a stated fact rather than a choice.
 * `MAP_SPEC.md`'s customiser table names these two axes `Body` and `Skin`; see
 * progress.md, 2026-09-12, for why the shipped axis is `Brows`.
 */
export const CHARACTER_AXES: readonly CharacterAxis[] = [
  { id: "body", label: "Body", options: ["body_base"] },
  { id: "brows", label: "Brows", options: ["brows"] },
  {
    id: "hair",
    label: "Hair",
    options: ["hair_long", "hair_buns", "hair_buzzed", "hair_parted"],
  },
  { id: "eyes", label: "Eyes", options: ["eyes_almond", "eyes_round", "eyes_wide"] },
  { id: "top", label: "Top", options: ["top_hoodie", "top_tee", "top_jacket"] },
  {
    id: "bottom",
    label: "Bottom",
    options: ["bottom_jeans", "bottom_shorts", "bottom_skirt"],
  },
  { id: "acc", label: "Accessory", options: ["acc_glasses", "acc_bag", "acc_scarf"] },
];

/** A whole character: one part id per axis id. */
export type CharacterSelection = Readonly<Record<string, string>>;

/** The character used when she skips the customiser, and the fallback for a bad record. */
export const DEFAULT_CHARACTER: CharacterSelection = Object.freeze(
  Object.fromEntries(
    CHARACTER_AXES.map((axis) => {
      const first = axis.options[0];
      if (first === undefined) {
        throw new Error(`Axis ${axis.id} has no options, so it has no default`);
      }
      return [axis.id, first];
    }),
  ),
);

/** Where a part's glTF lives. One file per option, named after the option id. */
export const CHARACTER_ASSET_DIRECTORY = "/assets/character";

export function partFileUrl(partId: string): string {
  return `${CHARACTER_ASSET_DIRECTORY}/${partId}.glb`;
}

/**
 * The clip names inside `anims.glb`.
 *
 * Held here rather than in the scene module because the customiser's preview plays
 * the same two clips, and a second copy of a string is a second thing to misspell.
 */
export const CHARACTER_CLIP_WALK = "Walk_Loop";
export const CHARACTER_CLIP_IDLE = "Idle_Loop";

/**
 * Narrow an untrusted stored value into a character.
 *
 * A record written by an older build can name a part that no longer exists. The spec
 * requires that case to be rejected rather than defaulted silently, so this returns
 * `null` and the caller decides (the walk view asks her to make a character again).
 */
export function parseCharacterSelection(raw: unknown): CharacterSelection | null {
  if (raw === null || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const axis of CHARACTER_AXES) {
    const value = record[axis.id];
    if (typeof value !== "string" || !axis.options.includes(value)) return null;
    result[axis.id] = value;
  }
  return result;
}

/** Every part id a selection needs, in axis order. */
export function partsForSelection(
  selection: CharacterSelection,
): readonly string[] {
  return CHARACTER_AXES.map((axis) => selection[axis.id]).filter(
    (partId): partId is string => typeof partId === "string",
  );
}

/** Which axis offers a part, or null when no axis does. */
export function axisIdForPart(partId: string): string | null {
  const axis = CHARACTER_AXES.find((candidate) => candidate.options.includes(partId));
  return axis === undefined ? null : axis.id;
}

/** The axes whose parts are worn over the body rather than set beside it. */
const BODY_COVERING_AXIS_IDS: readonly string[] = ["top", "bottom"];

/**
 * Whether a part clothes the body, and so draws against the skin's own surface.
 *
 * Every top and every bottom is authored as a region of the body mesh copied out, so
 * the two surfaces are drawn at one depth and the depth test resolves them per
 * fragment - she renders in the underwear the base body bakes in, with the garment
 * showing as speckles. Measured against `body_base`, the median vertex of all six
 * parts sits **0.0000 m** from the nearest body vertex. `hair_long` sits 0.0203 m
 * away, `acc_scarf` 0.0240 m, `acc_bag` 0.0389 m and `acc_glasses` 0.0113 m, and all
 * four render cleanly - that clearance is the gap `walkCharacter.ts` reproduces.
 */
export function isBodyCoveringPart(partId: string): boolean {
  return CHARACTER_AXES.some(
    (axis) => BODY_COVERING_AXIS_IDS.includes(axis.id) && axis.options.includes(partId),
  );
}

/** Replace one axis, leaving the rest. Out-of-list values are ignored. */
export function withAxis(
  selection: CharacterSelection,
  axisId: string,
  partId: string,
): CharacterSelection {
  const axis = CHARACTER_AXES.find((candidate) => candidate.id === axisId);
  if (axis === undefined || !axis.options.includes(partId)) return selection;
  return { ...selection, [axisId]: partId };
}
