/**
 * Choosing what the browse surfaces show: the feed's two lists and the search's results.
 *
 * All of it is arithmetic over the bake's own rows - text matching, distance ordering, and
 * the open-now reading from `openingHours.ts`. No model, no ranking score, no hidden
 * weights: every list here can be reproduced by hand from the file, which is what makes the
 * feed's why line a statement of the rule rather than a decoration.
 *
 * Two rules the surfaces depend on and this module keeps:
 *
 * 1. **A place with no hours is not "open now" and not "closed" - it is unstated.** The
 *    open-now filter keeps only places whose recorded rule parses and reads open, and the
 *    skipped ones are skipped, never guessed at.
 * 2. **Without her fix the lists still render, in an order the file itself decides.** The
 *    distance sorts need a point; with none, the bake's own order stands and no row claims
 *    a distance it does not have.
 */

import {
  haversineDistanceM,
  stationDistanceDisplay,
  zoneContainingPoint,
  type AreaPolygon,
  type StationDistanceDisplay,
} from "../../domain/engine/nearestStation";
import { parseOpeningHours, type IndiaWallClock } from "./openingHours";
import { PLACE_CATEGORIES, type Place } from "./walkPlaces";

export interface BrowsePoint {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * The row ceiling every browse surface passes as its `limit`, so the feed's two tabs, the
 * search results and the profile's saved list all cut at the same place.
 */
export const BROWSE_ROWS_MAX = 20; // fact: home.browse.rowsMax

/** The suggestion row's ceiling, passed to `suggestionChips`. */
export const SEARCH_CHIP_MAX = 8; // fact: home.search.chipMax

/**
 * The distance a row prints. This is deliberately the zone sheet's own type rather than a
 * second one that looks like it: one place, one reading of how far away it is, one pair of
 * copy slots (`zoneDistanceM` / `zoneDistanceKm`) doing the wording.
 */
export type DistanceDisplay = StationDistanceDisplay;

/** The distance row a card carries, or `undefined` while there is no fix to measure from. */
export function placeDistance(
  place: Place,
  currentPoint: BrowsePoint | null,
): DistanceDisplay | undefined {
  if (currentPoint === null) return undefined;
  return stationDistanceDisplay(
    haversineDistanceM(currentPoint, {
      latitude: place.lat,
      longitude: place.lon,
    }),
  );
}

/** The carded area the place stands in, or `undefined` when it stands outside every one. */
export function placeAreaName(
  place: Place,
  areas: readonly AreaPolygon[],
): string | undefined {
  return zoneContainingPoint(areas, {
    latitude: place.lat,
    longitude: place.lon,
  })?.areaName;
}

/**
 * Whether the place is open at the given wall clock. `undefined` means the bake states
 * nothing this reader can use: no hours, or hours outside the parsed subset. The open-now
 * filter drops exactly these, and the place sheet shows the hours verbatim without a state.
 */
export function placeOpenNow(
  place: Place,
  clock: IndiaWallClock,
): boolean | undefined {
  if (place.hours === undefined) return undefined;
  return parseOpeningHours(place.hours, clock)?.open;
}

/** What a row needs to say about one place, resolved once per render. */
export interface PlaceRowFacts {
  readonly areaName?: string;
  readonly categoryLabel: string;
  readonly distance?: DistanceDisplay;
  readonly place: Place;
  /** The name the current locale reads, falling back to the other, then the category. */
  readonly title: string;
}

export function placeTitle(
  place: Place,
  locale: "en" | "te",
  categoryLabel: string,
): string {
  const display = locale === "te" ? (place.te ?? place.name) : (place.name ?? place.te);
  return display ?? categoryLabel;
}

export function placeRowFacts(
  place: Place,
  context: {
    readonly areas: readonly AreaPolygon[];
    readonly currentPoint: BrowsePoint | null;
    readonly locale: "en" | "te";
    readonly categoryLabel: (category: string) => string;
  },
): PlaceRowFacts {
  const categoryLabel = context.categoryLabel(place.cat);
  return {
    areaName: placeAreaName(place, context.areas),
    categoryLabel,
    distance: placeDistance(place, context.currentPoint),
    place,
    title: placeTitle(place, context.locale, categoryLabel),
  };
}

/**
 * The rows a browse surface may show: only the categories the product has names for. The
 * bake maps OSM tags onto that vocabulary, and a row outside it is one no chip can filter
 * to and no label can name, so it is not in a list either.
 */
export function browsablePlaces(places: readonly Place[]): readonly Place[] {
  return places.filter((place) =>
    (PLACE_CATEGORIES as readonly string[]).includes(place.cat),
  );
}

/** Distance in metres, or `null` without a fix. The one ordering key both lists share. */
function metresTo(place: Place, currentPoint: BrowsePoint | null): number | null {
  if (currentPoint === null) return null;
  return haversineDistanceM(currentPoint, {
    latitude: place.lat,
    longitude: place.lon,
  });
}

/**
 * Nearest first when there is a fix; the file's own order when there is not. Stable under
 * equal distances because the comparison only reorders on a strict difference.
 */
export function sortByDistance(
  places: readonly Place[],
  currentPoint: BrowsePoint | null,
): readonly Place[] {
  if (currentPoint === null) return places;
  return [...places].sort((a, b) => {
    const distanceA = metresTo(a, currentPoint) ?? 0;
    const distanceB = metresTo(b, currentPoint) ?? 0;
    return distanceA - distanceB;
  });
}

/** The text a query is matched against: both names, the localized category, the address, the area. */
export function searchText(
  place: Place,
  context: {
    readonly areaName?: string;
    readonly categoryLabel: string;
  },
): string {
  return [
    place.name,
    place.te,
    context.categoryLabel,
    context.areaName,
    place.addr,
  ]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(" ")
    .toLocaleLowerCase();
}

export interface SearchOptions {
  readonly areaNameOf: (place: Place) => string | undefined;
  readonly categoryLabel: (category: string) => string;
  readonly clock: IndiaWallClock;
  readonly currentPoint: BrowsePoint | null;
  readonly limit: number;
  readonly openNowOnly: boolean;
  readonly query: string;
}

/**
 * The search results: every place whose text carries the query, nearest first, filtered by
 * open-now when she asked for it, capped at the row ceiling.
 */
export function searchPlaces(
  places: readonly Place[],
  options: SearchOptions,
): readonly Place[] {
  const needle = options.query.trim().toLocaleLowerCase();
  const matched: Place[] = [];
  for (const place of places) {
    const areaName = options.areaNameOf(place);
    if (
      needle.length > 0 &&
      !searchText(place, {
        areaName,
        categoryLabel: options.categoryLabel(place.cat),
      }).includes(needle)
    ) {
      continue;
    }
    if (options.openNowOnly && placeOpenNow(place, options.clock) !== true) continue;
    matched.push(place);
  }
  return sortByDistance(matched, options.currentPoint).slice(0, options.limit);
}

/** One feed card: the place, and the reason it is on this list, as a copy slot. */
export interface FeedEntry {
  readonly place: Place;
  readonly whyKind: "pick" | "nearest";
  /** The category the pick names, for the why line. Absent on a nearest entry. */
  readonly whyCategory?: string;
}

/**
 * "For you": her picked categories, nearest first inside each pick, picks in her own order,
 * so the same picks always produce the same list on any device. With no picks yet the rule
 * falls back to nearest-first over every category and says so, rather than inventing a taste
 * she has not stated.
 */
export function forYouEntries(
  places: readonly Place[],
  options: {
    readonly currentPoint: BrowsePoint | null;
    readonly limit: number;
    readonly picks: readonly string[];
  },
): readonly FeedEntry[] {
  if (options.picks.length === 0) {
    return sortByDistance(places, options.currentPoint)
      .slice(0, options.limit)
      .map((place) => ({ place, whyKind: "nearest" as const }));
  }
  const entries: FeedEntry[] = [];
  const taken = new Set<string>();
  for (const pick of options.picks) {
    if (entries.length >= options.limit) break;
    const inPick = sortByDistance(
      places.filter((place) => place.cat === pick && !taken.has(place.id)),
      options.currentPoint,
    );
    for (const place of inPick) {
      if (entries.length >= options.limit) break;
      taken.add(place.id);
      entries.push({ place, whyKind: "pick", whyCategory: pick });
    }
  }
  return entries;
}

/** One suggestion chip: a category or an area, and the query it puts in the field. */
export interface SuggestionChip {
  readonly kind: "area" | "category";
  /** The chip's own words, which are also the query it searches for. */
  readonly label: string;
}

/**
 * The chips under the search field. Every one is a string the bake actually contains - a
 * category with places, an area with places - so a chip always lands on results, and the
 * ceiling keeps the row to what a thumb can see at once.
 */
export function suggestionChips(
  places: readonly Place[],
  options: {
    readonly areaNameOf: (place: Place) => string | undefined;
    readonly categoryLabel: (category: string) => string;
    readonly limit: number;
    readonly nonEmptyCategories: readonly string[];
  },
): readonly SuggestionChip[] {
  const chips: SuggestionChip[] = options.nonEmptyCategories.map((category) => ({
    kind: "category" as const,
    label: options.categoryLabel(category),
  }));
  const areaCounts = new Map<string, number>();
  for (const place of places) {
    const areaName = options.areaNameOf(place);
    if (areaName === undefined) continue;
    areaCounts.set(areaName, (areaCounts.get(areaName) ?? 0) + 1);
  }
  const areas = [...areaCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  for (const [areaName] of areas) {
    if (chips.length >= options.limit) break;
    chips.push({ kind: "area", label: areaName });
  }
  return chips.slice(0, options.limit);
}
