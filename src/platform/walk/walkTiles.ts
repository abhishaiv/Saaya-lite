/**
 * Tile geometry: the baked world JSON becomes three.js meshes.
 *
 * Everything here is derived from what the bake wrote, never re-chosen. The tile
 * size, the quantisation step and the storey height all come from `meta`; building
 * heights come from each fragment's own `h`; road risk comes from each fragment's own
 * `r`. Nothing in this file invents a measurement.
 *
 * Road risk is a **band on the road surface**, never a count, a rate or a number of
 * incidents, and it never leaves this view. See `MAP_SPEC.md` "Roads, and the one
 * thing that must not drift" and `FEATURES.md` Amendment 1 clause 3: no road-level
 * claim enters the escalation ladder or any SUS record.
 *
 * The band values in the asset already carry `walk.risk.falloff_m` and
 * `walk.risk.falloff_floor` from the bake, so the falloff is **not** applied again
 * here. Re-applying it would darken every road twice.
 *
 * The ground primitives a tile is built from live in `walkGeometry.ts`, because the
 * zone layer draws with the same ribbon and the same ring fill. This file owns what is
 * specific to a tile: its materials, its decode, and how a fragment becomes a layer.
 */

import { Color, DoubleSide, FrontSide, Group, Mesh, MeshBasicMaterial } from "three";

import {
  appendBuilding,
  appendRibbon,
  appendRingFill,
  buildColoredGeometry,
  buildGeometry,
  closePath,
  layerHeight,
  pushColor,
} from "./walkGeometry";
import type { GroundPoint, TileId, WorldMeta } from "./walkProjection";
import { decodePath } from "./walkProjection";
import {
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
  COLOR_ZONE_MODERATE,
  RISK_THRESHOLD_ELEVATED,
  RISK_THRESHOLD_LOW,
  RISK_THRESHOLD_MODERATE,
} from "./walkFacts";

/** A road fragment as the bake writes it. */
export interface RawRoad {
  /** Risk, already clamped and already carrying the falloff. */
  readonly r: number;
  /** OSM `highway` class, so a trunk road reads as a trunk road. */
  readonly c: string;
  /** Street name. Read for nothing but debugging; it is never rendered. */
  readonly n?: string;
  /** Quantised vertices. First pair absolute, the rest deltas. */
  readonly v: readonly number[];
}

/** A building fragment. `h` is height in metres, from real `building:levels` where OSM has it. */
export interface RawBuilding {
  readonly h: number;
  readonly t: string;
  readonly v: readonly number[];
}

/** Green and water fragments carry only geometry. */
export interface RawArea {
  readonly v: readonly number[];
}

export interface RawTile {
  readonly roads?: readonly RawRoad[];
  readonly buildings?: readonly RawBuilding[];
  readonly green?: readonly RawArea[];
  readonly water?: readonly RawArea[];
}

/**
 * Half-width of a residential road ribbon, in metres.
 *
 * GROUNDED-EXEMPT: a rendering width. The spec fixes road *risk*, not road width, and
 * no product claim depends on how wide a street is drawn.
 *
 * Amended 2026-09-22, from 4. At her distance the frame shows about 6 m of ground across
 * (6.05 m at the row of her feet, solved from `walk.camera.fov` 54 on a 390x844 viewport),
 * so the old 8 m residential street was wider than the whole frame and the narrow one at
 * that: with the class multipliers below, a `primary` came out 24 m wide - four frames'
 * worth - so its band filled the picture from the horizon to her feet and the city was a
 * colour field. The reference's own road ribbons measure 2.5-3.2 m across at the depths
 * this camera reads them at (per-row profiles of `/tmp/pogo-over`, rows 0.62 and 0.85 of
 * frame height), so this is that measurement, in metres.
 */
export const ROAD_HALF_WIDTH_M = 1.5;

/**
 * How much wider each `highway` class is drawn than a residential street.
 *
 * Multipliers, not widths, so the base width above stays the only tuning point. Only
 * the seven classes the bake actually emitted appear; anything else falls to the
 * residential default rather than being given a width nobody chose.
 *
 * Amended 2026-09-22 with the base width: a trunk road reads wider than a lane, but the
 * reference's ribbons differ by less than this set used to, and a street that stops being
 * a ribbon stops carrying a legible band.
 */
export const ROAD_CLASS_WIDTH_MULTIPLIER: Readonly<Record<string, number>> = { primary: 2, secondary: 1.6, tertiary: 1.3, residential: 1, living_street: 1, unclassified: 1, service: 0.8 }; // GROUNDED-EXEMPT: rendering multipliers, not product values — see the block above.

const ROAD_CLASS_WIDTH_DEFAULT = 1;

/**
 * How far the road casing stands proud of the road surface, on each side, in metres.
 *
 * GROUNDED-EXEMPT: a rendering width, the same kind of value as `ROAD_HALF_WIDTH_M`. A
 * road in this palette is a dark ribbon on a dark ground; a lighter rim along each edge
 * is what lets a low camera see where the street is. It carries no claim.
 *
 * Amended 2026-09-22 to a hairline. The reference's own road edges are thin bright lines,
 * not bands: at 1080x1920 its edge lines measure 3-6 px across, and a rim 0.5 m wide is
 * 32 px at the near field - sixteen times as thick, and it reads as a painted shoulder
 * rather than as an edge. At 0.25 m it still holds a pixel of its own out to about 150 m,
 * which is where the reference's own lines stop resolving.
 */
export const ROAD_CASING_M = 0.25; // GROUNDED-EXEMPT: a rendering width, not a product value.

/**
 * The line network that edges every road and seams every block: `color.tile.casing`.
 *
 * It used to be derived — `color.tile.road` multiplied up by a factor, in the road's own hue —
 * because the road was the only line colour the spec stated, and a rim that follows its road
 * was worth more than a second ruling. 2026-09-23 retired the derivation: the key inverts,
 * the road goes dark, and the line has to sit *above* it and *below* the white land to read
 * at all, which no factor on the road's own colour can reach. So it became its own fact, and
 * its own value sits between the road's luma and the land's. That is the whole of the change —
 * the line still draws both jobs it always drew, the road edge and the block seam, and the
 * fact's own text records why one value serves both.
 */

/**
 * How wide the road's risk band is drawn, as a fraction of the road's own width.
 *
 * GROUNDED-EXEMPT: a rendering fraction, not a product value. The band's *colour* and
 * *thresholds* are facts and are unchanged; this is how much of the road surface it covers.
 *
 * It used to be the whole road, at the band layer's height above the surface, which meant
 * a banded street rendered as a slab of tier colour with the road, its casing and its
 * junction geometry all invisible underneath it. Every road in the dense captures carried a
 * band, so the street network — the thing the view exists to show her walking on — read as
 * one flat colour from the horizon down. The band is now a spine down the middle of the
 * road: the tier colour is still on the road surface at every point the risk applies to,
 * still at `color.zone.*`, still drawn over everything the risk layer outranks, and the
 * road it describes stays visible on both sides of it.
 */
export const ROAD_BAND_WIDTH_FRACTION = 0.55; // GROUNDED-EXEMPT: a rendering fraction, not a product value.

/**
 * Lighten a colour in the space its hex is written in.
 *
 * The renderer's working space is linear; a hex is not. `Color.multiplyScalar(2.2)` on
 * `#2E3450` converts to linear, doubles a near-black, and converts back to rgb(69,78,117)
 * — a factor of 1.5 to the eye, not 2.2. Multiplying the hex's own bytes gives the colour
 * the number reads as, and every other colour in this file is written as a hex, so a shade
 * derived from one is too.
 */
function lighten(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const byte = (shift: number): number =>
    Math.min(0xff, Math.round(((value >> shift) & 0xff) * factor));
  return `#${((byte(16) << 16) | (byte(8) << 8) | byte(0)).toString(16).padStart(6, "0")}`;
}

/**
 * The tile palette. Amended 2026-09-22 by founder ruling, twice the same day, and again
 * 2026-09-23 by the ruling that the view take Corner's map language in Saaya's own colours.
 *
 * Every value here was `#1A1A20`-dark before, on a near-black ground, which is a scene with no
 * contrast in it: a wall reads at 20 luma against a ground of 11, which is no edge at all, and
 * a road at 27 against a sky of 11 hides the street she is walking on. The 2026-09-22 amendments
 * placed the five values on the luminance ladder measured from the reference frames, in a night
 * key: the ground the lit plane, the road 0.56 of it, green 0.85 of it, the roofs the pale plane
 * the city is read from, and the walls the masses standing on it.
 *
 * **The 2026-09-23 key inverts the map.** The ruling is white and dark violet, where Corner is
 * white and black: the land becomes the white half (see `color.walk.ground`) and the streets,
 * walls and parks are read as marks on it rather than as lit ribbons in the dark. What does not
 * invert is the order of the ladder - a wall is still a mass below the land, green still sits
 * under it, water under that - so the city keeps its depth and every value keeps the relation to
 * the land the reference taught.
 *
 * **The road stays dark, and that is a safety decision, not a taste one.** The frozen tier
 * colours are drawn as bands on the road surface. A white road would put `#FFCC00` at 1.29x
 * against its own surface - the ELEVATED band would stop being a band - where the dark violet
 * road on white land lifts all three frozen bands above the contrast they had in the night key
 * (`#FF3B30` 1.52x, `#FF9500` 2.44x, `#FFCC00` 3.03x). The road is therefore the one element of
 * Corner's recipe that does not become white, and `color.tile.road` carries the arithmetic.
 */

/** Road surface. Dark against the white land, so the risk bands read on it and the street reads as a surface. */
const COLOR_ROAD_SURFACE = "#4B3A70"; // fact: color.tile.road

/** Building face. Below the land, so a block reads as a mass standing on it. */
const COLOR_BUILDING = "#D9D1F0"; // fact: color.tile.building

/** Building roof, above the land: from a camera below the rooflines, the roofs are the pale plane. */
const COLOR_BUILDING_ROOF = "#FFFFFF"; // fact: color.tile.building.roof

/** Green space, below the land and violet rather than green: the brand's parks are its own hue, not a literal green. */
const COLOR_GREEN = "#D5C9F7"; // fact: color.tile.green

/** Water, between the land and the road: a river reads darker than the land and lighter than a street. */
const COLOR_WATER = "#9E8FD0"; // fact: color.tile.water

/** The line network - every road edge and every block seam. Between the road's luma and the land's. */
const COLOR_CASING = "#B4A3DE"; // fact: color.tile.casing

/**
 * How much a building face's own tone may differ from `color.tile.building`.
 *
 * GROUNDED-EXEMPT: a rendering variation around a fact, not a colour of its own.
 * `color.tile.building` stays the wall colour and stays the mean of this; the factor is how far
 * a single face may sit from it, applied in the hex's own bytes so the spread is the one the eye
 * reads - the same space `lighten` works in.
 *
 * **Why the walls vary at all.** Every wall in the city was one colour, so a run of them read as
 * a single mass: measured under the night key, rows 0.20-0.22 of the frame were 84.9-100% one
 * rgb(56,64,96), where the reference's row 0.22 carries 9-29 separate runs. A street in the
 * reference is many faces at slightly different tones, and an exactly uniform wall is the one
 * thing a real one is not.
 *
 * **This is not a lighting model.** The view has no sun - see the `MeshBasicMaterial` note on
 * `createTileMaterials` - and a face's tone here comes from its own position, not from its angle
 * to anything. That is what keeps it deterministic: the same wall is the same tone in every frame
 * and every session, and two clients showing the same street show the same street.
 */
const BUILDING_SHADE_SPREAD = 0.08; // GROUNDED-EXEMPT: a rendering variation around a fact.

/** Vertices per wall quad, which `appendBuilding` writes in one run. */
const WALL_VERTEX_COUNT = 6; // GROUNDED-EXEMPT: a geometry count, not a product value.

/** Floats per wall quad: `WALL_VERTEX_COUNT` vertices of three components. */
const WALL_STRIDE_FLOATS = WALL_VERTEX_COUNT * 3;

/**
 * A deterministic unit value in [0, 1) from a point's own coordinates.
 *
 * Quantised to a tenth of a metre before mixing, so two neighbouring tiles that compute the same
 * wall's midpoint from their own origins - and land a few last bits apart - still give it one
 * tone. The mixing constants are arbitrary and only have to spread; nothing is measured by them.
 */
function hashUnit(x: number, z: number): number {
  // GROUNDED-EXEMPT: the four constants below are the arbitrary mixing integers of a stable hash.
  const HASH_X = 73856093; // GROUNDED-EXEMPT: see above.
  const HASH_Z = 19349663; // GROUNDED-EXEMPT: see above.
  const HASH_MIX = 1274126177; // GROUNDED-EXEMPT: see above.
  const HASH_SPAN = 4294967296; // GROUNDED-EXEMPT: see above.
  const quantisedX = Math.round(x * 10);
  const quantisedZ = Math.round(z * 10);
  let mixed = (quantisedX * HASH_X) ^ (quantisedZ * HASH_Z);
  mixed = Math.imul(mixed ^ (mixed >>> 13), HASH_MIX);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / HASH_SPAN;
}

/**
 * One tone per wall, taken from the wall's own midpoint.
 *
 * `appendBuilding` writes six vertices per wall in one run, so this walks the walls buffer in
 * strides of `WALL_STRIDE_FLOATS` and gives each stride one tone across all six of its vertices:
 * a face reads as one face, and its neighbours read as their own. The colour attribute this fills
 * is what `materials.building` multiplies, and the material is white for it - the fact's value is
 * carried here, per face, so that a face cannot be lit twice.
 */
function pushWallShades(colors: number[], walls: readonly number[]): void {
  const at = (index: number): number => walls[index] ?? 0;
  for (let start = 0; start + WALL_STRIDE_FLOATS <= walls.length; start += WALL_STRIDE_FLOATS) {
    const midX = (at(start) + at(start + 3) + at(start + 6)) / WALL_VERTEX_COUNT;
    const midZ = (at(start + 2) + at(start + 5) + at(start + 8)) / WALL_VERTEX_COUNT;
    const shade = 1 + BUILDING_SHADE_SPREAD * (hashUnit(midX, midZ) - 0.5) * 2;
    const color = new Color(lighten(COLOR_BUILDING, shade));
    for (let i = 0; i < WALL_VERTEX_COUNT; i += 1) colors.push(color.r, color.g, color.b);
  }
}

/**
 * The colour a road band is drawn in, or `null` for "this road carries no band".
 *
 * The band's colour is the colour of the tier its risk falls in, so a band at 0.8 is
 * the same red as a HIGH zone on the flat map. Below `risk.threshold.low` a road is
 * drawn as an ordinary road: the bands mean "this one is worth noticing" rather than
 * tinting every street in the city.
 */
export function bandColorForRisk(risk: number): string | null {
  if (risk >= RISK_THRESHOLD_ELEVATED) return COLOR_ZONE_HIGH;
  if (risk >= RISK_THRESHOLD_MODERATE) return COLOR_ZONE_ELEVATED;
  if (risk >= RISK_THRESHOLD_LOW) return COLOR_ZONE_MODERATE;
  return null;
}

/** Shared materials, created once for the whole world and disposed once. */
export interface TileMaterials {
  readonly roadCasing: MeshBasicMaterial;
  readonly roadSurface: MeshBasicMaterial;
  readonly roadBand: MeshBasicMaterial;
  readonly building: MeshBasicMaterial;
  readonly buildingRoof: MeshBasicMaterial;
  readonly green: MeshBasicMaterial;
  readonly water: MeshBasicMaterial;
}

/**
 * Create the shared materials.
 *
 * `MeshBasicMaterial` on purpose: this view shows where risk is, and a lit material
 * would shade a road by its angle to a sun that means nothing. Flat colour also keeps
 * the frame cost predictable on the 2 GB device `perf.fps` is written for.
 */
export function createTileMaterials(): TileMaterials {
  const flat = (color: string | Color): MeshBasicMaterial =>
    new MeshBasicMaterial({ color: new Color(color), side: DoubleSide });
  /**
   * A layer with an outside and nothing else.
   *
   * `appendBuilding` faces every wall outward, so a building's walls and its roof can be
   * one-sided. That is what lets the camera pass through a building it has ended up inside,
   * rather than filling the frame with that building's interior; the measurement is in
   * `MAP_SPEC.md`. Every other layer here lies flat on the ground and is seen from one side
   * only in principle, but is left `DoubleSide` so a fill never depends on its data's
   * winding - `appendRingFill` already guarantees a fill faces up, and this way a second
   * guarantee cannot silently fight the first.
   */
  const outward = (color: string | Color): MeshBasicMaterial =>
    new MeshBasicMaterial({ color: new Color(color), side: FrontSide });
  return {
    // Its own fact since 2026-09-23 — see `COLOR_CASING`. Before that it was the road
    // lightened, because the road was the only line colour the spec stated.
    roadCasing: flat(COLOR_CASING),
    roadSurface: flat(COLOR_ROAD_SURFACE),
    // The scene's distance haze is switched off for the band, not tuned down for it. `MAP_SPEC.md`:
    // "A distant road band faded into haze would be the risk information degrading with draw
    // distance." Every other material here is scenery and is fogged.
    roadBand: new MeshBasicMaterial({ side: DoubleSide, vertexColors: true, fog: false }),
    // White, with `vertexColors`, because each face's tone is carried in the geometry instead -
    // see `pushWallShades`. The fact's value still governs: `color.tile.building` is what every
    // face is shaded around, and an even face renders it exactly, since `lighten(hex, 1)` is the
    // hex back again. The material stays white so a face cannot be multiplied by the fact twice.
    building: new MeshBasicMaterial({
      color: "#FFFFFF", // GROUNDED-EXEMPT: white, the identity of a vertex-colour multiply.
      side: FrontSide,
      vertexColors: true,
    }),
    buildingRoof: outward(COLOR_BUILDING_ROOF),
    green: flat(COLOR_GREEN),
    water: flat(COLOR_WATER),
  };
}

export function disposeTileMaterials(materials: TileMaterials): void {
  for (const material of Object.values(materials)) material.dispose();
}

/** One decoded tile, ready to become meshes. */
export interface DecodedTile {
  readonly id: TileId;
  readonly roads: readonly { readonly path: readonly GroundPoint[]; readonly road: RawRoad }[];
  readonly buildings: readonly { readonly ring: readonly GroundPoint[]; readonly building: RawBuilding }[];
  readonly green: readonly (readonly GroundPoint[])[];
  readonly water: readonly (readonly GroundPoint[])[];
}

/** Decode a tile's fragments into ground-plane paths. Pure; no three.js involved. */
export function decodeTile(id: TileId, raw: RawTile, meta: WorldMeta): DecodedTile {
  return {
    id,
    roads: (raw.roads ?? []).map((road) => ({
      path: decodePath(road.v, id, meta),
      road,
    })),
    buildings: (raw.buildings ?? []).map((building) => ({
      ring: decodePath(building.v, id, meta),
      building,
    })),
    green: (raw.green ?? []).map((area) => decodePath(area.v, id, meta)),
    water: (raw.water ?? []).map((area) => decodePath(area.v, id, meta)),
  };
}

/**
 * Turn a decoded tile into a group of meshes.
 *
 * One mesh per layer rather than one per fragment: a tile carries up to 258 road
 * fragments, and 258 draw calls per tile is not a frame budget any phone will hold. A
 * tile that has every layer therefore draws seven meshes in total (casing, road, band,
 * walls, roof, green, water), however many fragments each of them holds.
 *
 * `detail` controls the scenery layers only. Buildings go first because they are the
 * expensive layer, and then green and water. **Roads are never dropped**, whatever
 * `detail` says: they are the risk carrier, and the spec's degradation rule is that the
 * risk information never degrades.
 */
export function buildTileMeshes(
  tile: DecodedTile,
  materials: TileMaterials,
  detail: boolean,
): Group {
  const group = new Group();
  group.name = `tile:${tile.id.tx},${tile.id.ty}`;

  const roadCasing: number[] = [];
  const roadBase: number[] = [];
  const roadBandPositions: number[] = [];
  const roadBandColors: number[] = [];
  for (const { path, road } of tile.roads) {
    const multiplier =
      ROAD_CLASS_WIDTH_MULTIPLIER[road.c] ?? ROAD_CLASS_WIDTH_DEFAULT;
    const halfWidth = ROAD_HALF_WIDTH_M * multiplier;
    appendRibbon(roadCasing, path, halfWidth + ROAD_CASING_M, layerHeight("roadCasing"));
    appendRibbon(roadBase, path, halfWidth, layerHeight("roadBase"));

    const band = bandColorForRisk(road.r);
    if (band === null) continue;
    const before = roadBandPositions.length;
    // The spine, not the road: see `ROAD_BAND_WIDTH_FRACTION`.
    appendRibbon(
      roadBandPositions,
      path,
      halfWidth * ROAD_BAND_WIDTH_FRACTION,
      layerHeight("roadBand"),
    );
    pushColor(roadBandColors, band, (roadBandPositions.length - before) / 3);
  }

  const casingGeometry = buildGeometry(roadCasing);
  if (casingGeometry !== null) {
    group.add(new Mesh(casingGeometry, materials.roadCasing));
  }
  const baseGeometry = buildGeometry(roadBase);
  if (baseGeometry !== null) {
    group.add(new Mesh(baseGeometry, materials.roadSurface));
  }
  const bandGeometry = buildColoredGeometry(roadBandPositions, roadBandColors);
  if (bandGeometry !== null) {
    group.add(new Mesh(bandGeometry, materials.roadBand));
  }

  if (detail) {
    const walls: number[] = [];
    const roofs: number[] = [];
    for (const { ring, building } of tile.buildings) {
      appendBuilding(walls, roofs, ring, building.h);
    }
    const wallShades: number[] = [];
    pushWallShades(wallShades, walls);
    const wallGeometry = buildColoredGeometry(walls, wallShades);
    if (wallGeometry !== null) {
      group.add(new Mesh(wallGeometry, materials.building));
    }
    const roofGeometry = buildGeometry(roofs);
    if (roofGeometry !== null) {
      group.add(new Mesh(roofGeometry, materials.buildingRoof));
    }

    // The ground's own line network. Only roads had a casing, so between them the ground was one
    // unbroken fill - measured, the largest single fill covered 82.7-95.5% of the band, where the
    // reference's largest covers 0.5-1.0% and its rows carry 2-8 pale runs. Every ring that lies
    // on the ground gets its edge drawn with the road casing's own material and its own hairline
    // width, because a block's edge and a street's edge are the same kind of line.
    //
    // A building's seam shows its outer half: the inner half is under the building, whose wall
    // stands on this same boundary. That is where the network's density comes from - there are
    // 12,690 footprints in the bake and 248 green and water rings.
    const seams: number[] = [];
    for (const { ring } of tile.buildings) {
      appendRibbon(seams, closePath(ring), ROAD_CASING_M, layerHeight("groundSeam"));
    }
    for (const ring of tile.green) {
      appendRibbon(seams, closePath(ring), ROAD_CASING_M, layerHeight("groundSeam"));
    }
    for (const ring of tile.water) {
      appendRibbon(seams, closePath(ring), ROAD_CASING_M, layerHeight("groundSeam"));
    }
    const seamGeometry = buildGeometry(seams);
    if (seamGeometry !== null) {
      group.add(new Mesh(seamGeometry, materials.roadCasing));
    }

    const green: number[] = [];
    for (const ring of tile.green) {
      appendRingFill(green, ring, layerHeight("green"));
    }
    const greenGeometry = buildGeometry(green);
    if (greenGeometry !== null) {
      group.add(new Mesh(greenGeometry, materials.green));
    }

    const water: number[] = [];
    for (const ring of tile.water) {
      appendRingFill(water, ring, layerHeight("water"));
    }
    const waterGeometry = buildGeometry(water);
    if (waterGeometry !== null) {
      group.add(new Mesh(waterGeometry, materials.water));
    }
  }

  return group;
}

/**
 * Free every geometry a tile group holds.
 *
 * Materials are not disposed here: they are shared across every tile in the world and
 * are disposed once by `disposeTileMaterials`.
 */
export function disposeGroup(group: Group): void {
  group.traverse((object) => {
    if (object instanceof Mesh) object.geometry.dispose();
  });
  group.clear();
}
