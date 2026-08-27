import { describe, expect, it } from "vitest";

import {
  createTileAvailabilityReporter,
  type TileAvailability,
} from "./leafletMap";

describe("map tile availability", () => {
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
