import { afterEach, describe, expect, it, vi } from "vitest";

import { parseWorldMeta } from "./walkProjection";
import { loadWalkWorld, parseWalkWorld, WORLD_ASSET_URL, type RawWorld } from "./walkWorld";

/**
 * A meta block for these fixtures. See `walkTiles.test.ts` for why every number here is
 * marked exempt rather than pinned to a fact: the bake owns these values, and the client
 * only ever reads them back.
 */
function probeRawMeta(): RawWorld["meta"] {
  return {
    origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
    tileM: 1024, // GROUNDED-EXEMPT: probe tile size; the real tile size comes from the bake's meta.
    q: 10, // GROUNDED-EXEMPT: probe quantisation step.
    storeyM: 4, // GROUNDED-EXEMPT: probe storey height.
    minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTx: 2, // GROUNDED-EXEMPT: probe grid bound.
    minTy: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTy: 2, // GROUNDED-EXEMPT: probe grid bound.
  };
}

function probeWorld(): RawWorld {
  return {
    meta: probeRawMeta(),
    tiles: {
      "0,0": { roads: [{ r: 0, c: "residential", v: [0, 0, 10, 0] }] },
      "1,2": { green: [{ v: [0, 0, 10, 0, 0, 10, -10, 0] }] },
      "-1,0": {},
    },
  };
}

describe("parseWalkWorld", () => {
  it("indexes every tile the bake emitted by its own key", () => {
    const world = parseWalkWorld(probeWorld());
    expect(world.tiles.size).toBe(3);
    expect(world.tiles.has("1,2")).toBe(true);
    expect(world.tiles.has("-1,0")).toBe(true);
  });

  it("finds a tile inside the grid and returns nothing outside it", () => {
    const world = parseWalkWorld(probeWorld());
    expect(world.tileAt(0, 0)).not.toBeNull();
    expect(world.tileAt(1, 2)).not.toBeNull();
    expect(world.tileAt(-1, 0)).not.toBeNull();
    // Inside the declared grid, but the bake emitted nothing there.
    expect(world.tileAt(2, 2)).toBeNull();
    // Outside the grid entirely.
    const outside = probeRawMeta().maxTx + 1;
    expect(world.tileAt(outside, outside)).toBeNull();
  });

  it("reads the tile size, quantisation step and storey height from the bake's own meta", () => {
    const world = parseWalkWorld(probeWorld());
    expect(world.meta.tileM).toBe(probeRawMeta().tileM);
    expect(world.meta.q).toBe(probeRawMeta().q);
    expect(world.meta.storeyM).toBe(probeRawMeta().storeyM);
  });

  it("derives metres per degree of longitude from the origin's own latitude", () => {
    const world = parseWalkWorld(probeWorld());
    const atVizag = world.meta.metresPerDegreeLongitude;
    // At any latitude away from the equator a degree of longitude is shorter than at
    // the equator, and never zero.
    expect(atVizag).toBeGreaterThan(0);
    const atEquator = parseWorldMeta({ ...probeRawMeta(), origin: [0, 83.3] }).metresPerDegreeLongitude;
    expect(atVizag).toBeLessThan(atEquator);
  });

  it("refuses a meta block whose origin is not a coordinate pair", () => {
    expect(() =>
      parseWalkWorld({ meta: { ...probeRawMeta(), origin: [] }, tiles: {} }),
    ).toThrow();
  });

  it("refuses a meta block whose tile size is not a usable number", () => {
    expect(() =>
      parseWalkWorld({
        meta: { ...probeRawMeta(), tileM: Number.NaN },
        tiles: {},
      }),
    ).toThrow();
  });

  it("keeps an empty world as an empty world rather than throwing", () => {
    const world = parseWalkWorld({ meta: probeRawMeta(), tiles: {} });
    expect(world.tiles.size).toBe(0);
    expect(world.tileAt(0, 0)).toBeNull();
  });
});

describe("loadWalkWorld", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the declared asset and parses it", async () => {
    const raw = probeWorld();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => raw }));
    vi.stubGlobal("fetch", fetchMock);

    const world = await loadWalkWorld(WORLD_ASSET_URL);
    expect(fetchMock).toHaveBeenCalledWith(WORLD_ASSET_URL);
    expect(world.tiles.size).toBe(3);
  });

  it("reports the status when the asset is not there, rather than an empty world", async () => {
    // A probe status for this fixture; any non-ok response must be reported, not swallowed.
    const missingStatus = 404; // GROUNDED-EXEMPT: a probe HTTP status, not a product value.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: missingStatus })));
    await expect(loadWalkWorld(WORLD_ASSET_URL)).rejects.toThrow(String(missingStatus));
  });

  it("declares the path the spec names, so there is one place to look when it moves", () => {
    expect(WORLD_ASSET_URL).toBe("/assets/world/world_tiled.json");
  });
});
