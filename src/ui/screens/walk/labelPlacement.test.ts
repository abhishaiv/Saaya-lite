import { describe, expect, it } from "vitest";

import { type LabelBounds, placeLabels } from "./labelPlacement";

/**
 * Probes: the frame and the two label boxes `layout.mjs` measured on the real screen.
 *
 * These are the capture's own numbers rather than product facts. The product reads its frame
 * from the canvas and each box from the DOM, and never restates either; these exist so that
 * the assertions below are assertions about the frame the captures are taken in.
 */
const FRAME_W_PX = 390; // GROUNDED-EXEMPT: probe viewport width, the harness's own frame.
const FRAME_H_PX = 844; // GROUNDED-EXEMPT: probe viewport height, the harness's own frame.
const INSET_PX = 20; // GROUNDED-EXEMPT: probe frame inset; the real one is --screen-padding.
const GAP_PX = 4; // GROUNDED-EXEMPT: probe label gap; the real one is --space-4.

const BOUNDS: LabelBounds = {
  widthPx: FRAME_W_PX,
  heightPx: FRAME_H_PX,
  insetPx: INSET_PX,
};

const OLD_TOWN = { widthPx: 77.1, heightPx: 26 }; // GROUNDED-EXEMPT: probe box, measured off the capture.
const SOLDIERPET = { widthPx: 83.5, heightPx: 26 }; // GROUNDED-EXEMPT: probe box, measured off the capture.

/** The anchors the capture measured these two names projecting to, 43 px apart. */
const OLD_TOWN_AT = { xPx: 312, yPx: 153 }; // GROUNDED-EXEMPT: probe anchor, measured off the capture.
const SOLDIERPET_AT = { xPx: 359, yPx: 154 }; // GROUNDED-EXEMPT: probe anchor, measured off the capture.

/** A comfortable spot in the middle of the frame, for tests that are not about the edges. */
const MIDDLE = { xPx: 195, yPx: 400 }; // GROUNDED-EXEMPT: probe anchor, the middle of the probe frame.

function rect(centre: { xPx: number; yPx: number }, size: { widthPx: number; heightPx: number }) {
  return {
    left: centre.xPx - size.widthPx / 2,
    right: centre.xPx + size.widthPx / 2,
    top: centre.yPx - size.heightPx / 2,
    bottom: centre.yPx + size.heightPx / 2,
  };
}

type Rect = ReturnType<typeof rect>;

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function centreOf(placed: readonly { xPx: number; yPx: number }[], index: number) {
  const spot = placed[index];
  if (spot === undefined) throw new Error(`no placement at ${index}`);
  return spot;
}

describe("placeLabels", () => {
  it("leaves a label that already fits exactly where its anchor is", () => {
    expect(placeLabels([MIDDLE], [OLD_TOWN], BOUNDS, GAP_PX)).toEqual([MIDDLE]);
  });

  it("pulls a label back inside the frame instead of letting the edge cut it", () => {
    // The capture measured Soldierpet at right edge 400.7 in a 390 px frame - 10.7 px of the
    // word off screen. Its anchor is what lands at the edge; the box must not follow it out.
    const box = rect(centreOf(placeLabels([SOLDIERPET_AT], [SOLDIERPET], BOUNDS, GAP_PX), 0), SOLDIERPET);
    expect(box.right).toBeLessThanOrEqual(FRAME_W_PX - INSET_PX);
    expect(box.left).toBeGreaterThanOrEqual(INSET_PX);
  });

  it("keeps a label's whole box inside all four edges", () => {
    const corners = [
      { xPx: -50, yPx: -50 },
      { xPx: 500, yPx: -50 },
      { xPx: -50, yPx: 900 },
      { xPx: 500, yPx: 900 },
    ].map((c) => c as { xPx: number; yPx: number }); // GROUNDED-EXEMPT: probe anchors placed off frame on purpose.
    const placed = placeLabels(corners, [OLD_TOWN, OLD_TOWN, OLD_TOWN, OLD_TOWN], BOUNDS, GAP_PX);
    for (const centre of placed) {
      const box = rect(centre, OLD_TOWN);
      expect(box.left).toBeGreaterThanOrEqual(INSET_PX);
      expect(box.right).toBeLessThanOrEqual(FRAME_W_PX - INSET_PX);
      expect(box.top).toBeGreaterThanOrEqual(INSET_PX);
      expect(box.bottom).toBeLessThanOrEqual(FRAME_H_PX - INSET_PX);
    }
  });

  it("steps a label clear of one already placed rather than printing over it", () => {
    // The capture measured Old Town and Soldierpet overlapping by 33.9 x 24.7 px because
    // their anchors projected 43 px apart. The second name is the one that moves.
    const placed = placeLabels([OLD_TOWN_AT, SOLDIERPET_AT], [OLD_TOWN, SOLDIERPET], BOUNDS, GAP_PX);
    expect(overlaps(rect(centreOf(placed, 0), OLD_TOWN), rect(centreOf(placed, 1), SOLDIERPET))).toBe(
      false,
    );
    // The first name keeps its anchor; nothing moved out from under it.
    expect(centreOf(placed, 0)).toEqual(OLD_TOWN_AT);
  });

  it("steps below before it steps above, so a moved name stays nearest its own anchor", () => {
    const placed = placeLabels([MIDDLE, MIDDLE], [OLD_TOWN, SOLDIERPET], BOUNDS, GAP_PX);
    const second = centreOf(placed, 1);
    expect(second.yPx).toBeGreaterThan(MIDDLE.yPx);
    expect(second.xPx).toBe(MIDDLE.xPx);
  });

  it("places a crowd of names at one anchor without any of them overlapping", () => {
    const anchors = Array.from({ length: 5 }, () => MIDDLE);
    const sizes = Array.from({ length: 5 }, () => OLD_TOWN);
    const placed = placeLabels(anchors, sizes, BOUNDS, GAP_PX);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(overlaps(rect(centreOf(placed, i), OLD_TOWN), rect(centreOf(placed, j), OLD_TOWN))).toBe(
          false,
        );
      }
    }
  });

  it("gives the same answer for the same frame, so names never swap places as she walks", () => {
    const anchors = [OLD_TOWN_AT, SOLDIERPET_AT, MIDDLE];
    const sizes = [OLD_TOWN, SOLDIERPET, OLD_TOWN];
    expect(placeLabels(anchors, sizes, BOUNDS, GAP_PX)).toEqual(
      placeLabels(anchors, sizes, BOUNDS, GAP_PX),
    );
  });

  it("centres a label too wide for the frame rather than flinging it to one edge", () => {
    const tooWide = { widthPx: FRAME_W_PX + 10, heightPx: 26 };
    const placed = placeLabels([MIDDLE], [tooWide], BOUNDS, GAP_PX);
    expect(centreOf(placed, 0).xPx).toBe(FRAME_W_PX / 2);
  });

  it("returns nothing for nothing, so an empty frame costs nothing", () => {
    expect(placeLabels([], [], BOUNDS, GAP_PX)).toEqual([]);
  });

  it("skips a label whose anchor arrived without a size rather than placing it blind", () => {
    const placed = placeLabels([MIDDLE, OLD_TOWN_AT], [OLD_TOWN], BOUNDS, GAP_PX);
    expect(placed).toHaveLength(1);
  });
});
