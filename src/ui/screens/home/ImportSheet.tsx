"use client";

import { useEffect, useMemo, useState } from "react";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import {
  browsablePlaces,
  placeRowFacts,
  type BrowsePoint,
} from "../../../platform/walk/placeBrowse";
import type { Place, Places } from "../../../platform/walk/walkPlaces";
import { subscribeBottomSheetDragRange } from "../../../platform/viewportMetrics";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import type { M4Copy, SaayaLocale } from "../../copy/strings";
import { CATEGORY_LABEL_KEY } from "./HomeChrome";
import { PlaceList, type PlaceListRow } from "./PlaceList";

/** How many examples the sheet ends on. Three fills a board row without turning the
 *  labelled demo into a browse of its own. */
const IMPORT_EXAMPLES_MAX = 3;

export interface ImportSheetProps {
  readonly areas: readonly AreaPolygon[];
  readonly copy: M4Copy;
  readonly currentPoint: BrowsePoint | null;
  readonly locale: SaayaLocale;
  readonly onDismiss: () => void;
  readonly onPlaceSelected: (place: Place) => void;
  readonly places: Places | null;
}

/**
 * The import sheet: what the full product will do with her list, stated before anything is
 * asked of her, and then a labelled demo rather than a parser.
 *
 * The beta reads nothing. Nothing she could paste is parsed, nothing is uploaded, and the
 * first press only reveals what the examples are - Saaya's own Visakhapatnam data, each
 * card carrying the demo chip - so the sheet can never be mistaken for having taken her
 * places. The words are the work order's own rules: "nothing the user pastes is parsed
 * (the import sheet is a labelled demo)" and "every mock says so in the UI".
 */
export function ImportSheet({
  areas,
  copy,
  currentPoint,
  locale,
  onDismiss,
  onPlaceSelected,
  places,
}: ImportSheetProps) {
  const [examplesShown, setExamplesShown] = useState(false);
  const [dragRangePx, setDragRangePx] = useState(0);

  useEffect(() => subscribeBottomSheetDragRange(setDragRangePx), []);

  const categoryLabel = useMemo(
    () => (category: string) => {
      const key = CATEGORY_LABEL_KEY[category as keyof typeof CATEGORY_LABEL_KEY];
      return key === undefined ? category : copy[key];
    },
    [copy],
  );

  const examples = useMemo<readonly PlaceListRow[]>(() => {
    if (places === null) return [];
    return browsablePlaces(places.places)
      .slice(0, IMPORT_EXAMPLES_MAX)
      .map((place) => ({
        demo: true,
        facts: placeRowFacts(place, { areas, currentPoint, locale, categoryLabel }),
      }));
  }, [areas, categoryLabel, currentPoint, locale, places]);

  return (
    <SaayaBottomSheet
      ariaLabel={copy.importTitle}
      className="import-sheet"
      dragRangePx={dragRangePx}
      onDismiss={onDismiss}
      onPositionChange={(position) => {
        if (position === "peek") onDismiss();
      }}
      position="expanded"
      tone="board"
    >
      <article aria-labelledby="import-sheet-title" className="import-detail">
        <header className="import-sheet__header">
          <h2 className="import-sheet__title" id="import-sheet-title">
            {examplesShown ? copy.importDemoTitle : copy.importTitle}
          </h2>
          <button
            aria-label={copy.cdCloseSheet}
            className="import-sheet__close"
            onClick={onDismiss}
            type="button"
          >
            <MaterialSymbol decorative fill="utility" name="close" size={24} />
          </button>
        </header>

        <p className="import-sheet__body">
          {examplesShown ? copy.importDemoBody : copy.importBody}
        </p>

        {examplesShown ? (
          examples.length === 0 ? (
            <p className="import-sheet__body">{copy.browseLoading}</p>
          ) : (
            <PlaceList copy={copy} onSelect={onPlaceSelected} rows={examples} />
          )
        ) : (
          <button
            className="import-sheet__action"
            onClick={() => setExamplesShown(true)}
            type="button"
          >
            {copy.importCta}
          </button>
        )}
      </article>

      <style jsx>{`
        .import-detail {
          display: grid;
          gap: var(--space-16);
          padding: var(--space-24) var(--space-16) var(--space-32);
        }

        .import-sheet__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-12);
        }

        .import-sheet__title {
          margin: 0;
          font-size: var(--type-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-title-line-height);
        }

        .import-sheet__close {
          flex: none;
          display: grid;
          place-items: center;
          min-inline-size: var(--minimum-touch-target);
          min-block-size: var(--minimum-touch-target);
          margin-inline-end: calc(var(--space-8) * -1);
          padding: 0;
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: none;
          color: inherit;
          animation: none;
          transition: none;
        }

        .import-sheet__body {
          margin: 0;
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        /* The one action on the paper: brand, the interface's white label, the touch
           target the design system sets, and nothing that animates. */
        .import-sheet__action {
          justify-self: start;
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-20);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: var(--color-brand);
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-body-line-height);
          animation: none;
          transition: none;
        }
      `}</style>
    </SaayaBottomSheet>
  );
}
