import { Color, Group, Mesh, type Material } from "three";
import { describe, expect, it } from "vitest";

import { layerHeight } from "./walkGeometry";
import type { WorldMeta } from "./walkProjection";
import { parseWorldMeta } from "./walkProjection";
import {
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
  COLOR_ZONE_MODERATE,
  RISK_CLAMP_MIN,
  RISK_THRESHOLD_ELEVATED,
  RISK_THRESHOLD_LOW,
  RISK_THRESHOLD_MODERATE,
} from "./walkFacts";
import {
  bandColorForRisk,
  buildTileMeshes,
  createTileMaterials,
  decodeTile,
  disposeGroup,
  disposeTileMaterials,
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
  it("gives a road under the product's low threshold no band at all", () => {
    expect(bandColorForRisk(RISK_CLAMP_MIN)).toBeNull();
  });

  it("bands a road at the exact low threshold in the moderate colour", () => {
    expect(bandColorForRisk(RISK_THRESHOLD_LOW)).toBe(COLOR_ZONE_MODERATE);
  });

  it("bands a road at the exact moderate threshold in the elevated colour", () => {
    expect(bandColorForRisk(RISK_THRESHOLD_MODERATE)).toBe(COLOR_ZONE_ELEVATED);
  });

  it("bands a road at the exact elevated threshold in the high colour", () => {
    expect(bandColorForRisk(RISK_THRESHOLD_ELEVATED)).toBe(COLOR_ZONE_HIGH);
  });

  it("reads each threshold as an inclusive lower bound", () => {
    // A value one tier down is still below the next threshold, so it must fall to the
    // tier beneath rather than rounding up.
    expect(bandColorForRisk(RISK_THRESHOLD_MODERATE)).not.toBe(COLOR_ZONE_HIGH);
    expect(bandColorForRisk(RISK_THRESHOLD_LOW)).not.toBe(COLOR_ZONE_ELEVATED);
  });

  it("uses the flat map's tier colours rather than a second ramp", () => {
    const ramp = [
      COLOR_ZONE_HIGH,
      COLOR_ZONE_ELEVATED,
      COLOR_ZONE_MODERATE,
    ];
    for (const risk of [RISK_THRESHOLD_LOW, RISK_THRESHOLD_MODERATE, RISK_THRESHOLD_ELEVATED]) {
      expect(ramp).toContain(bandColorForRisk(risk));
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

  it("draws the band in the tier colour of the road's own risk", () => {
    const tile = decodeTile(
      TILE_ZERO,
      { roads: [road({ r: RISK_THRESHOLD_ELEVATED })] },
      meta,
    );
    const group = buildTileMeshes(tile, materials, true);
    const band = meshWith(group, materials.roadBand);
    expect(band).not.toBeNull();
    const expected = new Color(COLOR_ZONE_HIGH);
    const colors = band?.geometry.getAttribute("color");
    expect(colors?.count).toBeGreaterThan(0);
    expect(colors?.getX(0)).toBeCloseTo(expected.r);
    expect(colors?.getY(0)).toBeCloseTo(expected.g);
    expect(colors?.getZ(0)).toBeCloseTo(expected.b);
  });

  it("draws a primary road three times as wide as a residential one", () => {
    const residential = buildTileMeshes(
      decodeTile(TILE_ZERO, { roads: [road({ c: "residential" })] }, meta),
      materials,
      true,
    );
    const primary = buildTileMeshes(
      decodeTile(TILE_ZERO, { roads: [road({ c: "primary" })] }, meta),
      materials,
      true,
    );
    const residentialMesh = meshWith(residential, materials.roadSurface);
    const primaryMesh = meshWith(primary, materials.roadSurface);
    expect(residentialMesh).not.toBeNull();
    expect(primaryMesh).not.toBeNull();
    if (residentialMesh === null || primaryMesh === null) return;
    expect(zSpan(primaryMesh) / zSpan(residentialMesh)).toBeCloseTo(3);
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
      "roadSurface",
      "water",
    ]);
    expect(layerNames(reduced, materials)).toEqual(["roadBand", "roadSurface"]);
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
