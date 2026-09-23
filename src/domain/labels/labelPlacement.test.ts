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

  it("separates the whole ladder's worth of names on one anchor, nine of them", () => {
    // Amended 2026-09-23: a capture of the walk view found "Bata", "Airtel" and
    // "Pantaloons" printed in one box over one place, along with everything else that
    // anchored near it. The ladder runs to STEP_LIMIT now, so the full ladder - nine
    // candidates - has to separate nine names on one point.
    const count = 9;
    const anchors = Array.from({ length: count }, () => MIDDLE);
    const sizes = Array.from({ length: count }, () => OLD_TOWN);
    const placed = placeLabels(anchors, sizes, BOUNDS, GAP_PX);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(
          overlaps(rect(centreOf(placed, i), OLD_TOWN), rect(centreOf(placed, j), OLD_TOWN)),
        ).toBe(false);
      }
    }
  });

  it("spreads a dense block's names over the least covered spots, never burying one", () => {
    // The capture of 2026-09-23, flat map, idle: twelve places on one block of Old Town
    // whose anchors all sat inside a 27 x 30 px blob. The ladder cannot separate twelve by
    // vertical steps alone, so rule 4 decides the last of them - and it used to decide the
    // resting spot, which covered a pill by 64 x 21 of another. The least covered candidate
    // is what it takes now, so no name is left more than a sliver under another.
    const anchors = [
      { xPx: 197, yPx: 417 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 194, yPx: 416 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 192, yPx: 429 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 201, yPx: 414 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 190, yPx: 413 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 203, yPx: 431 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 206, yPx: 426 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 206, yPx: 427 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 197, yPx: 436 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 184, yPx: 412 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 211, yPx: 427 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
      { xPx: 195, yPx: 406 }, // GROUNDED-EXEMPT: probe anchor, measured off the flat capture.
    ];
    const sizes = [
      { widthPx: 64, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 64, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 68, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 82, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 64, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 55, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 140, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 82, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 113, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 99, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 73, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
      { widthPx: 64, heightPx: 26 }, // GROUNDED-EXEMPT: probe pill box, measured off the flat capture.
    ];
    const placed = placeLabels(anchors, sizes, BOUNDS, GAP_PX);
    // No two names in one box, which is the reading the capture found: "Bata", "Airtel" and
    // "Pantaloons" printed over one place.
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(centreOf(placed, i)).not.toEqual(centreOf(placed, j));
      }
    }
    // And what the tail of the ladder does take is a sliver: with the sideways columns and
    // the least covered fallback the worst box in this block is a tenth of itself under a
    // neighbour, where the resting-spot fallback covered one by 64 x 21 of a 64 x 26 pill.
    for (let i = 0; i < placed.length; i += 1) {
      const box = rect(centreOf(placed, i), sizes[i] as { widthPx: number; heightPx: number });
      let worst = 0;
      for (let j = 0; j < placed.length; j += 1) {
        if (i === j) continue;
        const other = rect(centreOf(placed, j), sizes[j] as { widthPx: number; heightPx: number });
        const width = Math.min(box.right, other.right) - Math.max(box.left, other.left);
        const height = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
        if (width > 0 && height > 0) {
          worst = Math.max(worst, (width * height) / (box.right - box.left) / (box.bottom - box.top));
        }
      }
      expect(worst).toBeLessThanOrEqual(1 / 10);
    }
  });

  it("keeps a name out of the chrome the caller has already drawn over the frame", () => {
    // A band the caller reserved, wide enough that there is no way round it: a name under
    // the category bar is not a name. The anchor sits in the band, so its box has to move.
    const band = { topPx: 760, bottomPx: 812, leftPx: 20, rightPx: 370 }; // GROUNDED-EXEMPT: probe chrome band, a capture's own numbers.
    const bandRect = { left: band.leftPx, right: band.rightPx, top: band.topPx, bottom: band.bottomPx };
    const anchor = { xPx: 195, yPx: 786 }; // GROUNDED-EXEMPT: probe anchor, inside the probe band.
    const placed = placeLabels([anchor], [OLD_TOWN], BOUNDS, GAP_PX, [band]);
    const box = rect(centreOf(placed, 0), OLD_TOWN);
    expect(overlaps(box, bandRect)).toBe(false);
    expect(centreOf(placed, 0)).not.toEqual(anchor);
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
