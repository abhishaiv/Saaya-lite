import type { MouseEventHandler, ReactNode } from "react";

import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";

export type MapControlIconName = MaterialSymbolName;

export type MapControlButtonProps = Readonly<{
  icon: MapControlIconName;
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
export function MapControlButton({
  icon,
  label,
  onClick,
  className,
}: MapControlButtonProps) {
  const classes = ["saaya-map-control-button", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-label={label}
      className={classes}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="saaya-map-control-button__icon">
        <MaterialSymbol
          decorative
          fill="utility"
          name={icon}
          size={24}
        />
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
