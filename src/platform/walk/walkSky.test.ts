import { describe, expect, it } from "vitest";

import { skyBand, starPositions } from "./walkSky";

/**
 * The band the camera facts put the sky in, solved here rather than read from the module.
 *
 * `walkSky` derives this from `walk.camera.*`; restating the arithmetic is what makes the
 * test able to catch the derivation going wrong, so the inputs are the facts' own values.
 */
const FOV_DEG = 54; // fact: walk.camera.fov
const PITCH_DEG = 32.4; // fact: walk.camera.pitch
const DIST_M = 13.0; // fact: walk.camera.dist
const LOOK_AT_M = 3.21; // fact: walk.camera.look_at

const EXPECTED_TOP_DEG = (() => {
  const pitch = (PITCH_DEG * Math.PI) / 180;
  const back = DIST_M * Math.cos(pitch);
  const up = DIST_M * Math.sin(pitch);
  const depression = Math.atan2(up - LOOK_AT_M, back);
  return FOV_DEG / 2 - (depression * 180) / Math.PI;
})();

const SHELL_M = 400; // GROUNDED-EXEMPT: the test's copy of a rendering range, not a product value.
const AZIMUTH_HALF_DEG = 60; // GROUNDED-EXEMPT: the test's copy of a scenery span, not a product value.
const GIVEN_COUNT = 64; // GROUNDED-EXEMPT: a test fixture, not a product value.
const SMALLER_COUNT = 12; // GROUNDED-EXEMPT: a test fixture, not a product value.
const DEGREES = 180 / Math.PI;
/**
 * How much a position is allowed to move in passing through a `Float32Array`.
 *
 * The positions are stored as 32-bit floats, so an angle solved back out of one is only
 * accurate to about 1e-4 of a degree. Tighter than that would be testing the storage.
 */
const ANGLE_SLACK_DEG = 0.0001; // GROUNDED-EXEMPT: a floating-point tolerance, not a product value.
const SHELL_PLACES = 2; // GROUNDED-EXEMPT: a floating-point tolerance, not a product value.

function elevationDeg(y: number, x: number, z: number): number {
  return Math.atan2(y, Math.hypot(x, z)) * DEGREES;
}

describe("skyBand", () => {
  it("puts the top of the sky where the camera's own geometry does", () => {
    expect(skyBand().elevMaxDeg).toBeCloseTo(EXPECTED_TOP_DEG, 6);
  });

  it("keeps the whole band above the horizon", () => {
    const band = skyBand();
    expect(band.elevMinDeg).toBeGreaterThan(0);
    expect(band.elevMaxDeg).toBeGreaterThan(band.elevMinDeg);
  });
});

describe("starPositions", () => {
  it("places every glint above the horizon and inside the band", () => {
    const band = skyBand();
    const positions = starPositions(GIVEN_COUNT);
    for (let index = 0; index < GIVEN_COUNT; index += 1) {
      const x = positions[index * 3];
      const y = positions[index * 3 + 1];
      const z = positions[index * 3 + 2];
      if (x === undefined || y === undefined || z === undefined) throw new Error("short array");
      const elev = elevationDeg(y, x, z);
      expect(elev).toBeGreaterThanOrEqual(band.elevMinDeg - ANGLE_SLACK_DEG);
      expect(elev).toBeLessThanOrEqual(band.elevMaxDeg + ANGLE_SLACK_DEG);
    }
  });

  it("puts every glint on the shell, in front of the camera", () => {
    const positions = starPositions(GIVEN_COUNT);
    for (let index = 0; index < GIVEN_COUNT; index += 1) {
      const x = positions[index * 3] ?? 0;
      const y = positions[index * 3 + 1] ?? 0;
      const z = positions[index * 3 + 2] ?? 0;
      expect(Math.hypot(x, y, z)).toBeCloseTo(SHELL_M, SHELL_PLACES);
      // The camera looks along +z, so a glint behind it would never be drawn.
      expect(z).toBeGreaterThan(0);
    }
  });

  it("spreads the glints both ways round the sky", () => {
    const positions = starPositions(GIVEN_COUNT);
    let left = 0;
    let right = 0;
    for (let index = 0; index < GIVEN_COUNT; index += 1) {
      const x = positions[index * 3] ?? 0;
      if (x < 0) left += 1;
      else right += 1;
    }
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  it("stays inside the azimuth it is meant to cover", () => {
    const positions = starPositions(GIVEN_COUNT);
    for (let index = 0; index < GIVEN_COUNT; index += 1) {
      const x = positions[index * 3] ?? 0;
      const z = positions[index * 3 + 2] ?? 0;
      const az = Math.abs(Math.atan2(x, z) * DEGREES);
      expect(az).toBeLessThanOrEqual(AZIMUTH_HALF_DEG + ANGLE_SLACK_DEG);
    }
  });

  it("lays out the same sky every time", () => {
    expect(Array.from(starPositions(SMALLER_COUNT))).toEqual(
      Array.from(starPositions(SMALLER_COUNT)),
    );
  });
});
