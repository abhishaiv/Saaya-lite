import { describe, expect, it } from "vitest";
import { Color, LinearSRGBColorSpace, PerspectiveCamera, Vector3 } from "three";

import {
  COLOR_WALK_GROUND,
  COLOR_WALK_HAZE,
  COLOR_WALK_SKY,
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
  COLOR_ZONE_MODERATE,
  WALK_CAMERA_DIST_M,
  WALK_CAMERA_FOV_DEG,
  WALK_CAMERA_LOOK_AT_M,
  WALK_CAMERA_PITCH_DEG,
  WALK_CHARACTER_HEIGHT_M,
} from "./walkFacts";
import {
  buildTileMeshes,
  createTileMaterials,
  ROAD_BAND_WIDTH_FRACTION,
  type DecodedTile,
} from "./walkTiles";
import { buildZoneLayer, ZONE_FILL_ALPHA_SCALE } from "./walkZones";
import { bundledZoneRepository } from "../../data/repository/zoneRepository";
import { parseWorldMeta } from "./walkProjection";

/**
 * The composition, pinned as geometry.
 *
 * The camera facts were amended on 2026-09-22 from the reference video's measured frames, and
 * the amendment is only worth anything if the arithmetic it was derived from still holds. This
 * file re-derives the frame from the four facts and asserts it against the measured rows, so an
 * edit to any one of `fov`, `pitch`, `dist` or `look_at` fails here rather than quietly moving
 * the horizon or shrinking her in the frame.
 *
 * The rows below are derived with the projection a perspective camera actually uses, and below
 * they are checked against a real `three.PerspectiveCamera` built the way `walkScene.ts` builds
 * it, because the first solve of these facts did not. A row is **not** `(depression - axis) /
 * fov`: three.js projects `NDC_y = tan(angle above the axis) / tan(vFOV / 2)` and a row is
 * `0.5 - NDC_y / 2`. The two agree near the frame centre and diverge with distance - on this rig
 * the angle-linear reading put the horizon at 0.164 where the camera renders 0.178, which is 27
 * px on the reference's own 1920 px frame.
 *
 * The reference rows, all as a fraction of frame height, measured from the video: horizon 0.164,
 * her feet 0.736, her head 0.612, her height 0.124. Her feet are the stable measurement, within
 * 0.001 across three walk frames. Her head bobs between 0.613 and 0.622 as she walks, so her
 * height on screen is the target and the head row is the middle of that bob.
 *
 * Re-measured 2026-09-23, frame by frame across the whole clip rather than at three frames: her
 * height while walking is a median 0.124 (range 0.117-0.129), where the 2026-09-22 reading was
 * 0.120. That is the founder's "too small for the screen" put into a number, and it is why the
 * camera facts moved; the head row follows from the same two measurements, 0.736 - 0.124.
 */
const REFERENCE_HORIZON = 0.164; // GROUNDED-EXEMPT: measured off the reference frames; see the block above.
const REFERENCE_FEET = 0.736; // GROUNDED-EXEMPT: measured off the reference frames; see the block above.
const REFERENCE_HEAD = 0.612; // GROUNDED-EXEMPT: measured off the reference frames; see the block above.
const REFERENCE_CHARACTER = 0.124; // GROUNDED-EXEMPT: measured off the reference frames; see the block above.

/**
 * How close the re-derivation has to land.
 *
 * Not exact, and it should not be: the facts are stated as the rounded numbers the measurement
 * came to, and that rounding is what this holds. Half of the last digit of `pitch` is worth
 * about 0.001 of a row, and half of `dist`'s about the same, so 0.002 is the facts' own
 * precision rather than slack. The amended rig lands within 0.0005 of all three rows.
 */
const ROW_TOLERANCE = 0.002; // GROUNDED-EXEMPT: the tolerance these measured rows are held to, not a product value.

const DEGREES_TO_RADIANS = Math.PI / 180; // GROUNDED-EXEMPT: unit conversion, not a product value.
const FRAME_CENTRE = 1 / 2; // GROUNDED-EXEMPT: a divisor. Half of a frame is still half of it.
const HALF = 2; // GROUNDED-EXEMPT: a divisor. Half of a stated value is still half of it.

/** The Rec. 601 luma coefficients — the standard the reference frames were sampled in. */
const R601_RED = 0.299; // GROUNDED-EXEMPT: a measurement standard's coefficient, not a product value.
const R601_GREEN = 0.587; // GROUNDED-EXEMPT: a measurement standard's coefficient, not a product value.
const R601_BLUE = 0.114; // GROUNDED-EXEMPT: a measurement standard's coefficient, not a product value.

/** A colour's luma, the measure the reference frames were sampled in. */
function lumaOf(hex: string): number {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return R601_RED * red + R601_GREEN * green + R601_BLUE * blue;
}

/**
 * The frame the camera facts compose.
 *
 * The camera holds a rigid boom: `dist` back along an axis `pitch` above the horizon, aimed at
 * a point `look_at` above her feet. Everything here follows from those four numbers and her
 * height, in the same order `walkScene.ts` applies them: the camera sits `dist * sin pitch` up
 * and `dist * cos pitch` back and looks down its own axis, and a row is where a ray that many
 * degrees off that axis lands once the renderer projects it. Since 2026-09-23 the boom turns to
 * her heading, but the turn is about her own position and none of the four numbers move with it,
 * which is why these rows are yaw-invariant and are still the frame to solve against.
 */
function frame(): {
  horizon: number;
  feet: number;
  head: number;
  character: number;
  cameraUpM: number;
  cameraBackM: number;
} {
  const pitchRadians = WALK_CAMERA_PITCH_DEG * DEGREES_TO_RADIANS;
  const cameraUpM = WALK_CAMERA_DIST_M * Math.sin(pitchRadians);
  const cameraBackM = WALK_CAMERA_DIST_M * Math.cos(pitchRadians);

  /** How far below the horizon, in degrees, a ray to `heightM` above her feet leaves. */
  const depression = (heightM: number): number =>
    Math.atan((cameraUpM - heightM) / cameraBackM) / DEGREES_TO_RADIANS;

  /**
   * How far below the horizon the axis itself points, in degrees. Her feet are `pitch` below it
   * by construction, so a ray at `depression` below the horizon is `axis - depression` above the
   * axis, and the axis's own depression is the ray that reaches a point at infinite distance.
   */
  const axis = depression(WALK_CAMERA_LOOK_AT_M);

  /** The projection's own divisor: the tangent of half the field of view. */
  const halfFovTan = Math.tan((WALK_CAMERA_FOV_DEG / HALF) * DEGREES_TO_RADIANS);

  /**
   * The row a ray `degreesAboveAxis` off the axis lands on.
   *
   * A perspective camera projects the tangent of that angle against the tangent of the field of
   * view's half-angle, and `NDC_y` of +1 is the top of the frame, so a row is `0.5 - NDC_y / 2`.
   * The angle itself is only this tangent's small-angle limit, and using it directly is what put
   * the horizon 0.014 of a frame too high.
   */
  const rowOf = (degreesAboveAxis: number): number =>
    FRAME_CENTRE - Math.tan(degreesAboveAxis * DEGREES_TO_RADIANS) / (HALF * halfFovTan);

  const row = (heightM: number): number => rowOf(axis - depression(heightM));

  const feet = row(0);
  const head = row(WALK_CHARACTER_HEIGHT_M);
  return {
    horizon: rowOf(axis),
    feet,
    head,
    character: feet - head,
    cameraUpM,
    cameraBackM,
  };
}

describe("the amended camera composes the measured frame", () => {
  const composed = frame();

  it("puts the horizon where the reference frames put it", () => {
    expect(Math.abs(composed.horizon - REFERENCE_HORIZON)).toBeLessThan(ROW_TOLERANCE);
  });

  it("puts her feet and her head on the rows the reference frames measure", () => {
    expect(Math.abs(composed.feet - REFERENCE_FEET)).toBeLessThan(ROW_TOLERANCE);
    expect(Math.abs(composed.head - REFERENCE_HEAD)).toBeLessThan(ROW_TOLERANCE);
  });

  it("draws her at the size the reference draws its avatar", () => {
    expect(Math.abs(composed.character - REFERENCE_CHARACTER)).toBeLessThan(ROW_TOLERANCE);
  });

  it("keeps the horizon in frame, with sky above it and ground below it", () => {
    // The frame the amendment replaced had no horizon in it: a 52 deg camera aimed at her
    // mid-height put the horizon off the top edge, which is why every capture was a void.
    expect(composed.horizon).toBeGreaterThan(0);
    expect(composed.horizon).toBeLessThan(FRAME_CENTRE);
    expect(composed.feet).toBeLessThan(1);
  });

  it("keeps the camera below the tallest thing she walks past", () => {
    // The other half of the amendment: at 27 m the camera was 21 m up and sat behind the 16 m
    // buildings at dense corners, so the frame became unlit wall. A camera under the rooflines
    // reads the street instead. 16 m is the height read off the corner capture.
    const buildingHeightM = 16; // GROUNDED-EXEMPT: read back out of the capture named in the comment, not a product value.
    expect(composed.cameraUpM).toBeLessThan(buildingHeightM);
  });

  it("keeps the aim point above her head, so the ground stays in the frame", () => {
    expect(WALK_CAMERA_LOOK_AT_M).toBeGreaterThan(WALK_CHARACTER_HEIGHT_M);
    expect(WALK_CAMERA_LOOK_AT_M).toBeLessThan(composed.cameraUpM);
  });
});

describe("the amended palette keeps the reference's luminance relations", () => {
  const materials = createTileMaterials();
  const ground = lumaOf(COLOR_WALK_GROUND);
  const sky = lumaOf(COLOR_WALK_SKY);
  /** The colour a material actually renders, which is the thing the frame is made of. */
  const luma = (material: { color: { getHexString(): string } }): number =>
    lumaOf(`#${material.color.getHexString()}`);

  it("makes the ground the brighter half of the view, which the old all-black scene did not", () => {
    // Amended 2026-09-23 with the key. The band this asserted was the reference's own
    // land:sky ratio, measured at 2.16-2.45 on its night frames, and it held the placement
    // against the reference's measurements. The 2026-09-23 ruling takes the brand's own
    // white-and-dark-violet key instead, where the pair measures 5.98: the band is gone and
    // what it was ever for is kept - the land is the bright half and the sky the dark one,
    // and the pair is at least as strong as the reference's own, so the inversion deepens
    // the figure/ground the composition rests on rather than weakening it.
    expect(ground / sky).toBeGreaterThan(2.45); // GROUNDED-EXEMPT: the upper end of the band the reference frames' own land:sky ratio was measured in, kept as the floor the inversion has to clear.
    // And the sky stays darker than the darkest thing drawn on the map, so the map reads as
    // something in a world rather than as the whole of the frame. The night key's sky was
    // darker than its road too (53 against 71); the inversion moves both and keeps the order.
    expect(sky).toBeLessThan(luma(materials.roadSurface));
  });

  it("keeps the road dark against the ground, the surface the risk bands are read on", () => {
    // Amended 2026-09-23. The old assertion was the reference's own 0.56, which is the road's
    // value in the night key. The inversion moves it to about 0.29 - `color.tile.road` records
    // the same move as 3.6x darker than the land - so a ratio to the land is no longer the
    // thing to hold. What the ratio was standing in for is: the road is the surface the risk
    // bands are read against, so it has to be dark, and every band has to read on it.
    expect(luma(materials.roadSurface) / ground).toBeLessThan(0.35); // GROUNDED-EXEMPT: the top of the band the inverted road sits in, stated so a later edit that lightened the road fails here.
    for (const tier of [COLOR_ZONE_HIGH, COLOR_ZONE_MODERATE, COLOR_ZONE_ELEVATED]) {
      expect(lumaOf(tier)).toBeGreaterThan(luma(materials.roadSurface));
    }
  });

  it("keeps the line network between the road it edges and the land it seams", () => {
    // Amended 2026-09-23. The band this held - luma 190-250 over a land of 110-140 - was the
    // reference's own bright edge lines drawn on its own dark map, and the white land makes it
    // impossible rather than merely wrong: a line at 190-250 on a plane of 235 is a line that
    // disappears into the plane. The rule that replaced the derivation is what the derivation
    // was for: a line strictly between the two things it separates. Brighter than the road,
    // so a street has an edge; darker than the land, so a block has a seam.
    expect(luma(materials.roadCasing)).toBeGreaterThan(luma(materials.roadSurface));
    expect(luma(materials.roadCasing)).toBeLessThan(ground);
  });

  /**
   * The tones the walls actually render in, read out of the geometry rather than the material.
   *
   * Amended 2026-09-22, when the wall's hue moved into a per-vertex colour buffer: `pushWallShades`
   * gives each face its own tone around `color.tile.building`, and `materials.building` is white so
   * that the fact is not multiplied in twice. `luma(materials.building)` is therefore the identity,
   * 255, and says nothing about the ladder - and the ladder is a statement about the colours a frame
   * is actually made of, so it is read from the buffer the frame is made of. Each tone goes back to
   * an sRGB hex on the way out: the space `lighten` spreads in and the space `lumaOf` measures in.
   */
  const wallTones: { lowest: number; highest: number; distinct: number } = (() => {
    /** One square footprint, ten metres on a side. */
    const footprint = (x: number, z: number): { x: number; z: number }[] => [
      { x, z: z - 5 },
      { x: x + 10, z: z - 5 },
      { x: x + 10, z: z + 5 },
      { x, z: z + 5 },
    ];
    /** Three footprints a street apart, so their faces do not all hash to a single tone. */
    const block: DecodedTile = {
      id: { tx: 0, ty: 0 }, // GROUNDED-EXEMPT: probe geometry, not a product position.
      roads: [],
      buildings: [
        { ring: footprint(0, 0), building: { h: 9, t: "yes", v: [] } }, // GROUNDED-EXEMPT: probe geometry.
        { ring: footprint(30, 0), building: { h: 9, t: "yes", v: [] } }, // GROUNDED-EXEMPT: probe geometry.
        { ring: footprint(60, 0), building: { h: 9, t: "yes", v: [] } }, // GROUNDED-EXEMPT: probe geometry.
      ],
      green: [],
      water: [],
    };
    const group = buildTileMeshes(block, materials, true);
    const wallMesh = group.children.find(
      (child) => (child as unknown as { material?: unknown }).material === materials.building,
    );
    if (wallMesh === undefined) throw new Error("the built tile carries no wall mesh");
    const colors = (
      wallMesh as unknown as {
        geometry: {
          getAttribute(name: string): {
            count: number;
            getX(index: number): number;
            getY(index: number): number;
            getZ(index: number): number;
          };
        };
      }
    ).geometry.getAttribute("color");

    const seen = new Set<string>();
    const tone = new Color();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let index = 0; index < colors.count; index += 1) {
      // The buffer stores the working space, which is linear; `getHexString` reads it back out in
      // sRGB, which is where the fact and the ladder both live.
      tone.setRGB(colors.getX(index), colors.getY(index), colors.getZ(index), LinearSRGBColorSpace);
      const hex = `#${tone.getHexString()}`;
      seen.add(hex);
      const value = lumaOf(hex);
      if (value < lowest) lowest = value;
      if (value > highest) highest = value;
    }
    return { lowest, highest, distinct: seen.size };
  })();

  it("keeps green, walls and water under the ground, so mass reads against plane", () => {
    expect(luma(materials.green)).toBeLessThan(ground);
    expect(luma(materials.water)).toBeLessThan(ground);
    // Every wall the renderer can draw, not the mean of them: the shade spread may not lift a face
    // over the plane it stands on, or a block would stop reading as a mass at its brightest wall.
    expect(wallTones.highest).toBeLessThan(ground);
  });

  it("keeps the roofs over the ground, because from under the rooflines they are the pale plane", () => {
    expect(luma(materials.buildingRoof)).toBeGreaterThan(ground);
    expect(luma(materials.buildingRoof)).toBeGreaterThan(wallTones.highest);
  });

  it("gives neighbouring faces their own tone, so a run of walls is not one mass", () => {
    // What the spread is for: measured, rows 0.20-0.22 of the frame were 84.9-100% one rgb(56,64,96),
    // where the reference's own row 0.22 carries 9-29 separate runs.
    expect(wallTones.distinct).toBeGreaterThan(1);
  });

  it("fades the distance down into a dark seam at the horizon, which is what the reference does", () => {
    // Amended 2026-09-22. The haze was first placed on the reading that the reference's horizon
    // band is its brightest large area. Measured at full resolution that reading was wrong: the
    // band is a dark seam, rgb(25,47,107) at luma 47, darker than the sky above it (luma 56)
    // and darker still than the land below it (luma 124-129 in the rows just under). The rows
    // the reference holds at luma 124-135 are the map itself, not a band at the horizon.
    expect(lumaOf(COLOR_WALK_HAZE)).toBeLessThan(lumaOf(COLOR_WALK_SKY));
    expect(lumaOf(COLOR_WALK_HAZE)).toBeLessThan(ground);
  });

  it("keeps every risk-carrying material out of the haze", () => {
    // `MAP_SPEC.md`: the haze is scenery-only, "a distant road band faded into haze would be
    // the risk information degrading with draw distance". The band and the whole zone layer
    // therefore opt out of the scene's fog, and so does nothing else.
    expect(materials.roadBand.fog).toBe(false);
    const zones = buildZoneLayer(
      bundledZoneRepository.snapshot().mapZones,
      parseWorldMeta({
        origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
        tileM: 1024, // GROUNDED-EXEMPT: probe tile size; unread by these assertions.
        q: 10, // GROUNDED-EXEMPT: probe quantisation; unread by these assertions.
        storeyM: 4, // GROUNDED-EXEMPT: probe storey height; unread by these assertions.
        minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
        maxTx: 2, // GROUNDED-EXEMPT: probe grid bound.
        minTy: 0, // GROUNDED-EXEMPT: probe grid bound.
        maxTy: 2, // GROUNDED-EXEMPT: probe grid bound.
      }),
      0.5, // GROUNDED-EXEMPT: a probe on-screen scale.
    );
    zones.group.traverse((object) => {
      const material = (object as { material?: { fog?: boolean } }).material;
      if (material !== undefined) expect(material.fog).toBe(false);
    });
    expect(materials.roadSurface.fog).toBe(true);
    expect(materials.building.fog).toBe(true);
  });
});

describe("the camera distance and the frame it composes agree", () => {
  it("is the axis distance, not the ground distance", () => {
    // 10.98 m of ground back and 6.97 m up is 13.0 m along the axis - the measurement's own
    // two figures, recombined. A future edit that treated `dist` as the ground distance would
    // pull the camera down and tilt the horizon off the measured row.
    const composed = frame();
    expect(composed.cameraBackM * composed.cameraBackM + composed.cameraUpM * composed.cameraUpM)
      .toBeCloseTo(WALK_CAMERA_DIST_M * WALK_CAMERA_DIST_M, 6);
    // The two figures `walk.camera.dist`'s own text records: the ground back and the height
    // up the solve came to.
    // GROUNDED-EXEMPT: recorded in that fact's prose, so not readable out of the graph mechanically.
    expect(composed.cameraBackM / composed.cameraUpM).toBeCloseTo(10.98 / 6.97, 1); // GROUNDED-EXEMPT: see above.
  });

  it("uses the field of view it was solved against", () => {
    // The reference's own field of view is unknown; Saaya's is a fact and the solve held it
    // fixed, which is what makes the measured rows fov-independent targets.
    expect(WALK_CAMERA_FOV_DEG).toBe(54);
  });
});

/** The reference phone's own frame. The measured rows came from a 390x844 CSS viewport. */
const VIEWPORT_WIDTH = 390; // GROUNDED-EXEMPT: the reference phone's frame, not a product value.
const VIEWPORT_HEIGHT = 844; // GROUNDED-EXEMPT: the reference phone's frame, not a product value.

describe("the rows above are the rows the renderer projects", () => {
  const composed = frame();

  /**
   * The same rig, built the way `walkScene.ts` builds it, and asked for the row directly.
   *
   * Nothing here goes through `frame()`: the camera is placed from the facts, aimed at the aim
   * point, and the row is read back out of three's own projection. That is the only way this
   * file can catch its arithmetic drifting away from the renderer's, which is exactly what
   * happened to the first solve - it is the reason this block exists.
   */
  function projectedRow(heightM: number, aheadM: number): number {
    const camera = new PerspectiveCamera(
      WALK_CAMERA_FOV_DEG,
      VIEWPORT_WIDTH / VIEWPORT_HEIGHT,
      0.5, // GROUNDED-EXEMPT: a probe near plane. The row does not depend on it.
      5120, // GROUNDED-EXEMPT: a probe far plane, the ground plane's own width. The row does not depend on it either.
    );
    camera.position.set(0, composed.cameraUpM, -composed.cameraBackM);
    camera.lookAt(0, WALK_CAMERA_LOOK_AT_M, 0);
    camera.updateMatrixWorld(true);
    const point = new Vector3(0, heightM, aheadM);
    point.project(camera);
    return FRAME_CENTRE - point.y / HALF;
  }

  it("lands her feet and her head on the rows this file derives", () => {
    expect(projectedRow(0, 0)).toBeCloseTo(composed.feet, 9);
    expect(projectedRow(WALK_CHARACTER_HEIGHT_M, 0)).toBeCloseTo(composed.head, 9);
  });

  it("lands the horizon on the row this file derives", () => {
    // A point on the ground far ahead rather than at infinity, since nothing projects from
    // infinity. At 10 km the ground still subtends 0.04 deg from a camera 6.97 m up, which is
    // 0.0008 of a row - more than this tolerance - so the point has to be further out than the
    // world is wide for the two rows to be the same row.
    expect(projectedRow(0, 1e6)).toBeCloseTo(composed.horizon, 4);
  });

  it("puts the horizon lower in the frame than the angle-linear row that replaced it", () => {
    // The two models bracketed this camera's horizon at 0.178 and 0.150. The render is on the
    // near side, which is the whole of the amendment: read the far one and the camera looks
    // 1.4% of a frame too high, and no fog setting can put the ground's far edge back.
    const linearRow = FRAME_CENTRE - 18.8883 / WALK_CAMERA_FOV_DEG; // GROUNDED-EXEMPT: the discarded model's own arithmetic, restated to show which side of it the render is on.
    expect(composed.horizon).toBeGreaterThan(linearRow);
    expect(projectedRow(0, 1e6)).toBeGreaterThan(linearRow);
  });
});

/**
 * How much ground the frame shows across, at the row of her feet.
 *
 * The number `MAP_SPEC.md` and `ROAD_HALF_WIDTH_M` were both rescaled against, so it is
 * derived here from the same facts they are rather than restated. A pixel at the frame's left
 * edge and at her feet's row is a ray that many degrees below the axis and that many degrees
 * to the side of it; where that ray meets the ground plane is how much ground fits across the
 * frame. A road wider than this is a road that is the whole picture, which is what the width
 * this amendment replaced was.
 */
function groundWidthAtFeetRow(): number {
  const { cameraUpM, cameraBackM } = frame();
  const halfHorizontal =
    Math.tan((WALK_CAMERA_FOV_DEG / HALF) * DEGREES_TO_RADIANS) *
    (VIEWPORT_WIDTH / VIEWPORT_HEIGHT);

  // The axis, from the camera down to the point it crosses her vertical.
  const axisZ = cameraBackM;
  const axisY = WALK_CAMERA_LOOK_AT_M - cameraUpM;
  const axisLength = Math.hypot(axisZ, axisY);
  const forward = { z: axisZ / axisLength, y: axisY / axisLength };
  const up = { z: -axisY / axisLength, y: axisZ / axisLength };

  const belowAxis =
    Math.atan(cameraUpM / cameraBackM) -
    Math.atan((cameraUpM - WALK_CAMERA_LOOK_AT_M) / cameraBackM);
  const down = Math.tan(belowAxis);
  const ray = { z: forward.z - down * up.z, y: forward.y - down * up.y };

  return 2 * (cameraUpM / -ray.y) * halfHorizontal;
}

describe("the frame's own ground footprint", () => {
  it("shows about six metres of ground across at her feet", () => {
    // 5.76 m since the 2026-09-23 amendment shortened the boom: the footprint scales with
    // the camera's distance, so the closer camera reads a little less ground across. The
    // claim it carries - that a 1.5 m half-width road is a fraction of the frame, not the
    // whole of it - is unchanged.
    expect(groundWidthAtFeetRow()).toBeCloseTo(5.76, 2); // GROUNDED-EXEMPT: solved by the function above from the camera facts, not a product value.
  });

  it("was narrower than the street the amendment replaced, which is why it was rescaled", () => {
    // The old residential width was 8 m - more ground than the frame has - so the street she
    // was standing on could not fit in the picture she was looking at.
    const oldResidentialWidthM = 8; // GROUNDED-EXEMPT: the width this amendment replaced, recorded in `ROAD_HALF_WIDTH_M`'s own comment.
    expect(groundWidthAtFeetRow()).toBeLessThan(oldResidentialWidthM);
  });
});

/** The z-extent of a mesh's geometry, which for a road running along x is its width. */
function widthOf(mesh: { geometry: { getAttribute(name: string): { count: number; getZ(index: number): number } } }): number {
  const position = mesh.geometry.getAttribute("position");
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index);
    if (z < min) min = z;
    if (z > max) max = z;
  }
  return max - min;
}

describe("a banded street is still drawn as a street", () => {
  const materials = createTileMaterials();
  /** One straight road along x, so every mesh's z-extent is its width and nothing else. */
  const road: DecodedTile = {
    id: { tx: 0, ty: 0 },
    roads: [
      {
        path: [
          { x: -50, z: 0 }, // GROUNDED-EXEMPT: probe geometry.
          { x: 50, z: 0 }, // GROUNDED-EXEMPT: probe geometry.
        ],
        road: { r: 0.9, c: "residential", v: [] }, // 0.9 is over risk.threshold.elevated, so this road is banded.
      },
    ],
    buildings: [],
    green: [],
    water: [],
  };
  const group = buildTileMeshes(road, materials, false);
  const [casing, surface, band] = group.children as unknown as {
    geometry: never;
  }[];

  it("draws the band as a spine down the middle of the road, not over all of it", () => {
    // Amended 2026-09-22. At the road's full width the band erased the surface, the casing
    // and the junctions under it, and every road in the dense captures carried a band, so the
    // whole street network rendered as one colour from the horizon down.
    expect(widthOf(band)).toBeLessThan(widthOf(surface));
    expect(widthOf(band) / widthOf(surface)).toBeCloseTo(ROAD_BAND_WIDTH_FRACTION, 3);
  });

  it("keeps the casing proud of the road on both sides, so the street has an edge", () => {
    expect(widthOf(casing)).toBeGreaterThan(widthOf(surface));
  });

  it("draws no band at all on a road below the low threshold", () => {
    const quiet: DecodedTile = {
      ...road,
      roads: [{ path: road.roads[0]!.path, road: { r: 0.1, c: "residential", v: [] } }], // under risk.threshold.low
    };
    // Casing and surface, and nothing else.
    expect(buildTileMeshes(quiet, materials, false).children).toHaveLength(2);
  });
});

describe("a zone tint is a cast over the ground, not a repaint of it", () => {
  const ground = lumaOf(COLOR_WALK_GROUND);
  const snapshot = bundledZoneRepository.snapshot().mapZones;
  const strongest = [...snapshot].sort((left, right) => right.zone.opacity - left.zone.opacity)[0]!;
  const meta = parseWorldMeta({
    origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
    tileM: 1024, // GROUNDED-EXEMPT: probe tile size.
    q: 10, // GROUNDED-EXEMPT: probe quantisation.
    storeyM: 4, // GROUNDED-EXEMPT: probe storey height.
    minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTx: 2,
    minTy: 0,
    maxTy: 2,
  });

  /** The tint's own colour laid over the ground at `alpha`, as the frame composites it. */
  function overGround(tintHex: string, alpha: number): { red: number; green: number; blue: number } {
    const bytes = (hex: string): number[] =>
      [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
    const base = bytes(COLOR_WALK_GROUND);
    const tint = bytes(tintHex);
    const mixed = base.map((channel, index) =>
      Math.round(alpha * (tint[index] ?? 0) + (1 - alpha) * channel),
    );
    return { red: mixed[0] ?? 0, green: mixed[1] ?? 0, blue: mixed[2] ?? 0 };
  }

  /** The luma of the ground after the tint is laid over it at `alpha`. */
  function tintedGroundLuma(tintHex: string, alpha: number): number {
    const mixed = overGround(tintHex, alpha);
    const hex = `#${[mixed.red, mixed.green, mixed.blue]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
    return lumaOf(hex);
  }

  it("draws the fill at a fraction of the dataset's opacity", () => {
    const layer = buildZoneLayer([strongest], meta, 0.5);
    const fill = (layer.group.children[0] as { children: unknown[] }).children[0] as {
      material: { opacity: number };
    };
    expect(fill.material.opacity).toBeCloseTo(strongest.zone.opacity * ZONE_FILL_ALPHA_SCALE, 6);
  });

  it("keeps the ground reading as ground under the strongest tint the dataset carries", () => {
    // Amended 2026-09-23. The old form of this assertion was the land's own blue-dominance,
    // which held only because the night key's land was blue: rgb(87,140,174) has 87 bytes
    // between its red and its blue, and the white-violet land that replaced it has ten, so
    // the strongest tint the dataset carries flips the ordering. The old assertion was
    // measuring the land's hue, not the tint's weight.
    //
    // What it was for survives the key. Measured, the strongest is HIGH at the dataset's own
    // 0.35, and at the scaled alpha it costs the land 16 luma of 236: the tint is a cast, so
    // the plane it is cast over stays the plane. The sibling test holds the other half - the
    // dataset's own alpha would take a fifth of the land's brightness, which is a repaint.
    expect(tintedGroundLuma(strongest.zone.colorHex, strongest.zone.opacity * ZONE_FILL_ALPHA_SCALE) / ground).toBeGreaterThan(0.9); // GROUNDED-EXEMPT: how much of the land's brightness a cast may cost and still be a cast, stated here so a later edit to the scale fails rather than passing quietly.
  });

  it("is a scale that is doing work: the dataset's own alpha would repaint the ground", () => {
    expect(tintedGroundLuma(strongest.zone.colorHex, strongest.zone.opacity) / ground).toBeLessThan(0.85); // GROUNDED-EXEMPT: the other side of the same line - see the test above.
  });
});
