"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SaayaBottomSheet,
} from "../../components/SaayaBottomSheet";
import { subscribeBottomSheetDragRange } from "../../../platform/viewportMetrics";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import { formatCopy, type M4Copy } from "../../copy/strings";
import {
  haversineDistanceM,
  stationDistanceDisplay,
  zoneContainingPoint,
  type AreaPolygon,
} from "../../../domain/engine/nearestStation";
import { browserClock } from "../../../platform/clock";
import { indiaWallClockAt, parseOpeningHours } from "../../../platform/walk/openingHours";
import type { Place } from "../../../platform/walk/walkPlaces";
import { CATEGORY_LABEL_KEY } from "./HomeChrome";

export interface PlaceSheetProps {
  readonly copy: M4Copy;
  readonly locale: "en" | "te";
  /** The place the sheet reads. The caller keeps the authority; this renders it. */
  readonly place: Place;
  /** Her current fix, or `null` while there is none - the distance row needs one. */
  readonly currentPoint:
    | { readonly latitude: number; readonly longitude: number }
    | null;
  /** The carded areas, for the area row. She may stand outside every one. */
  readonly areas: readonly AreaPolygon[];
  /** The bake's own attribution line, shown verbatim in the footer. */
  readonly attribution: string;
  /**
   * Whether she has this place saved, read from the on-device store, and the toggle that
   * writes it. Optional together: the walk view mounts this sheet from its own frame with
   * no store behind it, and a Save button there would be an action with nothing behind it.
   */
  readonly saved?: boolean;
  readonly onToggleSave?: (placeId: string) => void;
  readonly onDismiss: () => void;
}

/**
 * The place sheet: what the pin's place has, and nothing it does not.
 *
 * Every row is earned by the bake's own file. An absent field means an absent row - no
 * placeholder, no invented value. Hours carry an open state only when the recorded rule
 * actually parses; an unparseable rule shows verbatim with no state. The area row needs
 * her to stand inside a carded area; the distance needs a fix; the call needs OSM's
 * phone; the share needs the browser's own share surface. No ratings, no reviews, no
 * photos - the product has none, and the sheet does not pretend.
 *
 * The tone is the walk view's own paper: this sheet is the map's surface raised, not a
 * dark card over a white world, so its ink is the background's own dark.
 */
export function PlaceSheet({
  copy,
  locale,
  place,
  currentPoint,
  areas,
  attribution,
  saved,
  onToggleSave,
  onDismiss,
}: PlaceSheetProps) {
  const [dragRangePx, setDragRangePx] = useState(0);

  useEffect(() => subscribeBottomSheetDragRange(setDragRangePx), []);

  const displayName =
    locale === "te" ? (place.te ?? place.name) : (place.name ?? place.te);
  const categoryKey =
    CATEGORY_LABEL_KEY[place.cat as keyof typeof CATEGORY_LABEL_KEY];
  const title = displayName ?? (categoryKey ? copy[categoryKey] : place.cat);

  // Her own wall clock, read once for this opening: the sheet is open for seconds, and
  // the open state is a reading of now, not a subscription.
  const clock = useMemo(
    () => indiaWallClockAt(browserClock.nowEpochMs()),
    [],
  );
  const hoursState =
    place.hours === undefined ? undefined : parseOpeningHours(place.hours, clock);
  const areaName = useMemo(
    () =>
      zoneContainingPoint(areas, {
        latitude: place.lat,
        longitude: place.lon,
      })?.areaName,
    [areas, place.lat, place.lon],
  );
  const distance = useMemo(
    () =>
      currentPoint === null
        ? undefined
        : stationDistanceDisplay(
            haversineDistanceM(currentPoint, {
              latitude: place.lat,
              longitude: place.lon,
            }),
          ),
    [currentPoint, place.lat, place.lon],
  );
  const canShare = typeof navigator.share === "function";

  return (
    <SaayaBottomSheet
      ariaLabel={copy.cdCloseSheet}
      className="place-sheet"
      dragRangePx={dragRangePx}
      onDismiss={onDismiss}
      onPositionChange={(position) => {
        if (position === "peek") onDismiss();
      }}
      position="expanded"
      tone="paper"
    >
      <article aria-labelledby="place-sheet-title" className="place-detail">
        <header className="place-sheet__header">
          <div>
            <h2 id="place-sheet-title">{title}</h2>
            {categoryKey === undefined ? null : (
              <span className="place-sheet__chip">{copy[categoryKey]}</span>
            )}
          </div>
          <button
            aria-label={copy.cdCloseSheet}
            className="place-sheet__close"
            onClick={onDismiss}
            type="button"
          >
            <MaterialSymbol decorative fill="utility" name="close" size={24} />
          </button>
        </header>

        {place.hours === undefined ? null : (
          <div className="place-sheet__row">
            <span className="place-sheet__label">{copy.placeHours}</span>
            <span className="place-sheet__value">
              {hoursState === null || hoursState === undefined ? null : hoursState.open ? (
                <strong className="place-sheet__state place-sheet__state--open">
                  {copy.placeOpenNow}
                </strong>
              ) : (
                <strong className="place-sheet__state">
                  {copy.placeClosedNow}
                </strong>
              )}
              {place.hours}
            </span>
          </div>
        )}

        {areaName === undefined ? null : (
          <div className="place-sheet__row">
            <span className="place-sheet__label">{copy.placeArea}</span>
            <span className="place-sheet__value">{areaName}</span>
          </div>
        )}

        {distance === undefined ? null : (
          <div className="place-sheet__row">
            <span className="place-sheet__value">
              {formatCopy(
                distance.unit === "m" ? copy.zoneDistanceM : copy.zoneDistanceKm,
                distance.value,
              )}
            </span>
          </div>
        )}

        <div className="place-sheet__actions">
          {onToggleSave === undefined ? null : (
            <button
              aria-label={formatCopy(
                saved === true ? copy.cdPlaceUnsave : copy.cdPlaceSave,
                title,
              )}
              aria-pressed={saved === true}
              className="place-sheet__action"
              onClick={() => onToggleSave(place.id)}
              type="button"
            >
              {saved === true ? copy.ctaSaved : copy.ctaSave}
            </button>
          )}
          <a
            aria-label={formatCopy(copy.cdPlaceDirections, title)}
            className="place-sheet__action"
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
            rel="noreferrer"
            target="_blank"
          >
            {copy.placeDirections}
          </a>
          {place.phone === undefined ? null : (
            <a
              aria-label={formatCopy(copy.cdStationCall, title)}
              className="place-sheet__action"
              href={`tel:${place.phone}`}
            >
              <MaterialSymbol decorative fill="utility" name="call" size={20} />
              <span>{copy.ctaCall}</span>
            </a>
          )}
          {canShare ? (
            <button
              aria-label={formatCopy(copy.cdPlaceShare, title)}
              className="place-sheet__action"
              onClick={() => {
                void navigator
                  .share({ title })
                  .catch((error: unknown) => {
                    // A share the user walked away from is not a failure to report.
                    if ((error as { name?: string }).name !== "AbortError") {
                      throw error;
                    }
                  });
              }}
              type="button"
            >
              {copy.ctaShare}
            </button>
          ) : null}
        </div>

        <footer>{attribution}</footer>
      </article>

      <style jsx>{`
        /* The sheet's own class carries the global sizing row in globals.css; this is
           the content inside it, named apart so the styled-jsx scope of one cannot
           land on the other. */
        .place-detail {
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
          min-block-size: 100%; /* GROUNDED-EXEMPT: content fills the sheet surface. */
          padding: var(--space-48) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
        }

        .place-sheet__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-12);
        }

        .place-sheet__header h2 {
          margin: 0 0 var(--space-8);
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-title-line-height);
        }

        .place-sheet__chip {
          display: inline-block;
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-small);
          background: rgb(from var(--color-brand) r g b / var(--border-accent-alpha));
          color: var(--color-background);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
        }

        .place-sheet__row {
          display: grid;
          gap: var(--space-4);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .place-sheet__label {
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .place-sheet__state {
          font-weight: var(--weight-semibold);
          margin-inline-end: var(--space-8);
        }

        .place-sheet__state--open {
          color: var(--color-safe);
        }

        .place-sheet__actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-8);
        }

        .place-sheet__action {
          display: inline-flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-12) var(--space-16);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: var(--color-brand);
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          text-decoration: none;
          animation: none;
          transition: none;
        }

        .place-sheet footer {
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-label-size);
          line-height: var(--type-label-line-height);
        }
      `}</style>
    </SaayaBottomSheet>
  );
}