"use client";

import type { ReactNode } from "react";

import { formatCopy, type M4Copy } from "../../copy/strings";
import type { PlaceRowFacts } from "../../../platform/walk/placeBrowse";
import type { Place } from "../../../platform/walk/walkPlaces";

export interface PlaceListRow {
  /** The place, and everything the row says about it, already resolved by the caller. */
  readonly facts: PlaceRowFacts;
  /** The one-line reason this card is here, already in her language. Absent when there is none. */
  readonly why?: string;
  /** True on cards the UI has to label as demo content. */
  readonly demo?: boolean;
  /**
   * The card's own controls - the profile's star and remove - drawn in the card's own
   * footer rather than inside its face, because a button cannot hold a button. Cards
   * without per-card controls leave it out.
   */
  readonly actions?: ReactNode;
}

export interface PlaceListProps {
  readonly copy: M4Copy;
  readonly onSelect: (place: Place) => void;
  readonly rows: readonly PlaceListRow[];
}

/**
 * The board the feed, the search and the profile all stand on: two columns of white cards,
 * each one a place.
 *
 * The shape is the founder's own pick from five rendered directions (2026-09-23): "D -
 * Board of white cards". A card carries its category as a violet tag, its name, the meta
 * line of area and distance, and the why line when the list has a rule to state. It
 * replaced the typographic row that shipped first: the row was right about what a place
 * says and wrong about how much of the screen it spent saying it.
 *
 * Two columns rather than one list, because a city has a shape and a single column reads it
 * as a queue. The meta line drops any part the bake cannot earn - the category is already
 * the tag, an area she stands outside is not printed, a distance with no fix is not a dash.
 */
export function PlaceList({ copy, onSelect, rows }: PlaceListProps) {
  return (
    <ul className="place-board">
      {rows.map(({ actions, facts, why, demo }) => {
        const meta = [
          facts.areaName,
          facts.distance === undefined
            ? undefined
            : formatCopy(
                facts.distance.unit === "m" ? copy.zoneDistanceM : copy.zoneDistanceKm,
                facts.distance.value,
              ),
        ].filter((part): part is string => part !== undefined);

        return (
          <li className="place-card" key={facts.place.id}>
            <button
              aria-label={formatCopy(copy.cdSearchResult, facts.title)}
              className="place-card__face"
              onClick={() => onSelect(facts.place)}
              type="button"
            >
              <span className="place-card__tag">{facts.categoryLabel}</span>
              <span className="place-card__title">
                {facts.title}
                {demo === true ? (
                  <span className="place-card__demo">{copy.demoChip}</span>
                ) : null}
              </span>
              {meta.length === 0 ? null : (
                <span className="place-card__meta">{meta.join(" · ")}</span>
              )}
              {why === undefined ? null : (
                <span className="place-card__why">{why}</span>
              )}
            </button>
            {actions === undefined ? null : (
              <div className="place-card__actions">{actions}</div>
            )}
          </li>
        );
      })}

      <style jsx>{`
        /* Two columns of cards: a city read as a board rather than a queue. The columns
           flow top to bottom and break between cards, never inside one. */
        .place-board {
          columns: 2;
          column-gap: var(--space-12);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .place-card {
          display: grid;
          break-inside: avoid;
          margin: 0 0 var(--space-12);
          padding: var(--space-16);
          border-radius: var(--radius-card);
          background: var(--color-text-primary);
          color: var(--color-background);
        }

        /* The card's face: everything the card says, and the whole of it is the target.
           The card's own padding is the paper's, not the button's. */
        .place-card__face {
          display: grid;
          gap: var(--space-4);
          inline-size: 100%;
          padding: 0;
          border: 0;
          appearance: none;
          background: none;
          color: inherit;
          font-family: inherit;
          text-align: start;
          animation: none;
          transition: none;
        }

        .place-card__tag {
          justify-self: start;
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-small);
          background: color-mix(in srgb, var(--color-brand) 20%, transparent); /* alpha.chip.fill */
          color: var(--color-background);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
        }

        .place-card__title {
          display: flex;
          align-items: baseline;
          gap: var(--space-8);
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-title-line-height);
        }

        .place-card__demo {
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-small);
          background: rgb(from var(--color-brand) r g b / var(--border-accent-alpha));
          color: var(--color-background);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: none;
        }

        .place-card__meta,
        .place-card__why {
          color: rgb(from var(--color-background) r g b / 0.6);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .place-card__why {
          font-style: italic;
        }

        /* The card's own controls, on the card's lower edge: they belong to this card and
           read as its footer, so the board keeps its rhythm with or without them. */
        .place-card__actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-4);
          margin-block-start: var(--space-8);
        }
      `}</style>
    </ul>
  );
}
