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
// 0.736 and her head at 0.616. See the facts' own `sourced_from` for the measurement, and
// `walkComposition.test.ts` for the projection the rows are derived with.
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

// --- what she wears. Fact: color.brand, color.brandDark ---
//
// The asset pack has no violet in it. Every garment ships grey - `top_hoodie` is
// (0.36, 0.31, 0.28) linear, `bottom_jeans` (0.22, 0.25, 0.36) - and each garment mesh is
// a copy of the body's own surface, so a grey garment over the body's nude base texture
// reads as skin at phone size. That is what the founder saw on his phone on 2026-09-23,
// and it is a colour problem rather than a missing mesh: the top is loaded, lifted 14 mm
// off the skin and drawn, and the frame still reads as unclothed.
//
// The palette he ruled for this view is white and violet, so the two garment axes are
// painted with the interface's own two violets - the lavender over the darker one -
// rather than with two new hexes invented for the occasion. Reused the same way the zone
// constants below are reused: she cannot then disagree with the interface she is drawn
// inside. There is no footwear axis in the pack, so her feet stay bare; that is owed to
// the asset work rather than fixable here.
export const GARMENT_TOP_COLOR = "#A78BFA"; // fact: color.brand
export const GARMENT_BOTTOM_COLOR = "#8566D1"; // fact: color.brandDark

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
// A road is drawn no safer than its zone, so the band's colour is the colour of the
// tier that value falls in, and the thresholds are the product's own. Nothing new is
// chosen here: a band at 0.8 is the same red as a HIGH zone on the flat map.
//
// The band values the bake writes are already clamped to [risk.clamp.min,
// risk.clamp.max] and already carry walk.risk.falloff_m and walk.risk.falloff_floor,
// so this file must not apply the falloff again.
export const RISK_CLAMP_MIN = 0; // fact: risk.clamp.min
export const RISK_CLAMP_MAX = 1; // fact: risk.clamp.max
export const RISK_THRESHOLD_LOW = 0.25; // fact: risk.threshold.low
export const RISK_THRESHOLD_MODERATE = 0.5; // fact: risk.threshold.moderate
export const RISK_THRESHOLD_ELEVATED = 0.75; // fact: risk.threshold.elevated

// Tier colours. These are the exact hexes the frozen geojson gives the 19 drawn
// zones, so a band and a zone at the same tier are the same colour.
//
// Note the tier-to-hue order is not a mistake here: the frozen data paints ELEVATED
// #FFCC00 and MODERATE #FF9500. The walk view follows the data rather than inventing
// a second, better-ordered ramp, so the two views cannot disagree.
export const COLOR_ZONE_HIGH = "#FF3B30"; // fact: color.zone.high
export const COLOR_ZONE_ELEVATED = "#FFCC00"; // fact: color.zone.elevated
export const COLOR_ZONE_MODERATE = "#FF9500"; // fact: color.zone.moderate

// Below RISK_THRESHOLD_LOW a road carries no band at all. That is deliberate: a road
// under the product's own low threshold is drawn as an ordinary road, so the bands
// mean "this one is worth noticing" rather than tinting every street in the city.

// --- scene palette ---
export const COLOR_BACKGROUND = "#0B0B0F"; // fact: color.background
export const COLOR_TILE_LAND = "#0E0E10"; // fact: color.tile.land
export const COLOR_BRAND = "#A78BFA"; // fact: color.brand
export const COLOR_WHITE = "#FFFFFF"; // fact: color.white

// --- the walk view's own sky, haze and land. Facts: color.walk.* ---
//
// Added 2026-09-22 by the same ruling as the camera above, and amended the same day once the
// reference was measured at full resolution rather than at half. These are the view's three
// largest areas and the reference gives all three: sky rgb(24,52,152), a dark seam at the
// horizon rgb(25,47,107), and land rgb(87,140,174). The walk view was one near-black colour in
// all three places, which is why a correct scene rendered as a void.
//
// The amendment's own reason: the reference's map area is 78% in the 180-240 degree blue/cyan
// family and holds no magenta anywhere, while the old ground under the highest-risk zone tint
// rendered rgb(110,90,117) - hue 284, and half the frame. Two of the three frozen tier tints
// took the land off-family. The fix belongs in the scenery, not in the frozen data: the land is
// chosen so that every tint the dataset carries leaves it in the reference's own family.
//
// They are walk-view facts and not the flat map's `color.background` / `color.tile.land`, which
// are untouched: the flat map is a CARTO Dark Matter tile map and has no horizon to compose.
export const COLOR_WALK_SKY = "#183498"; // fact: color.walk.sky
export const COLOR_WALK_HAZE = "#192F6B"; // fact: color.walk.haze
export const COLOR_WALK_GROUND = "#578BAE"; // fact: color.walk.ground

// --- budgets, used by the loop's own frame guard ---
export const FRAME_BUDGET_MS = 32; // fact: perf.frame
export const TARGET_FPS = 60; // fact: perf.fps
