import type { MouseEventHandler, ReactNode } from "react";

import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";

export type MapControlIconName = MaterialSymbolName;

/**
 * The button's mark: one of the pinned Material Symbols, or a drawn component.
 *
 * Added 2026-09-23 for the walk view's character control, whose mark is Saaya's own
 * (`CharacterIcon`) because the pinned subset has no glyph that means "your character" -
 * see that file for why drawing beat regenerating the subset font.
 */
type MapControlGlyph =
  | Readonly<{ icon: MapControlIconName; mark?: never }>
  | Readonly<{ icon?: never; mark: ReactNode }>;

export type MapControlButtonProps = MapControlGlyph &
  Readonly<{
    /** Action name announced for the otherwise icon-only control. */
    label: string;
    onClick: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    /**
     * Which ground the button floats on. `dark` (the default) is the panel fill these
     * controls have always used; `light` is the interface's own white with ink, which is
     * what the founder's chosen chrome ("A - Light and quiet", 2026-09-23) puts on the
     * map's top row beside the white search pill.
     */
    tone?: "dark" | "light";
  }>;

export type MapControlButtonStackProps = Readonly<{
  children: ReactNode;
  className?: string;
  /**
   * The stack's own axis. `column` (the default) is the bottom-right control column;
   * `row` is the map's top row, where the view's controls stand beside the search pill.
   */
  axis?: "column" | "row";
}>;

/**
 * Layout-only C13 companion: it supplies the frozen 12 px gap on its own axis while the
 * owning screen remains responsible for right-side placement.
 */
export function MapControlButtonStack({
  axis = "column",
  children,
  className,
}: MapControlButtonStackProps) {
  const classes = [
    "saaya-map-control-button-stack",
    axis === "row" ? "saaya-map-control-button-stack--row" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {children}

      <style jsx>{`
        .saaya-map-control-button-stack {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .saaya-map-control-button-stack--row {
          flex-direction: row;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

/** C13's icon-only map utility action. */
export function MapControlButton(props: MapControlButtonProps) {
  const classes = [
    "saaya-map-control-button",
    props.tone === "light" ? "saaya-map-control-button--light" : undefined,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-label={props.label}
      className={classes}
      onClick={props.onClick}
      type="button"
    >
      <span aria-hidden="true" className="saaya-map-control-button__icon">
        {props.icon !== undefined ? (
          <MaterialSymbol
            decorative
            fill="utility"
            name={props.icon}
            size={24}
          />
        ) : (
          props.mark
        )}
      </span>

      <style jsx>{`
        .saaya-map-control-button {
          display: inline-grid;
          flex: none;
          place-items: center;
          inline-size: 48px;
          block-size: 48px;
          padding: 0;
          border: 0;
          border-radius: 14px;
          appearance: none;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-primary);
          animation: none;
          transition: none;
        }

        /* The light tone: the interface's own white with ink, the same pair the search
           pill and the nav are drawn in, and the card radius so the two of them read as
           the circles the founder chose.
           * Founder ruling, 2026-09-23: "A - Light and quiet". */
        .saaya-map-control-button--light {
          border-radius: var(--radius-card);
          background: var(--color-text-primary);
          color: var(--color-background);
        }

        .saaya-map-control-button__icon {
          display: inline-flex;
          inline-size: 24px;
          block-size: 24px;
          align-items: center;
          justify-content: center;
          animation: none;
          transition: none;
        }
      `}</style>
    </button>
  );
}
