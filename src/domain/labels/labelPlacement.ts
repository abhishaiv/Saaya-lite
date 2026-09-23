/**
 * Where a zone's name goes, once its anchor is on screen.
 *
 * The scene reports a projection, which is a point. A name is a box: it has a width, it has
 * a height, and it is drawn centred on that point - so a name whose anchor lands near the
 * frame edge is drawn half outside it, and two names whose anchors land near each other are
 * drawn on top of each other. `MAP_SPEC.md` requires the risk reading to stay legible, and
 * two words printed over each other is not legible.
 *
 * This is deliberately not a general label engine. It is four rules, in order, and each one
 * exists because a capture measured it failing:
 *
 * 1. The box is centred on its anchor, which is what the view has always done.
 * 2. The box is pulled back inside the frame if centring would push it out.
 * 3. If the box lands on one already placed, it steps clear of it - below first, then above.
 * 4. If nothing fits, it takes the clamped centre. A name slightly overlapping another is
 *    still worth more than no name, because the label is a tap target, not decoration.
 *
 * Everything is a function of the anchor and the box's own size, and the order is the order
 * the caller passes, so the same frame always places the same way. A placement that
 * depended on anything else would make names swap places as she walks.
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

interface Rect {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** The box a centre and a size make, which is what both the clamp and the overlap test read. */
function rectAt(centre: LabelPlacement, size: LabelBoxSize): Rect {
  const halfWidth = size.widthPx / 2;
  const halfHeight = size.heightPx / 2;
  return {
    left: centre.xPx - halfWidth,
    right: centre.xPx + halfWidth,
    top: centre.yPx - halfHeight,
    bottom: centre.yPx + halfHeight,
  };
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
): readonly LabelPlacement[] {
  const placed: Rect[] = [];
  const out: LabelPlacement[] = [];

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const size = sizes[index];
    if (anchor === undefined || size === undefined) continue;

    const resting = clamp(anchor, size, bounds);
    // Below first, then above, then a step further each way: a name that has to move should
    // stay as close to the thing it names as it can.
    const steps = [0, 1, -1, 2, -2];
    let chosen: LabelPlacement | null = null;
    for (const step of steps) {
      const candidate =
        step === 0
          ? resting
          : clamp(
              { xPx: anchor.xPx, yPx: anchor.yPx + step * (size.heightPx + gapPx) },
              size,
              bounds,
            );
      const rect = rectAt(candidate, size);
      if (!placed.some((other) => overlaps(rect, other))) {
        chosen = candidate;
        break;
      }
    }

    const final = chosen ?? resting;
    placed.push(rectAt(final, size));
    out.push(final);
  }

  return out;
}
