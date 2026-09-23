/**
 * Geodesy and tile decoding for the walk view.
 *
 * Pure functions with no `three` import, so the whole of the coordinate maths is
 * unit-testable in the node environment the suite already runs in.
 *
 * The world asset is projected metres relative to an origin, bucketed into square
 * tiles, with each vertex quantised to a fraction of a metre and stored as a signed
 * delta from the previous vertex. Both the tile size and the quantisation step are
 * read from `meta`, never written here: the bake owns those numbers, and a second
 * copy in the client is a copy that can drift.
 *
 * Axis convention. The bake works in ground metres, x east and y north. Three.js
 * wants y up, so north becomes -z and the ground plane is x/z. That mapping
 * preserves handedness, so a clockwise ring stays clockwise and nothing renders
 * inside out.
 */

/** Metres per degree of latitude. GROUNDED-EXEMPT: a geodesy constant, not a product value. */
export const METRES_PER_DEGREE_LATITUDE = 110574; // GROUNDED-EXEMPT: WGS84 metres per degree of latitude, the same constant bake2.py projected with.
/** Metres per degree of longitude at the equator. GROUNDED-EXEMPT: a geodesy constant. */
const METRES_PER_DEGREE_LONGITUDE_EQUATOR = 111320; // GROUNDED-EXEMPT: WGS84 metres per degree of longitude at the equator, as bake2.py used.
/** Degrees to radians. GROUNDED-EXEMPT: a mathematical identity, not a product value. */
const DEGREES_TO_RADIANS = Math.PI / 180; // GROUNDED-EXEMPT: unit conversion, not a product value.

export interface WorldMeta {
  readonly originLatitude: number;
  readonly originLongitude: number;
  readonly metresPerDegreeLongitude: number;
  readonly tileM: number;
  readonly q: number;
  readonly storeyM: number;
  readonly minTx: number;
  readonly maxTx: number;
  readonly minTy: number;
  readonly maxTy: number;
}

export interface TileId {
  readonly tx: number;
  readonly ty: number;
}

/** A point on the ground plane, in the scene's own axes. */
export interface GroundPoint {
  readonly x: number;
  readonly z: number;
}

/** What the loader passes in, matching the bake's own `meta` block. */
export interface RawWorldMeta {
  readonly origin: readonly number[];
  readonly tileM: number;
  readonly q: number;
  readonly storeyM: number;
  readonly minTx: number;
  readonly maxTx: number;
  readonly minTy: number;
  readonly maxTy: number;
}

function requireFinite(value: number, what: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`World meta is missing a usable ${what}`);
  }
  return value;
}

export function parseWorldMeta(raw: RawWorldMeta): WorldMeta {
  const latitude = raw.origin[0];
  const longitude = raw.origin[1];
  if (latitude === undefined || longitude === undefined) {
    throw new Error("World meta origin must be [latitude, longitude]");
  }
  return {
    originLatitude: requireFinite(latitude, "origin latitude"),
    originLongitude: requireFinite(longitude, "origin longitude"),
    metresPerDegreeLongitude:
      METRES_PER_DEGREE_LONGITUDE_EQUATOR *
      Math.cos(requireFinite(latitude, "origin latitude") * DEGREES_TO_RADIANS),
    tileM: requireFinite(raw.tileM, "tileM"),
    q: requireFinite(raw.q, "q"),
    storeyM: requireFinite(raw.storeyM, "storeyM"),
    minTx: raw.minTx,
    maxTx: raw.maxTx,
    minTy: raw.minTy,
    maxTy: raw.maxTy,
  };
}

/**
 * A latitude and longitude to a point on the ground plane.
 *
 * This is the same projection the bake used, so the character stands where the
 * geometry says she stands. Any disagreement here shows up as her walking a few
 * metres beside her own street.
 */
export function toGround(
  latitude: number,
  longitude: number,
  meta: WorldMeta,
): GroundPoint {
  const east = (longitude - meta.originLongitude) * meta.metresPerDegreeLongitude;
  const north = (latitude - meta.originLatitude) * METRES_PER_DEGREE_LATITUDE;
  return { x: east, z: -north };
}

export function toTile(point: GroundPoint, meta: WorldMeta): TileId {
  return {
    tx: Math.floor(point.x / meta.tileM),
    ty: Math.floor(-point.z / meta.tileM),
  };
}

export function tileKey(id: TileId): string {
  return `${id.tx},${id.ty}`;
}

export function tileKeyOf(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

/** Every tile id in the baked grid, row by row. */
export function allTileIds(meta: WorldMeta): readonly TileId[] {
  const ids: TileId[] = [];
  for (let ty = meta.minTy; ty <= meta.maxTy; ty += 1) {
    for (let tx = meta.minTx; tx <= meta.maxTx; tx += 1) {
      ids.push({ tx, ty });
    }
  }
  return ids;
}

/**
 * Decode one layer fragment's vertices.
 *
 * The first pair is absolute quantised, every pair after it is a delta from the one
 * before, so a path cannot be read out of order or in parallel with itself. Both
 * coordinates are relative to the fragment's own tile origin.
 */
export function decodePath(
  vertices: readonly number[],
  tile: TileId,
  meta: WorldMeta,
): readonly GroundPoint[] {
  const points: GroundPoint[] = [];
  const originX = tile.tx * meta.tileM;
  const originNorth = tile.ty * meta.tileM;
  let qx = 0;
  let qy = 0;
  for (let i = 0; i + 1 < vertices.length; i += 2) {
    const dx = vertices[i];
    const dy = vertices[i + 1];
    if (dx === undefined || dy === undefined) break;
    if (i === 0) {
      qx = dx;
      qy = dy;
    } else {
      qx += dx;
      qy += dy;
    }
    points.push({
      x: originX + qx / meta.q,
      z: -(originNorth + qy / meta.q),
    });
  }
  return points;
}
