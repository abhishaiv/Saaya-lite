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

export interface HomeChromeProps {
  readonly copy: M4Copy;
  /** Places per category, from the bake itself. A zero-count category never renders. */
  readonly categoryCounts: Readonly<Record<PlaceCategory, number>>;
  /** The category the pins are filtered to, or `null` for every category. */
  readonly activeCategory: PlaceCategory | null;
  readonly onCategoryChange: (category: PlaceCategory | null) => void;
}

/**
 * Home's chrome, over either render mode: the search pill up top, the category bar above
 * the nav, and the four-tab nav.
 *
 * This shipped as the walk view's own and moved here when the founder ruled the Corner
 * layout belongs to the normal view (2026-09-23): "These are the reference screens I have
 * provided. This is for normal view not the 3D view." It is the same chrome over the flat
 * map and over the walk render, because it is Home's, not either map's.
 *
 * All of it floats over the map, so the root is a positioning layer only - pointer events
 * off, back on at each control - so a drag on empty chrome still reaches the map. The
 * nav's other three tabs ship disabled until their surfaces arrive in the next part; the
 * work order allows the bar itself here. The search pill waits the same way.
 */
export function HomeChrome({
  copy,
  categoryCounts,
  activeCategory,
  onCategoryChange,
}: HomeChromeProps) {
  const pills = PLACE_CATEGORIES.filter(
    (category) => categoryCounts[category] > 0,
  );
  return (
    <div className="home-chrome">
      <button
        aria-label={copy.cdWalkSearch}
        className="home-chrome__search"
        disabled
        type="button"
      >
        {copy.walkSearchHint}
      </button>

      {pills.length === 0 ? null : (
        <div className="home-chrome__categories">
          {pills.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                aria-pressed={active}
                className="home-chrome__category"
                data-active={active || undefined}
                key={category}
                onClick={() =>
                  onCategoryChange(active ? null : category)
                }
                type="button"
              >
                {copy[CATEGORY_LABEL_KEY[category]]}
              </button>
            );
          })}
        </div>
      )}

      <nav className="home-chrome__nav">
        <button
          aria-current="page"
          className="home-chrome__tab"
          data-active="true"
          type="button"
        >
          {copy.navMap}
        </button>
        <button className="home-chrome__tab" disabled type="button">
          {copy.navFeed}
        </button>
        <button className="home-chrome__tab" disabled type="button">
          {copy.navSearch}
        </button>
        <button className="home-chrome__tab" disabled type="button">
          {copy.navProfile}
        </button>
      </nav>

      <style jsx>{`
        /* A positioning layer only: three floating rows over the canvas, each control
           taking pointer events back for itself, so a drag on the gaps reaches the
           street. The nav is the bottom edge and the categories stack above it, and
           both clear the safe area the way the flat map's own dock does. */
        .home-chrome {
          /* The nav's own height: the tab's touch target plus the pill's own padding.
             The category bar stacks one row above it from this, and the home screen's
             own dock clears both - its arithmetic mirrors this one in the same tokens. */
          --home-nav-height: calc(
            var(--minimum-touch-target) + var(--space-8) + var(--space-8)
          );

          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        /* One pill, top of the ground: a reading of the frame rather than a live
           input, and it opens the search surface when that part lands. */
        .home-chrome__search {
          position: absolute;
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12) +
              var(--minimum-touch-target) + var(--space-8)
          );
          inset-inline: var(--screen-padding) calc(
            var(--screen-padding) + var(--home-rail)
          );
          pointer-events: auto;
          /* Held at the touch target: the walk view's own status line sits one band
             below this pill, and that arithmetic counts on this height. */
          min-block-size: var(--minimum-touch-target);
          padding: var(--space-12) var(--space-16);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
          font-family: inherit;
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-card-body-line-height);
          text-align: start;
          animation: none;
          transition: none;
        }

        /* Above the nav, one row, sideways scroll only. The pills are the flat map's
           control shape; the active one is the interface's own violet. */
        .home-chrome__categories {
          position: absolute;
          inset-block-end: calc(
            env(safe-area-inset-bottom) + var(--space-12) +
              var(--home-nav-height) + var(--space-12)
          );
          inset-inline: var(--screen-padding);
          display: flex;
          gap: var(--space-8);
          /* The chips inside carry touch padding taller than themselves. A scrolling
             box clips what leaves it, so the strip takes the room as padding and
             immediately takes it back as a margin: the targets fit inside, the bar
             still paints at the chips' own height. */
          margin-block: calc(var(--space-12) * -1);
          padding-block: var(--space-12);
          overflow-x: auto;
          scrollbar-width: none;
          pointer-events: auto;
        }

        .home-chrome__category {
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

        .home-chrome__category[data-active="true"] {
          background: var(--color-brand);
          color: var(--color-background);
        }

        /* The visual is a 30 px chip; the target is not. DESIGN_SYSTEM.md: "Minimum
           touch target 48 x 48 px, no exceptions", and the interface's own chips read
           the same rule: pad the touch target, do not grow the visual. The percentage
           is the pill's own painted box, because a positioned element's percentages
           resolve against its own padding box. */
        .home-chrome__category::after {
          content: "";
          position: absolute;
          inset-block: calc((var(--minimum-touch-target) - 100%) / -2);
          inset-inline: 0;
        }

        /* Corner's floating pill, in the interface's own white: four tabs, the map
           tab the active page, the other three disabled rows until their surfaces
           arrive. Nothing here is a safety control, so nothing here animates either. */
        .home-chrome__nav {
          position: absolute;
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