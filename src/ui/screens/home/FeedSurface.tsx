"use client";

import { useMemo, useState } from "react";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import {
  browsablePlaces,
  forYouEntries,
  placeRowFacts,
  sortByDistance,
  type BrowsePoint,
} from "../../../platform/walk/placeBrowse";
import type {
  Place,
  PlaceCategory,
  Places,
} from "../../../platform/walk/walkPlaces";
import { formatCopy, type M4Copy, type SaayaLocale } from "../../copy/strings";
import { PlaceList, type PlaceListRow } from "./PlaceList";
import { SurfacePanel } from "./SurfacePanel";
import { CATEGORY_LABEL_KEY, CategoryChips } from "./HomeChrome";

type FeedTab = "forYou" | "near";

export interface FeedSurfaceProps {
  readonly areas: readonly AreaPolygon[];
  readonly copy: M4Copy;
  readonly currentPoint: BrowsePoint | null;
  readonly locale: SaayaLocale;
  readonly onPlaceSelected: (place: Place) => void;
  /** The category ids she picked. Empty until the onboarding delta writes them. */
  readonly picks: readonly string[];
  readonly places: Places | null;
  /** The row ceiling, from `home.browse.rowsMax`. */
  readonly rowsMax: number;
}

/**
 * The feed: the bake's places as typographic cards, in one of two orders.
 *
 * "Near you" is distance. "For you" is her picks walked in her own order, and every card
 * says why it is there in the same words the rule uses - a pick's category, or the nearest
 * fallback while she has picked nothing. Nothing here is a recommendation model, so nothing
 * here can drift: the same picks and the same fix produce the same list on any device.
 */
export function FeedSurface({
  areas,
  copy,
  currentPoint,
  locale,
  onPlaceSelected,
  picks,
  places,
  rowsMax,
}: FeedSurfaceProps) {
  const [tab, setTab] = useState<FeedTab>("near");
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const categoryLabel = useMemo(
    () => (category: string) => {
      const key = CATEGORY_LABEL_KEY[category as keyof typeof CATEGORY_LABEL_KEY];
      return key === undefined ? category : copy[key];
    },
    [copy],
  );

  const rows = useMemo<readonly PlaceListRow[]>(() => {
    if (places === null) return [];
    const browsable = browsablePlaces(places.places).filter(
      (place) => category === null || place.cat === category,
    );
    const factsFor = (place: Place, why?: string): PlaceListRow => ({
      facts: placeRowFacts(place, { areas, currentPoint, locale, categoryLabel }),
      why,
    });
    if (tab === "near") {
      return sortByDistance(browsable, currentPoint)
        .slice(0, rowsMax)
        .map((place) => factsFor(place));
    }
    return forYouEntries(browsable, { currentPoint, limit: rowsMax, picks }).map(
      (entry) =>
        factsFor(
          entry.place,
          entry.whyKind === "pick" && entry.whyCategory !== undefined
            ? formatCopy(copy.feedWhyPick, categoryLabel(entry.whyCategory))
            : copy.feedWhyNearest,
        ),
    );
  }, [areas, category, categoryLabel, copy.feedWhyNearest, copy.feedWhyPick, currentPoint, locale, picks, places, rowsMax, tab]);

  return (
    <SurfacePanel
      heading={copy.navFeed}
      controls={
        <>
          <button
            aria-pressed={tab === "near"}
            className="feed-tab"
            data-active={tab === "near" || undefined}
            onClick={() => setTab("near")}
            type="button"
          >
            {copy.feedNearYou}
          </button>
          <button
            aria-pressed={tab === "forYou"}
            className="feed-tab"
            data-active={tab === "forYou" || undefined}
            onClick={() => setTab("forYou")}
            type="button"
          >
            {copy.feedForYou}
          </button>
        </>
      }
    >
      {places === null ? (
        <p className="feed-note">{copy.browseLoading}</p>
      ) : (
        <>
          {/* The category row lives here now.
              * The founder, on the shipped flat map, 2026-09-23: "Too many things on
              screen. Very counter-intuitive to use." The map kept "Search + nav only", so
              filtering moved to where the places are listed, in the board's own white
              chips on the board's paper. */}
          <CategoryChips
            active={category}
            copy={copy}
            counts={places.categoryCounts}
            onChange={setCategory}
            tone="paper"
          />

          {currentPoint === null ? (
            <p className="feed-note">{copy.feedNeedsFix}</p>
          ) : null}
          {rows.length === 0 ? (
            <p className="feed-note">{copy.browseEmpty}</p>
          ) : (
            <PlaceList copy={copy} onSelect={onPlaceSelected} rows={rows} />
          )}
        </>
      )}

      <style jsx>{`
        /* The tab pair is the category bar's shape on paper: the same chip, the same
           active fill, so the two surfaces read as one interface. */
        .feed-tab {
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

        .feed-tab[data-active="true"] {
          background: var(--color-brand);
          color: var(--color-background);
        }

        .feed-note {
          margin: 0;
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }
      `}</style>
    </SurfacePanel>
  );
}
