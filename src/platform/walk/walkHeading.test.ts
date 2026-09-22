import { describe, expect, it } from "vitest";

import {
  characterRotationY,
  DEFAULT_HEADING_DEG,
  directionForHeading,
  normalizeDegrees,
  shortestTurnDegrees,
} from "./walkHeading";

const FIXTURE_WEST_DEG = 270; // GROUNDED-EXEMPT: a test fixture, not a product value.
const FIXTURE_PAST_A_TURN_DEG = 450; // GROUNDED-EXEMPT: a test fixture, not a product value.
const FIXTURE_NEAR_NORTH_DEG = 350; // GROUNDED-EXEMPT: a test fixture, not a product value.

/**
 * Two decimal places, which is finer than a degree of heading needs to be read to.
 *
 * The added zero is there to turn a `-0` - which is what `-cos(90 degrees)` rounds to - back
 * into a plain `0`, so a cardinal row compares equal instead of failing on the sign of a
 * value that is zero either way.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

/** A direction, to those two places: `sin(pi)` is not exactly zero in binary. */
function roundedDirection(degrees: number): { x: number; z: number } {
  const direction = directionForHeading(degrees);
  return { x: round(direction.x), z: round(direction.z) };
}

describe("a heading in the walk view's own world", () => {
  it("draws the recorded frame when there is no compass", () => {
    // Founder finding, 2026-09-23: the view did not turn with him. The default has to
    // stay exactly the frame the composition facts were solved for, so a phone with no
    // compass, or one that refused the permission, is unchanged rather than restaged.
    expect(DEFAULT_HEADING_DEG).toBe(180);
    expect(roundedDirection(DEFAULT_HEADING_DEG)).toEqual({ x: 0, z: 1 });
    expect(round(characterRotationY(DEFAULT_HEADING_DEG))).toBe(0);
  });

  it("puts north at -z and east at +x, as toGround does", () => {
    // `walkProjection.toGround` returns `{ x: east, z: -north }`, so these four rows are
    // the projection restated rather than a second convention invented beside it.
    expect(directionForHeading(0)).toEqual({ x: 0, z: -1 });
    expect(roundedDirection(90)).toEqual({ x: 1, z: 0 });
    expect(roundedDirection(180)).toEqual({ x: 0, z: 1 });
    expect(roundedDirection(FIXTURE_WEST_DEG)).toEqual({ x: -1, z: 0 });
  });

  it("turns her onto the heading, and leaves her alone at the default", () => {
    expect(round(characterRotationY(90))).toBe(round(Math.PI / 2));
    expect(round(characterRotationY(FIXTURE_WEST_DEG))).toBe(
      round(-Math.PI / 2),
    );
  });

  it("wraps any angle into one circle", () => {
    expect(normalizeDegrees(-90)).toBe(FIXTURE_WEST_DEG);
    expect(normalizeDegrees(FIXTURE_PAST_A_TURN_DEG)).toBe(90);
    expect(normalizeDegrees(360)).toBe(0);
  });

  it("turns along the shorter arc, so a boundary crossing is a nudge", () => {
    expect(shortestTurnDegrees(FIXTURE_NEAR_NORTH_DEG, 10)).toBe(20);
    expect(shortestTurnDegrees(10, FIXTURE_NEAR_NORTH_DEG)).toBe(-20);
    expect(shortestTurnDegrees(0, 90)).toBe(90);
    expect(shortestTurnDegrees(90, 0)).toBe(-90);
  });
});
