import { describe, expect, it } from "vitest";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import { CHARACTER_AXES, isBodyCoveringPart } from "./characterParts";
import {
  GARMENT_BOTTOM_COLOR,
  GARMENT_TOP_COLOR,
} from "./walkFacts";
import {
  applyGarmentColour,
  clearHemOverTrousers,
  GARMENT_COLOR_BY_AXIS,
  liftOffSkin,
} from "./walkCharacter";

/**
 * The distances these tests hand the function.
 *
 * The stand-off the view actually uses is `walkCharacter.ts`'s business; the point here
 * is that whatever distance it is given is the distance every vertex travels.
 */
const GIVEN_M = 0.008; // GROUNDED-EXEMPT: a test fixture, not a product value.
const OTHER_GIVEN_M = 0.01; // GROUNDED-EXEMPT: a test fixture, not a product value.
const THIRD_GIVEN_M = 0.005; // GROUNDED-EXEMPT: a test fixture, not a product value.
/** A trousers-top height, in the fixture plane's own units. */
const TROUSERS_TOP_Y_M = 0.5; // GROUNDED-EXEMPT: a test fixture, not a product value.

/** A two-triangle plane in the XY plane, all four normals pointing at +Z. */
function planeGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3),
  );
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  return geometry;
}

function flatPlane(): Mesh {
  return new Mesh(planeGeometry());
}

function vertexZ(mesh: Mesh): number[] {
  const position = mesh.geometry.getAttribute("position");
  return [0, 1, 2, 3].map((vertex) => position.getZ(vertex));
}

describe("liftOffSkin", () => {
  it("moves every vertex the given distance along its own normal", () => {
    const mesh = flatPlane();
    liftOffSkin(mesh, GIVEN_M);
    for (const z of vertexZ(mesh)) expect(z).toBeCloseTo(GIVEN_M, 6);
  });

  it("moves a vertex along its own normal, not along a shared one", () => {
    const mesh = flatPlane();
    mesh.geometry.getAttribute("normal").setXYZ(1, 1, 0, 0);
    liftOffSkin(mesh, OTHER_GIVEN_M);
    const position = mesh.geometry.getAttribute("position");
    // The vertex at (1,0,0) with a +x normal travels in x; the others travel in z.
    expect(position.getX(1)).toBeCloseTo(1 + OTHER_GIVEN_M, 6);
    expect(position.getZ(1)).toBeCloseTo(0, 6);
    expect(position.getZ(0)).toBeCloseTo(OTHER_GIVEN_M, 6);
  });

  it("reaches meshes nested under the part's scene", () => {
    const part = new Object3D();
    const child = flatPlane();
    part.add(child);
    liftOffSkin(part, THIRD_GIVEN_M);
    for (const z of vertexZ(child)) expect(z).toBeCloseTo(THIRD_GIVEN_M, 6);
  });

  it("leaves a part with no normals untouched rather than throwing", () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([1, 2, 3], 3));
    const mesh = new Mesh(geometry);
    expect(() => liftOffSkin(mesh, GIVEN_M)).not.toThrow();
    expect(mesh.geometry.getAttribute("position").getZ(0)).toBe(3);
  });

  it("gives the part bounds it did not have before", () => {
    const mesh = flatPlane();
    expect(mesh.geometry.boundingSphere).toBeNull();
    liftOffSkin(mesh, GIVEN_M);
    expect(mesh.geometry.boundingSphere).not.toBeNull();
  });
});

describe("clearHemOverTrousers", () => {
  it("moves every vertex at or below the trousers' top out by the clearance", () => {
    const mesh = flatPlane();
    clearHemOverTrousers(mesh, TROUSERS_TOP_Y_M, GIVEN_M);
    // The plane spans y 0..1, so the two low vertices are under the trousers' top and
    // the two high ones are clear of it already.
    const z = vertexZ(mesh);
    expect(z[0]).toBeCloseTo(GIVEN_M, 6);
    expect(z[1]).toBeCloseTo(GIVEN_M, 6);
    expect(z[2]).toBeCloseTo(0, 6);
    expect(z[3]).toBeCloseTo(0, 6);
  });

  it("eases to nothing across the clearance above the trousers' top", () => {
    const mesh = flatPlane();
    const position = mesh.geometry.getAttribute("position");
    position.setY(1, TROUSERS_TOP_Y_M + GIVEN_M / 2);
    position.setY(2, TROUSERS_TOP_Y_M + GIVEN_M);
    clearHemOverTrousers(mesh, TROUSERS_TOP_Y_M, GIVEN_M);
    const z = vertexZ(mesh);
    // Halfway through the fade is half the clearance; the fade's far edge is untouched.
    expect(z[1]).toBeCloseTo(GIVEN_M / 2, 6);
    expect(z[2]).toBeCloseTo(0, 6);
    expect(z[0]).toBeCloseTo(GIVEN_M, 6);
  });

  it("moves a vertex along its own normal, not along a shared one", () => {
    const mesh = flatPlane();
    mesh.geometry.getAttribute("normal").setXYZ(1, 1, 0, 0);
    clearHemOverTrousers(mesh, TROUSERS_TOP_Y_M, GIVEN_M);
    const position = mesh.geometry.getAttribute("position");
    expect(position.getX(1)).toBeCloseTo(1 + GIVEN_M, 6);
    expect(position.getZ(1)).toBeCloseTo(0, 6);
    expect(position.getZ(0)).toBeCloseTo(GIVEN_M, 6);
  });

  it("reaches meshes nested under the part's scene", () => {
    const part = new Object3D();
    const child = flatPlane();
    part.add(child);
    clearHemOverTrousers(part, TROUSERS_TOP_Y_M, THIRD_GIVEN_M);
    expect(vertexZ(child)[0]).toBeCloseTo(THIRD_GIVEN_M, 6);
  });

  it("leaves a part with no normals untouched rather than throwing", () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([1, 0, 3], 3));
    const mesh = new Mesh(geometry);
    expect(() => clearHemOverTrousers(mesh, TROUSERS_TOP_Y_M, GIVEN_M)).not.toThrow();
    expect(mesh.geometry.getAttribute("position").getZ(0)).toBe(3);
  });

  it("gives the part bounds it did not have before", () => {
    const mesh = flatPlane();
    expect(mesh.geometry.boundingSphere).toBeNull();
    clearHemOverTrousers(mesh, TROUSERS_TOP_Y_M, GIVEN_M);
    expect(mesh.geometry.boundingSphere).not.toBeNull();
  });
});

/** A part shaped like the ones the loader hands over: a scene with meshes inside it. */
function partWithMaterial(material: MeshStandardMaterial): Object3D {
  const part = new Object3D();
  part.add(new Mesh(planeGeometry(), material));
  return part;
}

function standardMaterialIn(part: Object3D): MeshStandardMaterial {
  let found: MeshStandardMaterial | null = null;
  part.traverse((object) => {
    if (found !== null || !(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) found = material;
    }
  });
  if (found === null) throw new Error("the fixture holds no standard material");
  return found;
}

describe("applyGarmentColour", () => {
  it("leaves the material drawing the colour the view states", () => {
    const part = partWithMaterial(new MeshStandardMaterial());
    applyGarmentColour(part, GARMENT_TOP_COLOR);
    expect(standardMaterialIn(part).color.getHexString()).toBe(
      GARMENT_TOP_COLOR.slice("#".length).toLowerCase(),
    );
  });

  it("reaches a mesh nested under the part's scene", () => {
    const nested = partWithMaterial(new MeshStandardMaterial());
    const outer = new Object3D();
    outer.add(nested);
    applyGarmentColour(outer, GARMENT_BOTTOM_COLOR);
    expect(standardMaterialIn(nested).color.getHexString()).toBe(
      GARMENT_BOTTOM_COLOR.slice("#".length).toLowerCase(),
    );
  });

  it("paints every material of a multi-material mesh, not just the first", () => {
    const mesh = new Mesh(planeGeometry(), [
      new MeshStandardMaterial(),
      new MeshStandardMaterial(),
    ]);
    applyGarmentColour(mesh, GARMENT_TOP_COLOR);
    const painted = (mesh.material as MeshStandardMaterial[]).map((material) =>
      material.color.getHexString(),
    );
    expect(painted).toEqual([
      GARMENT_TOP_COLOR.slice("#".length).toLowerCase(),
      GARMENT_TOP_COLOR.slice("#".length).toLowerCase(),
    ]);
  });

  it("leaves a material it cannot colour alone rather than throwing", () => {
    const mesh = new Mesh(planeGeometry(), new LineBasicMaterial());
    expect(() => applyGarmentColour(mesh, GARMENT_TOP_COLOR)).not.toThrow();
  });
});

/**
 * The invariants a frame cannot show on its own.
 *
 * A garment axis with no colour here ships grey and reads as skin; an entry for a part
 * that is not a garment paints her hair the accent colour. Neither failure would say
 * which of the two had happened, so both are pinned here instead.
 */
describe("the garments the walk view paints", () => {
  it("covers every axis that clothes the body, and no other axis", () => {
    const coveringAxisIds = CHARACTER_AXES.filter((axis) =>
      axis.options.some((partId) => isBodyCoveringPart(partId)),
    ).map((axis) => axis.id);
    expect(Object.keys(GARMENT_COLOR_BY_AXIS).sort()).toEqual(
      [...coveringAxisIds].sort(),
    );
  });

  it("puts the lighter violet over the darker one, so the two read as two garments", () => {
    const lightness = (hex: string): number => {
      const hsl = { h: 0, s: 0, l: 0 };
      new Color(hex).getHSL(hsl);
      return hsl.l;
    };
    expect(lightness(GARMENT_TOP_COLOR)).toBeGreaterThan(
      lightness(GARMENT_BOTTOM_COLOR),
    );
  });
});
