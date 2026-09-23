import { describe, expect, it } from "vitest";

import {
  METRES_PER_DEGREE_LATITUDE,
  parseWorldMeta,
  type WorldMeta,
} from "./walkProjection";
import {
  projectPinAnchors,
  selectNearestPinIds,
  type PinAnchor,
  type PinPlace,
} from "./walkPins";

/**
 * A meta block for these fixtures, built the same way the loader builds it.
 *
 * Every number here is a probe, in the walkTiles tests' own words: the real origin,
 * scale and tile size are whatever the bake wrote into `world_tiled.json`, and the
 * client reads them from `meta` and never restates them. One metre per degree of
 * longitude keeps the arithmetic readable, and the expected north values below carry
 * the same constant the projection itself runs, so the two cannot drift.
 */
function probeMeta(): WorldMeta {
  return parseWorldMeta({
    origin: [17.7, 83.3], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
    tileM: 64, // GROUNDED-EXEMPT: probe tile size; the real tile size comes from the bake's meta.
    q: 1, // GROUNDED-EXEMPT: probe quantisation, so one metre is one unit and the arithmetic is readable.
    storeyM: 4, // GROUNDED-EXEMPT: probe storey height; unused here, each building carries its own h.
    minTx: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTx: 2, // GROUNDED-EXEMPT: probe grid bound.
    minTy: 0, // GROUNDED-EXEMPT: probe grid bound.
    maxTy: 2, // GROUNDED-EXEMPT: probe grid bound.
  });
}

describe("projectPinAnchors", () => {
  it("projects every row onto the ground the bake defines", () => {
    const meta = probeMeta();
    const anchors = projectPinAnchors(
      [
        { cat: "cafes", id: "n1", lat: 17.71, lon: 83.31 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
        { cat: "cafes", id: "n2", lat: 17.72, lon: 83.3 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
      ],
      null,
      meta,
    );
    // East from the probe's own meta; north runs down -z in the scene's axes, so the
    // projection's own constant arrives negated. The comparison is by closeness, not
    // by bitwise identity: 17.71 minus 17.7 does not come out of a float64 exactly.
    expect(anchors[0]?.id).toBe("n1");
    expect(anchors[0]?.x).toBeCloseTo(0.01 * meta.metresPerDegreeLongitude); // GROUNDED-EXEMPT: the probe's east offset, in the meta's own degrees.
    expect(anchors[0]?.z).toBeCloseTo(-0.01 * METRES_PER_DEGREE_LATITUDE); // GROUNDED-EXEMPT: the probe's north metres, read from the projection's own constant.
    expect(anchors[1]?.id).toBe("n2");
    expect(anchors[1]?.x).toBe(0);
    expect(anchors[1]?.z).toBeCloseTo(-0.02 * METRES_PER_DEGREE_LATITUDE); // GROUNDED-EXEMPT: the probe's north metres, read from the projection's own constant.
  });

  it("keeps only the active category when one is chosen", () => {
    const anchors = projectPinAnchors(
      [
        { cat: "cafes", id: "n1", lat: 17.71, lon: 83.31 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
        { cat: "bars", id: "n2", lat: 17.71, lon: 83.32 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
      ],
      "bars",
      probeMeta(),
    );
    expect(anchors.map((anchor) => anchor.id)).toEqual(["n2"]);
  });

  it("keeps every category when none is chosen", () => {
    const anchors = projectPinAnchors(
      [
        { cat: "cafes", id: "n1", lat: 17.71, lon: 83.31 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
        { cat: "bars", id: "n2", lat: 17.71, lon: 83.32 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
      ],
      null,
      probeMeta(),
    );
    expect(anchors).toHaveLength(2);
  });
});

describe("selectNearestPinIds", () => {
  it("holds the budget on a dense set", () => {
    // Fifty anchors, all closer than any real street needs to be: the budget is a
    // ceiling, and fifty candidates must still yield exactly `budget` pins.
    const anchors: PinAnchor[] = [];
    for (let index = 0; index < 50; index += 1) {
      anchors.push({ id: `p${index}`, x: index * 10, z: 0 });
    }
    const chosen = selectNearestPinIds(anchors, 0, 0, 12);
    expect(chosen).toHaveLength(12);
    // Nearest first: the first dozen multiples of ten metres.
    expect(chosen).toEqual([
      "p0",
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
      "p10",
      "p11",
    ]);
  });

  it("draws fewer than the budget when the category is thin", () => {
    const anchors: PinAnchor[] = [
      { id: "only", x: 5, z: 5 },
    ];
    expect(selectNearestPinIds(anchors, 0, 0, 12)).toEqual(["only"]);
  });

  it("draws nothing with no anchors and no pins to choose", () => {
    expect(selectNearestPinIds([], 0, 0, 12)).toEqual([]);
  });

  it("measures from where she stands now, not from the origin", () => {
    const anchors: PinAnchor[] = [
      { id: "east", x: 100, z: 0 },
      { id: "near", x: 20, z: 0 },
    ];
    // Standing by the east pin flips the order: nearest is a reading, not a sort key
    // baked into the set.
    expect(selectNearestPinIds(anchors, 95, 0, 12)[0]).toBe("east"); // GROUNDED-EXEMPT: a probe standing point, not a product value.
    expect(selectNearestPinIds(anchors, 0, 0, 12)[0]).toBe("near");
  });

  it("is a ceiling, not a floor: a budget larger than the set is not padded", () => {
    const anchors: PinAnchor[] = [
      { id: "a", x: 1, z: 0 },
      { id: "b", x: 2, z: 0 },
    ];
    expect(selectNearestPinIds(anchors, 0, 0, 12)).toEqual(["a", "b"]);
  });

  it("spends the budget on the nearest anchors the frame can show", () => {
    // The bake's densest cluster put ten of the nearest twelve out of frame, and a pill
    // behind her cannot stand over the street: with a filter, the dozen goes to the
    // nearest anchors that keep, and a filter that keeps only a few draws only those.
    const anchors: PinAnchor[] = [];
    for (let index = 0; index < 40; index += 1) {
      anchors.push({ id: `p${index}`, x: index * 10, z: 0 });
    }
    const ahead = (anchor: PinAnchor): boolean => anchor.x >= 200;
    const chosen = selectNearestPinIds(anchors, 0, 0, 12, ahead);
    expect(chosen).toHaveLength(12);
    expect(chosen[0]).toBe("p20");
    expect(chosen[11]).toBe("p31");

    // A thin category in frame draws what it has, and the ceiling still holds.
    const few = (anchor: PinAnchor): boolean => anchor.x >= 380;
    expect(selectNearestPinIds(anchors, 0, 0, 12, few)).toEqual(["p38", "p39"]);
    expect(selectNearestPinIds(anchors, 0, 0, 12, () => false)).toEqual([]);
  });

  it("carries the place rows the pin layer places, unchanged", () => {
    const places: PinPlace[] = [
      { cat: "eat", id: "w9", lat: 17.7, lon: 83.3 }, // GROUNDED-EXEMPT: probe rows; real rows come from the bake's places.json.
    ];
    const anchors = projectPinAnchors(places, null, probeMeta());
    expect(anchors[0]?.id).toBe("w9");
  });
});