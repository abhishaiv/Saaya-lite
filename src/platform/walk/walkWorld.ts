/**
 * Loading and holding the baked world.
 *
 * One fetch, one parse, and the tiles are then indexed by key for the streaming
 * window. The bake's `meta` is authoritative for the tile size, the quantisation
 * step and the storey height; nothing here restates them.
 *
 * `MAP_SPEC.md`: the world asset is "derived from the same OSM extract and the same
 * frozen `vizag_heatmap.geojson`" as the flat map. It is not a second dataset, which
 * is what makes the per-road risk lawful.
 */

import type { RawTile } from "./walkTiles";
import { parseWorldMeta, tileKeyOf, type RawWorldMeta, type WorldMeta } from "./walkProjection";

/** The shape the bake writes. */
export interface RawWorld {
  readonly meta: RawWorldMeta;
  readonly tiles: Readonly<Record<string, RawTile>>;
}

export interface WalkWorld {
  readonly meta: WorldMeta;
  /** Tiles by `"tx,ty"`. A key that is absent is a tile the bake did not emit. */
  readonly tiles: ReadonlyMap<string, RawTile>;
  /** The tile for a key, or `null` when the bake has none there. */
  tileAt(tx: number, ty: number): RawTile | null;
}

export function parseWalkWorld(raw: RawWorld): WalkWorld {
  const tiles = new Map<string, RawTile>();
  for (const [key, tile] of Object.entries(raw.tiles)) {
    tiles.set(key, tile);
  }
  return {
    meta: parseWorldMeta(raw.meta),
    tiles,
    tileAt(tx: number, ty: number): RawTile | null {
      return tiles.get(tileKeyOf(tx, ty)) ?? null;
    },
  };
}

/**
 * Where the bake writes the world.
 *
 * Declared here for the same reason `characterParts.ts` declares its own directory:
 * one place to look when the asset moves. `MAP_SPEC.md` names this exact file, so the
 * path is a spec value rather than a choice.
 */
export const WORLD_ASSET_URL = "/assets/world/world_tiled.json";

/**
 * Fetch and parse the world.
 *
 * **One fetch, then a decode window.** The bake emits a single `world_tiled.json`
 * rather than a file per tile, so "streaming" here means the resident *decode* window
 * — `MAP_SPEC.md`'s "keep that tile and the ring around it resident, and drop the rest"
 * — not a per-tile download. The download is the whole asset once; what the window
 * bounds is how many tiles are turned into geometry and kept in memory. See
 * progress.md, 2026-09-12, for the figures this contradicts in the spec's streaming
 * table.
 *
 * The caller supplies the url so a test can point at a fixture.
 */
export async function loadWalkWorld(url: string): Promise<WalkWorld> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`World asset failed to load: ${response.status}`);
  }
  const raw = (await response.json()) as RawWorld;
  return parseWalkWorld(raw);
}
