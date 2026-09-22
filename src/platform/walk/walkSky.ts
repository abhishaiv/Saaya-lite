/**
 * The sky's own scenery: a field of four-pointed glints above the horizon.
 *
 * The reference's night map carries them - five glints in the frame at 60 s, fixed to the
 * world and sitting above the haze seam - and this view had none, which left the strip above
 * the horizon as flat clear colour. Measured from the reference with `starcheck.py`,
 * 2026-09-23, after an earlier reading had written them off as the phone's status bar: the
 * status bar is the red band at rows 0-52 of every frame, and these are below it.
 *
 * Every literal here is scenery, so each carries a `GROUNDED-EXEMPT` reason rather than a fact
 * id. The band the glints occupy is *derived* from the camera facts rather than named, so the
 * sky cannot drift away from a camera that moves.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Material,
  Points,
  PointsMaterial,
} from "three";

import {
  COLOR_WHITE,
  WALK_CAMERA_DIST_M,
  WALK_CAMERA_FOV_DEG,
  WALK_CAMERA_LOOK_AT_M,
  WALK_CAMERA_PITCH_DEG,
} from "./walkFacts";

const DEGREES_TO_RADIANS = Math.PI / 180; // GROUNDED-EXEMPT: unit conversion, not a product value.

/** How many glints the sky holds. */
const STAR_COUNT = 64; // GROUNDED-EXEMPT: scenery density, not a product value.
/** How far away the sky is drawn, in metres. */
const STAR_SHELL_M = 400; // GROUNDED-EXEMPT: a rendering range, not a product value.
/** A glint's size in framebuffer pixels. */
const STAR_SIZE_PX = 9; // GROUNDED-EXEMPT: a sprite size, not a product value.
/** The lowest glint, in degrees above horizontal, which keeps them clear of the horizon seam. */
const STAR_ELEV_MIN_DEG = 1.6; // GROUNDED-EXEMPT: clears the horizon seam, not a product value.
/** How far round the sky they are spread, in degrees either side of straight ahead. */
const STAR_AZIMUTH_HALF_DEG = 60; // GROUNDED-EXEMPT: scenery coverage across a resize, not a product value.
/** The generated glint sprite's edge, in pixels. */
const GLINT_TEXTURE_PX = 64; // GROUNDED-EXEMPT: a texture size, not a product value.
/** How wide the glint's waist is against its points. */
const GLINT_WAIST = 0.18; // GROUNDED-EXEMPT: a sprite shape, not a product value.
/** Hash constants for the deterministic spread. */
const GLINT_HASH_A = 12.9898; // GROUNDED-EXEMPT: a hash seed, not a product value.
const GLINT_HASH_B = 78.233; // GROUNDED-EXEMPT: a hash seed, not a product value.
const GLINT_HASH_SCALE = 43758.5453; // GROUNDED-EXEMPT: a hash scale, not a product value.

export interface SkyBand {
  /** The lowest glint, in degrees above horizontal. */
  readonly elevMinDeg: number;
  /** The top of the frame, in degrees above horizontal. */
  readonly elevMaxDeg: number;
  /** How far round the sky the glints are spread. */
  readonly azimuthHalfDeg: number;
}

/**
 * Where in the sky the glints can be seen from.
 *
 * The view's camera does not rotate: it holds a rigid offset from her and aims at a point
 * above her head, so the horizon sits at a fixed row and the sky is the strip above it. That
 * strip's top is `fov / 2` above the camera's own axis, and the axis is depressed by the angle
 * its aim point sits below it - both from the camera's facts, so a camera amendment moves the
 * sky with it.
 */
export function skyBand(): SkyBand {
  const pitchRadians = WALK_CAMERA_PITCH_DEG * DEGREES_TO_RADIANS;
  const backM = WALK_CAMERA_DIST_M * Math.cos(pitchRadians);
  const upM = WALK_CAMERA_DIST_M * Math.sin(pitchRadians);
  const axisDepressionDeg =
    Math.atan2(upM - WALK_CAMERA_LOOK_AT_M, backM) / DEGREES_TO_RADIANS;
  return {
    elevMinDeg: STAR_ELEV_MIN_DEG,
    elevMaxDeg: WALK_CAMERA_FOV_DEG / 2 - axisDepressionDeg,
    azimuthHalfDeg: STAR_AZIMUTH_HALF_DEG,
  };
}

/** A deterministic fraction in [0, 1) for an index, so the sky does not reshuffle per run. */
function hash(index: number, seed: number): number {
  const value = Math.sin(index * seed) * GLINT_HASH_SCALE;
  return value - Math.floor(value);
}

/**
 * The glints' positions on the shell, as a flat xyz array.
 *
 * Deterministic on purpose: two captures of the same place have to be comparable pixel for
 * pixel, so the sky is laid out from the index rather than from a random source.
 */
export function starPositions(count: number): Float32Array {
  const band = skyBand();
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const up = hash(index, GLINT_HASH_A);
    const round = hash(index, GLINT_HASH_B) * 2 - 1;
    const elevRadians =
      (band.elevMinDeg + (band.elevMaxDeg - band.elevMinDeg) * up) *
      DEGREES_TO_RADIANS;
    const azimuthRadians = round * band.azimuthHalfDeg * DEGREES_TO_RADIANS;
    const levelM = Math.cos(elevRadians) * STAR_SHELL_M;
    // The camera looks along +z, so that is where straight ahead is.
    positions[index * 3] = Math.sin(azimuthRadians) * levelM;
    positions[index * 3 + 1] = Math.sin(elevRadians) * STAR_SHELL_M;
    positions[index * 3 + 2] = Math.cos(azimuthRadians) * levelM;
  }
  return positions;
}

/** The four-pointed glint the reference draws, generated rather than shipped as art. */
function glintTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = GLINT_TEXTURE_PX;
  canvas.height = GLINT_TEXTURE_PX;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("the sky's sprite could not be drawn");
  const centre = GLINT_TEXTURE_PX / 2;
  const waist = centre * GLINT_WAIST;

  // A soft core first, so the arms read as a glow rather than as two crossed blades.
  const glow = context.createRadialGradient(
    centre,
    centre,
    0,
    centre,
    centre,
    waist * 2,
  );
  glow.addColorStop(0, "rgba(255, 255, 255, 1)"); // GROUNDED-EXEMPT: white, the same value as color.white.
  glow.addColorStop(1, "rgba(255, 255, 255, 0)"); // GROUNDED-EXEMPT: white at zero alpha, a sprite gradient stop.
  context.fillStyle = glow;
  context.fillRect(0, 0, GLINT_TEXTURE_PX, GLINT_TEXTURE_PX);

  context.fillStyle = "#FFFFFF";
  context.beginPath();
  for (let point = 0; point < 8; point += 1) {
    // Eight vertices: four points out at the axes, four waists between them.
    const radius = point % 2 === 0 ? centre : waist;
    const angle = (point * Math.PI) / 4 - Math.PI / 2;
    const x = centre + Math.cos(angle) * radius;
    const y = centre + Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export interface SkyLayer {
  readonly points: Points;
  dispose(): void;
}

/**
 * The glints, ready to add to the scene.
 *
 * `sizeAttenuation` is off, so a glint is the same size however far away it is drawn - which
 * is what makes it read as something at infinity rather than as a small object nearby. The
 * material is unfogged: the haze is for the ground, and a hazed star is a star that is not
 * there. It follows the camera every frame, so the sky does not slide past as she walks.
 */
export function createSkyLayer(): SkyLayer {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(starPositions(STAR_COUNT), 3),
  );
  const texture = glintTexture();
  const material = new PointsMaterial({
    color: COLOR_WHITE,
    map: texture,
    size: STAR_SIZE_PX,
    sizeAttenuation: false,
    transparent: true,
    // A glint is light, so it adds to the sky rather than painting over it.
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const points = new Points(geometry, material);
  points.name = "sky";
  return {
    points,
    dispose() {
      geometry.dispose();
      texture.dispose();
      (material as Material).dispose();
    },
  };
}
