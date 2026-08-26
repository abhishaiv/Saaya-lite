import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../../data/zone/zoneLoader";
import {
  MAX_STATION_DISTANCE_M,
  METRES_PER_KILOMETRE,
} from "./rules";
import {
  haversineDistanceM,
  nearestStation,
  stationDistanceDisplay,
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
