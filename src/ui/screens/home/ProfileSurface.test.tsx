import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PlaceRowFacts } from "../../../platform/walk/placeBrowse";
import type { Place } from "../../../platform/walk/walkPlaces";
import {
  MAX_TOP_SPOTS,
  weeksUsing,
  type PersonalState,
} from "../../../data/repository/personalRepository";
import { formatCopy, M4_COPY } from "../../copy/strings";
import { MATERIAL_SYMBOL_GLYPHS } from "../../icons/MaterialSymbol";
import { ProfileSurface } from "./ProfileSurface";

const COPY = M4_COPY.en;

const NOW_EPOCH_MS = 1_756_000_000_000; // GROUNDED-EXEMPT: a probe clock reading, not a product value.
const FIRST_USED_EPOCH_MS = NOW_EPOCH_MS - 14 * 24 * 60 * 60 * 1000; // GROUNDED-EXEMPT: a probe stamp, two weeks back.

function place(id: string, name: string): Place {
  return {
    cat: "cafes",
    id,
    lat: 17.7, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    lon: 83.3, // GROUNDED-EXEMPT: a probe coordinate, not a product value.
    name,
    osm: "amenity=cafe",
  };
}

const STAR_SPOT = place("node/1", "Top Cafe");
const SAVED_PLACE = place("node/2", "Saved Cafe");

function row(target: Place): { facts: PlaceRowFacts } {
  return {
    facts: { categoryLabel: COPY.catCafes, place: target, title: target.name ?? "" },
  };
}

const PERSONAL: PersonalState = {
  checkInsAccepted: 4,
  firstUsedAtEpochMs: FIRST_USED_EPOCH_MS,
  picks: [],
  savedPlaces: [
    { placeId: SAVED_PLACE.id, savedAtEpochMs: NOW_EPOCH_MS },
    { placeId: STAR_SPOT.id, savedAtEpochMs: NOW_EPOCH_MS },
  ],
  topSpots: [STAR_SPOT.id],
};

function render(
  options: Readonly<{
    favouriteName?: string | null;
    name?: string | null;
    personal?: PersonalState;
    savedRows?: readonly { facts: PlaceRowFacts }[];
    topSpotRows?: readonly { facts: PlaceRowFacts }[];
  }> = {},
): string {
  return renderToStaticMarkup(
    <ProfileSurface
      copy={COPY}
      favouriteName={options.favouriteName === undefined ? "Top Cafe" : options.favouriteName}
      name={options.name === undefined ? "Probe Name" : options.name}
      nowEpochMs={NOW_EPOCH_MS}
      onImportOpen={() => undefined}
      onPlaceSelected={() => undefined}
      onRemoveSaved={() => undefined}
      onSettingsOpen={() => undefined}
      onToggleTopSpot={() => undefined}
      personal={options.personal ?? PERSONAL}
      savedRows={options.savedRows ?? [row(SAVED_PLACE), row(STAR_SPOT)]}
      topSpotRows={options.topSpotRows ?? [row(STAR_SPOT)]}
    />,
  );
}

describe("her page", () => {
  it("says who she set up, and never invents a name or a favourite she has not given", () => {
    const named = render();
    expect(named).toContain("Probe Name");
    expect(named).toContain("Top Cafe");
    expect(named).not.toContain(COPY.profileNameUnset);
    expect(named).not.toContain(COPY.profileFavouriteUnset);

    const unset = render({ favouriteName: null, name: null });
    expect(unset).toContain(COPY.profileNameUnset);
    expect(unset).toContain(COPY.profileFavouriteUnset);
  });

  it("counts only what the app can stand behind", () => {
    // The weeks come from the stamp written the first time she opened Saaya, the count is
    // what she saved, and the check-in count is one per accepted check-in. No streak, no
    // score, no engagement number.
    // The probe stamp is behind her, so the reading is a count: the type's own null case is
    // the unstamped render below, where the surface draws no weeks line at all.
    const weeks = weeksUsing(FIRST_USED_EPOCH_MS, NOW_EPOCH_MS) ?? 0;
    const html = render();
    expect(html).toContain(formatCopy(COPY.profileWeeks, weeks));
    expect(html).toContain(formatCopy(COPY.profileSavedCount, PERSONAL.savedPlaces.length));
    expect(html).toContain(formatCopy(COPY.profileCheckIns, PERSONAL.checkInsAccepted));

    // Without the first-use stamp there is no weeks line at all, rather than a guessed one.
    const unstamped = render({
      personal: { ...PERSONAL, firstUsedAtEpochMs: null },
    });
    expect(unstamped).not.toContain(formatCopy(COPY.profileWeeks, 0));
  });

  it("says the count in the singular at one, so her page never reads back at her", () => {
    // The first week of use is exactly when she opens this page, so "1 weeks with Saaya"
    // is not a rare render: at one week and at one saved place the line takes its own words.
    // The week of first use is week one, so the probe sits inside that first week.
    const threeDaysAgo = NOW_EPOCH_MS - 3 * 24 * 60 * 60 * 1000; // GROUNDED-EXEMPT: a probe stamp, inside the first week.
    const html = render({
      personal: {
        ...PERSONAL,
        firstUsedAtEpochMs: threeDaysAgo,
        savedPlaces: [{ placeId: SAVED_PLACE.id, savedAtEpochMs: NOW_EPOCH_MS }],
      },
      savedRows: [row(SAVED_PLACE)],
    });
    expect(weeksUsing(threeDaysAgo, NOW_EPOCH_MS)).toBe(1);
    expect(html).toContain(formatCopy(COPY.profileWeeksOne, 1));
    expect(html).toContain(formatCopy(COPY.profileSavedCountOne, 1));
  });

  it("keeps her top spots first, and says the ceiling when the list is empty", () => {    const html = render();
    expect(html).toContain(COPY.profileTopSpotsTitle);
    expect(html).toContain("Top Cafe");
    expect(html).not.toContain(COPY.profileTopSpotsEmpty);

    const empty = render({ topSpotRows: [] });
    expect(empty).toContain(formatCopy(COPY.profileTopSpotsEmpty, MAX_TOP_SPOTS));
  });

  it("carries the star and the remove on a place, each named for its own place", () => {
    const html = render();
    expect(html).toContain(formatCopy(COPY.cdProfileUnstar, STAR_SPOT.name ?? ""));
    expect(html).toContain(formatCopy(COPY.cdProfileRemove, STAR_SPOT.name ?? ""));
    // A place she has not starred offers the star, not the unstar.
    expect(html).toContain(formatCopy(COPY.cdProfileStar, SAVED_PLACE.name ?? ""));
    // The glyphs say the same thing the aria names do: filled for a top spot, hollow for one.
    expect(html).toContain("★");
    expect(html).toContain("☆");
  });

  it("states the saved list under its own heading, and its empty words when nothing is saved", () => {
    const html = render();
    expect(html).toContain(COPY.profileSavedTitle);
    expect(html).toContain("Saved Cafe");

    const empty = render({ savedRows: [] });
    expect(empty).toContain(COPY.profileSavedEmpty);
  });

  it("holds the way into the import sheet", () => {
    const html = render();
    expect(html).toContain(COPY.profileImport);
    expect(html).toContain(COPY.importCta);
  });

  it("holds the way into settings, where the gear went when it left the map", () => {
    // Founder ruling, 2026-09-23, choosing between five rendered directions: "A - Light and
    // quiet" keeps the map to the search pill and the view's own two controls, and "the doc"
    // - settings and about - moves to the dock's Profile page.
    const html = render();
    expect(html).toContain(COPY.cdSettings);
    // The glyph itself, read from the pinned subset rather than written out: the mark on
    // the row is the one the map used to carry.
    expect(html).toContain(MATERIAL_SYMBOL_GLYPHS.settings);
  });
});
