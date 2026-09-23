import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { M4_COPY } from "../../copy/strings";
import type { PlaceCategory } from "../../../platform/walk/walkPlaces";
import { HomeChrome } from "./HomeChrome";

/**
 * Fixture counts, not product values: what is under test is the bar's own filter. A
 * category the bake yielded nothing for never renders a pill, which is the whole of the
 * rule the work order sets - so the fixture yields places for one category and none for
 * the other six.
 */
const COUNTS: Readonly<Record<PlaceCategory, number>> = {
  bars: 0,
  cafes: 3,
  eat: 0,
  goOut: 0,
  hotels: 0,
  leisure: 0,
  shops: 0,
};

function render(activeCategory: PlaceCategory | null = null): string {
  return renderToStaticMarkup(
    <HomeChrome
      activeCategory={activeCategory}
      categoryCounts={COUNTS}
      copy={M4_COPY.en}
      onCategoryChange={() => undefined}
    />,
  );
}

describe("home chrome", () => {
  it("renders a pill only for a category the bake yielded places for", () => {
    const html = render();
    expect(html).toContain(M4_COPY.en.catCafes);
    expect(html).not.toContain(M4_COPY.en.catBars);
    expect(html).not.toContain(M4_COPY.en.catEat);
    expect(html).not.toContain(M4_COPY.en.catGoOut);
    expect(html).not.toContain(M4_COPY.en.catHotels);
    expect(html).not.toContain(M4_COPY.en.catLeisure);
    expect(html).not.toContain(M4_COPY.en.catShops);
  });

  it("reads the active category as pressed and the others as not", () => {
    expect(render("cafes")).toContain('aria-pressed="true"');
    expect(render()).not.toContain('aria-pressed="true"');
  });

  it("opens on the map tab, with the search pill and the other tabs disabled", () => {
    const html = render();
    // The pill is a reading of the frame, never a live input over the map, and it says
    // where it will go rather than pretending to take text now.
    expect(html).toContain(M4_COPY.en.walkSearchHint);
    expect(html).toContain(M4_COPY.en.navMap);
    expect(html).toContain(M4_COPY.en.navFeed);
    expect(html).toContain(M4_COPY.en.navSearch);
    expect(html).toContain(M4_COPY.en.navProfile);
    expect(html).toContain('aria-current="page"');
    // The search pill plus the three tabs whose surfaces have not arrived yet.
    expect(html.split('disabled=""').length - 1).toBe(4); // GROUNDED-EXEMPT: markup probe count, not a product value.
  });
});
