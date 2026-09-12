import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bundledZoneRepository } from "../../../data/repository/zoneRepository";
import {
  CHARACTER_AXES,
  DEFAULT_CHARACTER,
  type CharacterSelection,
} from "../../../platform/walk/characterParts";
import { M4_COPY } from "../../copy/strings";
import { CharacterCustomiser } from "./CharacterCustomiser";
import { WalkView } from "./WalkView";

const snapshot = bundledZoneRepository.snapshot();

/**
 * `renderToStaticMarkup` escapes what it writes, so `walk_risk_note`'s apostrophe comes
 * back as `&#x27;` and a plain `toContain` on the copy row would fail on punctuation
 * rather than on wording. Decoding first means these assertions are about the sentence she
 * reads. `&amp;` is decoded last so an escaped ampersand is not decoded twice.
 */
function decode(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function renderWalk(
  copy: (typeof M4_COPY)["en"],
  overrides: Partial<Parameters<typeof WalkView>[0]> = {},
): string {
  return decode(
    renderToStaticMarkup(
      <WalkView
        character={DEFAULT_CHARACTER}
        copy={copy}
        hourBand="DAY"
        location={null}
        locationStatus="SEARCHING"
        mapZones={snapshot.mapZones}
        onEditCharacter={() => undefined}
        onZoneSelected={() => undefined}
        selectedZoneId={null}
        sessionState="IDLE"
        {...overrides}
      />,
    ),
  );
}

function renderCustomiser(
  copy: (typeof M4_COPY)["en"],
  firstRun: boolean,
  initial: CharacterSelection = DEFAULT_CHARACTER,
): string {
  return decode(
    renderToStaticMarkup(
      <CharacterCustomiser
        copy={copy}
        firstRun={firstRun}
        initial={initial}
        onCancel={() => undefined}
        onSave={() => undefined}
      />,
    ),
  );
}

/** One part is chosen per axis, and the chosen chip is the axis's own current value. */
function pressedLabels(html: string): readonly string[] {
  return [...html.matchAll(/aria-pressed="true"[^>]*>([^<]*)</g)].map(
    (match) => match[1]?.trim() ?? "",
  );
}

describe("M4 walk view", () => {
  it("renders a canvas and the reading she needs before any world arrives", () => {
    const copy = M4_COPY.en;
    const html = renderWalk(copy);
    expect(html).toContain("<canvas");
    // Decorative: the risk information is in the legend and the labels, not the picture.
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(copy.walkLegendTitle);
    expect(html).toContain(copy.walkLegendLow);
    expect(html).toContain(copy.walkLegendHigh);
    expect(html).toContain(copy.walkRiskNote);
    expect(html).toContain(copy.walkEditCharacter);
  });

  it("says the streets are still coming, and only that, until the world resolves", () => {
    const copy = M4_COPY.en;
    const html = renderWalk(copy);
    expect(html).toContain(copy.walkLoading);
    expect(html).not.toContain(copy.walkOffline);
    expect(html).not.toContain(copy.walkLocDenied);
  });

  it("asks for her location rather than drawing a world without her in it", () => {
    const copy = M4_COPY.en;
    for (const status of ["PERMISSION_DENIED", "POSITION_UNAVAILABLE"] as const) {
      expect(renderWalk(copy, { locationStatus: status })).toContain(
        copy.walkLocDenied,
      );
    }
    // A fix that is merely slow is not a refusal.
    for (const status of ["SEARCHING", "SLOW", "CURRENT"] as const) {
      expect(renderWalk(copy, { locationStatus: status })).not.toContain(
        copy.walkLocDenied,
      );
    }
  });

  it("draws no area name as a label until the frame loop reports one", () => {
    // Labels are written from the render loop, which does not run outside a browser. The
    // zones are all still there to be labelled; none of them is named yet.
    const html = renderWalk(M4_COPY.en);
    for (const zone of snapshot.mapZones) {
      expect(html).not.toContain(`>${zone.areaName}<`);
    }
  });

  it("carries the legend and the reading in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const copy = M4_COPY[locale];
      const html = renderWalk(copy);
      expect(html).toContain(copy.walkLegendTitle);
      expect(html).toContain(copy.walkRiskNote);
      expect(html).toContain(copy.walkEditCharacter);
    }
  });
});

describe("M4 character customiser", () => {
  it("is a modal dialog offering every shipped axis", () => {
    for (const locale of ["en", "te"] as const) {
      const html = renderCustomiser(M4_COPY[locale], false);
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      for (const axis of CHARACTER_AXES) {
        expect(html).toContain(`id="cust-axis-${axis.id}"`);
      }
    }
  });

  it("names each axis in the language it is being read in", () => {
    const english = [
      M4_COPY.en.custAxisBody,
      M4_COPY.en.custAxisBrows,
      M4_COPY.en.custAxisHair,
      M4_COPY.en.custAxisEyes,
      M4_COPY.en.custAxisTop,
      M4_COPY.en.custAxisBottom,
      M4_COPY.en.custAxisAccessories,
    ];
    const telugu = [
      M4_COPY.te.custAxisBody,
      M4_COPY.te.custAxisBrows,
      M4_COPY.te.custAxisHair,
      M4_COPY.te.custAxisEyes,
      M4_COPY.te.custAxisTop,
      M4_COPY.te.custAxisBottom,
      M4_COPY.te.custAxisAccessories,
    ];
    // The axis list is driven off CHARACTER_AXES, so the count is the contract.
    expect(english).toHaveLength(CHARACTER_AXES.length);
    const en = renderCustomiser(M4_COPY.en, false);
    for (const label of english) expect(en).toContain(label);
    const te = renderCustomiser(M4_COPY.te, false);
    for (const label of telugu) expect(te).toContain(label);
    // A Telugu screen that falls back to the English axis name is a failed screen.
    for (const label of english) {
      expect(te).not.toContain(`>${label}<`);
    }
  });

  it("leaves the part names in English until they have copy of their own", () => {
    // **This asserts a known gap, so that fixing it breaks the test.** COPY.md has a row
    // per axis and none per part, so `hair_buns` is shown as "Buns" in both languages.
    // When the 16 per-part copy rows exist, this test is the thing that fails first.
    const te = renderCustomiser(M4_COPY.te, false);
    expect(te).toContain(">Buns<");
    expect(te).toContain(">Hoodie<");
  });

  it("offers every part of every axis, and has exactly one chosen per axis", () => {
    const html = renderCustomiser(M4_COPY.en, false);
    const optionCount = CHARACTER_AXES.reduce(
      (total, axis) => total + axis.options.length,
      0,
    );
    expect(html.match(/aria-pressed=/g)).toHaveLength(optionCount);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(CHARACTER_AXES.length);
  });

  it("marks the part she already has, not the default", () => {
    const chosen: CharacterSelection = {
      ...DEFAULT_CHARACTER,
      eyes: "eyes_wide",
      hair: "hair_buns",
    };
    const html = renderCustomiser(M4_COPY.en, false, chosen);
    const pressed = pressedLabels(html);
    expect(pressed).toHaveLength(CHARACTER_AXES.length);
    expect(pressed).toContain("Buns");
    expect(pressed).toContain("Wide");
    // And the ones she did not choose are not marked.
    expect(pressed).not.toContain("Almond");
  });

  it("asks on the first switch and offers the default as the way past it", () => {
    const copy = M4_COPY.en;
    const html = renderCustomiser(copy, true);
    expect(html).toContain(copy.walkFirstTitle);
    expect(html).toContain(copy.walkFirstBody);
    expect(html).toContain(copy.walkFirstCta);
    expect(html).toContain(copy.walkFirstSkip);
    expect(html).toContain(copy.custStaysLocal);
    // Onboarding has two ways out; the editing actions belong to the return visit.
    expect(html).not.toContain(copy.custSave);
    expect(html).not.toContain(copy.custCancel);
    expect(html).not.toContain(copy.custReset);
  });

  it("offers edit, cancel and start-again once a character exists", () => {
    const copy = M4_COPY.en;
    const html = renderCustomiser(copy, false);
    expect(html).toContain(copy.custTitle);
    expect(html).toContain(copy.custSave);
    expect(html).toContain(copy.custCancel);
    expect(html).toContain(copy.custReset);
    expect(html).toContain(copy.custStaysLocal);
    expect(html).not.toContain(copy.walkFirstTitle);
    expect(html).not.toContain(copy.walkFirstBody);
  });
});
