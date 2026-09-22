/**
 * Zones in the walk view.
 *
 * `MAP_SPEC.md`: "The same 19 non-SAFE polygons, the same colours, the same rule that
 * `SAFE` zones are never drawn." That is enforced upstream rather than here: the caller
 * passes the same `mapZones` array `leafletMap.ts` draws, which `zoneRepository.ts` has
 * already filtered to the 19 drawn zones and joined to their cards. Nothing in this file
 * selects, filters or recolours a zone. It scales the fill's opacity for this view, which is
 * the one number here the flat map does not share — `ZONE_FILL_ALPHA_SCALE` says why.
 *
 * **No vertical extrusion.** The spec is explicit: a translucent wall rising out of the
 * ground "would read as a fence, which is a different and worse claim". Every mesh here
 * is a flat thing at one height on the ground plane.
 *
 * Every material is `DoubleSide`, matching `createTileMaterials()` in `walkTiles.ts`. The
 * zone geometry is a closed ring seen from above, and a boundary ribbon's winding flips
 * with the direction its ring happens to run; one-sided materials cull half the zones'
 * boundaries for that reason alone. `appendRingFill` normalises a fill's winding, so a
 * one-sided fill would work — this is the same belt-and-braces the tile layer wears, and
 * it costs nothing when the winding is already right.
 */

import { BufferGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial } from "three";

import type { MapZone } from "../../data/repository/zoneRepository";
import type { LatLng } from "../../domain/model/zone";
import {
  ZONE_GLOW_ALPHA,
  ZONE_GLOW_PX,
  ZONE_SELECTED_ALPHA_RAISE,
  ZONE_STROKE_PX,
  ZONE_STROKE_SELECTED_PX,
} from "./walkFacts";
import {
  appendRibbon,
  appendRingFill,
  buildGeometry,
  closePath,
  layerHeight,
} from "./walkGeometry";
import { toGround, type GroundPoint, type WorldMeta } from "./walkProjection";

/**
 * An opacity ceiling.
 *
 * It is the same ceiling `leafletMap.ts` clamps its own zone fill to; the selected raise
 * it guards is the fact `alpha.map.zone.selected.raise`.
 */
const FULL_OPACITY = 1; // GROUNDED-EXEMPT: a structural clamp, not a product value.

/**
 * A ribbon's half-width is half of a stated width; these are the two ends of that scale.
 */
const HALF = 2; // GROUNDED-EXEMPT: a divisor. Half of a stated value is still half of it.

/**
 * What a zone's fill opacity is multiplied by to draw it here.
 *
 * GROUNDED-EXEMPT: a rendering multiplier over a data value, not a fact of its own. The
 * fill's colour is still `color.zone.*` and its per-zone opacity is still the dataset's
 * `opacity` — nothing here chooses either.
 *
 * Amended 2026-09-22. Those opacities were tuned against the flat map's near-black sheet,
 * where 0.35 of `color.zone.high` renders as rgb(96,28,27): a dark red *area* on a dark
 * sheet. This view composites in sRGB over a **lit** ground, so the same 0.35 renders as
 * rgb(145,82,100), and the profile of the street capture found that one colour covering
 * 35% of the frame — the ground's own colour, the roads on it and the blocks beside them
 * all read as that tint rather than as ground. The same *contrast* is what the tint is for,
 * not the same number: the multiplier brings the tint to a shade *cast over* the ground so
 * the map underneath it stays the picture, which is what the reference frames show and what
 * `MAP_SPEC.md` "the zone is a tint on the ground" asks for.
 *
 * The selected raise (`alpha.map.zone.selected.raise`) is scaled with it, because that fact
 * states an *increase on this fill* — scaling one and not the other would turn a tenth of the
 * fill into three quarters of it.
 */
export const ZONE_FILL_ALPHA_SCALE = 0.4; // GROUNDED-EXEMPT: a rendering multiplier over a data value, not a product value.

interface ZoneEntry {
  readonly stationId: string;
  /** The zone's boundary, projected and closed. The fills and ribbons both come from it. */
  readonly ring: readonly GroundPoint[];
  readonly baseOpacity: number;
  readonly fill: Mesh;
  readonly fillMaterial: MeshBasicMaterial;
  readonly glow: Mesh;
  readonly normal: Mesh;
  readonly selected: Mesh;
  /** False when the ring was too degenerate to carry a boundary ribbon. */
  hasBoundary: boolean;
}

/** A zone label's anchor, in world metres. The caller projects it to the screen. */
export interface ZoneLabelAnchor {
  readonly stationId: string;
  readonly x: number;
  readonly z: number;
}

export interface ZoneLayer {
  /** Add this to the scene. */
  readonly group: Group;
  /** Every zone's label anchor, in the order the flat map draws them. */
  readonly labelAnchors: readonly ZoneLabelAnchor[];
  /**
   * Re-cut every boundary ribbon for a new on-screen scale.
   *
   * `MAP_SPEC.md` states the zone stroke in **pixels** (`map.zone.stroke` 1.5,
   * `.sel` 3, `map.zone.glow` 6) because the flat map draws in a 2D canvas. A 3D ribbon
   * is a width in metres, so `metresPerPixel` is how the same three facts are honoured
   * here: a boundary then reads at the same weight it does on the flat map, measured at
   * her distance, and narrows with foreshortening where it runs away from the camera,
   * exactly as a line painted on the ground does. Only the boundaries are rebuilt; the
   * fills do not depend on the scale.
   */
  setPixelScale(metresPerPixel: number): void;
  setSelected(stationId: string | null): void;
  dispose(): void;
}

function projectRing(ring: readonly LatLng[], meta: WorldMeta): readonly GroundPoint[] {
  return closePath(ring.map((point) => toGround(point.latitude, point.longitude, meta)));
}

/**
 * Build every zone's meshes.
 *
 * Zones are added lowest risk first and given an explicit `renderOrder` from that
 * position, which is the ordering `leafletMap.ts` gets from adding its polygons in
 * ascending `riskScore`. Coplanar fills resolve a depth tie by draw order, so HIGH ends
 * up over MODERATE in both views rather than only in the 2D one.
 */
export function buildZoneLayer(
  mapZones: readonly MapZone[],
  meta: WorldMeta,
  metresPerPixel: number,
): ZoneLayer {
  const group = new Group();
  group.name = "zones";

  const fillGroup = new Group();
  fillGroup.name = "zone-fills";
  fillGroup.renderOrder = 0;

  const boundaryGroup = new Group();
  boundaryGroup.name = "zone-boundaries";
  // Boundaries draw after every fill, whatever their individual risk order.
  boundaryGroup.renderOrder = 1;

  group.add(fillGroup, boundaryGroup);

  const entries: ZoneEntry[] = [];
  const labelAnchors: ZoneLabelAnchor[] = [];

  const sorted = [...mapZones].sort(
    (left, right) => left.zone.riskScore - right.zone.riskScore,
  );

  sorted.forEach(({ zone }, index) => {
    const ring = projectRing(zone.polygon, meta);
    const color = new Color(zone.colorHex);

    const fillPositions: number[] = [];
    appendRingFill(fillPositions, ring, layerHeight("zoneFill"));
    const fillGeometry = buildGeometry(fillPositions);
    if (fillGeometry === null) {
      // A degenerate ring has no area to tint. Skipping it leaves the flat map's zone
      // count and this layer's zone count equal, which is what the boundary check in
      // `walkZones.test.ts` asserts.
      return;
    }

    const fillMaterial = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: zone.opacity * ZONE_FILL_ALPHA_SCALE,
      side: DoubleSide,
      // All three zone materials opt out of the scene's distance haze. `MAP_SPEC.md`: the
      // haze is applied to scenery only, because "a distant road band faded into haze would
      // be the risk information degrading with draw distance". A zone's boundary is the
      // same claim as a road's band, so it keeps its frozen colour at every distance too.
      fog: false,
    });
    const fill = new Mesh(fillGeometry, fillMaterial);
    fill.renderOrder = index;
    fillGroup.add(fill);

    // Separate materials for the halo and the line: they differ only in alpha, but a
    // shared material would make one of them unfixable without the other.
    const glow = new Mesh(undefined, new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: ZONE_GLOW_ALPHA,
      side: DoubleSide,
      fog: false,
    }));
    const outlineMaterial = new MeshBasicMaterial({ color, side: DoubleSide, fog: false });
    const normal = new Mesh(undefined, outlineMaterial);
    const selected = new Mesh(undefined, outlineMaterial);
    normal.renderOrder = index;
    selected.renderOrder = index;
    glow.renderOrder = index;
    boundaryGroup.add(glow, normal, selected);

    entries.push({
      stationId: zone.stationId,
      ring,
      baseOpacity: zone.opacity * ZONE_FILL_ALPHA_SCALE,
      fill,
      fillMaterial,
      glow,
      normal,
      selected,
      hasBoundary: false,
    });

    const centroid = toGround(zone.centroid.latitude, zone.centroid.longitude, meta);
    labelAnchors.push({
      stationId: zone.stationId,
      x: centroid.x,
      z: centroid.z,
    });
  });

  let selectedId: string | null = null;

  /**
   * Cut one ribbon, or hide the mesh when the ring was too short to carry one.
   *
   * A mesh that was built with no positions keeps its default empty geometry and is
   * simply not shown, so `geometry` is never the thing that encodes visibility.
   */
  function cutRibbon(
    mesh: Mesh,
    ring: readonly GroundPoint[],
    pixels: number,
    height: number,
    scale: number,
  ): void {
    const positions: number[] = [];
    appendRibbon(positions, ring, (pixels * scale) / HALF, height);
    const geometry = buildGeometry(positions);
    if (geometry === null) {
      mesh.geometry.dispose();
      mesh.geometry = new BufferGeometry();
      mesh.visible = false;
      return;
    }
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    mesh.visible = true;
  }

  function applySelection(): void {
    for (const entry of entries) {
      const isSelected = entry.stationId === selectedId;
      entry.fillMaterial.opacity = Math.min(
        FULL_OPACITY,
        entry.baseOpacity +
          (isSelected ? ZONE_SELECTED_ALPHA_RAISE * ZONE_FILL_ALPHA_SCALE : 0),
      );
      // All three ribbons share the zone's ring, so either the ring carried a ribbon
      // for every one of them or it carried none. One flag covers the set.
      if (entry.hasBoundary) {
        entry.normal.visible = !isSelected;
        entry.selected.visible = isSelected;
        entry.glow.visible = true;
      }
    }
  }

  function setPixelScale(metresPerPixel: number): void {
    for (const entry of entries) {
      cutRibbon(entry.glow, entry.ring, ZONE_GLOW_PX, layerHeight("zoneGlow"), metresPerPixel);
      cutRibbon(
        entry.normal,
        entry.ring,
        ZONE_STROKE_PX,
        layerHeight("zoneOutline"),
        metresPerPixel,
      );
      cutRibbon(
        entry.selected,
        entry.ring,
        ZONE_STROKE_SELECTED_PX,
        layerHeight("zoneOutline"),
        metresPerPixel,
      );
      entry.hasBoundary = entry.glow.visible;
    }
    applySelection();
  }

  setPixelScale(metresPerPixel);

  return {
    group,
    labelAnchors,
    setPixelScale,
    setSelected(stationId: string | null): void {
      selectedId = stationId;
      applySelection();
    },
    dispose(): void {
      for (const entry of entries) {
        entry.fill.geometry.dispose();
        entry.fillMaterial.dispose();
        entry.glow.geometry.dispose();
        (entry.glow.material as MeshBasicMaterial).dispose();
        entry.normal.geometry.dispose();
        entry.selected.geometry.dispose();
        // `normal` and `selected` share one material.
        (entry.normal.material as MeshBasicMaterial).dispose();
      }
      group.clear();
      fillGroup.clear();
      boundaryGroup.clear();
    },
  };
}
