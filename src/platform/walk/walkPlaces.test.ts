import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPlaces, parsePlaces, PLACES_ASSET_URL, type RawPlaces } from "./walkPlaces";

/**
 * Fixture places. The bake owns every value here — the real counts live in the baked
 * asset and are reported in progress.md — so these probes carry the file's shape rather
 * than restating one of its numbers.
 */
function probePlace(overrides: Partial<RawPlaces["places"][number]> = {}): RawPlaces["places"][number] {
  return {
    id: "n1", // GROUNDED-EXEMPT: probe OSM id.
    cat: "cafes",
    osm: "amenity=cafe",
    lat: 17.72, // GROUNDED-EXEMPT: probe coordinate; the real ones are the bake's.
    lon: 83.31, // GROUNDED-EXEMPT: probe coordinate; the real ones are the bake's.
    name: "A probe cafe",
    ...overrides,
  };
}

function probeRaw(places: RawPlaces["places"]): RawPlaces {
  return {
    meta: {
      origin: [17.7217, 83.3071], // GROUNDED-EXEMPT: probe origin; the real origin is the bake's.
      bbox: [17.68714, 83.27025, 17.75634, 83.34402], // GROUNDED-EXEMPT: the bake's own fetch window.
      attribution: "© OpenStreetMap contributors",
      source: "OpenStreetMap via Overpass API",
    },
    places,
  };
}

describe("parsePlaces", () => {
  it("derives the counts a category bar may show from the file's own rows", () => {
    const places = parsePlaces(probeRaw([probePlace(), probePlace({ id: "n2" }), probePlace({ id: "n3", cat: "eat", osm: "amenity=restaurant" })]));
    expect(places.categoryCounts.cafes).toBe(2);
    expect(places.categoryCounts.eat).toBe(1);
  });

  it("reads zero for a category the bake yielded nothing for", () => {
    // Zero is a fact the caller must honour — the category bar never invents a chip the
    // file cannot back. The parse reports it, it does not paper over it.
    const places = parsePlaces(probeRaw([probePlace()]));
    expect(places.categoryCounts.hotels).toBe(0);
    expect(places.categoryCounts.bars).toBe(0);
  });

  it("keeps every category of the screen map in the count even when the file is empty", () => {
    const places = parsePlaces(probeRaw([]));
    for (const count of Object.values(places.categoryCounts)) {
      expect(count).toBe(0);
    }
    expect(places.places).toHaveLength(0);
  });

  it("carries the OSM attribution out of the file, for the map to surface", () => {
    const places = parsePlaces(probeRaw([]));
    expect(places.attribution).toBe("© OpenStreetMap contributors");
  });

  it("refuses a file that does not carry its attribution", () => {
    const raw = probeRaw([]);
    const meta = { ...raw.meta, attribution: "" } as RawPlaces["meta"];
    expect(() => parsePlaces({ ...raw, meta })).toThrow(/attribution/);
  });

  it("refuses a file that carries no places array", () => {
    expect(() => parsePlaces({ meta: probeRaw([]).meta, places: undefined as unknown as [] })).toThrow();
  });

  it("keeps an optional field absent as absent, never an empty string", () => {
    const place = parsePlaces(probeRaw([probePlace({ name: undefined, hours: undefined })])).places[0];
    expect(place?.name).toBeUndefined();
    expect(place?.hours).toBeUndefined();
    expect(place?.te).toBeUndefined();
  });

  it("carries the raw OSM tag beside the category, so search can match both", () => {
    const place = parsePlaces(probeRaw([probePlace({ cat: "eat", osm: "amenity=fast_food" })])).places[0];
    expect(place?.cat).toBe("eat");
    expect(place?.osm).toBe("amenity=fast_food");
  });
});

describe("loadPlaces", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the declared asset and parses it", async () => {
    const raw = probeRaw([probePlace()]);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => raw }));
    vi.stubGlobal("fetch", fetchMock);

    const places = await loadPlaces(PLACES_ASSET_URL);
    expect(fetchMock).toHaveBeenCalledWith(PLACES_ASSET_URL);
    expect(places.categoryCounts.cafes).toBe(1);
  });

  it("reports the status when the asset is not there, rather than empty places", async () => {
    // A probe status for this fixture; any non-ok response must be reported, not swallowed.
    const missingStatus = 404; // GROUNDED-EXEMPT: a probe HTTP status, not a product value.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: missingStatus })));
    await expect(loadPlaces(PLACES_ASSET_URL)).rejects.toThrow(String(missingStatus));
  });

  it("declares the path beside the world asset, so there is one place to look when it moves", () => {
    expect(PLACES_ASSET_URL).toBe("/assets/world/places.json");
  });
});