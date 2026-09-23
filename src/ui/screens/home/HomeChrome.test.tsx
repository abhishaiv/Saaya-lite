import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import type { Place } from "../../../platform/walk/walkPlaces";
import { CategoryChips, HomeChrome, pinLabel } from "./HomeChrome";

/**
 * Render the chrome the way Home does: the flat map passes no categories - the ruling kept
 * it to "Search + nav only" - and the walk view fills the slot with the chips it filters
 * its own pins by.
 */
function render(options?: {
  readonly activeTab?: "map" | "feed" | "search" | "profile";
  readonly categories?: boolean;
}): string {
  const activeTab = options?.activeTab ?? "map";
  return renderToStaticMarkup(
    <HomeChrome
      activeTab={activeTab}
      categories={
        options?.categories === true ? (
          <CategoryChips
            active={null}
            copy={M4_COPY.en}
            counts={{
              bars: 0,
              cafes: 3,
              eat: 0,
              goOut: 0,
              hotels: 0,
              leisure: 0,
              shops: 0,
            }}
            onChange={() => undefined}
            tone="map"
          />
        ) : undefined
      }
      copy={M4_COPY.en}
      onSearchOpen={() => undefined}
      onTabChange={() => undefined}
    />,
  );
}

describe("home chrome", () => {
  it("draws the search pill, its words, and no input to type into", () => {
    const html = render();
    expect(html).toContain(M4_COPY.en.walkSearchHint);
    expect(html).not.toContain("<input");
  });

  it("draws all four tabs, none of them disabled, and marks the page she is on", () => {
    const html = render({ activeTab: "feed" });
    expect(html).toContain(M4_COPY.en.navMap);
    expect(html).toContain(M4_COPY.en.navFeed);
    expect(html).toContain(M4_COPY.en.navSearch);
    expect(html).toContain(M4_COPY.en.navProfile);
    expect(html).not.toContain('disabled=""');
    expect(html.split('aria-current="page"').length - 1).toBe(1); // GROUNDED-EXEMPT: markup probe count, not a product value.
  });

  it("keeps the flat map to the pill and the nav, as the ruling had it", () => {
    // Founder ruling, 2026-09-23: "Search + nav only (Recommended)". No category row is
    // drawn when the view passes none, which is what the flat map does.
    const html = render();
    expect(html).not.toContain(M4_COPY.en.catCafes);
    expect(html).not.toContain(M4_COPY.en.catEat);
  });

  it("draws the view's own category row when the view fills the slot", () => {
    const html = render({ categories: true });
    expect(html).toContain(M4_COPY.en.catCafes);
  });
});

describe("the category chips", () => {
  const chips = (active: "cafes" | null, tone?: "map" | "paper"): string =>
    renderToStaticMarkup(
      <CategoryChips
        active={active}
        copy={M4_COPY.en}
        counts={{
          bars: 0,
          cafes: 3,
          eat: 0,
          goOut: 0,
          hotels: 0,
          leisure: 0,
          shops: 0,
        }}
        onChange={() => undefined}
        {...(tone === undefined ? {} : { tone })}
      />,
    );

  it("renders a chip only for a category the bake yielded places for", () => {
    // Fixture counts, not product values: a category with zero places never renders a
    // chip, which is the whole of the rule - so the fixture yields places for one
    // category and none for the other six.
    const html = chips(null);
    expect(html).toContain(M4_COPY.en.catCafes);
    expect(html).not.toContain(M4_COPY.en.catBars);
    expect(html).not.toContain(M4_COPY.en.catEat);
    expect(html).not.toContain(M4_COPY.en.catGoOut);
    expect(html).not.toContain(M4_COPY.en.catHotels);
    expect(html).not.toContain(M4_COPY.en.catLeisure);
    expect(html).not.toContain(M4_COPY.en.catShops);
  });

  it("reads the active category as pressed and the others as not", () => {
    expect(chips("cafes")).toContain('aria-pressed="true"');
    expect(chips(null)).not.toContain('aria-pressed="true"');
  });

  it("carries its ground, so the board's row can wear the board's colours", () => {
    expect(chips(null, "map")).toContain('data-tone="map"');
    expect(chips(null, "paper")).toContain('data-tone="paper"');
  });
});

describe("a pin's words", () => {
  const place = (name?: string): Place => ({
    cat: "cafes",
    id: "n1",
    lat: 17.7, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    lon: 83.3, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    osm: "amenity=cafe",
    ...(name === undefined ? {} : { name }),
  });

  it("names the place by its own name when the bake has one", () => {
    expect(pinLabel(place("Bean Board"), M4_COPY.en)).toBe("Bean Board");
  });

  it("falls back to its category's own word when the bake has no name", () => {
    expect(pinLabel(place(), M4_COPY.en)).toBe(M4_COPY.en.catCafes);
  });
});
