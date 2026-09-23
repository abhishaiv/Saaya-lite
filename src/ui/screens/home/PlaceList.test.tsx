import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PlaceRowFacts } from "../../../platform/walk/placeBrowse";
import type { Place } from "../../../platform/walk/walkPlaces";
import { formatCopy, M4_COPY } from "../../copy/strings";
import { PlaceList, type PlaceListRow } from "./PlaceList";

const COPY = M4_COPY.en;

function place(overrides: Partial<Place> = {}): Place {
  return {
    cat: "cafes",
    id: "node/1",
    lat: 17.7, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    lon: 83.3, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    osm: "amenity=cafe",
    ...overrides,
  };
}

function facts(overrides: Partial<PlaceRowFacts> = {}): PlaceRowFacts {
  const target = overrides.place ?? place({ name: "Probe Cafe" });
  return {
    categoryLabel: COPY.catCafes,
    place: target,
    title: "Probe Cafe",
    ...overrides,
  };
}

function render(rows: readonly PlaceListRow[]): string {
  return renderToStaticMarkup(
    <PlaceList copy={COPY} onSelect={() => undefined} rows={rows} />,
  );
}

describe("the place board", () => {
  it("draws one card per row, and the face of each is the whole target", () => {
    // The founder's own pick from five rendered directions, 2026-09-23: "D - Board of white
    // cards". Two rows in, two cards out, each named for its place rather than for "select".
    const html = render([
      { facts: facts() },
      { facts: facts({ place: place({ id: "node/2", name: "Second Cafe" }), title: "Second Cafe" }) },
    ]);

    expect(html.match(/class="place-card"/g)).toHaveLength(2); // GROUNDED-EXEMPT: markup probe count, not a product value.
    expect(html).toContain(formatCopy(COPY.cdSearchResult, "Probe Cafe"));
    expect(html).toContain(formatCopy(COPY.cdSearchResult, "Second Cafe"));
  });

  it("says the tag, the title, the area and the distance, and nothing it cannot earn", () => {
    const withBoth = render([
      {
        facts: facts({
          areaName: "Square",
          distance: { unit: "m", value: 120 },
        }),
      },
    ]);
    expect(withBoth).toContain(COPY.catCafes);
    expect(withBoth).toContain("Probe Cafe");
    expect(withBoth).toContain(
      `Square · ${formatCopy(COPY.zoneDistanceM, 120)}`,
    );

    // An absent part is an absent part of the line: no placeholder, no dash.
    const areaOnly = render([{ facts: facts({ areaName: "Square" }) }]);
    expect(areaOnly).toContain("Square");
    expect(areaOnly).not.toContain(COPY.zoneDistanceM);
    expect(areaOnly).not.toContain(COPY.zoneDistanceKm);

    // The full class attribute rather than the bare class name: styled-jsx writes its own
    // CSS, selectors and all, into the same markup.
    const neither = render([{ facts: facts() }]);
    expect(neither).not.toContain(`class="place-card__meta"`);
  });

  it("reads the distance in the template the unit chooses", () => {
    // The same rule the place sheet states for the same field: metres under a kilometre,
    // kilometres above it, one pair of copy slots doing the wording.
    const near = render([{ facts: facts({ distance: { unit: "m", value: 400 } }) }]);
    expect(near).toContain(formatCopy(COPY.zoneDistanceM, 400));

    const farKm = "4.2"; // GROUNDED-EXEMPT: a probe distance reading, not a product value.
    const far = render([{ facts: facts({ distance: { unit: "km", value: farKm } }) }]);
    expect(far).toContain(formatCopy(COPY.zoneDistanceKm, farKm));
  });

  it("prints the why line only when the list has a rule to state", () => {
    const why = formatCopy(COPY.feedWhyPick, COPY.catCafes);
    const withWhy = render([{ facts: facts(), why }]);
    expect(withWhy).toContain(why);

    const withoutWhy = render([{ facts: facts() }]);
    expect(withoutWhy).not.toContain(COPY.feedWhyPick);
    expect(withoutWhy).not.toContain(COPY.feedWhyNearest);
  });

  it("marks a demo card as demo, and leaves an ordinary card unmarked", () => {
    // "Every mock (post, photo) says so in the UI": an example card is labelled on its own
    // title, so a demo can never read as one of her places.
    const demo = render([{ demo: true, facts: facts() }]);
    expect(demo).toContain(formatCopy(COPY.cdSearchResult, "Probe Cafe"));
    expect(demo).toContain(`>${COPY.demoChip}<`);

    const ordinary = render([{ facts: facts() }]);
    expect(ordinary).not.toContain(`>${COPY.demoChip}<`);
  });

  it("draws the card's own controls only when the card has them", () => {
    // A button cannot hold a button: the star and the remove stand in the card's footer,
    // outside the face, and a list without them keeps the same rhythm.
    const withActions = render([
      { actions: <button type="button">Star</button>, facts: facts() },
    ]);
    expect(withActions).toContain(`class="place-card__actions"`);
    expect(withActions).toContain("Star");

    const withoutActions = render([{ facts: facts() }]);
    expect(withoutActions).not.toContain(`class="place-card__actions"`);
  });
});
