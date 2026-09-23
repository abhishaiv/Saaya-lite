/**
 * Where a name goes, once its anchor is on screen.
 *
 * The renderer reports a projection, which is a point. A name is a box: it has a width, it
 * has a height, and it is drawn centred on that point - so a name whose anchor lands near
 * the frame edge is drawn half outside it, and two names whose anchors land near each other
 * are drawn on top of each other. `MAP_SPEC.md` requires the risk reading to stay legible,
 * and two words printed over each other is not legible.
 *
 * This is deliberately not a general label engine. It is four rules, in order, and each one
 * exists because a capture measured it failing:
 *
 * 1. The box is centred on its anchor, which is what the view has always done.
 * 2. The box is pulled back inside the frame if centring would push it out.
 * 3. If the box lands on something already placed - or on the chrome - it steps clear: down
 *    the anchor's own column first (below, then above, then a step further each way, up to
 *    `STEP_LIMIT`), then the same ladder one box to the right, then one box to the left.
 * 4. If nothing fits, it takes the least covered candidate on the ladder - the one that
 *    touches what already stands the least, and the chrome only if the whole ladder touches
 *    it. A name slightly overlapping another is still worth more than no name, because the
 *    label is a tap target, not decoration.
 *
 * Amended 2026-09-23, on a capture of the walk view: rule 3's ladder was five candidates
 * (0, 1, -1, 2, -2) and the fallback then stacked names whose anchors sat on the same point
 * - "Bata", "Airtel" and "Pantaloons" were found printed in one box over one place, which is
 * the one reading rule 4 was never meant to excuse. The ladder runs to `STEP_LIMIT` now, so a
 * coincident cluster separates by a full pill-height at each step and reaches nine positions
 * before it gives up. The same day the signature took `reserved`: rectangles the caller has
 * already drawn over the frame - the search pill, the category bar, the nav - which no
 * candidate may land on, because a name under the chrome is not a name either.
 *
 * Amended again the same day, on a capture of the flat map: a block of twelve places anchored
 * inside one 27 x 30 px blob. Rows alone could not separate twelve - they share nearly one
 * column - so rule 3 searches two more columns, one box to either side, and rule 4 takes the
 * least covered candidate rather than always the clamped centre. The same capture is the
 * dense-block test in this module's test file.
 *
 * Everything is a function of the anchor, the box's own size and those reserved rectangles,
 * and the order is the order the caller passes, so the same frame always places the same
 * way. A placement that depended on anything else would make names swap places as she walks.
 */

export interface LabelBoxSize {
  readonly heightPx: number;
  readonly widthPx: number;
}

export interface LabelAnchor {
  readonly xPx: number;
  readonly yPx: number;
}

export interface LabelPlacement {
  readonly xPx: number;
  readonly yPx: number;
}

export interface LabelBounds {
  readonly heightPx: number;
  readonly insetPx: number;
  readonly widthPx: number;
}

/** A box in the frame's own pixels: what the caller has already drawn, and what a box covers. */
export interface LabelRect {
  readonly bottomPx: number;
  readonly leftPx: number;
  readonly rightPx: number;
  readonly topPx: number;
}

/**
 * How far the search may run, in strides of one box plus the gap: nine rows, so a cluster
 * of nine names on one point still separates. Past that the frame is dense enough that
 * every placement is a compromise, and rule 4 takes over rather than flinging a name
 * across the map.
 */
const STEP_LIMIT = 4; // GROUNDED-EXEMPT: a search bound, not a product value.

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return (
    a.leftPx < b.rightPx &&
    b.leftPx < a.rightPx &&
    a.topPx < b.bottomPx &&
    b.topPx < a.bottomPx
  );
}

/** The box a centre and a size make, which is what both the clamp and the overlap test read. */
function rectAt(centre: LabelPlacement, size: LabelBoxSize): LabelRect {
  const halfWidth = size.widthPx / 2;
  const halfHeight = size.heightPx / 2;
  return {
    leftPx: centre.xPx - halfWidth,
    rightPx: centre.xPx + halfWidth,
    topPx: centre.yPx - halfHeight,
    bottomPx: centre.yPx + halfHeight,
  };
}

/** 0, 1, -1, 2, -2, ... in the order one thing should move to clear another. */
function stepOffsets(): readonly number[] {
  const steps: number[] = [0];
  for (let step = 1; step <= STEP_LIMIT; step += 1) steps.push(step, -step);
  return steps;
}

/**
 * The columns the search may use: the anchor's own, then one box to the right, then one to
 * the left. The rows alone cannot separate a block of twelve places - they share nearly one
 * x, so every row is taken by a neighbour - and a whole box sideways is the smallest move
 * that opens a second column.
 */
function columnOffsets(size: LabelBoxSize, gapPx: number): readonly number[] {
  const stride = size.widthPx + gapPx;
  return [0, stride, -stride];
}

/** How much of a box is covered by the boxes already standing: the least-bad fallback's score. */
function coveredArea(rect: LabelRect, others: readonly LabelRect[]): number {
  let covered = 0;
  for (const other of others) {
    const width = Math.min(rect.rightPx, other.rightPx) - Math.max(rect.leftPx, other.leftPx);
    const height = Math.min(rect.bottomPx, other.bottomPx) - Math.max(rect.topPx, other.topPx);
    if (width > 0 && height > 0) covered += width * height;
  }
  return covered;
}

/**
 * The furthest the centre may sit and still leave the whole box inside the frame.
 *
 * When the box is wider than the space between the insets there is no such centre; the
 * clamp collapses to the middle of the gap rather than inverting, so an over-wide name is
 * still centred rather than flung to one edge.
 */
function clamp(centre: LabelPlacement, size: LabelBoxSize, bounds: LabelBounds): LabelPlacement {
  const halfWidth = size.widthPx / 2;
  const halfHeight = size.heightPx / 2;
  const minX = bounds.insetPx + halfWidth;
  const maxX = bounds.widthPx - bounds.insetPx - halfWidth;
  const minY = bounds.insetPx + halfHeight;
  const maxY = bounds.heightPx - bounds.insetPx - halfHeight;
  return {
    xPx: minX > maxX ? bounds.widthPx / 2 : Math.min(Math.max(centre.xPx, minX), maxX),
    yPx: minY > maxY ? bounds.heightPx / 2 : Math.min(Math.max(centre.yPx, minY), maxY),
  };
}

export function placeLabels(
  anchors: readonly LabelAnchor[],
  sizes: readonly LabelBoxSize[],
  bounds: LabelBounds,
  gapPx: number,
  reserved: readonly LabelRect[] = [],
): readonly LabelPlacement[] {
  const placed: LabelRect[] = [];
  const out: LabelPlacement[] = [];

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const size = sizes[index];
    if (anchor === undefined || size === undefined) continue;

    const resting = clamp(anchor, size, bounds);
    // Below first, then above, then a step further each way: a name that has to move should
    // stay as close to the thing it names as it can.
    let chosen: LabelPlacement | null = null;
    // The runners-up while the ladder runs, each scored by how much of the box is covered.
    // `clearOfChrome` is the one that matters - a name under the chrome is not a name, so a
    // spot on the chrome is only ever taken when the whole ladder is on it. Amended
    // 2026-09-23 after a capture found a block of twelve places whose anchors sat inside one
    // 27 x 30 px blob: every candidate for the last of them was blocked, and rule 4's
    // resting spot was the worst of the nine, printing it under three other names. Rule 4
    // keeps its meaning - a slightly covered name beats no name - and the spot it takes is
    // now the least covered one on the ladder.
    let clearOfChrome: { candidate: LabelPlacement; covered: number } | null = null;
    let anywhere: { candidate: LabelPlacement; covered: number } | null = null;
    search: for (const dx of columnOffsets(size, gapPx)) {
      for (const step of stepOffsets()) {
        const candidate = clamp(
          { xPx: anchor.xPx + dx, yPx: anchor.yPx + step * (size.heightPx + gapPx) },
          size,
          bounds,
        );
        const rect = rectAt(candidate, size);
        const labelCovered = coveredArea(rect, placed);
        const chromeCovered = coveredArea(rect, reserved);
        if (labelCovered === 0 && chromeCovered === 0) {
          chosen = candidate;
          break search;
        }
        if (chromeCovered === 0 && (clearOfChrome === null || labelCovered < clearOfChrome.covered)) {
          clearOfChrome = { candidate, covered: labelCovered };
        }
        const total = labelCovered + chromeCovered;
        if (anywhere === null || total < anywhere.covered) {
          anywhere = { candidate, covered: total };
        }
      }
    }

    const final =
      chosen ?? clearOfChrome?.candidate ?? anywhere?.candidate ?? resting;
    placed.push(rectAt(final, size));
    out.push(final);
  }

  return out;
}
