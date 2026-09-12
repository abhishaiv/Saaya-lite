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
export const WALK_CAMERA_FOV_DEG = 54; // fact: walk.camera.fov
export const WALK_CAMERA_PITCH_DEG = 52; // fact: walk.camera.pitch
export const WALK_CAMERA_DIST_M = 27; // fact: walk.camera.dist

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

// --- budgets, used by the loop's own frame guard ---
export const FRAME_BUDGET_MS = 32; // fact: perf.frame
export const TARGET_FPS = 60; // fact: perf.fps
