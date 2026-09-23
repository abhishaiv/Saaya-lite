import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SurfacePanel } from "./SurfacePanel";

describe("the surface panel", () => {
  it("is the board's paper with the interface's ink, and it carries the board's fact", () => {
    const html = renderToStaticMarkup(
      <SurfacePanel heading="Feed">body</SurfacePanel>,
    );

    expect(html).toContain('aria-label="Feed"');
    expect(html).toContain("color-mix(");
    expect(html).toContain("fact: alpha.board.paper");
    // The ink on the paper is the interface's dark, not the card's white: the white cards
    // stand on this surface, so the two can never be the same colour.
    expect(html).toContain("color: var(--color-background)");
  });

  it("keeps no z-index of its own, so a sheet opened from it stands over it", () => {
    // The layering rule the surfaces depend on: a surface carries no z-index of its own. A
    // surface is the last ordinary overlay in tree order - after the map, before every sheet
    // - and the nav (3), the view's two controls (4) and the SOS/SUS rail (6) keep their own
    // rungs above it, while every sheet carries a rung of its own above all of them.
    const html = renderToStaticMarkup(
      <SurfacePanel heading="Feed">body</SurfacePanel>,
    );
    // The declaration, not the word: the rule's own comment says why it is absent.
    expect(html).not.toMatch(/z-index\s*:/);
  });

  it("draws the row under the heading only when it is given one", () => {
    const withControls = renderToStaticMarkup(
      <SurfacePanel controls={<button type="button">Near you</button>} heading="Feed">
        body
      </SurfacePanel>,
    );
    expect(withControls).toContain('class="surface-panel__controls"');
    expect(withControls).toContain("Near you");

    const without = renderToStaticMarkup(
      <SurfacePanel heading="You">body</SurfacePanel>,
    );
    expect(without).not.toContain('class="surface-panel__controls"');
  });
});
