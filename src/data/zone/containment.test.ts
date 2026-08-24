import { describe, expect, it } from "vitest";

import { bundledZoneData } from "./zoneLoader";
import {
  boundsContainPoint,
  containingZones,
  polygonBounds,
  polygonContainsPoint,
  prepareContainmentZones,
} from "./containment";
import { RiskTier, type LatLng, type Zone } from "../../domain/model/zone";

describe("polygon containment", () => {
  it("admits every frozen polygon vertex through its bounding-box prefilter", () => {
    expect(bundledZoneData.zones).toHaveLength(24); // fact: zones.total

    for (const zone of bundledZoneData.zones) {
      const bounds = polygonBounds(zone.polygon);
      for (const vertex of zone.polygon) {
        expect(boundsContainPoint(bounds, vertex)).toBe(true);
      }
    }
  });

  it("never excludes a point that its polygon accepts", () => {
    for (const zone of bundledZoneData.zones) {
      expect(polygonContainsPoint(zone.polygon, zone.centroid)).toBe(true);
      expect(boundsContainPoint(polygonBounds(zone.polygon), zone.centroid)).toBe(
        true,
      );
    }
  });

  it("counts vertices and edge points as inside", () => {
    const zone = bundledZoneData.zones[0];
    if (zone === undefined) throw new Error("Frozen zones are missing");
    const start = zone.polygon[0];
    const end = zone.polygon[1];
    if (start === undefined || end === undefined) {
      throw new Error("Frozen polygon has no edge");
    }
    const edgeMidpoint: LatLng = {
      latitude: (start.latitude + end.latitude) / 2, // GROUNDED-EXEMPT: geometric midpoint divisor.
      longitude: (start.longitude + end.longitude) / 2, // GROUNDED-EXEMPT: geometric midpoint divisor.
    };

    expect(polygonContainsPoint(zone.polygon, start)).toBe(true);
    expect(polygonContainsPoint(zone.polygon, edgeMidpoint)).toBe(true);
  });

  it("rejects a point inside the bounds but outside the polygon", () => {
    const example = bundledZoneData.zones
      .map((zone) => {
        const bounds = polygonBounds(zone.polygon);
        const corner = {
          latitude: bounds.maximumLatitude,
          longitude: bounds.maximumLongitude,
        };
        return { zone, bounds, corner };
      })
      .find(({ zone, corner }) => !polygonContainsPoint(zone.polygon, corner));
    if (example === undefined) {
      throw new Error("Frozen polygons supplied no bounding-box false positive");
    }

    expect(boundsContainPoint(example.bounds, example.corner)).toBe(true);
    expect(polygonContainsPoint(example.zone.polygon, example.corner)).toBe(
      false,
    );
  });

  it("prepares exactly the non-safe zones", () => {
    const prepared = prepareContainmentZones(bundledZoneData.zones);
    expect(prepared).toHaveLength(19); // fact: zones.drawn
    expect(prepared.every(({ zone }) => zone.riskTier !== RiskTier.SAFE)).toBe(
      true,
    );
  });

  it("never reads the legacy radius in a containment code path", () => {
    const source = bundledZoneData.zones.find(
      (zone) => zone.riskTier !== RiskTier.SAFE,
    );
    if (source === undefined) throw new Error("No armable frozen zone exists");
    let radiusRead = false;
    const guardedZone = new Proxy(source, {
      get(target, property, receiver) {
        if (property === "geofenceRadiusM") radiusRead = true;
        return Reflect.get(target, property, receiver) as Zone[keyof Zone];
      },
    });

    const prepared = prepareContainmentZones([guardedZone]);
    containingZones(prepared, guardedZone.centroid);

    expect(radiusRead).toBe(false);
  });
});
