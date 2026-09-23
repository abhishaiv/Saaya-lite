"use client";

import { useMemo, useState } from "react";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import {
  browsablePlaces,
  placeAreaName,
  placeRowFacts,
  searchPlaces,
  suggestionChips,
  type BrowsePoint,
} from "../../../platform/walk/placeBrowse";
import { indiaWallClockAt, type IndiaWallClock } from "../../../platform/walk/openingHours";
import { browserClock } from "../../../platform/clock";
import {
  PLACE_CATEGORIES,
  type Place,
  type PlaceCategory,
  type Places,
} from "../../../platform/walk/walkPlaces";
import type { M4Copy, SaayaLocale } from "../../copy/strings";
import { PlaceList, type PlaceListRow } from "./PlaceList";
import { SurfacePanel } from "./SurfacePanel";
import { CATEGORY_LABEL_KEY } from "./HomeChrome";

export interface SearchSurfaceProps {
  readonly areas: readonly AreaPolygon[];
  readonly copy: M4Copy;
  readonly currentPoint: BrowsePoint | null;
  readonly locale: SaayaLocale;
  readonly onPlaceSelected: (place: Place) => void;
  readonly places: Places | null;
  /** The suggestion row's ceiling, from `home.search.chipMax`. */
  readonly chipsMax: number;
  /** The row ceiling, from `home.browse.rowsMax`. */
  readonly rowsMax: number;
}

/**
 * The search surface: text matching over the bake, nothing else.
 *
 * Every chip is a string the file actually holds - a category with places, an area with
 * places - so a chip always lands on results. "Open now" keeps only places whose recorded
 * `opening_hours` parses and reads open: a place with no hours is skipped rather than
 * guessed at, which is the same rule the place sheet states for the same field.
 */
export function SearchSurface({
  areas,
  copy,
  currentPoint,
  locale,
  onPlaceSelected,
  places,
  chipsMax,
  rowsMax,
}: SearchSurfaceProps) {
  const [query, setQuery] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(false);

  // Her wall clock, read when the surface opens: "open now" is a reading of this moment,
  // not a subscription she watches tick by.
  const clock = useMemo<IndiaWallClock>(
    () => indiaWallClockAt(browserClock.nowEpochMs()),
    [],
  );

  const categoryLabel = useMemo(
    () => (category: string) => {
      const key = CATEGORY_LABEL_KEY[category as keyof typeof CATEGORY_LABEL_KEY];
      return key === undefined ? category : copy[key];
    },
    [copy],
  );
  const areaNameOf = useMemo(
    () => (place: Place) => placeAreaName(place, areas),
    [areas],
  );

  const browsable = useMemo(
    () => (places === null ? [] : browsablePlaces(places.places)),
    [places],
  );

  const chips = useMemo(() => {
    if (places === null) return [];
    return suggestionChips(browsable, {
      areaNameOf,
      categoryLabel,
      limit: chipsMax,
      nonEmptyCategories: PLACE_CATEGORIES.filter(
        (category: PlaceCategory) => places.categoryCounts[category] > 0,
      ),
    });
  }, [areaNameOf, browsable, categoryLabel, chipsMax, places]);

  const rows = useMemo<readonly PlaceListRow[]>(
    () =>
      searchPlaces(browsable, {
        areaNameOf,
        categoryLabel,
        clock,
        currentPoint,
        limit: rowsMax,
        openNowOnly,
        query,
      }).map((place) => ({
        facts: placeRowFacts(place, { areas, currentPoint, locale, categoryLabel }),
      })),
    [areaNameOf, areas, browsable, categoryLabel, clock, currentPoint, locale, openNowOnly, query, rowsMax],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <SurfacePanel
      heading={copy.navSearch}
      controls={
        <>
          <input
            aria-label={copy.cdSearchField}
            autoFocus
            className="search-field"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.walkSearchHint}
            type="search"
            value={query}
          />
          <button
            aria-pressed={openNowOnly}
            className="search-toggle"
            data-active={openNowOnly || undefined}
            onClick={() => setOpenNowOnly((current) => !current)}
            type="button"
          >
            {copy.searchOpenNow}
          </button>
        </>
      }
    >
      {places === null ? (
        <p className="search-note">{copy.browseLoading}</p>
      ) : (
        <>
          {hasQuery || chips.length === 0 ? null : (
            <div className="search-chips">
              <span className="search-chips__label">{copy.searchChipsLabel}</span>
              <div className="search-chips__row">
                {chips.map((chip) => (
                  <button
                    className="search-chip"
                    key={`${chip.kind}:${chip.label}`}
                    onClick={() => setQuery(chip.label)}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {rows.length === 0 ? (
            <p className="search-note">{copy.searchEmpty}</p>
          ) : (
            <PlaceList copy={copy} onSelect={onPlaceSelected} rows={rows} />
          )}
        </>
      )}

      <style jsx>{`
        /* The field is the map's own search pill brought onto paper: the same height and
           radius, the ink inverted with the surface. */
        .search-field {
          flex: 1;
          min-block-size: var(--minimum-touch-target);
          padding: var(--space-12) var(--space-16);
          border: var(--border-hairline) solid
            rgb(from var(--color-background) r g b / 0.2);
          border-radius: var(--radius-control);
          appearance: none;
          background: none;
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-body-line-height);
        }

        .search-field::placeholder {
          color: rgb(from var(--color-background) r g b / 0.6);
        }

        .search-toggle {
          flex: none;
          min-inline-size: var(--minimum-touch-target);
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-16);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: rgb(from var(--color-background) r g b / 0.06);
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .search-toggle[data-active="true"] {
          background: var(--color-brand);
        }

        .search-chips {
          display: grid;
          gap: var(--space-8);
        }

        .search-chips__label {
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .search-chips__row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-8);
        }

        .search-chip {
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-16);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: rgb(from var(--color-background) r g b / 0.06);
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .search-note {
          margin: 0;
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }
      `}</style>
    </SurfacePanel>
  );
}
