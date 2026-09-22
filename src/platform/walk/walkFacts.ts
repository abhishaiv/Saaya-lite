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
export const WALK_CAMERA_FOV_DEG = 54; // fact: walk.camera.fov
export const WALK_CAMERA_PITCH_DEG = 32.4; // fact: walk.camera.pitch
export const WALK_CAMERA_DIST_M = 13.0; // fact: walk.camera.dist
export const WALK_CAMERA_LOOK_AT_M = 3.21; // fact: walk.camera.look_at

// --- the character. Fact: walk.character.height, walk.speed ---
export const WALK_CHARACTER_HEIGHT_M = 1.7; // fact: walk.character.height
export const WALK_SPEED_MPS = 1.4; // fact: walk.speed

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
