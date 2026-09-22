import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute, Mesh, Object3D } from "three";

import { liftOffSkin } from "./walkCharacter";

/**
 * The distances these tests hand the function.
 *
 * The stand-off the view actually uses is `walkCharacter.ts`'s business; the point here
 * is that whatever distance it is given is the distance every vertex travels.
 */
const GIVEN_M = 0.008; // GROUNDED-EXEMPT: a test fixture, not a product value.
const OTHER_GIVEN_M = 0.01; // GROUNDED-EXEMPT: a test fixture, not a product value.
const THIRD_GIVEN_M = 0.005; // GROUNDED-EXEMPT: a test fixture, not a product value.

/** A two-triangle plane in the XY plane, all four normals pointing at +Z. */
function flatPlane(): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3),
  );
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  return new Mesh(geometry);
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
