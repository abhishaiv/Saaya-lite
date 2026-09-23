import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AreaPolygon } from "../../../domain/engine/nearestStation";
import type { Places } from "../../../platform/walk/walkPlaces";
import { M4_COPY } from "../../copy/strings";
import { ImportSheet } from "./ImportSheet";

const COPY = M4_COPY.en;

const PLACES: Places = {
  attribution: "© OpenStreetMap contributors",
  categoryCounts: { bars: 0, cafes: 1, eat: 0, goOut: 0, hotels: 0, leisure: 0, shops: 0 },
  places: [
    {
      cat: "cafes",
      id: "node/1",
      lat: 17.7, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
      lon: 83.3, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
      name: "Probe Cafe",
      osm: "amenity=cafe",
    },
  ],
};

const AREAS: readonly AreaPolygon[] = [];

function render(places: Places | null = PLACES): string {
  return renderToStaticMarkup(
    <ImportSheet
      areas={AREAS}
      copy={COPY}
      currentPoint={null}
      locale="en"
      onDismiss={() => undefined}
      onPlaceSelected={() => undefined}
      places={places}
    />,
  );
}

describe("the import sheet", () => {
  it("states what the full product will do before it asks anything of her", () => {
    const html = render();
    expect(html).toContain(COPY.importTitle);
    expect(html).toContain(COPY.importCta);
    expect(html).toContain(COPY.cdCloseSheet);
    expect(html).toContain('data-tone="board"');
  });

  it("reads nothing she could paste, and puts nothing on the page before she asks", () => {
    // The work order's own rule: "nothing the user pastes is parsed (the import sheet is a
    // labelled demo)". The first step is words and one action - there is no field to paste
    // into, no card, and no demo chip until the press that reveals the examples, which is
    // the one step a static render cannot reach.
    const html = render();
    expect(html).not.toContain("<input");
    expect(html).not.toContain("textarea");
    expect(html).not.toContain('class="place-card"');
    expect(html).not.toContain(`>${COPY.demoChip}<`);
    expect(html).not.toContain(COPY.importDemoTitle);
  });

  it("promises exactly what the beta does, in the words on the sheet", () => {
    // The promise is the product here, so the copy itself is what is guarded: no upload, no
    // parser, and the step after this one labelled as Saaya's own data rather than hers.
    expect(COPY.importBody).toContain("nothing is uploaded, nothing is parsed");
    expect(COPY.importDemoBody).toContain(COPY.demoChip);
  });

  it("stands on the board's paper even with no bake to draw examples from", () => {
    const html = render(null);
    expect(html).toContain(COPY.importTitle);
    expect(html).toContain('class="import-detail"');
    expect(html).not.toContain('class="place-card"');
  });
});
