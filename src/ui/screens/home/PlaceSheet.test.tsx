import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  haversineDistanceM,
  stationDistanceDisplay,
  type AreaPolygon,
} from "../../../domain/engine/nearestStation";
import type { Place } from "../../../platform/walk/walkPlaces";
import { formatCopy, M4_COPY } from "../../copy/strings";
import { PlaceSheet } from "./PlaceSheet";

const ATTRIBUTION = "© OpenStreetMap contributors";
const COPY = M4_COPY.en;

/** Probe coordinates, not product values: the bake's own file decides the real ones. */
const PLACE_LAT = 17.7; // GROUNDED-EXEMPT: a probe coordinate.
const PLACE_LON = 83.3; // GROUNDED-EXEMPT: a probe coordinate.
const HER_LAT = 17.71; // GROUNDED-EXEMPT: a probe coordinate.
const HER_LON = 83.31; // GROUNDED-EXEMPT: a probe coordinate.

function place(overrides: Partial<Place> = {}): Place {
  return {
    cat: "cafes",
    id: "node/1",
    lat: PLACE_LAT,
    lon: PLACE_LON,
    osm: "amenity=cafe",
    ...overrides,
  };
}

const HER_POINT = { latitude: HER_LAT, longitude: HER_LON };

/** One carded square, wide enough for the probe place to stand inside it. */
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

function render(
  target: Place,
  options: Readonly<{
    areas?: readonly AreaPolygon[];
    currentPoint?: { latitude: number; longitude: number } | null;
  }> = {},
): string {
  return renderToStaticMarkup(
    <PlaceSheet
      areas={options.areas ?? []}
      attribution={ATTRIBUTION}
      copy={COPY}
      currentPoint={options.currentPoint === undefined ? null : options.currentPoint}
      locale="en"
      onDismiss={() => undefined}
      place={target}
    />,
  );
}

describe("place sheet", () => {
  it("invents nothing for a place the bake carries no hours or phone for", () => {
    const html = render(place({ name: "Probe Cafe" }));
    expect(html).toContain("Probe Cafe");
    // An absent field is an absent row: no placeholder, no borrowed value.
    expect(html).not.toContain(COPY.placeHours);
    expect(html).not.toContain(COPY.placeOpenNow);
    expect(html).not.toContain(COPY.placeClosedNow);
    expect(html).not.toContain("tel:");
    expect(html).not.toContain(COPY.placeArea);
    // The ways out are always there, and the attribution with them.
    expect(html).toContain(COPY.placeDirections);
    expect(html).toContain(ATTRIBUTION);
  });

  it("reads a rule it can parse, and shows one it cannot verbatim with no state", () => {
    const open = render(place({ hours: "24/7", name: "Probe Cafe" }));
    expect(open).toContain(COPY.placeOpenNow);
    expect(open).toContain("24/7");

    const unreadable = render(place({ hours: "by appointment", name: "Probe Cafe" }));
    expect(unreadable).toContain("by appointment");
    expect(unreadable).not.toContain(COPY.placeOpenNow);
    expect(unreadable).not.toContain(COPY.placeClosedNow);
  });

  it("falls back to the category's own name when the bake has no name for the place", () => {
    const html = render(place());
    expect(html).toContain(COPY.catCafes);
  });

  it("carries a call row only when OSM has a phone", () => {
    const html = render(place({ name: "Probe Cafe", phone: "+91 90000 00000" })); // GROUNDED-EXEMPT: probe phone number, not a product value.
    expect(html).toContain("tel:+91 90000 00000"); // GROUNDED-EXEMPT: probe phone number, not a product value.
    expect(html).toContain(COPY.ctaCall);
  });

  it("measures the distance from her fix, and drops the row when there is none", () => {
    // The same reading the sheet takes, so the assertion cannot disagree with the
    // template the unit chooses.
    const distance = stationDistanceDisplay(
      haversineDistanceM(HER_POINT, { latitude: PLACE_LAT, longitude: PLACE_LON }),
    );
    const expected = formatCopy(
      distance.unit === "m" ? COPY.zoneDistanceM : COPY.zoneDistanceKm,
      distance.value,
    );
    const withFix = render(place({ name: "Probe Cafe" }), { currentPoint: HER_POINT });
    const withoutFix = render(place({ name: "Probe Cafe" }));
    expect(withFix).toContain(expected);
    expect(withoutFix).not.toContain(expected);
  });

  it("names the carded area she stands in, and stays silent when she is outside every one", () => {
    const inside = render(place({ name: "Probe Cafe" }), { areas: AREAS });
    const outside = render(place({ name: "Probe Cafe" }));
    expect(inside).toContain(COPY.placeArea);
    expect(inside).toContain("Square");
    expect(outside).not.toContain(COPY.placeArea);
  });

  it("points directions at the place's own coordinates", () => {
    const html = render(place({ name: "Probe Cafe" }));
    expect(html).toContain(`destination=${PLACE_LAT},${PLACE_LON}`);
  });
});
