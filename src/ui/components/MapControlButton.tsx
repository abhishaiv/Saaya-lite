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
  }>;

export type MapControlButtonStackProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

/**
 * Layout-only C13 companion: it supplies the frozen vertical gap while the
 * owning screen remains responsible for right-side placement.
 */
export function MapControlButtonStack({
  children,
  className,
}: MapControlButtonStackProps) {
  const classes = ["saaya-map-control-button-stack", className]
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
      `}</style>
    </div>
  );
}

/** C13's icon-only map utility action. */
export function MapControlButton(props: MapControlButtonProps) {
  const classes = ["saaya-map-control-button", props.className]
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
