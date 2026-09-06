import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SessionState } from "../../../domain/model/session";
import { M4_COPY, type SaayaLocale } from "../../copy/strings";
import { DemoPanel } from "./DemoPanel";

/** renderToStaticMarkup escapes the same five characters in text and attributes. */
function markupText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function render(locale: SaayaLocale, sessionState: SessionState) {
  return renderToStaticMarkup(
    <DemoPanel
      copy={M4_COPY[locale]}
      onClose={() => undefined}
      onReset={() => undefined}
      onStartDemo={() => undefined}
      sessionState={sessionState}
    />,
  );
}

function buttonTag(html: string, ariaLabel: string): string {
  const tag = html.match(
    new RegExp(`<button[^>]*aria-label="${markupText(ariaLabel)}"[^>]*>`),
  )?.[0];
  expect(tag).toBeDefined();
  return tag ?? "";
}

describe("M4 bilingual demo panel", () => {
  it("presents the Start Demo disclosure and timing note in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, "IDLE");

      expect(html).toContain(M4_COPY[locale].demoPanelHeader);
      expect(html).toContain(markupText(M4_COPY[locale].demoStartDisclosure));
      expect(html).toContain(M4_COPY[locale].demoTimingNote);
      expect(html).toContain(M4_COPY[locale].ctaStartDemo);
      expect(html).toContain(M4_COPY[locale].demoReset);
    }
  });

  it("offers only Start Demo and Reset: no zones, speed toggle or jump buttons", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, "IDLE");

      expect(html).not.toContain("<select");
      expect(html).not.toContain("<option");
      expect(html).not.toContain('role="switch"');
      expect(html).not.toContain(M4_COPY[locale].demoPickZoneHint);
      expect(html).not.toContain(M4_COPY[locale].demoMissCheckin);
      expect(html).not.toContain(M4_COPY[locale].demoJumpFamily);
      expect(html).not.toContain(M4_COPY[locale].demoTriggerSos);
    }
  });

  it("enables Start Demo only from the quiet IDLE or RESOLVED screen", () => {
    for (const state of ["IDLE", "RESOLVED"] as const) {
      const start = buttonTag(render("en", state), M4_COPY.en.ctaStartDemo);
      expect(start).not.toContain("disabled");
    }

    for (const state of ["SHADOW", "CHECKIN_1", "SOS_ACTIVE"] as const) {
      const start = buttonTag(render("en", state), M4_COPY.en.ctaStartDemo);
      expect(start).toContain("disabled");
    }
  });

  it("explains why Start Demo is blocked while a session is live in both languages", () => {
    for (const locale of ["en", "te"] as const) {
      const html = render(locale, "CHECKIN_1");

      expect(html).toContain(M4_COPY[locale].demoSessionLiveReason);
      expect(html).toContain('role="status"');
      expect(html).not.toContain(M4_COPY[locale].demoResetBlockedSos);
    }
  });

  it("disables Reset during SOS and states the PIN-only exit instead", () => {
    const blocked = buttonTag(render("en", "SOS_ACTIVE"), M4_COPY.en.cdDemoReset);
    expect(blocked).toContain("disabled");
    expect(render("en", "SOS_ACTIVE")).toContain(M4_COPY.en.demoResetBlockedSos);

    for (const state of ["IDLE", "SHADOW", "CHECKIN_1"] as const) {
      const reset = buttonTag(render("en", state), M4_COPY.en.cdDemoReset);
      expect(reset).not.toContain("disabled");
      expect(render("en", state)).not.toContain(M4_COPY.en.demoResetBlockedSos);
    }
  });
});