import type { CSSProperties } from "react";

import { joinClassNames } from "../components/saayaStyles";
import materialSymbolGlyphs from "./materialSymbols.json";

export const MATERIAL_SYMBOL_GLYPHS = Object.freeze(materialSymbolGlyphs);

export type MaterialSymbolName = keyof typeof MATERIAL_SYMBOL_GLYPHS;
export type MaterialSymbolSize = 16 | 20 | 24 | 32 | 40;
export type MaterialSymbolFill = "state" | "utility";
export type MaterialSymbolWeight = "default" | "button";

const OPTICAL_SIZE_BY_RENDERED_SIZE: Readonly<
  Record<MaterialSymbolSize, number>
> = {
  16: 20, // 16 px contexts clamp to icon.opsz.min.
  20: 20,
  24: 24,
  32: 32,
  40: 40,
};

export function materialSymbolOpticalSize(size: MaterialSymbolSize) {
  return OPTICAL_SIZE_BY_RENDERED_SIZE[size];
}

type SharedMaterialSymbolProps = Readonly<{
  className?: string;
  fill: MaterialSymbolFill;
  name: MaterialSymbolName;
  size: MaterialSymbolSize;
  weight?: MaterialSymbolWeight;
}>;

type DecorativeMaterialSymbolProps = SharedMaterialSymbolProps &
  Readonly<{
    decorative: true;
    label?: never;
  }>;

type MeaningfulMaterialSymbolProps = SharedMaterialSymbolProps &
  Readonly<{
    decorative?: false;
    label: string;
  }>;

export type MaterialSymbolProps =
  | DecorativeMaterialSymbolProps
  | MeaningfulMaterialSymbolProps;

type MaterialSymbolStyle = CSSProperties & {
  "--material-symbol-fill": number;
  "--material-symbol-opsz": number;
  "--material-symbol-size": string;
  "--material-symbol-weight": number;
};

/** The single renderer for the pinned, 17-glyph Material Symbols subset. */
export function MaterialSymbol(props: MaterialSymbolProps) {
  const isDecorative = props.decorative === true;
  const style: MaterialSymbolStyle = {
    "--material-symbol-fill": props.fill === "state" ? 1 : 0,
    "--material-symbol-opsz": materialSymbolOpticalSize(props.size),
    "--material-symbol-size": `${props.size}px`,
    "--material-symbol-weight": props.weight === "button" ? 500 : 400,
  };

  return (
    <span
      aria-hidden={isDecorative ? "true" : undefined}
      aria-label={isDecorative ? undefined : props.label}
      className={joinClassNames("material-symbol", props.className)}
      role={isDecorative ? undefined : "img"}
      style={style}
    >
      {MATERIAL_SYMBOL_GLYPHS[props.name]}

      <style jsx>{`
        .material-symbol {
          display: inline-block;
          inline-size: var(--material-symbol-size);
          block-size: var(--material-symbol-size);
          flex: 0 0 auto;
          font-family: "Material Symbols Rounded";
          font-size: var(--material-symbol-size);
          font-style: normal;
          font-weight: normal;
          font-variant-ligatures: none;
          font-variation-settings:
            "FILL" var(--material-symbol-fill),
            "wght" var(--material-symbol-weight),
            "GRAD" 0,
            "opsz" var(--material-symbol-opsz);
          line-height: 1;
          text-align: center;
          text-transform: none;
          white-space: nowrap;
          direction: ltr;
          user-select: none;
        }
      `}</style>
    </span>
  );
}
