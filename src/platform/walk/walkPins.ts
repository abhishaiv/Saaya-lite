/**
 * Where the place pins come from, in the scene's own terms.
 *
 * Two steps, both kept out of the renderer so they can be checked without a canvas:
 * the bake's place rows projected onto the ground the character walks, and the
 * nearest-N choice against `walk.places.pinBudget` from where she stands now.
 *
 * The nearest set is recomputed every frame because she moves; the projection is not,
 * because the world does not. A place pill's whole meaning is "near her, on screen",
 * so a pin with no fix for her yet does not exist.
 */

import { toGround, type WorldMeta } from "./walkProjection";

/** A place row reduced to what pinning needs: its id and its ground point. */
export interface PinAnchor {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

/** The fields a baked place row must carry for the pin layer to place it. */
export interface PinPlace {
  readonly id: string;
  readonly cat: string;
  readonly lat: number;
  readonly lon: number;
}

/**
 * The category-filtered rows, projected onto the ground once per set or category
 * change. `null` means every category. This runs when the set changes, never per
 * frame - the bake holds 1444 rows and projecting all of them sixty times a second
 * would be the one allocation the frame path does not get to make.
 */
export function projectPinAnchors(
  places: readonly PinPlace[],
  category: string | null,
  meta: WorldMeta,
): readonly PinAnchor[] {
  const wanted =
    category === null
      ? places
      : places.filter((place) => place.cat === category);
  return wanted.map((place) => {
    const ground = toGround(place.lat, place.lon, meta);
    return { id: place.id, x: ground.x, z: ground.z };
  });
}

// Scratch for the per-frame nearest-N. The anchor set only changes on `setPins`, so the
// two arrays are sized once per set and rewritten in place every frame - the frame path
// allocates nothing. Scenes call this one frame at a time, so the shared scratch cannot
// interleave.
const distances: number[] = [];
const order: number[] = [];

/**
 * The ids of the nearest pins to a ground point, nearest first, at most `budget` of
 * them. Squared planar distances in the bake's own ground metres - the plane the
 * camera draws - which is the straight line the view can actually draw.
 *
 * `keep` is the frame's own view of the world: with it, the budget is spent on the
 * nearest anchors the camera can actually show, not on the nearest anchors full stop.
 * The bake's densest cluster put ten of its nearest twelve behind or below the camera,
 * so a street that had a dozen pills to show drew two - the filter is what closes that
 * gap, and it is why the ceiling is a ceiling on pills *over the street*.
 */
export function selectNearestPinIds(
  anchors: readonly PinAnchor[],
  x: number,
  z: number,
  budget: number,
  keep?: (anchor: PinAnchor) => boolean,
): readonly string[] {
  distances.length = anchors.length;
  order.length = anchors.length;
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (anchor === undefined) continue;
    const dx = anchor.x - x;
    const dz = anchor.z - z;
    distances[index] = dx * dx + dz * dz;
    order[index] = index;
  }
  order.sort((left, right) => (distances[left] ?? 0) - (distances[right] ?? 0));
  const chosen: string[] = [];
  for (let rank = 0; rank < order.length && chosen.length < budget; rank += 1) {
    const index = order[rank];
    const anchor = index === undefined ? undefined : anchors[index];
    if (anchor === undefined) continue;
    if (keep !== undefined && !keep(anchor)) continue;
    chosen.push(anchor.id);
  }
  return chosen;
}