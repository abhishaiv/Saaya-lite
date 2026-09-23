/**
 * Loading and holding the baked places.
 *
 * The places asset sits beside the world asset and follows its discipline: one fetch,
 * one parse, and the bake's own `meta` stays authoritative — nothing here restates a
 * value the bake wrote. The file carries only what OSM has (id, name, category, lat/lon,
 * and opening hours / address / phone when present), and OSM's attribution travels with
 * it; `MAP_SPEC.md` names the attribution and it is surfaced, never assumed.
 *
 * The category vocabulary is the screen map's seven. The bake maps OSM tags onto it
 * deterministically, so the counts a category bar shows are what the file contains —
 * a category the bake yielded nothing for reads zero and is a caller's problem, never
 * invented here.
 */

/** The categories the screen map rules, as the bake writes them. */
export const PLACE_CATEGORIES = [
  "eat",
  "cafes",
  "bars",
  "goOut",
  "shops",
  "hotels",
  "leisure",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

/** The shape the bake writes per place. Optional fields are absent, never empty strings. */
export interface Place {
  readonly id: string;
  readonly cat: string;
  /** The raw OSM tag the category was mapped from, e.g. `amenity=cafe`. */
  readonly osm: string;
  readonly lat: number;
  readonly lon: number;
  readonly name?: string;
  /** OSM's Telugu name, when OSM has one. */
  readonly te?: string;
  readonly hours?: string;
  readonly addr?: string;
  readonly phone?: string;
}

/** The shape the bake writes. */
export interface RawPlaces {
  readonly meta: {
    readonly origin: readonly [number, number];
    readonly bbox: readonly number[];
    readonly attribution: string;
    readonly source: string;
  };
  readonly places: readonly Place[];
}

export interface Places {
  readonly attribution: string;
  readonly places: readonly Place[];
  /** Places per category, derived from the file. Zero means the bake yielded none. */
  readonly categoryCounts: Readonly<Record<PlaceCategory, number>>;
}

function zeroCounts(): Record<PlaceCategory, number> {
  return { eat: 0, cafes: 0, bars: 0, goOut: 0, shops: 0, hotels: 0, leisure: 0 };
}

export function parsePlaces(raw: RawPlaces): Places {
  // The attribution is a display obligation, not decoration: refuse a file that does not
  // carry one rather than rendering a map with a silent debt.
  if (typeof raw.meta?.attribution !== "string" || raw.meta.attribution.length === 0) {
    throw new Error("Places asset is missing its attribution");
  }
  if (!Array.isArray(raw.places)) {
    throw new Error("Places asset carries no places array");
  }
  const categoryCounts = zeroCounts();
  for (const place of raw.places) {
    if (place.cat in categoryCounts) {
      categoryCounts[place.cat as PlaceCategory] += 1;
    }
  }
  return {
    attribution: raw.meta.attribution,
    places: raw.places,
    categoryCounts,
  };
}

/**
 * Where the bake writes the places. Declared beside `WORLD_ASSET_URL` for the same
 * reason: one place to look when the asset moves.
 */
export const PLACES_ASSET_URL = "/assets/world/places.json";

/**
 * Fetch and parse the places. The caller supplies the url so a test can point at a
 * fixture, exactly as `loadWalkWorld` does.
 */
export async function loadPlaces(url: string): Promise<Places> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Places asset failed to load: ${response.status}`);
  }
  const raw = (await response.json()) as RawPlaces;
  return parsePlaces(raw);
}

