import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import type { Places } from "../../../platform/walk/walkPlaces";
import { M4_COPY } from "../../copy/strings";
import { SearchSurface } from "./SearchSurface";

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

const PLACES: Places = {
  attribution: "© OpenStreetMap contributors",
  categoryCounts: { bars: 1, cafes: 1, eat: 0, goOut: 0, hotels: 0, leisure: 0, shops: 0 },
  places: [
    { cat: "cafes", hours: "24/7", id: "node/1", lat: PLACE_LAT, lon: PLACE_LON, name: "First Cafe", osm: "amenity=cafe" },
    { cat: "bars", id: "node/2", lat: PLACE_LAT, lon: PLACE_LON, name: "Probe Bar", osm: "amenity=bar" },
  ],
};

function render(places: Places | null = PLACES): string {
  return renderToStaticMarkup(
    <SearchSurface
      areas={AREAS}
      chipsMax={8}
      copy={COPY}
      currentPoint={HER_POINT}
      locale="en"
      onPlaceSelected={() => undefined}
      places={places}
      rowsMax={20}
    />,
  );
}

describe("the search surface", () => {
  it("is a field she types into, named for what it searches", () => {
    const html = render();
    expect(html).toContain('aria-label="Search Visakhapatnam places"');
    expect(html).toContain("<input");
    expect(html).toContain(`placeholder="${COPY.walkSearchHint}"`);
  });

  it("opens on the bake's own words, every chip a string the file holds", () => {
    // Text matching over the bake, nothing else: a category with places and the area they
    // stand in. Both are strings the file actually contains, so a chip always lands.
    const html = render();
    expect(html).toContain(COPY.searchChipsLabel);
    expect(html).toContain(COPY.catCafes);
    expect(html).toContain(COPY.catBars);
    expect(html).toContain("Square");
    // A category the bake yielded nothing for is not offered as a chip.
    expect(html).not.toContain(COPY.catEat);
  });

  it("offers open-now as a filter she sets, not a claim the surface makes", () => {
    const html = render();
    expect(html).toContain(COPY.searchOpenNow);
    expect(html).toContain('aria-pressed="false"');
  });

  it("lists the bake's places as cards until she narrows them", () => {
    const html = render();
    expect(html.match(/class="place-card"/g)).toHaveLength(2); // GROUNDED-EXEMPT: markup probe count, not a product value.
    // The area the probe place stands in reaches the card's meta line.
    expect(html).toContain("Square");
  });

  it("says the bake is still coming rather than searching nothing", () => {
    const html = render(null);
    // React escapes the apostrophe in the line, so the probe reads it as the markup does.
    expect(html).toContain(COPY.browseLoading.replace("'", "&#x27;"));
    expect(html).not.toContain('class="place-card"');
    expect(html).not.toContain(COPY.searchChipsLabel);
    expect(html).not.toContain(COPY.searchEmpty);
  });
});
