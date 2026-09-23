import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import type { Places } from "../../../platform/walk/walkPlaces";
import { M4_COPY } from "../../copy/strings";
import { FeedSurface } from "./FeedSurface";

const COPY = M4_COPY.en;

/** Probe coordinates, not product values: the bake's own file decides the real ones. */
const PLACE_LAT = 17.7; // GROUNDED-EXEMPT: a probe coordinate.
const PLACE_LON = 83.3; // GROUNDED-EXEMPT: a probe coordinate.
const HER_POINT = { latitude: 17.71, longitude: 83.31 }; // GROUNDED-EXEMPT: a probe fix.

const AREAS: readonly AreaPolygon[] = [
  {
    areaName: "Square",
    polygon: [
      { latitude: PLACE_LAT, longitude: PLACE_LON }, // GROUNDED-EXEMPT: a probe outline vertex.
      { latitude: PLACE_LAT, longitude: PLACE_LON + 0.02 }, // GROUNDED-EXEMPT: a probe outline vertex.
      { latitude: PLACE_LAT + 0.02, longitude: PLACE_LON + 0.02 }, // GROUNDED-EXEMPT: a probe outline vertex.
      { latitude: PLACE_LAT + 0.02, longitude: PLACE_LON }, // GROUNDED-EXEMPT: a probe outline vertex.
    ],
  },
];

/** Three places across two categories, and one category the bake yielded nothing for. */
const PLACES: Places = {
  attribution: "© OpenStreetMap contributors",
  categoryCounts: { bars: 0, cafes: 2, eat: 1, goOut: 0, hotels: 0, leisure: 0, shops: 0 },
  places: [
    { cat: "cafes", id: "node/1", lat: PLACE_LAT, lon: PLACE_LON, name: "First Cafe", osm: "amenity=cafe" },
    { cat: "cafes", id: "node/2", lat: PLACE_LAT, lon: PLACE_LON, name: "Second Cafe", osm: "amenity=cafe" },
    { cat: "eat", id: "node/3", lat: PLACE_LAT, lon: PLACE_LON, name: "Probe Mess", osm: "amenity=restaurant" },
  ],
};

function render(
  options: Readonly<{
    currentPoint?: typeof HER_POINT | null;
    places?: Places | null;
    picks?: readonly string[];
    rowsMax?: number;
  }> = {},
): string {
  return renderToStaticMarkup(
    <FeedSurface
      areas={AREAS}
      copy={COPY}
      currentPoint={options.currentPoint === undefined ? HER_POINT : options.currentPoint}
      locale="en"
      onPlaceSelected={() => undefined}
      picks={options.picks ?? []}
      places={options.places === undefined ? PLACES : options.places}
      rowsMax={options.rowsMax ?? 20}
    />,
  );
}

describe("the feed", () => {
  it("is one surface with two orders, and it opens on the one that needs no taste from her", () => {
    const html = render();

    expect(html).toContain('aria-label="Feed"');
    expect(html).toContain(COPY.feedNearYou);
    expect(html).toContain(COPY.feedForYou);
    // "Near you" is the opening order: it sorts by distance and asks nothing of her.
    expect(html).toContain('aria-pressed="true"');
    expect(html.split('aria-pressed="true"').length - 1).toBe(1); // GROUNDED-EXEMPT: markup probe count, not a product value.
  });

  it("lists the bake's places as cards, and cuts at the row ceiling", () => {
    const html = render();
    expect(html.match(/class="place-card"/g)).toHaveLength(3); // GROUNDED-EXEMPT: markup probe count, not a product value.

    const one = render({ rowsMax: 1 });
    expect(one.match(/class="place-card"/g)).toHaveLength(1); // GROUNDED-EXEMPT: markup probe count, not a product value.
  });

  it("keeps the category row here, in the board's own chips on the board's paper", () => {
    // The founder's ruling kept the flat map to "Search + nav only", so filtering lives
    // where the places are listed. A category the bake yielded nothing for draws no chip.
    const html = render();
    expect(html).toContain('class="category-chips" data-tone="paper"');
    expect(html).toContain(COPY.catCafes);
    expect(html).toContain(COPY.catEat);
    expect(html).not.toContain(COPY.catBars);
    expect(html).not.toContain(COPY.catShops);
  });

  it("states a why line on neither order until she has picked something", () => {
    // "Near you" has no rule to state beyond the order itself. The picks are empty here, so
    // nothing on the board may claim she picked anything.
    const html = render();
    expect(html).not.toContain(COPY.feedWhyPick.replace("%1$s", ""));
    expect(html).not.toContain(COPY.feedWhyNearest);
  });

  it("says the fix is missing rather than hiding the places behind it", () => {
    const html = render({ currentPoint: null });
    expect(html).toContain(COPY.feedNeedsFix);
    expect(html.match(/class="place-card"/g)).toHaveLength(3); // GROUNDED-EXEMPT: markup probe count, not a product value.
  });

  it("lists nothing it has not got: no bake, no cards, and one honest line", () => {
    const html = render({ places: null });
    // React escapes the apostrophe in the line, so the probe reads it as the markup does.
    expect(html).toContain(COPY.browseLoading.replace("'", "&#x27;"));
    expect(html).not.toContain('class="place-card"');
    expect(html).not.toContain('class="category-chips"');
    expect(html).not.toContain(COPY.browseEmpty);
  });
});
