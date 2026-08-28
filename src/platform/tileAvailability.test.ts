import { describe, expect, it } from "vitest";

import {
  createTileAvailabilityReporter,
  OPEN_STREET_MAP_TILE_URL,
  type TileAvailability,
} from "./leafletMap";

describe("map tile availability", () => {
  it("uses the keyless OpenStreetMap raster endpoint", () => {
    expect(OPEN_STREET_MAP_TILE_URL).toBe(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(OPEN_STREET_MAP_TILE_URL).not.toMatch(/carto|key/i);
  });

  it("enters offline on every failed-evidence path", () => {
    const changes: TileAvailability[] = [];
    const reporter = createTileAvailabilityReporter((status) => {
      changes.push(status);
    });

    reporter.noTileWithinTimeout();
    reporter.tileLoaded();
    reporter.tileError();
    reporter.tileLoaded();
    reporter.browserOffline();

    expect(changes).toEqual([
      "offline",
      "online",
      "offline",
      "online",
      "offline",
    ]);
  });

  it("clears offline only when a tile loads, across two recovery cycles", () => {
    const changes: TileAvailability[] = [];
    const reporter = createTileAvailabilityReporter((status) => {
      changes.push(status);
    });

    reporter.tileError();
    reporter.browserOnlineHint();
    reporter.tileLoaded();
    reporter.tileError();
    reporter.browserOnlineHint();
    reporter.tileLoaded();
    reporter.tileError();

    expect(changes).toEqual([
      "offline",
      "online",
      "offline",
      "online",
      "offline",
    ]);
  });
});
