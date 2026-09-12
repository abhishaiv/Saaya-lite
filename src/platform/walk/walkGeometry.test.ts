import { describe, expect, it } from "vitest";

import {
  appendBuilding,
  appendRibbon,
  appendRingFill,
  buildColoredGeometry,
  buildGeometry,
  closePath,
  LAYER_ORDER,
  layerHeight,
  pushColor,
} from "./walkGeometry";
import type { GroundPoint } from "./walkProjection";

function point(x: number, z: number): GroundPoint {
  return { x, z };
}

/** Read the nth vertex out of a flat position buffer. */
function vertex(positions: readonly number[], index: number): [number, number, number] {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  const z = positions[index * 3 + 2];
  if (x === undefined || y === undefined || z === undefined) {
    throw new Error(`No vertex ${index}`);
  }
  return [x, y, z];
}

describe("the layer stack", () => {
  it("gives every layer its own height, so nothing z-fights", () => {
    const heights = LAYER_ORDER.map((name) => layerHeight(name));
    expect(new Set(heights).size).toBe(LAYER_ORDER.length);
  });

  it("increases strictly from bottom to top", () => {
    for (let i = 1; i < LAYER_ORDER.length; i += 1) {
      const previous = LAYER_ORDER[i - 1];
      const current = LAYER_ORDER[i];
      if (previous === undefined || current === undefined) throw new Error("gap");
      expect(layerHeight(current)).toBeGreaterThan(layerHeight(previous));
    }
  });

  it("keeps the zone tint under the roads, because the spec says the zone is a tint on the ground", () => {
    expect(layerHeight("zoneFill")).toBeLessThan(layerHeight("roadBase"));
  });

  it("keeps the risk band above the road it belongs to", () => {
    expect(layerHeight("roadBand")).toBeGreaterThan(layerHeight("roadBase"));
  });

  it("keeps the zone boundary above everything, because its stated purpose is legibility", () => {
    expect(layerHeight("zoneOutline")).toBeGreaterThan(layerHeight("roadBand"));
    expect(layerHeight("zoneGlow")).toBeLessThan(layerHeight("zoneOutline"));
  });

  it("starts above the ground plane at y=0", () => {
    for (const name of LAYER_ORDER) {
      expect(layerHeight(name)).toBeGreaterThan(0);
    }
  });
});

describe("appendRibbon", () => {
  it("turns a two-point path into one quad at the height and half-width it was given", () => {
    const positions: number[] = [];
    appendRibbon(positions, [point(0, 0), point(10, 0)], 4, 0.05); // GROUNDED-EXEMPT: an arbitrary probe height for this fixture; real layer heights come from layerHeight().

    // Two triangles over four vertices, wound into six vertices.
    expect(positions.length).toBe(18);
    for (let i = 0; i < 6; i += 1) {
      expect(vertex(positions, i)[1]).toBeCloseTo(0.05); // GROUNDED-EXEMPT: the same probe height, asserted back.
    }
    // A path along +x offsets along z, four metres either side.
    const zs = [0, 1, 2, 3, 4, 5].map((i) => vertex(positions, i)[2]);
    expect(Math.min(...zs)).toBeCloseTo(-4);
    expect(Math.max(...zs)).toBeCloseTo(4);
    const xs = [0, 1, 2, 3, 4, 5].map((i) => vertex(positions, i)[0]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(10);
  });

  it("shares an edge at a bend instead of leaving a notch", () => {
    const positions: number[] = [];
    appendRibbon(positions, [point(0, 0), point(10, 0), point(10, 10)], 1, 0);

    // Each quad is six vertices: l0, r0, r1, l0, r1, l1. So quad 0's far edge at the
    // bend is l1 (vertex 5) and r1 (vertex 2), and quad 1's near edge at the same point
    // is l1 (vertex 6) and r1 (vertex 7).
    const quadZeroRightAtBend = vertex(positions, 2);
    const quadZeroLeftAtBend = vertex(positions, 5);
    const quadOneLeftAtBend = vertex(positions, 6);
    const quadOneRightAtBend = vertex(positions, 7);
    expect(quadOneLeftAtBend).toEqual(quadZeroLeftAtBend);
    expect(quadOneRightAtBend).toEqual(quadZeroRightAtBend);
  });

  it("ignores a path too short to carry a ribbon", () => {
    const positions: number[] = [];
    appendRibbon(positions, [point(0, 0)], 4, 0);
    expect(positions).toEqual([]);
    appendRibbon(positions, [], 4, 0);
    expect(positions).toEqual([]);
  });

  it("borrows the previous offset at a repeated point rather than pinching to a notch", () => {
    const positions: number[] = [];
    appendRibbon(positions, [point(0, 0), point(10, 0), point(10, 0), point(20, 0)], 2, 0);
    const zs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => vertex(positions, i)[2]);
    expect(Math.min(...zs)).toBeCloseTo(-2);
    expect(Math.max(...zs)).toBeCloseTo(2);
  });
});

describe("appendRingFill", () => {
  const square: readonly GroundPoint[] = [
    point(0, 0),
    point(10, 0),
    point(10, 10),
    point(0, 10),
  ];

  it("drops a duplicated closing vertex and triangulates a square into two triangles", () => {
    const positions: number[] = [];
    appendRingFill(positions, [...square, point(0, 0)], 0.02); // GROUNDED-EXEMPT: an arbitrary probe height for this fixture.
    expect(positions.length).toBe(18);
    for (let i = 0; i < 6; i += 1) {
      expect(vertex(positions, i)[1]).toBeCloseTo(0.02); // GROUNDED-EXEMPT: the same probe height, asserted back.
    }
  });

  it("gives the same result whether or not the ring repeats its first point", () => {
    const open: number[] = [];
    const closed: number[] = [];
    appendRingFill(open, square, 0);
    appendRingFill(closed, [...square, point(0, 0)], 0);
    expect(closed).toEqual(open);
  });

  it("ignores a ring with no area", () => {
    const positions: number[] = [];
    appendRingFill(positions, [point(0, 0), point(1, 1)], 0);
    expect(positions).toEqual([]);
  });
});

describe("appendBuilding", () => {
  it("builds four walls from the ground to the height it was given, and a roof at the top", () => {
    // An arbitrary probe height for this fixture. At runtime the height is read from the
    // bake's meta (`storeyM` times the tile's storey count), never restated in code.
    const buildingHeightM = 9.6; // GROUNDED-EXEMPT: an arbitrary probe height for this fixture.
    const walls: number[] = [];
    const roof: number[] = [];
    appendBuilding(
      walls,
      roof,
      [point(0, 0), point(10, 0), point(10, 10), point(0, 10)],
      buildingHeightM,
    );

    // Four walls, six vertices each.
    expect(walls.length).toBe(4 * 6 * 3);
    const wallHeights = [];
    for (let i = 0; i < walls.length / 3; i += 1) wallHeights.push(walls[i * 3 + 1]);
    expect(Math.min(...wallHeights)).toBe(0);
    expect(Math.max(...wallHeights)).toBeCloseTo(buildingHeightM);

    // Two triangles at the top.
    expect(roof.length).toBe(18);
    for (let i = 0; i < 6; i += 1) {
      expect(vertex(roof, i)[1]).toBeCloseTo(buildingHeightM);
    }
  });

  it("ignores a footprint with no area", () => {
    const walls: number[] = [];
    const roof: number[] = [];
    appendBuilding(walls, roof, [point(0, 0), point(1, 0)], 5);
    expect(walls).toEqual([]);
    expect(roof).toEqual([]);
  });
});

describe("closePath", () => {
  it("leaves a ring that already closes alone", () => {
    const ring = [point(0, 0), point(1, 0), point(1, 1), point(0, 0)];
    expect(closePath(ring)).toBe(ring);
  });

  it("appends the first point to an open path", () => {
    const result = closePath([point(0, 0), point(1, 0), point(1, 1)]);
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual(point(0, 0));
  });

  it("leaves an empty path and a single point alone", () => {
    expect(closePath([])).toEqual([]);
    expect(closePath([point(3, 4)])).toEqual([point(3, 4)]);
  });
});

describe("buildGeometry", () => {
  it("returns nothing for an empty buffer rather than a geometry with no vertices", () => {
    expect(buildGeometry([])).toBeNull();
    expect(buildColoredGeometry([], [])).toBeNull();
  });

  it("carries a bounding sphere so three can cull it", () => {
    const geometry = buildGeometry([0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(geometry).not.toBeNull();
    expect(geometry?.boundingSphere).not.toBeNull();
  });

  it("carries a colour attribute when colours are supplied", () => {
    const colors: number[] = [];
    pushColor(colors, "#FF3B30", 3);
    expect(colors).toHaveLength(9);
    const geometry = buildColoredGeometry(
      [0, 0, 0, 1, 0, 0, 0, 0, 1],
      colors,
    );
    expect(geometry?.getAttribute("color")).toBeDefined();
  });
});
