/**
 * The character mark, drawn rather than shipped in the font.
 *
 * Every other control glyph comes from the pinned Material Symbols subset
 * (`materialSymbols.json`), whose coverage is checked against the pinned upstream font.
 * That set has no mark that means "your character" - the nearest, `group`, reads as
 * people rather than one person - and adding a glyph would mean regenerating the subset
 * font and its pins. This one is drawn to the same rules as the subset: a 24 px box,
 * outlined, 2 px of stroke, round caps and joins, so it sits in the rail beside the
 * font's own glyphs without announcing which is which.
 */

import type { CSSProperties } from "react";

const BOX_PX = 24; // GROUNDED-EXEMPT: the glyph box every Material Symbols glyph in the rail shares.
const STROKE_PX = 2; // GROUNDED-EXEMPT: the drawn stroke weight of the pinned subset at this box.
const HEAD_CENTRE_Y = 7.25; // GROUNDED-EXEMPT: icon geometry, not a product value.
const HEAD_RADIUS = 3.5; // GROUNDED-EXEMPT: icon geometry, not a product value.
const SHOULDER_CREST_Y = 13.75; // GROUNDED-EXEMPT: icon geometry, not a product value.
const SHOULDER_FOOT_Y = 19.5; // GROUNDED-EXEMPT: icon geometry, not a product value.
// The shoulders, as one curve: a cubic out of the left shoulder, over the crest, into a
// smooth cubic down to the right one. The control offsets are the curve's own shape and
// nothing else reads them, so they stay in the path rather than becoming five constants.
const SHOULDER_PATH = `M5 ${SHOULDER_FOOT_Y}c0-3.45 3.13-5.75 7-5.75s7 2.3 7 5.75`; // GROUNDED-EXEMPT: icon geometry, not a product value.

export type CharacterIconProps = Readonly<{
  /** Rendered size in px. Matches `MaterialSymbolSize`'s 24 for the rail. */
  size?: number;
}>;

/** A person, outlined, for the control that changes who she is in the walk view. */
export function CharacterIcon({ size = BOX_PX }: CharacterIconProps) {
  const style: CSSProperties = size === BOX_PX ? {} : { height: size, width: size };
  return (
    <svg
      aria-hidden="true"
      className="character-icon"
      focusable="false"
      style={style}
      viewBox={`0 0 ${BOX_PX} ${BOX_PX}`}
    >
      <circle
        cx={BOX_PX / 2}
        cy={HEAD_CENTRE_Y}
        fill="none"
        r={HEAD_RADIUS}
        stroke="currentColor"
        strokeWidth={STROKE_PX}
      />
      <path
        d={SHOULDER_PATH}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE_PX}
      />
      <style jsx>{`
        .character-icon {
          display: inline-block;
          flex: 0 0 auto;
          inline-size: ${BOX_PX}px;
          block-size: ${BOX_PX}px;
        }
      `}</style>
    </svg>
  );
}
