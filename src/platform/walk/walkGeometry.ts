/**
 * Ground-plane geometry primitives, shared by the tile layer and the zone layer.
 *
 * Both layers are the same kind of object: flat things laid on the ground, stacked in a
 * fixed order, built from the same two shapes. A ribbon follows an open path (a road, a
 * zone boundary). A ring fill covers a closed one (a park, a lake, a building roof, a
 * zone body). Keeping them here means a zone boundary and a road are the same ribbon,
 * so neither can be fixed without the other.
 *
 * The layer stack lives here for the same reason. It is one ordered list, and a layer's
 * height is its position in it. Nothing carries a hand-written offset, and no two layers
 * can be given the same height by accident — which is what z-fighting is.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShapeUtils,
  Vector2,
} from "three";

import type { GroundPoint } from "./walkProjection";

/**
 * Coplanar layers, ordered bottom to top.
 *
 * The order is the whole z-order of the walk view's ground, and it is chosen so the
 * safety information always sits above the scenery:
 *
 * 1. `water`, `green` — context, furthest back.
 * 2. `zoneFill` — the zone's tint on the ground, *under* the roads. `MAP_SPEC.md`: "the
 *    zone is a tint on the ground". Putting it over the roads would wash the risk bands,
 *    which are the thing that must never degrade.
 * 3. `roadBase`, `roadBand` — the road, then its risk band on top of it.
 * 4. `zoneGlow`, `zoneOutline` — the boundary, above everything, because the spec's
 *    stated purpose for it is legibility: "a line at the zone edge, so the boundary is
 *    legible from a low camera".
 */
export const LAYER_ORDER = [
  "water",
  "green",
  "zoneFill",
  "roadBase",
  "roadBand",
  "zoneGlow",
  "zoneOutline",
] as const;

export type LayerName = (typeof LAYER_ORDER)[number];

/**
 * Depth separation between coplanar ground layers.
 *
 * It only has to be larger than the depth buffer's resolution at the camera's distance
 * and far smaller than anything a person could see. Nothing in the product is stated in
 * metres at this scale.
 */
const LAYER_HEIGHT_STEP_M = 0.01; // GROUNDED-EXEMPT: depth separation between coplanar ground layers, not a product value.

export function layerHeight(name: LayerName): number {
  return (LAYER_ORDER.indexOf(name) + 1) * LAYER_HEIGHT_STEP_M;
}

function pointAt(path: readonly GroundPoint[], index: number): GroundPoint {
  const point = path[index];
  if (point === undefined) {
    throw new Error(`Path is missing point ${index}`);
  }
  return point;
}

/**
 * Lay a ribbon along an open path.
 *
 * Each point gets its own offset pair, taken from the average of the segments either
 * side of it, so a bend has no notch and consecutive quads share an edge. A
 * per-segment offset would be cheaper and would leave a wedge-shaped hole at every
 * corner, which on a road network is most of them.
 */
export function appendRibbon(
  positions: number[],
  path: readonly GroundPoint[],
  halfWidth: number,
  height: number,
): void {
  if (path.length < 2) return;
  const count = path.length;
  const leftX: number[] = [];
  const leftZ: number[] = [];
  const rightX: number[] = [];
  const rightZ: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const current = pointAt(path, i);
    const previous = i > 0 ? pointAt(path, i - 1) : null;
    const next = i + 1 < count ? pointAt(path, i + 1) : null;

    let dirX = 0;
    let dirZ = 0;
    if (previous !== null) {
      dirX += current.x - previous.x;
      dirZ += current.z - previous.z;
    }
    if (next !== null) {
      dirX += next.x - current.x;
      dirZ += next.z - current.z;
    }
    const length = Math.hypot(dirX, dirZ);
    if (length === 0) {
      // A repeated point carries no direction; borrow the previous offset so the
      // ribbon stays continuous instead of pinching to zero width.
      leftX.push(leftX[leftX.length - 1] ?? current.x);
      leftZ.push(leftZ[leftZ.length - 1] ?? current.z);
      rightX.push(rightX[rightX.length - 1] ?? current.x);
      rightZ.push(rightZ[rightZ.length - 1] ?? current.z);
      continue;
    }
    // Perpendicular in the ground plane: rotate the tangent a quarter turn.
    const normalX = -dirZ / length;
    const normalZ = dirX / length;
    leftX.push(current.x + normalX * halfWidth);
    leftZ.push(current.z + normalZ * halfWidth);
    rightX.push(current.x - normalX * halfWidth);
    rightZ.push(current.z - normalZ * halfWidth);
  }

  for (let i = 0; i + 1 < count; i += 1) {
    const l0x = leftX[i];
    const l0z = leftZ[i];
    const r0x = rightX[i];
    const r0z = rightZ[i];
    const l1x = leftX[i + 1];
    const l1z = leftZ[i + 1];
    const r1x = rightX[i + 1];
    const r1z = rightZ[i + 1];
    if (
      l0x === undefined || l0z === undefined || r0x === undefined ||
      r0z === undefined || l1x === undefined || l1z === undefined ||
      r1x === undefined || r1z === undefined
    ) {
      continue;
    }
    // Two triangles, wound the same way so DoubleSide is belt-and-braces rather than
    // load-bearing.
    positions.push(
      l0x, height, l0z, r0x, height, r0z, r1x, height, r1z,
      l0x, height, l0z, r1x, height, r1z, l1x, height, l1z,
    );
  }
}

/**
 * Close an open path so a ribbon can follow it all the way round.
 *
 * Returns the path unchanged when it already ends where it starts, so a caller can hand
 * in a bake ring or a geojson ring without knowing which convention it used.
 */
export function closePath(path: readonly GroundPoint[]): readonly GroundPoint[] {
  // A path with fewer than two points has no span to close, and appending its own first
  // point would just duplicate it.
  if (path.length <= 1) return path;
  const first = path[0];
  const last = path[path.length - 1];
  if (first === undefined || last === undefined) return path;
  if (first.x === last.x && first.z === last.z) return path;
  return [...path, first];
}

/** Append a filled ring (green, water, roof, zone body) at one height. */
export function appendRingFill(
  positions: number[],
  ring: readonly GroundPoint[],
  height: number,
): void {
  const contour: Vector2[] = [];
  for (const point of ring) contour.push(new Vector2(point.x, point.z));
  // A duplicated closing vertex makes triangulation fail.
  const last = contour[contour.length - 1];
  const first = contour[0];
  if (
    contour.length > 1 && last !== undefined && first !== undefined &&
    last.x === first.x && last.y === first.y
  ) {
    contour.pop();
  }
  if (contour.length < 3) return;
  for (const face of ShapeUtils.triangulateShape(contour, [])) {
    const a = face[0];
    const b = face[1];
    const c = face[2];
    if (a === undefined || b === undefined || c === undefined) continue;
    const pa = contour[a];
    const pb = contour[b];
    const pc = contour[c];
    if (pa === undefined || pb === undefined || pc === undefined) continue;
    positions.push(
      pa.x, height, pa.y,
      pb.x, height, pb.y,
      pc.x, height, pc.y,
    );
  }
}

/** Append the walls and roof of one building footprint. */
export function appendBuilding(
  walls: number[],
  roof: number[],
  ring: readonly GroundPoint[],
  heightM: number,
): void {
  let contour: GroundPoint[] = [...ring];
  const last = contour[contour.length - 1];
  const first = contour[0];
  if (
    contour.length > 1 && last !== undefined && first !== undefined &&
    last.x === first.x && last.z === first.z
  ) {
    contour = contour.slice(0, -1);
  }
  if (contour.length < 3) return;

  for (let i = 0; i < contour.length; i += 1) {
    const a = contour[i];
    const b = contour[(i + 1) % contour.length];
    if (a === undefined || b === undefined) continue;
    walls.push(
      a.x, 0, a.z, b.x, 0, b.z, b.x, heightM, b.z,
      a.x, 0, a.z, b.x, heightM, b.z, a.x, heightM, a.z,
    );
  }
  appendRingFill(roof, contour, heightM);
}

/** A geometry from a position buffer, or `null` when there was nothing to build. */
export function buildGeometry(positions: number[]): BufferGeometry | null {
  if (positions.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.computeBoundingSphere();
  return geometry;
}

/** A geometry from a position buffer plus a matching per-vertex colour buffer. */
export function buildColoredGeometry(
  positions: number[],
  colors: number[],
): BufferGeometry | null {
  if (positions.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colors), 3),
  );
  geometry.computeBoundingSphere();
  return geometry;
}

/** Repeat one colour once per vertex already pushed. */
export function pushColor(colors: number[], hex: string, times: number): void {
  const color = new Color(hex);
  for (let i = 0; i < times; i += 1) {
    colors.push(color.r, color.g, color.b);
  }
}
