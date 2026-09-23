import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../../data/zone/zoneLoader";
import type { LatLng } from "../model/zone";
import {
  MAX_STATION_DISTANCE_M,
  METRES_PER_KILOMETRE,
} from "./rules";
import {
  haversineDistanceM,
  nearestStation,
  stationDistanceDisplay,
  zoneContainingPoint,
  type AreaPolygon,
} from "./nearestStation";

describe("nearest police station", () => {
  it("checks all bundled stations and returns the closest one", () => {
    expect(bundledZoneData.policeStations).toHaveLength(37); // fact: stations.total
    const station = bundledZoneData.policeStations[0];
    const result = nearestStation(
      { latitude: station.latitude, longitude: station.longitude },
      bundledZoneData.policeStations,
    );

    expect(result?.station.id).toBe(station.id);
    expect(result?.distanceM).toBeCloseTo(0);
  });

  it("uses Haversine rather than flat coordinate subtraction", () => {
    const from = { latitude: 0, longitude: 0 };
    const to = { latitude: 0, longitude: 1 };
    expect(haversineDistanceM(from, to)).toBeGreaterThan(
      MAX_STATION_DISTANCE_M,
    );
  });

  it("formats metres and kilometres at the specified boundary", () => {
    const finalWholeMetre = METRES_PER_KILOMETRE - 1;
    expect(stationDistanceDisplay(finalWholeMetre)).toEqual({
      unit: "m",
      value: finalWholeMetre,
    });
    expect(stationDistanceDisplay(METRES_PER_KILOMETRE)).toEqual({
      unit: "km",
      value: "1.0",
    });
  });

  it("treats a nearest station beyond the maximum range as absent", () => {
    const station = bundledZoneData.policeStations[0];
    expect(nearestStation({ latitude: 0, longitude: 0 }, [station])).toBeNull();
  });
});

describe("zone containing point", () => {
  // A probe square and a probe notch, in the walkTiles tests' own words: the real
  // outlines are the frozen geojson's, and the client reads them from the bake and
  // never restates them.
  const square: AreaPolygon = {
    areaName: "Square",
    polygon: [
      { latitude: 17.7, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
      { latitude: 17.71, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
      { latitude: 17.71, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
      { latitude: 17.7, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
    ],
  };

  it("reads her inside the outline she stands in", () => {
    const point: LatLng = { latitude: 17.705, longitude: 83.31 }; // GROUNDED-EXEMPT: probe point inside the probe outline.
    expect(zoneContainingPoint([square], point)?.areaName).toBe("Square");
  });

  it("returns null outside every outline rather than the nearest one", () => {
    const point: LatLng = { latitude: 17.72, longitude: 83.31 }; // GROUNDED-EXEMPT: probe point just north of the probe outline.
    expect(zoneContainingPoint([square], point)).toBeNull();
  });

  it("picks the one she is in when she stands among several", () => {
    const other: AreaPolygon = {
      areaName: "Other",
      polygon: [
        { latitude: 17.72, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.73, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.73, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.72, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
      ],
    };
    const point: LatLng = { latitude: 17.725, longitude: 83.31 }; // GROUNDED-EXEMPT: probe point inside the second probe outline.
    expect(zoneContainingPoint([square, other], point)?.areaName).toBe("Other");
  });

  it("reads a point in a concave notch as outside", () => {
    // The outline is a square with a notch cut out of its middle east side; a point in
    // the notch is inside the bounding box but outside the parity count.
    const concave: AreaPolygon = {
      areaName: "Notched",
      polygon: [
        { latitude: 17.7, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.71, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.71, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.708, longitude: 83.318 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.702, longitude: 83.318 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
        { latitude: 17.7, longitude: 83.32 }, // GROUNDED-EXEMPT: probe outline; real outlines come from the frozen geojson.
      ],
    };
    const notch: LatLng = { latitude: 17.705, longitude: 83.319 }; // GROUNDED-EXEMPT: probe point inside the notch.
    expect(zoneContainingPoint([concave], notch)).toBeNull();
    const inside: LatLng = { latitude: 17.705, longitude: 83.31 }; // GROUNDED-EXEMPT: probe point in the outline's own body.
    expect(zoneContainingPoint([concave], inside)?.areaName).toBe("Notched");
  });
});
