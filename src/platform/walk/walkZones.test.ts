import { Color, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../data/repository/zoneRepository";
import { RiskTier } from "../../domain/model/zone";
import { layerHeight } from "./walkGeometry";
import { toGround, parseWorldMeta, type WorldMeta } from "./walkProjection";
import { ZONE_SELECTED_ALPHA_RAISE } from "./walkFacts";
import { buildZoneLayer, type ZoneLayer } from "./walkZones";

/**
 * A meta block for these fixtures. The tile size and quantisation step go unread by the
 * zone layer, which only needs an origin to project against; they are here because
 * `WorldMeta` is the one shape the whole walk view passes around.
 */
function probeMeta(): WorldMeta {
  return parseWorldMeta({
    origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
    tileM: 1024, // GROUNDED-EXEMPT: probe tile size; unread by the zone layer.
    q: 10, // GROUNDED-EXEMPT: probe quantisation step; unread by the zone layer.
    storeyM: 4, // GROUNDED-EXEMPT: probe storey height; unread by the zone layer.
    minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTx: 2, // GROUNDED-EXEMPT: probe grid bound.
    minTy: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTy: 2, // GROUNDED-EXEMPT: probe grid bound.
  });
}

/** A probe on-screen scale. At runtime it is measured from the camera and the viewport. */
const PROBE_METRES_PER_PIXEL = 0.5; // GROUNDED-EXEMPT: probe scale for these fixtures.

/**
 * The relative precision of a vertex once it is in a `Float32Array`, so a height read
 * back out of a geometry is the height that was written to within this much.
 */
const FLOAT32_RELATIVE_EPSILON = 1.2e-7; // GROUNDED-EXEMPT: the relative precision of a float32, not a product value.

// The real 19 drawn zones, joined to their locality labels, exactly as the flat map gets
// them. Using the frozen bundle rather than a hand-written fixture is the point: if the
// walk layer and the flat map ever disagree about which zones exist, this fails.
const snapshot = bundledZoneRepository.snapshot();
const MAP_ZONES = snapshot.mapZones;

function split(layer: ZoneLayer): { fills: Mesh[]; boundaries: Mesh[] } {
  const fillGroup = layer.group.children[0];
  const boundaryGroup = layer.group.children[1];
  if (fillGroup === undefined || boundaryGroup === undefined) {
    throw new Error("Zone layer is missing its fill or boundary group");
  }
  return {
    fills: fillGroup.children.filter((child): child is Mesh => child instanceof Mesh),
    boundaries: boundaryGroup.children.filter((child): child is Mesh => child instanceof Mesh),
  };
}

function opacityOf(mesh: Mesh): number {
  return (mesh.material as MeshBasicMaterial).opacity;
}

/** The three ribbons of one zone: glow, normal outline, selected outline. */
function ribbonsFor(layer: ZoneLayer, index: number): {
  glow: Mesh;
  normal: Mesh;
  selected: Mesh;
} {
  const { boundaries } = split(layer);
  const glow = boundaries[index * 3];
  const normal = boundaries[index * 3 + 1];
  const selected = boundaries[index * 3 + 2];
  if (glow === undefined || normal === undefined || selected === undefined) {
    throw new Error(`Zone ${index} is missing a ribbon`);
  }
  return { glow, normal, selected };
}

describe("buildZoneLayer", () => {
  const meta = probeMeta();

  it("draws one fill for every zone the flat map draws", () => {
    const { fills } = split(buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL));
    expect(fills).toHaveLength(19); // fact: zones.drawn
    expect(fills).toHaveLength(MAP_ZONES.length);
  });

  it("never draws a SAFE zone, which is the rule the flat map keeps", () => {
    expect(MAP_ZONES.some(({ zone }) => zone.riskTier === RiskTier.SAFE)).toBe(false);
    const { fills } = split(buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL));
    expect(fills).toHaveLength(MAP_ZONES.filter(({ zone }) => zone.riskTier !== RiskTier.SAFE).length);
  });

  it("cuts a glow, a normal outline and a selected outline for every zone", () => {
    const { boundaries } = split(buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL));
    expect(boundaries).toHaveLength(MAP_ZONES.length * 3);
  });

  it("orders the fills by ascending risk, so HIGH wins the depth tie as it does on the flat map", () => {
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    const { fills } = split(layer);

    fills.forEach((fill, index) => {
      const zone = sorted[index];
      if (zone === undefined) throw new Error(`No zone at ${index}`);
      // Draw order is the tie-break for coplanar fills, so the index must match the
      // risk order or the two views disagree about which zone sits on top.
      expect(fill.renderOrder).toBe(index);
      expect((fill.material as MeshBasicMaterial).color.getHexString()).toBe(
        new Color(zone.zone.colorHex).getHexString(),
      );
    });

    const scores = sorted.map(({ zone }) => zone.riskScore);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it("gives each fill its own opacity, read from the frozen data", () => {
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    const { fills } = split(buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL));
    fills.forEach((fill, index) => {
      const zone = sorted[index];
      if (zone === undefined) throw new Error(`No zone at ${index}`);
      expect(opacityOf(fill)).toBeCloseTo(zone.zone.opacity);
    });
  });

  it("places the fills and the boundaries at the heights the shared layer stack gives them", () => {
    const { fills } = split(buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL));
    const first = fills[0];
    if (first === undefined) throw new Error("No fills");
    expect(first.geometry.getAttribute("position").getY(0)).toBeCloseTo(layerHeight("zoneFill"));
  });

  it("keeps every zone flat on the ground, because the spec forbids extruding a zone", () => {
    // "A translucent wall rising out of the ground would read as a fence, which is a
    // different and worse claim." Nothing here may leave the ground plane.
    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    const ceiling = layerHeight("zoneOutline");
    layer.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const positions = object.geometry.getAttribute("position");
      for (let i = 0; i < positions.count; i += 1) {
        const y = positions.getY(i);
        expect(y).toBeGreaterThanOrEqual(0);
        // The ceiling is the top of the layer stack, read back out of a Float32Array.
        expect(y).toBeLessThanOrEqual(ceiling * (1 + FLOAT32_RELATIVE_EPSILON));
      }
    });
  });

  it("anchors one label per zone at the zone's own centroid, keyed by station id", () => {
    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    expect(layer.labelAnchors).toHaveLength(MAP_ZONES.length);

    for (const anchor of layer.labelAnchors) {
      const zone = MAP_ZONES.find(({ zone: candidate }) => candidate.stationId === anchor.stationId);
      if (zone === undefined) throw new Error(`Anchor ${anchor.stationId} matches no zone`);
      // The label is placed on the ground, so it is the zone's centroid in scene axes.
      const ground = toGround(zone.zone.centroid.latitude, zone.zone.centroid.longitude, meta);
      expect(anchor.x).toBeCloseTo(ground.x);
      expect(anchor.z).toBeCloseTo(ground.z);
      // The anchor key is the station id, never the station's display name: a police
      // jurisdiction name is not a place label.
      expect(anchor.stationId).not.toBe(zone.zone.stationName);
    }
  });
});

describe("selection", () => {
  const meta = probeMeta();

  /** A zone whose raise will not hit the opacity ceiling, so the assertion is exact. */
  function unclampedIndex(): number {
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    const index = sorted.findIndex(
      ({ zone }) => zone.opacity + ZONE_SELECTED_ALPHA_RAISE <= 1,
    );
    if (index < 0) throw new Error("Every zone is already at the opacity ceiling");
    return index;
  }

  it("raises the selected zone's fill by exactly the stated raise and leaves the rest alone", () => {
    const index = unclampedIndex();
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    const target = sorted[index];
    if (target === undefined) throw new Error("No zone");

    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    const before = split(layer).fills.map(opacityOf);

    layer.setSelected(target.zone.stationId);

    const after = split(layer).fills.map(opacityOf);
    after.forEach((opacity, fillIndex) => {
      const expectedBase = before[fillIndex];
      if (expectedBase === undefined) throw new Error("missing fill");
      if (fillIndex === index) {
        expect(opacity).toBeCloseTo(expectedBase + ZONE_SELECTED_ALPHA_RAISE);
      } else {
        expect(opacity).toBeCloseTo(expectedBase);
      }
    });
  });

  it("never raises a fill past full opacity", () => {
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    for (const { zone } of sorted) {
      const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
      layer.setSelected(zone.stationId);
      for (const fill of split(layer).fills) {
        expect(opacityOf(fill)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("swaps in the wider outline for the selected zone and takes it away again", () => {
    const index = unclampedIndex();
    const sorted = [...MAP_ZONES].sort(
      (left, right) => left.zone.riskScore - right.zone.riskScore,
    );
    const target = sorted[index];
    if (target === undefined) throw new Error("No zone");

    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    layer.setSelected(target.zone.stationId);

    MAP_ZONES.forEach((_, zoneIndex) => {
      const { glow, normal, selected } = ribbonsFor(layer, zoneIndex);
      // The halo is always on: it is the zone's own glow, not a selection cue.
      expect(glow.visible).toBe(true);
      if (zoneIndex === index) {
        expect(selected.visible).toBe(true);
        expect(normal.visible).toBe(false);
      } else {
        expect(normal.visible).toBe(true);
        expect(selected.visible).toBe(false);
      }
      // Both at once would z-fight, and the winner would be arbitrary.
      expect(normal.visible && selected.visible).toBe(false);
    });

    layer.setSelected(null);
    MAP_ZONES.forEach((_, zoneIndex) => {
      const { normal, selected } = ribbonsFor(layer, zoneIndex);
      expect(normal.visible).toBe(true);
      expect(selected.visible).toBe(false);
    });
  });
});

describe("pixel scale", () => {
  const meta = probeMeta();

  function glowRadius(layer: ZoneLayer, index: number): number {
    const { glow } = ribbonsFor(layer, index);
    const sphere = glow.geometry.boundingSphere;
    if (sphere === null) throw new Error("Ribbon has no bounding sphere");
    return sphere.radius;
  }

  it("widens every boundary ribbon as the on-screen scale grows", () => {
    const narrow = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    const wide = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL * 2);
    for (let index = 0; index < MAP_ZONES.length; index += 1) {
      expect(glowRadius(wide, index)).toBeGreaterThan(glowRadius(narrow, index));
    }
  });

  it("gives every drawn zone a boundary at a realistic scale", () => {
    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    for (let index = 0; index < MAP_ZONES.length; index += 1) {
      // A zone with no legible edge is a zone whose boundary she cannot see.
      expect(ribbonsFor(layer, index).glow.visible).toBe(true);
    }
  });

  it("re-cuts the ribbons without disturbing the fills", () => {
    const layer = buildZoneLayer(MAP_ZONES, meta, PROBE_METRES_PER_PIXEL);
    const before = split(layer).fills.map((fill) => fill.geometry.uuid);
    layer.setPixelScale(PROBE_METRES_PER_PIXEL * 2);
    expect(split(layer).fills.map((fill) => fill.geometry.uuid)).toEqual(before);
  });
});

describe("disposal", () => {
  it("empties the layer and leaves nothing for the next frame to draw", () => {
    const layer = buildZoneLayer(MAP_ZONES, probeMeta(), PROBE_METRES_PER_PIXEL);
    layer.dispose();
    expect(layer.group.children).toHaveLength(0);
  });
});
