import type { ReactNode } from "react";

import type { M4Copy } from "../../copy/strings";
import {
  PLACE_CATEGORIES,
  type Place,
  type PlaceCategory,
} from "../../../platform/walk/walkPlaces";

/** The copy slot each category's pill reads, in the bar's own order. */
export const CATEGORY_LABEL_KEY: Readonly<
  Record<PlaceCategory, keyof M4Copy>
> = {
  bars: "catBars",
  cafes: "catCafes",
  eat: "catEat",
  goOut: "catGoOut",
  hotels: "catHotels",
  leisure: "catLeisure",
  shops: "catShops",
};

export type HomeChromeNavTab = "map" | "feed" | "search" | "profile";

/**
 * The counts the bar reads before the bake has answered: every category at zero, so the
 * bar holds its row back rather than guessing at what the city holds.
 */
export const ZERO_CATEGORY_COUNTS: Readonly<Record<PlaceCategory, number>> = {
  bars: 0,
  cafes: 0,
  eat: 0,
  goOut: 0,
  hotels: 0,
  leisure: 0,
  shops: 0,
};

/**
 * A pill's words: the place's own name, else the category she filtered by. Shared by both
 * render modes, so the same place reads the same in the walk view and on the flat map.
 */
export function pinLabel(place: Place, copy: M4Copy): string {
  if (place.name !== undefined) return place.name;
  const key: keyof M4Copy | undefined = CATEGORY_LABEL_KEY[place.cat as PlaceCategory];
  return key === undefined ? place.cat : copy[key];
}

/** The four tabs, in the order the dock draws them. */
const NAV_TABS: readonly Readonly<{
  key: HomeChromeNavTab;
  label: keyof M4Copy;
}>[] = [
  { key: "map", label: "navMap" },
  { key: "feed", label: "navFeed" },
  { key: "search", label: "navSearch" },
  { key: "profile", label: "navProfile" },
];

export interface CategoryChipsProps {
  /** The category the pins are filtered to, or `null` for every category. */
  readonly active: PlaceCategory | null;
  readonly copy: M4Copy;
  /** Places per category, from the bake itself. A zero-count category never renders. */
  readonly counts: Readonly<Record<PlaceCategory, number>>;
  readonly onChange: (category: PlaceCategory | null) => void;
  /**
   * Which ground the row is drawn on. `map` (the default) is the floating chrome over the
   * walk render; `paper` is the board's own row, in the surface's white chips.
   */
  readonly tone?: "map" | "paper";
}

/**
 * The category row: one chip per category the bake actually yielded places for, one active
 * at a time, tapping the active one clears the filter.
 *
 * It is not HomeChrome's own row any more. The founder, on the shipped flat map
 * (2026-09-23): "Too many things on screen. Very counter-intuitive to use." The ruling kept
 * the flat map to "Search + nav only (Recommended)", so its category bar came out and the
 * chips live where they are answered now - the feed's own header, and the walk view's
 * chrome, which still filters its pins. One implementation, two grounds, and the flat map
 * draws none of it.
 *
 * Layout is the caller's: this is the row's contents, not its placement. HomeChrome puts a
 * row in the floating shell above the nav; the feed puts one in its own flow.
 */
export function CategoryChips({
  active,
  copy,
  counts,
  onChange,
  tone = "map",
}: CategoryChipsProps) {
  const pills = PLACE_CATEGORIES.filter((category) => counts[category] > 0);
  if (pills.length === 0) return null;

  return (
    <div className="category-chips" data-tone={tone}>
      {pills.map((category) => {
        const on = category === active;
        return (
          <button
            aria-pressed={on}
            className="category-chips__chip"
            data-active={on || undefined}
            key={category}
            onClick={() => onChange(on ? null : category)}
            type="button"
          >
            {copy[CATEGORY_LABEL_KEY[category]]}
          </button>
        );
      })}

      <style jsx>{`
        .category-chips {
          display: flex;
          gap: var(--space-8);
          flex-wrap: wrap;
        }

        .category-chips__chip {
          position: relative;
          flex: none;
          padding: var(--space-8) var(--space-14);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .category-chips__chip[data-active="true"] {
          background: var(--color-brand);
          color: var(--color-background);
        }

        /* On the board's paper the same chip is white with ink, which is what the surface
           is: the map's chip is a control over a map, the paper's chip is a card on a
           board. Only the two colours change. */
        .category-chips[data-tone="paper"] .category-chips__chip {
          background: var(--color-text-primary);
          color: rgb(from var(--color-background) r g b / 0.6);
        }

        .category-chips[data-tone="paper"] .category-chips__chip[data-active="true"] {
          background: var(--color-brand);
          color: var(--color-background);
        }

        /* The visual is a 30 px chip; the target is not. DESIGN_SYSTEM.md: "Minimum
           touch target 48 x 48 px, no exceptions", and the interface's own chips read
           the same rule: pad the touch target, do not grow the visual. The percentage
           is the pill's own painted box, because a positioned element's percentages
           resolve against its own padding box. */
        .category-chips__chip::after {
          content: "";
          position: absolute;
          inset-block: calc((var(--minimum-touch-target) - 100%) / -2);
          inset-inline: 0;
        }
      `}</style>
    </div>
  );
}

export interface HomeChromeProps {
  /** Which tab reads as the page she is on. */
  readonly activeTab: HomeChromeNavTab;
  readonly copy: M4Copy;
  /**
   * A view's own filter row, when it has one. The walk view passes `CategoryChips`; the
   * flat map passes nothing, because the ruling keeps it to the search pill and the nav.
   */
  readonly categories?: ReactNode;
  /** Opens the search surface. */
  readonly onSearchOpen: () => void;
  readonly onTabChange: (tab: HomeChromeNavTab) => void;
}

/**
 * Home's chrome, over either render mode: the search pill up top, the four-tab nav on the
 * bottom edge.
 *
 * This shipped as the walk view's own and moved here when the founder ruled the Corner
 * layout belongs to the normal view (2026-09-23): "These are the reference screens I have
 * provided. This is for normal view not the 3D view." It is the same chrome over the flat
 * map and over the walk render, because it is Home's, not either map's.
 *
 * Shape ruled by the founder the same day, from five rendered directions: "A - Light and
 * quiet". The search pill, then the view's own two controls beside it; the map is the
 * screen; SUS and SOS sit in a rail on the right; the four-tab dock at the bottom. The
 * category bar that stood above the nav is gone from this chrome - the flat map is
 * "Search + nav only" and the chips answer where the filtering happens now.
 *
 * All of it floats over the map, so the root is a positioning layer only - pointer events
 * off, back on at each control - so a drag on empty chrome still reaches the map.
 */
export function HomeChrome({
  activeTab,
  categories,
  copy,
  onSearchOpen,
  onTabChange,
}: HomeChromeProps) {
  return (
    <div className="home-chrome">
      <button
        aria-label={copy.cdWalkSearch}
        className="home-chrome__search"
        onClick={onSearchOpen}
        type="button"
      >
        {copy.walkSearchHint}
      </button>

      {categories === undefined ? null : (
        <div className="home-chrome__category-row">{categories}</div>
      )}

      <nav className="home-chrome__nav">
        {NAV_TABS.map(({ key, label }) => {
          const active = key === activeTab;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className="home-chrome__tab"
              data-active={active || undefined}
              key={key}
              onClick={() => onTabChange(key)}
              type="button"
            >
              {copy[label]}
            </button>
          );
        })}
      </nav>

      <style jsx>{`
        /* A positioning layer only: floating rows over the canvas, each control taking
           pointer events back for itself, so a drag on the gaps reaches the street. The
           nav is the bottom edge and both it and the pill clear the safe area. */
        .home-chrome {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        /* One pill, top of the ground, in the interface's own white so it reads as the
           first thing on the map: a live control that opens the search surface. Its
           trailing inset is the rail's own width, because the view's two controls stand
           beside it in that column. */
        .home-chrome__search {
          position: absolute;
          inset-block-start: calc(env(safe-area-inset-top) + var(--space-12));
          inset-inline: var(--screen-padding) calc(
            var(--screen-padding) + var(--home-rail)
          );
          pointer-events: auto;
          /* Held at the touch target: the walk view's own status line sits one band
             below this pill, and that arithmetic counts on this height. */
          min-block-size: var(--minimum-touch-target);
          padding: var(--space-12) var(--space-16);
          border: 0;
          border-radius: var(--radius-card);
          appearance: none;
          background: var(--color-text-primary);
          color: rgb(from var(--color-background) r g b / 0.6);
          font-family: inherit;
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-body-line-height);
          text-align: start;
          animation: none;
          transition: none;
        }

        /* The slot a view fills when it has a row of its own: one row above the nav, in
           the same arithmetic the nav measures itself with. It scrolls sideways rather
           than wrapping, and the chips inside carry touch padding taller than themselves -
           a scrolling box clips what leaves it, so the row takes that room as padding and
           immediately takes it back as a margin. */
        .home-chrome__category-row {
          --home-nav-height: calc(
            var(--minimum-touch-target) + var(--space-8) + var(--space-8)
          );

          position: absolute;
          inset-block-end: calc(
            env(safe-area-inset-bottom) + var(--space-12) +
              var(--home-nav-height) + var(--space-12)
          );
          inset-inline: var(--screen-padding);
          display: flex;
          gap: var(--space-8);
          margin-block: calc(var(--space-12) * -1);
          padding-block: var(--space-12);
          overflow-x: auto;
          scrollbar-width: none;
          pointer-events: auto;
        }

        .home-chrome__category-row > :global(.category-chips) {
          flex-wrap: nowrap;
        }

        /* Corner's floating pill, in the interface's own white: four tabs, the tab she is
           on the active page. Nothing here is a safety control, so nothing here animates.
           The rung is load-bearing: a surface is drawn after this nav in tree order and
           sets no z-index of its own, so without it the board would cover the tabs and
           the map would be unreachable. The view's two controls (4) and the SOS/SUS rail
           (6) still stand above this. */
        .home-chrome__nav {
          position: absolute;
          z-index: 3;
          inset-block-end: calc(env(safe-area-inset-bottom) + var(--space-12));
          inset-inline-start: 50%;
          translate: -50% 0;
          display: flex;
          gap: var(--space-4);
          padding: var(--space-8) var(--space-12);
          border-radius: var(--radius-card);
          background: var(--color-text-primary);
          pointer-events: auto;
        }

        .home-chrome__tab {
          min-inline-size: var(--minimum-touch-target);
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-12);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: none;
          /* The nav's pill is the interface's own white, so the inactive label is the
             background colour at a label's weight - the same reading the place sheet uses
             on its own white card. The theme's secondary text is white, and white on white
             is not a label. */
          color: rgb(from var(--color-background) r g b / 0.6);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .home-chrome__tab[data-active="true"] {
          background: var(--color-brand);
          color: var(--color-background);
        }
      `}</style>
    </div>
  );
}
