const SHEET_EXPANDED_PERCENT = 55; // fact: sheet.expanded
const SHEET_PEEK_PX = 160; // fact: dim.sheet.peek
const PERCENT_BASE = 100; // GROUNDED-EXEMPT: mathematical percent denominator.

export function bottomSheetDragRangePx(): number {
  const expandedHeightPx =
    globalThis.innerHeight * (SHEET_EXPANDED_PERCENT / PERCENT_BASE);
  return Math.max(0, expandedHeightPx - SHEET_PEEK_PX);
}

export function subscribeBottomSheetDragRange(
  listener: (rangePx: number) => void,
): () => void {
  const update = () => listener(bottomSheetDragRangePx());
  globalThis.addEventListener("resize", update);
  update();
  return () => globalThis.removeEventListener("resize", update);
}
