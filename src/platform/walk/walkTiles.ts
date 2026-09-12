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

import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial } from "three";

import {
  appendBuilding,
  appendRibbon,
  appendRingFill,
  buildColoredGeometry,
  buildGeometry,
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
 */
const ROAD_HALF_WIDTH_M = 4;

/**
 * How much wider each `highway` class is drawn than a residential street.
 *
 * Multipliers, not widths, so the base width above stays the only tuning point. Only
 * the seven classes the bake actually emitted appear; anything else falls to the
 * residential default rather than being given a width nobody chose.
 */
const ROAD_CLASS_WIDTH_MULTIPLIER: Readonly<Record<string, number>> = {
  primary: 3,
  secondary: 2,
  tertiary: 2,
  residential: 1,
  living_street: 1,
  unclassified: 1,
  service: 1,
};

const ROAD_CLASS_WIDTH_DEFAULT = 1;

/** Road surface. A neutral dark grey so the risk bands are the only colour on the ground. */
const COLOR_ROAD_SURFACE = "#1A1A20"; // fact: color.tile.road

/** Building face colour. */
const COLOR_BUILDING = "#22222A"; // fact: color.tile.building

/** Building roof, a shade lighter so the top face reads from a high camera. */
const COLOR_BUILDING_ROOF = "#2A2A34"; // fact: color.tile.building.roof

/** Green space. */
const COLOR_GREEN = "#14251A"; // fact: color.tile.green

/** Water. */
const COLOR_WATER = "#101C2E"; // fact: color.tile.water

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
  const flat = (color: string): MeshBasicMaterial =>
    new MeshBasicMaterial({ color: new Color(color), side: DoubleSide });
  return {
    roadSurface: flat(COLOR_ROAD_SURFACE),
    roadBand: new MeshBasicMaterial({ side: DoubleSide, vertexColors: true }),
    building: flat(COLOR_BUILDING),
    buildingRoof: flat(COLOR_BUILDING_ROOF),
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
 * tile that has every layer therefore draws six meshes in total (road, band, walls,
 * roof, green, water), however many fragments each of them holds.
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

  const roadBase: number[] = [];
  const roadBandPositions: number[] = [];
  const roadBandColors: number[] = [];
  for (const { path, road } of tile.roads) {
    const multiplier =
      ROAD_CLASS_WIDTH_MULTIPLIER[road.c] ?? ROAD_CLASS_WIDTH_DEFAULT;
    const halfWidth = ROAD_HALF_WIDTH_M * multiplier;
    appendRibbon(roadBase, path, halfWidth, layerHeight("roadBase"));

    const band = bandColorForRisk(road.r);
    if (band === null) continue;
    const before = roadBandPositions.length;
    appendRibbon(roadBandPositions, path, halfWidth, layerHeight("roadBand"));
    pushColor(roadBandColors, band, (roadBandPositions.length - before) / 3);
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
    const wallGeometry = buildGeometry(walls);
    if (wallGeometry !== null) {
      group.add(new Mesh(wallGeometry, materials.building));
    }
    const roofGeometry = buildGeometry(roofs);
    if (roofGeometry !== null) {
      group.add(new Mesh(roofGeometry, materials.buildingRoof));
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
