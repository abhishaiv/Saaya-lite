/**
 * Every product value the walk view renders with, gathered in one place.
 *
 * Each literal below must keep matching the value of the named fact in
 * `graph/spec_graph.json`, because `scripts/grounded_check.py` matches by value and
 * fails the build when a literal traces to nothing. They live here rather than inline
 * so there is exactly one place to look when a fact moves.
 *
 * Facts are read, never re-chosen. Where the walk view needs the same value the flat
 * map already shows, it reuses the flat map's fact rather than picking a new one.
 */

// --- the walk camera. Fact: walk.camera.* ---
//
// Amended 2026-09-22 by founder ruling, twice: pitch 52 / dist 27 / no aim point became
// 31.4 / 13.2 / 3.18, and then 32.4 / 13.0 / 3.21 once the first solve was found to have used
// an angle-linear row model, which is not how a perspective camera projects. The three numbers
// together are the reference's composition: horizon at 0.164 of the frame height, her feet at
// 0.736 and her head where the reference's own measurements put it. See the facts' own
// `sourced_from` for the measurement, and `walkComposition.test.ts` for the projection the rows
// are derived with.
//
// Amended again 2026-09-23, by the same ruling and with the same method: the founder found her
// drawn too small on his phone, the reference was re-measured frame by frame, and her height on
// screen there is 0.124 of the frame while walking, not 0.120. Distance and aim point carry it
// (the angle and the field of view are pinned by the horizon row), so the boom is 0.42 m nearer
// along the same aim line and the frame reads horizon 0.1646 / feet 0.7361 / head 0.6121.
export const WALK_CAMERA_FOV_DEG = 54; // fact: walk.camera.fov
export const WALK_CAMERA_PITCH_DEG = 32.4; // fact: walk.camera.pitch
export const WALK_CAMERA_DIST_M = 12.58; // fact: walk.camera.dist
export const WALK_CAMERA_LOOK_AT_M = 3.11; // fact: walk.camera.look_at

// --- the risk legend chip. Fact: walk.legend.width ---
//
// Compacted 2026-09-23 on founder instruction: the legend was a card across the frame
// ("The street shading rectangle is taking up all the space"), and is now a chip in the
// bottom-left corner whose ramp and both ends stay in view. The width is a chosen design
// value rather than a measured one, and the fact says so.
export const WALK_LEGEND_WIDTH_PX = 224; // fact: walk.legend.width

// --- the character. Fact: walk.character.height, walk.speed ---
export const WALK_CHARACTER_HEIGHT_M = 1.7; // fact: walk.character.height
export const WALK_SPEED_MPS = 1.4; // fact: walk.speed

// --- what she wears. Fact: color.brand, color.garment.trouser ---
//
// The asset pack has no violet in it. Every garment ships grey - `top_hoodie` is
// (0.36, 0.31, 0.28) linear, `bottom_jeans` (0.22, 0.25, 0.36) - and each garment mesh is
// a copy of the body's own surface, so a grey garment over the body's nude base texture
// reads as skin at phone size. That is what the founder saw on his phone on 2026-09-23,
// and it is a colour problem rather than a missing mesh: the top is loaded, lifted 14 mm
// off the skin and drawn, and the frame still reads as unclothed.
//
// The palette he ruled for this view is white and violet, so both axes were first painted
// with the interface's own two violets, the lavender over the darker one. The same day he
// amended the outfit by name - "Light top, dark trousers" - so the top keeps `color.brand`
// and the trousers take `color.garment.trouser`, a new fact. That value was not picked in
// the abstract: the road she walks on is `color.tile.road` #4B3A70, and #3A2A5E holds
// color.brand's hue family 16.3 luma below the road, so the legs read as a garment against
// the surface under her (#7C3AED was rendered and rejected for sitting lighter than the
// road; #2E2150 and #191230 for sitting darker than the pack's own shadow range).
//
// There is no footwear axis in the pack, so her feet stay bare; that is owed to the asset
// work rather than fixable here.
export const GARMENT_TOP_COLOR = "#A78BFA"; // fact: color.brand
export const GARMENT_BOTTOM_COLOR = "#3A2A5E"; // fact: color.garment.trouser

// --- zone treatment, reused from the flat map rather than re-chosen. ---
// The flat map's own constants in HomeMap.tsx carry the same ids; these are the same
// values so a zone reads identically in both views.
export const ZONE_STROKE_PX = 1.5; // fact: map.zone.stroke
export const ZONE_STROKE_SELECTED_PX = 3; // fact: map.zone.stroke.sel
export const ZONE_GLOW_PX = 6; // fact: map.zone.glow
export const ZONE_GLOW_ALPHA = 0.15; // fact: alpha.map.zone.glow
export const ZONE_SELECTED_ALPHA_RAISE = 0.1; // fact: alpha.map.zone.selected.raise

// --- the risk ramp, for road bands only. ---
//
// A road is drawn no safer than its zone, so a band is cut from the road's own baked
// risk, and the thresholds are the product's own. Nothing new is chosen here.
//
// The band values the bake writes are already clamped to [risk.clamp.min,
// risk.clamp.max] and already carry walk.risk.falloff_m and walk.risk.falloff_floor,
// so this file must not apply the falloff again.
export const RISK_CLAMP_MIN = 0; // fact: risk.clamp.min
export const RISK_CLAMP_MAX = 1; // fact: risk.clamp.max
export const RISK_THRESHOLD_LOW = 0.25; // fact: risk.threshold.low
export const RISK_THRESHOLD_MODERATE = 0.5; // fact: risk.threshold.moderate
export const RISK_THRESHOLD_ELEVATED = 0.75; // fact: risk.threshold.elevated

// --- the violet signal, for road bands only. ---
//
// Amended 2026-09-23 by founder ruling: "The unsafe places will be violet highlighted
// roads." The clause this replaced is superseded, kept here as the record of what was
// retired - "A road is drawn no safer than its zone, so the band's colour is the colour
// of the tier that value falls in ... a band at 0.8 is the same red as a HIGH zone on
// the flat map": the red/orange/yellow ramp retires from roads. The three tier colours
// are unchanged facts and still paint the zones on the flat map and the walk view's own
// zone tint, which both read them from the frozen geojson's own `colorHex`; no walk-view
// code names them any more.
//
// Both readings of the ruling are built, for the founder to rule between on the branch
// preview; `?roads=a` draws the first and everything else the default, the second.
//
//   a - the dark key kept: the base road stays `color.tile.road`, and the band is a
//       brighter violet highlight over it, drawn in `color.brand`.
//   b - the guide-map reading: the base street goes `color.white`, and the band is the
//       only dark mark on the street, drawn in `color.tile.road`.
//
// Either way the band's strength is the road's own risk: it fades in from the base
// surface at `risk.threshold.low` - below which a road carries no band at all, so a road
// under the product's own low threshold is drawn as an ordinary street and the bands
// mean "this one is worth noticing" rather than tinting every street in the city - and
// reaches the full signal at `risk.clamp.max`.

/** The dark violet the streets are drawn in: the road surface in A, the full signal in B. */
export const COLOR_TILE_ROAD = "#4B3A70"; // fact: color.tile.road

/** Which of the two readings of the violet ruling the view draws. */
export type RoadSignalVariant = "a" | "b";

/** The reading an unprefixed URL draws. Temporary, until the founder's ruling lands. */
export const ROAD_SIGNAL_DEFAULT_VARIANT: RoadSignalVariant = "b";

/** Read the variant out of a search string, so both readings live on one preview. */
export function roadSignalVariantFromSearch(search: string): RoadSignalVariant {
  // Temporary: the founder rules between the two readings from their own phone.
  return new URLSearchParams(search).get("roads") === "a"
    ? "a"
    : ROAD_SIGNAL_DEFAULT_VARIANT;
}

/** The variant this page draws. Nothing switches it mid-session. */
export function roadSignalVariant(): RoadSignalVariant {
  return roadSignalVariantFromSearch(globalThis.location?.search ?? "");
}

/**
 * Mix two hexes in the space their bytes are written in.
 *
 * The same space `lighten` in `walkTiles.ts` works in, and for the same reason: a mix
 * done in the renderer's linear space does not land on the colour the numbers read as.
 */
export function mixHex(from: string, to: string, t: number): string {
  const fromValue = Number.parseInt(from.slice(1), 16);
  const toValue = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number): number => {
    const start = (fromValue >> shift) & 0xff;
    const end = (toValue >> shift) & 0xff;
    return Math.round(start + (end - start) * t);
  };
  // Uppercase, the case every hex in this codebase is written in, so a mix at the ends of
  // `t` compares equal to the fact it started from rather than differing by letter case.
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0").toUpperCase()}`;
}

/** The base surface a street is drawn in, per variant. */
export function roadSurfaceColor(variant: RoadSignalVariant): string {
  return variant === "a" ? COLOR_TILE_ROAD : COLOR_WHITE;
}

/** The band's colour at full strength, per variant. */
export function roadSignalColor(variant: RoadSignalVariant): string {
  return variant === "a" ? COLOR_BRAND : COLOR_TILE_ROAD;
}

/** How far up the signal a road's own risk draws its band: 0 at the low threshold, 1 at the clamp's top. */
export function roadSignalStrength(risk: number): number {
  const span = RISK_CLAMP_MAX - RISK_THRESHOLD_LOW;
  const strength = (risk - RISK_THRESHOLD_LOW) / span;
  return Math.min(RISK_CLAMP_MAX, Math.max(RISK_CLAMP_MIN, strength));
}

/**
 * The colour a road band is drawn in, or `null` for "this road carries no band".
 *
 * At `risk.threshold.low` the band's colour is the base surface's own, so the mark fades
 * in from nothing, and the road's own risk is the strength of its mark.
 */
export function bandColorForRisk(
  risk: number,
  variant: RoadSignalVariant,
): string | null {
  if (risk < RISK_THRESHOLD_LOW) return null;
  return mixHex(
    roadSurfaceColor(variant),
    roadSignalColor(variant),
    roadSignalStrength(risk),
  );
}

/** The legend's two inner stops, as fractions of the signal's strength. */
const RAMP_STOP_ONE_THIRD = 1 / 3; // GROUNDED-EXEMPT: a legend step, not a product value.
const RAMP_STOP_TWO_THIRDS = 2 / 3; // GROUNDED-EXEMPT: a legend step, not a product value.

/**
 * The legend's ramp, low to high, in the colours the map draws.
 *
 * The low end is the ground colour rather than the base street, because that is what the
 * world does below the low threshold: `bandColorForRisk` returns nothing there, so a quiet
 * area is drawn unshaded. The three stops above it are the band at a third, two thirds and
 * the whole of the signal's strength, so the ramp is the picture the shading is cut from.
 */
export function roadSignalRamp(variant: RoadSignalVariant): readonly string[] {
  const surface = roadSurfaceColor(variant);
  const signal = roadSignalColor(variant);
  return [
    COLOR_WALK_GROUND,
    mixHex(surface, signal, RAMP_STOP_ONE_THIRD),
    mixHex(surface, signal, RAMP_STOP_TWO_THIRDS),
    signal,
  ];
}

// --- scene palette ---
export const COLOR_BACKGROUND = "#0B0B0F"; // fact: color.background
export const COLOR_TILE_LAND = "#0E0E10"; // fact: color.tile.land
export const COLOR_BRAND = "#A78BFA"; // fact: color.brand
export const COLOR_WHITE = "#FFFFFF"; // fact: color.white

// --- the walk view's own sky, haze and land. Facts: color.walk.* ---
//
// Added 2026-09-22 by the same ruling as the camera above, and amended twice since: the same day
// once the reference was measured at full resolution, and 2026-09-23 by the ruling that the view
// take Corner's map language in Saaya's own colours. These are the view's three largest areas.
//
// **The 2026-09-23 key.** White and dark violet, where Corner is white and black: the land is the
// white half and the sky is the dark half, held as one field so the two are figure and ground.
// The map inverts - the night key had a dark scene carrying lit ribbons, this has a white plane
// carrying dark streets - and the sky and the horizon seam are what stay dark, so the view keeps
// its depth and the glints the reference carries above the horizon keep something to sit in.
//
// Both earlier placements took these three colours from the reference video's own measurements.
// This one does not, and that is recorded rather than left implicit: the composition comes from
// the brand instead, and the sky and the seam are the brand's own darkest violet rather than a
// colour from another product. What has not changed is the relation the reference taught - the
// seam darker than the sky, both far darker than the land - which is why a white map still reads
// as somewhere rather than as a diagram.
//
// They are walk-view facts and not the flat map's `color.background` / `color.tile.land`, which
// are untouched: the flat map is a CARTO Dark Matter tile map and has no horizon to compose.
export const COLOR_WALK_SKY = "#2B1B5E"; // fact: color.walk.sky
export const COLOR_WALK_HAZE = "#120C24"; // fact: color.walk.haze
export const COLOR_WALK_GROUND = "#EDE9F7"; // fact: color.walk.ground

// --- budgets, used by the loop's own frame guard ---
export const FRAME_BUDGET_MS = 32; // fact: perf.frame
export const TARGET_FPS = 60; // fact: perf.fps
