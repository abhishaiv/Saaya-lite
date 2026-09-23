import { Color, Group, Mesh, type Material } from "three";
import { describe, expect, it } from "vitest";

import { layerHeight } from "./walkGeometry";
import type { WorldMeta } from "./walkProjection";
import { parseWorldMeta } from "./walkProjection";
import {
  bandColorForRisk,
  COLOR_WALK_GROUND,
  mixHex,
  RISK_CLAMP_MAX,
  RISK_CLAMP_MIN,
  RISK_THRESHOLD_ELEVATED,
  RISK_THRESHOLD_LOW,
  RISK_THRESHOLD_MODERATE,
  roadSignalColor,
  roadSignalStrength,
  roadSurfaceColor,
} from "./walkFacts";
import {
  buildTileMeshes,
  createTileMaterials,
  decodeTile,
  disposeGroup,
  disposeTileMaterials,
  ROAD_CASING_M,
  ROAD_CLASS_WIDTH_MULTIPLIER,
  ROAD_HALF_WIDTH_M,
  type RawRoad,
  type TileMaterials,
} from "./walkTiles";

/**
 * A meta block for these fixtures.
 *
 * Every number here is a probe. The real tile size, quantisation step and storey height
 * are whatever the bake wrote into `world_tiled.json`; the client reads them from `meta`
 * and never restates them. They are marked exempt for exactly that reason, rather than
 * pinned to a fact whose value they happen to equal but whose meaning they do not carry.
 */
function probeMeta(): WorldMeta {
  return parseWorldMeta({
    origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
    tileM: 1024, // GROUNDED-EXEMPT: probe tile size; the real tile size comes from the bake's meta.
    q: 10, // GROUNDED-EXEMPT: probe quantisation, so one metre is ten units and the arithmetic is readable.
    storeyM: 4, // GROUNDED-EXEMPT: probe storey height; unused here, each building carries its own h.
    minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTx: 2, // GROUNDED-EXEMPT: probe grid bound.
    minTy: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTy: 2, // GROUNDED-EXEMPT: probe grid bound.
  });
}

const TILE_ZERO = { tx: 0, ty: 0 };
const TILE_ONE_EAST = { tx: 1, ty: 0 };

/** A ten-metre square ring, delta-encoded as the bake writes one. */
const PROBE_SQUARE = [0, 0, 100, 0, 0, 100, -100, 0]; // GROUNDED-EXEMPT: a probe ring in quantised units, read against the fixture's q.

/** A ten-metre straight road along +x, at the tile's own origin. */
const PROBE_ROAD = [0, 0, 100, 0]; // GROUNDED-EXEMPT: a probe path in quantised units, read against the fixture's q.

/** A probe building height. The bake reads real `building:levels`; this is a fixture. */
const PROBE_BUILDING_H = 12; // GROUNDED-EXEMPT: probe building height for these fixtures.

function road(overrides: Partial<RawRoad> = {}): RawRoad {
  return { r: RISK_CLAMP_MIN, c: "residential", v: PROBE_ROAD, ...overrides };
}

function meshWith(group: Group, material: Material): Mesh | null {
  for (const child of group.children) {
    if (child instanceof Mesh && child.material === material) return child;
  }
  return null;
}

function layerNames(group: Group, materials: TileMaterials): readonly string[] {
  const found: string[] = [];
  for (const [name, material] of Object.entries(materials)) {
    if (meshWith(group, material) !== null) found.push(name);
  }
  return found.sort();
}

/** The z range a mesh's vertices span, which for a ribbon is twice its half-width. */
function zSpan(mesh: Mesh): number {
  const attribute = mesh.geometry.getAttribute("position");
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < attribute.count; i += 1) {
    const z = attribute.getZ(i);
    min = Math.min(min, z);
    max = Math.max(max, z);
  }
  return max - min;
}

describe("bandColorForRisk", () => {
  // Amended 2026-09-23 by the violet ruling. The clause these replaced - the band is "the
  // colour of the tier its risk falls in", tested against the flat map's tier colours - is
  // superseded: the ramp retires from roads, the band is the violet signal, and its strength
  // is the road's own risk. Every assertion below holds in both variants.
  const VARIANTS = ["a", "b"] as const;

  it("gives a road under the product's low threshold no band at all", () => {
    for (const variant of VARIANTS) {
      expect(bandColorForRisk(RISK_CLAMP_MIN, variant)).toBeNull();
    }
  });

  it("fades the band in from the surface itself at the exact low threshold", () => {
    // The mark's strength starts at nothing: at the low threshold its colour *is* the base
    // surface's, so a band grows out of its own street rather than switching on.
    for (const variant of VARIANTS) {
      expect(bandColorForRisk(RISK_THRESHOLD_LOW, variant)).toBe(
        roadSurfaceColor(variant),
      );
    }
  });

  it("draws the full signal at the top of the risk clamp", () => {
    for (const variant of VARIANTS) {
      expect(bandColorForRisk(RISK_CLAMP_MAX, variant)).toBe(roadSignalColor(variant));
    }
  });

  it("makes the road's own risk the strength of its mark", () => {
    // Monotone: a riskier road draws a mark further along the surface-to-signal mix, and
    // every threshold sits between the fade-in and the top of the clamp.
    const strengths = [
      roadSignalStrength(RISK_THRESHOLD_LOW),
      roadSignalStrength(RISK_THRESHOLD_MODERATE),
      roadSignalStrength(RISK_THRESHOLD_ELEVATED),
      roadSignalStrength(RISK_CLAMP_MAX),
    ];
    for (let index = 1; index < strengths.length; index += 1) {
      expect(strengths[index]).toBeGreaterThan(strengths[index - 1] ?? 0);
    }
    // And the colour the mesh gets is exactly the mix at that strength - read through the
    // same `mixHex` the legend uses, so the two cannot drift.
    for (const variant of VARIANTS) {
      const risk = RISK_THRESHOLD_MODERATE;
      expect(bandColorForRisk(risk, variant)).toBe(
        mixHex(
          roadSurfaceColor(variant),
          roadSignalColor(variant),
          roadSignalStrength(risk),
        ),
      );
    }
  });
});

describe("decodeTile", () => {
  const meta = probeMeta();

  it("reads the first vertex as absolute and every one after it as a delta", () => {
    const decoded = decodeTile(TILE_ZERO, { roads: [road({ v: [100, 200, 50, 50] })] }, meta);
    const path = decoded.roads[0]?.path;
    expect(path).toBeDefined();
    // 100 units at q=10 is ten metres east; 200 units is twenty metres north, which is
    // -z in the scene's axes.
    expect(path?.[0]).toEqual({ x: 10, z: -20 });
    // The second pair is a delta, so it lands at 15/-25 rather than at 5/-5.
    expect(path?.[1]).toEqual({ x: 15, z: -25 });
  });

  it("offsets every vertex by the fragment's own tile origin", () => {
    const decoded = decodeTile(TILE_ONE_EAST, { roads: [road({ v: [100, 200] })] }, meta);
    expect(decoded.roads[0]?.path[0]).toEqual({ x: meta.tileM + 10, z: -20 });
  });

  it("returns an empty tile rather than throwing when the bake emitted nothing there", () => {
    const decoded = decodeTile(TILE_ZERO, {}, meta);
    expect(decoded.roads).toEqual([]);
    expect(decoded.buildings).toEqual([]);
    expect(decoded.green).toEqual([]);
    expect(decoded.water).toEqual([]);
  });

  it("carries each fragment's own risk and class through to the mesh build", () => {
    const decoded = decodeTile(
      TILE_ZERO,
      { roads: [road({ r: RISK_THRESHOLD_ELEVATED, c: "primary" })] },
      meta,
    );
    expect(decoded.roads[0]?.road.r).toBe(RISK_THRESHOLD_ELEVATED);
    expect(decoded.roads[0]?.road.c).toBe("primary");
  });
});

describe("buildTileMeshes", () => {
  const meta = probeMeta();
  const materials = createTileMaterials();

  it("draws a road and, when the road is under the low threshold, no band", () => {
    const tile = decodeTile(TILE_ZERO, { roads: [road()] }, meta);
    const group = buildTileMeshes(tile, materials, true);
    expect(meshWith(group, materials.roadSurface)).not.toBeNull();
    expect(meshWith(group, materials.roadBand)).toBeNull();
  });

  it("draws the band in the signal's strength for the road's own risk, per variant", () => {
    // Amended 2026-09-23 by the violet ruling: the assertion used to read the band as the
    // tier colour of the road's risk. What it held - the band's colour is decided by the
    // road's own `r`, carried per vertex on the mesh rather than through the material - is
    // kept, and the variant has to reach both the surface and the band together.
    for (const variant of ["a", "b"] as const) {
      const variantMaterials = createTileMaterials(variant);
      const risk = RISK_THRESHOLD_ELEVATED;
      const tile = decodeTile(TILE_ZERO, { roads: [road({ r: risk })] }, meta);
      const group = buildTileMeshes(tile, variantMaterials, true, variant);
      const band = meshWith(group, variantMaterials.roadBand);
      expect(band).not.toBeNull();
      const expected = new Color(
        mixHex(
          roadSurfaceColor(variant),
          roadSignalColor(variant),
          roadSignalStrength(risk),
        ),
      );
      const colors = band?.geometry.getAttribute("color");
      expect(colors?.count).toBeGreaterThan(0);
      expect(colors?.getX(0)).toBeCloseTo(expected.r);
      expect(colors?.getY(0)).toBeCloseTo(expected.g);
      expect(colors?.getZ(0)).toBeCloseTo(expected.b);
    }
  });

  it("draws every highway class the bake emits at its own multiple of the residential width", () => {
    // Amended 2026-09-22 with the road widths. It used to pin one ratio (primary at three
    // times a residential street); the table is the thing that decides every class, so this
    // reads it rather than restating one of its entries.
    for (const [highwayClass, multiplier] of Object.entries(ROAD_CLASS_WIDTH_MULTIPLIER)) {
      const built = buildTileMeshes(
        decodeTile(TILE_ZERO, { roads: [road({ c: highwayClass })] }, meta),
        materials,
        true,
      );
      const surface = meshWith(built, materials.roadSurface);
      if (surface === null) throw new Error(`no road layer for ${highwayClass}`);
      expect(zSpan(surface)).toBeCloseTo(2 * ROAD_HALF_WIDTH_M * multiplier, 6);
    }
    // A trunk road still reads wider than a lane, which is the whole point of the table.
    expect(ROAD_CLASS_WIDTH_MULTIPLIER.primary).toBeGreaterThan(
      ROAD_CLASS_WIDTH_MULTIPLIER.residential ?? 0,
    );
  });

  it("falls back to the residential width for a class the bake never emitted", () => {
    const known = buildTileMeshes(
      decodeTile(TILE_ZERO, { roads: [road({ c: "residential" })] }, meta),
      materials,
      true,
    );
    const unknown = buildTileMeshes(
      decodeTile(TILE_ZERO, { roads: [road({ c: "cycleway" })] }, meta),
      materials,
      true,
    );
    const knownMesh = meshWith(known, materials.roadSurface);
    const unknownMesh = meshWith(unknown, materials.roadSurface);
    if (knownMesh === null || unknownMesh === null) throw new Error("no road mesh");
    expect(zSpan(unknownMesh)).toBeCloseTo(zSpan(knownMesh));
  });

  it("keeps the roads and the band when detail is off, and drops only the scenery", () => {
    // The safety-critical assertion of this file. `MAP_SPEC.md` requires that the risk
    // information never degrades, so `detail` may cost a building and must never cost a
    // road or its band.
    const tile = decodeTile(
      TILE_ZERO,
      {
        roads: [road({ r: RISK_THRESHOLD_ELEVATED })],
        buildings: [{ h: PROBE_BUILDING_H, t: "yes", v: PROBE_SQUARE }],
        green: [{ v: PROBE_SQUARE }],
        water: [{ v: PROBE_SQUARE }],
      },
      meta,
    );

    const full = buildTileMeshes(tile, materials, true);
    const reduced = buildTileMeshes(tile, materials, false);

    expect(layerNames(full, materials)).toEqual([
      "building",
      "buildingRoof",
      "green",
      "roadBand",
      "roadCasing",
      "roadSurface",
      "water",
    ]);
    // The casing travels with the road, for the same reason the band does: it is what the
    // road is drawn with, not scenery that can be given up.
    expect(layerNames(reduced, materials)).toEqual([
      "roadBand",
      "roadCasing",
      "roadSurface",
    ]);
  });

  it("draws the casing wider than the road it edges, and beneath it", () => {
    const tile = decodeTile(TILE_ZERO, { roads: [road()] }, meta);
    const group = buildTileMeshes(tile, materials, true);
    const casing = meshWith(group, materials.roadCasing);
    const surface = meshWith(group, materials.roadSurface);
    if (casing === null || surface === null) throw new Error("no road layer");
    // An edge only reads if it stands proud of the surface it edges.
    expect(zSpan(casing)).toBeGreaterThan(zSpan(surface));
    expect(zSpan(casing)).toBeCloseTo(zSpan(surface) + 2 * ROAD_CASING_M);
    expect(casing.geometry.getAttribute("position").getY(0)).toBeCloseTo(
      layerHeight("roadCasing"),
    );
  });

  it("holds the casing's colour doing its job in each reading of the violet ruling", () => {
    // Amended 2026-09-23, twice. First with the white key: the casing used to be derived - the
    // road's own fact multiplied up - and this asserted the ratio; the key inverted, no factor
    // on a dark road could reach a line that has to sit above the road and below the white
    // land, so the casing became its own fact. Then with the violet ruling: in reading A the
    // relation is that same one, a line strictly between the street and the land; in reading B
    // the street rises to the land's own plane, so the line sits below both - it is what draws
    // a street's edge on a light map - and above the signal, so a band outranks the line.
    const luma = (color: Color): number => {
      const hex = color.getHex();
      return 0.299 * ((hex >> 16) & 0xff) + 0.587 * ((hex >> 8) & 0xff) + 0.114 * (hex & 0xff); // GROUNDED-EXEMPT: the Rec. 601 luma coefficients, the standard the reference frames were sampled in.
    };
    const land = luma(new Color(COLOR_WALK_GROUND));
    const aMaterials = createTileMaterials("a");
    const aCasing = luma(aMaterials.roadCasing.color);
    expect(aCasing).toBeGreaterThan(luma(aMaterials.roadSurface.color));
    expect(aCasing).toBeLessThan(land);
    const bMaterials = createTileMaterials("b");
    const bCasing = luma(bMaterials.roadCasing.color);
    expect(bCasing).toBeLessThan(luma(bMaterials.roadSurface.color));
    expect(bCasing).toBeLessThan(land);
    expect(bCasing).toBeGreaterThan(luma(new Color(roadSignalColor("b"))));
  });

  it("keeps every road fragment in one mesh rather than one mesh per fragment", () => {
    const roads = [
      road({ v: PROBE_ROAD }),
      road({ v: [0, 100, 100, 0] }),
      road({ v: [0, 200, 100, 0] }),
    ];
    const tile = decodeTile(TILE_ZERO, { roads }, meta);
    const group = buildTileMeshes(tile, materials, true);
    const roadMeshes = group.children.filter(
      (child) => child instanceof Mesh && child.material === materials.roadSurface,
    );
    expect(roadMeshes).toHaveLength(1);
  });

  it("places the ground layers at the heights the shared layer stack gives them", () => {
    const tile = decodeTile(
      TILE_ZERO,
      {
        roads: [road({ r: RISK_THRESHOLD_ELEVATED })],
        green: [{ v: PROBE_SQUARE }],
        water: [{ v: PROBE_SQUARE }],
      },
      meta,
    );
    const group = buildTileMeshes(tile, materials, true);

    const heightOf = (material: Material): number | null => {
      const mesh = meshWith(group, material);
      if (mesh === null) return null;
      return mesh.geometry.getAttribute("position").getY(0);
    };

    expect(heightOf(materials.water)).toBeCloseTo(layerHeight("water"));
    expect(heightOf(materials.green)).toBeCloseTo(layerHeight("green"));
    expect(heightOf(materials.roadSurface)).toBeCloseTo(layerHeight("roadBase"));
    expect(heightOf(materials.roadBand)).toBeCloseTo(layerHeight("roadBand"));
  });

  it("names the group after its tile, so a leaked group is traceable", () => {
    const tile = decodeTile(TILE_ONE_EAST, {}, meta);
    const group = buildTileMeshes(tile, materials, true);
    expect(group.name).toBe("tile:1,0");
  });

  it("builds nothing for a tile the bake left empty", () => {
    const group = buildTileMeshes(decodeTile(TILE_ZERO, {}, meta), materials, true);
    expect(group.children).toHaveLength(0);
  });
});

describe("disposal", () => {
  it("empties a tile group and leaves the shared materials alone", () => {
    const materials = createTileMaterials();
    const group = buildTileMeshes(
      decodeTile(TILE_ZERO, { roads: [road({ r: RISK_THRESHOLD_ELEVATED })] }, probeMeta()),
      materials,
      true,
    );
    expect(group.children.length).toBeGreaterThan(0);
    disposeGroup(group);
    expect(group.children).toHaveLength(0);
    // The materials outlive the tile; `disposeTileMaterials` owns them.
    expect(materials.roadSurface.color.getHexString()).toBeTruthy();
    disposeTileMaterials(materials);
  });
});
