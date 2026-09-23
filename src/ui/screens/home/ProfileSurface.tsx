"use client";

import { formatCopy, type M4Copy } from "../../copy/strings";
import { MAX_TOP_SPOTS, weeksUsing, type PersonalState } from "../../../data/repository/personalRepository";
import { BROWSE_ROWS_MAX } from "../../../platform/walk/placeBrowse";
import type { Place } from "../../../platform/walk/walkPlaces";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import { PlaceList, type PlaceListRow } from "./PlaceList";
import { SurfacePanel } from "./SurfacePanel";

export interface ProfileSurfaceProps {
  readonly copy: M4Copy;
  /** Her favourite's name, or `null` when she has not named one yet. */
  readonly favouriteName: string | null;
  /** Her own name, or `null` when onboarding did not capture one. */
  readonly name: string | null;
  /** The clock reading the surface opened with, for the weeks counter. */
  readonly nowEpochMs: number;
  readonly onImportOpen: () => void;
  readonly onPlaceSelected: (place: Place) => void;
  readonly onRemoveSaved: (placeId: string) => void;
  readonly onSettingsOpen: () => void;
  readonly onToggleTopSpot: (placeId: string, starred: boolean) => void;
  readonly personal: PersonalState;
  /** The row facts for every place she has saved, already resolved, newest save first. */
  readonly savedRows: readonly PlaceListRow[];
  readonly topSpotRows: readonly PlaceListRow[];
}

/**
 * Her page: who she set up, what she has saved, and the three counters the app can actually
 * stand behind. Nothing on it is inferred - the weeks come from the stamp written the first
 * time she opened Saaya, the count is what she saved, and the check-in count is one per
 * accepted check-in. There is no streak, no score and no engagement number, because a
 * friend does not keep those.
 *
 * Top spots come first because she chose them: the star list is hers, capped at the fact's
 * ceiling, and the saved list below is everything else she has kept. Both lists carry the
 * same two controls, because both are the same places and she may unstar one from either.
 */
export function ProfileSurface({
  copy,
  favouriteName,
  name,
  nowEpochMs,
  onImportOpen,
  onPlaceSelected,
  onRemoveSaved,
  onSettingsOpen,
  onToggleTopSpot,
  personal,
  savedRows,
  topSpotRows,
}: ProfileSurfaceProps) {
  const weeks = weeksUsing(personal.firstUsedAtEpochMs, nowEpochMs);

  const withActions = (row: PlaceListRow): PlaceListRow => {
    const starred = personal.topSpots.includes(row.facts.place.id);
    return {
      ...row,
      actions: (
        <>
          <button
            aria-label={formatCopy(
              starred ? copy.cdProfileUnstar : copy.cdProfileStar,
              row.facts.title,
            )}
            className="profile-action"
            onClick={() => onToggleTopSpot(row.facts.place.id, !starred)}
            type="button"
          >
            <span aria-hidden="true">{starred ? "★" : "☆"}</span>
          </button>
          <button
            aria-label={formatCopy(copy.cdProfileRemove, row.facts.title)}
            className="profile-action"
            onClick={() => onRemoveSaved(row.facts.place.id)}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </>
      ),
    };
  };

  return (
    <SurfacePanel heading={copy.navProfile}>
      <section className="profile-identity">
        <p className="profile-identity__name">{name ?? copy.profileNameUnset}</p>
        <p className="profile-identity__favourite">
          {copy.profileFavourite}: {favouriteName ?? copy.profileFavouriteUnset}
        </p>
      </section>

      <ul className="profile-stats">
        {weeks === null ? null : (
          <li className="profile-stats__line">
            {formatCopy(weeks === 1 ? copy.profileWeeksOne : copy.profileWeeks, weeks)}
          </li>
        )}
        <li className="profile-stats__line">
          {formatCopy(
            personal.savedPlaces.length === 1
              ? copy.profileSavedCountOne
              : copy.profileSavedCount,
            personal.savedPlaces.length,
          )}
        </li>
        <li className="profile-stats__line">
          {formatCopy(copy.profileCheckIns, personal.checkInsAccepted)}
        </li>
      </ul>

      <section className="profile-section">
        <h2 className="profile-section__heading">{copy.profileTopSpotsTitle}</h2>
        {topSpotRows.length === 0 ? (
          <p className="profile-note">
            {formatCopy(copy.profileTopSpotsEmpty, MAX_TOP_SPOTS)}
          </p>
        ) : (
          <PlaceList
            copy={copy}
            onSelect={onPlaceSelected}
            rows={topSpotRows.map(withActions)}
          />
        )}
      </section>

      <section className="profile-section">
        <h2 className="profile-section__heading">{copy.profileSavedTitle}</h2>
        {savedRows.length === 0 ? (
          <p className="profile-note">{copy.profileSavedEmpty}</p>
        ) : (
          <PlaceList
            copy={copy}
            onSelect={onPlaceSelected}
            rows={savedRows.slice(0, BROWSE_ROWS_MAX).map(withActions)}
          />
        )}
      </section>

      <section className="profile-section">
        <h2 className="profile-section__heading">{copy.profileImport}</h2>
        <button className="profile-import" onClick={onImportOpen} type="button">
          {copy.importCta}
        </button>
      </section>

      {/* The gear left the map.
          * Founder ruling, 2026-09-23, choosing between five rendered directions: "A -
          Light and quiet" keeps the map to the search pill and the view's own two
          controls, and "the doc" - settings and about - moves to the dock's Profile page,
          where her page already is. */}
      <section className="profile-section">
        <button
          className="profile-import"
          onClick={onSettingsOpen}
          type="button"
        >
          <MaterialSymbol decorative fill="utility" name="settings" size={20} />
          {copy.cdSettings}
        </button>
      </section>

      <style jsx>{`
        .profile-identity {
          display: grid;
          gap: var(--space-4);
        }

        .profile-identity__name {
          margin: 0;
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-title-line-height);
        }

        .profile-identity__favourite,
        .profile-note {
          margin: 0;
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        /* The counters are three statements rather than a table: each one already says what
           it counts, so there is no label to print above it and nothing to read twice. */
        .profile-stats {
          display: grid;
          gap: var(--space-4);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .profile-stats__line {
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-body-line-height);
        }

        .profile-section {
          display: grid;
          gap: var(--space-8);
        }

        .profile-section__heading {
          margin: 0;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
        }

        .profile-import {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          gap: var(--space-8);
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

        /* The row's own star and remove. They carry the full target size themselves rather
           than borrowing it from a pseudo-element, because they sit in the row's trailing
           column and nothing else may overlap them. */
        .profile-action {
          display: grid;
          place-items: center;
          min-block-size: var(--minimum-touch-target);
          min-inline-size: var(--minimum-touch-target);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: none;
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-card-body-size);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }
      `}</style>
    </SurfacePanel>
  );
}
