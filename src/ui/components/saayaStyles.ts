/** Shared, non-visual helpers emitted once by the T1.3 manifest merge. */
export function joinClassNames(
  ...classNames: ReadonlyArray<string | null | undefined | false>
) {
  return classNames.filter(Boolean).join(" ");
}

/** C8's caller supplies the measured range; the component only chooses its snap offset. */
export function bottomSheetOffset(
  expanded: boolean,
  dragRangePx: number,
) {
  return expanded ? 0 : Math.max(0, dragRangePx);
}

export type BottomSheetRelease =
  | "dismiss"
  | "expanded"
  | "peek";

const DISMISS_THRESHOLD_PERCENT = 40;
const PERCENT_BASE = 100; // GROUNDED-EXEMPT: arithmetic conversion from a ratio to a percentage.

/** Pure C8 release decision, including the strict "past 40%" boundary. */
export function bottomSheetRelease(
  deltaYPx: number,
  dragRangePx: number,
  current: "peek" | "expanded",
): BottomSheetRelease {
  const actualRangePx = Math.max(0, dragRangePx);

  if (
    actualRangePx > 0 &&
    (deltaYPx / actualRangePx) * PERCENT_BASE >
      DISMISS_THRESHOLD_PERCENT
  ) {
    return "dismiss";
  }

  if (deltaYPx < 0) {
    return "expanded";
  }

  if (deltaYPx > 0) {
    return "peek";
  }

  return current === "peek" ? "expanded" : "peek";
}
