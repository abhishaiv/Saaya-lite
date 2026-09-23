import { describe, expect, it } from "vitest";

import type { AreaPolygon } from "../../domain/engine/nearestStation";
import type { IndiaWallClock } from "./openingHours";
import {
  forYouEntries,
  placeOpenNow,
  searchPlaces,
  sortByDistance,
  suggestionChips,
} from "./placeBrowse";
import type { Place } from "./walkPlaces";

// Probe places: the coordinates and hours below are invented for the arithmetic, not
// values read off the bake. They carry the marker for the same reason a probe anchor does.
const KIOSK: Place = {
  id: "n1",
  cat: "cafes",
  osm: "amenity=cafe",
  lat: 17.7217, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  lon: 83.3071, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  name: "Deccan Chai",
  te: "డెక్కన్ చాయ్",
  hours: "Mo-Su 07:00-21:30",
};
const SHOP: Place = {
  id: "n2",
  cat: "shops",
  osm: "shop=clothes",
  lat: 17.7288, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  lon: 83.3162, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  name: "Janapriya Footwear",
  addr: "Dwaraka Nagar",
};
const SHUT: Place = {
  id: "n3",
  cat: "eat",
  osm: "amenity=restaurant",
  lat: 17.73, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  lon: 83.32, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  name: "Night Mess",
  hours: "Mo-Su 19:00-23:00",
};
const UNSTATED: Place = {
  id: "n4",
  cat: "hotels",
  osm: "tourism=hotel",
  lat: 17.74, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  lon: 83.33, // GROUNDED-EXEMPT: probe coordinate, not a product value.
  name: "Sree Surya Residency",
};
const PLACES = [KIOSK, SHOP, SHUT, UNSTATED];

const HER = { latitude: 17.7217, longitude: 83.3071 }; // GROUNDED-EXEMPT: probe fix, on the kiosk.

const AREAS: readonly AreaPolygon[] = [
  {
    areaName: "Soldierpet",
    polygon: [
      { latitude: 17.72, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline corner.
      { latitude: 17.73, longitude: 83.3 }, // GROUNDED-EXEMPT: probe outline corner.
      { latitude: 17.73, longitude: 83.31 }, // GROUNDED-EXEMPT: probe outline corner.
      { latitude: 17.72, longitude: 83.31 }, // GROUNDED-EXEMPT: probe outline corner.
    ],
  },
];

const MIDMORNING: IndiaWallClock = { weekday: 2, minuteOfDay: 10 * 60 };
const LATE: IndiaWallClock = { weekday: 2, minuteOfDay: 22 * 60 };

function labels(category: string): string {
  const table: Record<string, string> = {
    cafes: "cafes",
    eat: "eat",
    hotels: "hotels",
    shops: "shops",
  };
  return table[category] ?? category;
}

function areaOf(place: Place): string | undefined {
  return place.id === "n1" ? "Soldierpet" : undefined;
}

describe("placeOpenNow", () => {
  it("reads a parsed rule, and leaves an unstated place unstated", () => {
    expect(placeOpenNow(KIOSK, MIDMORNING)).toBe(true);
    expect(placeOpenNow(KIOSK, LATE)).toBe(false);
    expect(placeOpenNow(UNSTATED, MIDMORNING)).toBeUndefined();
  });
});

describe("sortByDistance", () => {
  it("puts the nearest first with a fix, and keeps the file's order without one", () => {
    expect(sortByDistance(PLACES, HER).map((place) => place.id)).toEqual([
      "n1",
      "n2",
      "n3",
      "n4",
    ]);
    expect(sortByDistance(PLACES, null).map((place) => place.id)).toEqual([
      "n1",
      "n2",
      "n3",
      "n4",
    ]);
  });
});

describe("searchPlaces", () => {
  const base = {
    areaNameOf: areaOf,
    categoryLabel: labels,
    clock: MIDMORNING,
    currentPoint: HER,
    limit: 20,
    openNowOnly: false,
  };

  it("matches on the name, the category and the area", () => {
    expect(searchPlaces(PLACES, { ...base, query: "chai" }).map((p) => p.id)).toEqual(["n1"]);
    expect(searchPlaces(PLACES, { ...base, query: "shops" }).map((p) => p.id)).toEqual(["n2"]);
    expect(searchPlaces(PLACES, { ...base, query: "soldierpet" }).map((p) => p.id)).toEqual(["n1"]);
    expect(searchPlaces(PLACES, { ...base, query: "dwaraka" }).map((p) => p.id)).toEqual(["n2"]);
  });

  it("matches the Telugu name too", () => {
    expect(searchPlaces(PLACES, { ...base, query: "డెక్కన్" }).map((p) => p.id)).toEqual(["n1"]);
  });

  it("skips an unstated place under open-now, and keeps a parsed one that reads open", () => {
    expect(
      searchPlaces(PLACES, { ...base, openNowOnly: true, query: "" }).map((p) => p.id),
    ).toEqual(["n1"]);
  });

  it("caps the list at the row ceiling, nearest first", () => {
    expect(
      searchPlaces(PLACES, { ...base, limit: 2, query: "" }).map((p) => p.id),
    ).toEqual(["n1", "n2"]);
  });

  it("holds the bake's order when there is no fix", () => {
    expect(
      searchPlaces(PLACES, { ...base, currentPoint: null, query: "" }).map((p) => p.id),
    ).toEqual(["n1", "n2", "n3", "n4"]);
  });
});

describe("forYouEntries", () => {
  it("walks her picks in her own order and names the category in the why", () => {
    const entries = forYouEntries(PLACES, {
      currentPoint: HER,
      limit: 20,
      picks: ["eat", "cafes"],
    });
    expect(entries.map((entry) => entry.place.id)).toEqual(["n3", "n1"]);
    expect(entries[0]?.whyKind).toBe("pick");
    expect(entries[0]?.whyCategory).toBe("eat");
    expect(entries[1]?.whyCategory).toBe("cafes");
  });

  it("never repeats a place across two picks", () => {
    const entries = forYouEntries([KIOSK], {
      currentPoint: HER,
      limit: 20,
      picks: ["cafes", "cafes"],
    });
    expect(entries.map((entry) => entry.place.id)).toEqual(["n1"]);
  });

  it("falls back to nearest-first and says so when she has picked nothing", () => {
    const entries = forYouEntries(PLACES, {
      currentPoint: HER,
      limit: 2,
      picks: [],
    });
    expect(entries.map((entry) => entry.place.id)).toEqual(["n1", "n2"]);
    expect(entries.every((entry) => entry.whyKind === "nearest")).toBe(true);
  });
});

describe("suggestionChips", () => {
  it("leads with the categories that have places and fills the rest with real areas", () => {
    const chips = suggestionChips(PLACES, {
      areaNameOf: areaOf,
      categoryLabel: labels,
      limit: 8,
      nonEmptyCategories: ["cafes", "shops"],
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      "cafes",
      "shops",
      "Soldierpet",
    ]);
  });

  it("keeps the row to the ceiling", () => {
    const chips = suggestionChips(PLACES, {
      areaNameOf: areaOf,
      categoryLabel: labels,
      limit: 2,
      nonEmptyCategories: ["cafes", "shops"],
    });
    expect(chips).toHaveLength(2);
  });
});
