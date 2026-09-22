/**
 * Her heading, as this view's own world understands it.
 *
 * Two conventions have to agree for a compass to point a camera the right way, and both
 * are settled here rather than inside the scene, so a test can check them without a
 * canvas.
 *
 * **North is -z.** `walkProjection.toGround` returns `{ x: east, z: -north }`. So a heading
 * of 0 degrees (north) is the world direction (0, -1) and 90 degrees (east) is (1, 0).
 *
 * **The recorded camera looks south.** The composition facts in `walkFacts.ts` - pitch,
 * distance, aim point - were solved against the reference for a camera placed behind her
 * on +z and aimed back at her, which is a camera looking toward +z. In this projection that
 * is south, so the default heading is 180 and the scene without a compass draws exactly the
 * frame the facts pin. `walkHeading.test.ts` asserts that, rather than leaving it to this
 * comment.
 */

const FULL_CIRCLE_DEG = 360; // GROUNDED-EXEMPT: a full circle in degrees, a unit conversion.
const HALF_CIRCLE_DEG = 180; // GROUNDED-EXEMPT: half of that circle, for wrapping a turn.

/** Degrees in a radian, the inverse of the conversion the scene already carries. */
const RADIANS_PER_DEGREE = Math.PI / HALF_CIRCLE_DEG; // GROUNDED-EXEMPT: unit conversion, not a product value.

/**
 * The heading the view draws when it has no compass: a half turn, which is south.
 *
 * GROUNDED-EXEMPT: a half turn, and the direction the recorded camera already looks.
 */
export const DEFAULT_HEADING_DEG = HALF_CIRCLE_DEG;

/** Any angle, wrapped into [0, 360). */
export function normalizeDegrees(value: number): number {
  return ((value % FULL_CIRCLE_DEG) + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
}

/**
 * The turn from one heading to another, along the shorter arc.
 *
 * A result in (-180, 180]. Turning from 350 to 10 is twenty degrees clockwise, not three
 * hundred and forty the other way, which is the difference between the world nudging and
 * the world spinning.
 */
export function shortestTurnDegrees(
  fromDegrees: number,
  toDegrees: number,
): number {
  return (
    normalizeDegrees(toDegrees - fromDegrees + HALF_CIRCLE_DEG) - HALF_CIRCLE_DEG
  );
}

/**
 * The ground-plane unit vector she is looking along, for a compass heading.
 *
 * Both components are read from the projection rather than chosen: east is +x and north is
 * -z, so the east component of a heading is its sine and the north component its cosine -
 * and the z component is that cosine negated.
 */
export function directionForHeading(degrees: number): {
  readonly x: number;
  readonly z: number;
} {
  const radians = degrees * RADIANS_PER_DEGREE;
  return { x: Math.sin(radians), z: -Math.cos(radians) };
}

/**
 * The character's own `rotation.y` for a heading, so she faces where the view looks.
 *
 * The rig is built facing +z at a rotation of zero, which is the same convention
 * `walkScene.step` already uses when she turns to face the direction she is walking. At the
 * default heading this is zero: she is unchanged from the recorded frame.
 */
export function characterRotationY(degrees: number): number {
  const direction = directionForHeading(degrees);
  return Math.atan2(direction.x, direction.z);
}
