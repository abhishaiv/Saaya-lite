import type { MouseEventHandler } from "react";

import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";
import { SaayaButton } from "./SaayaButton";

export type EmptyStateIcon = MaterialSymbolName;

export type EmptyStateAction = Readonly<{
  disabled?: boolean;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  workingLabel: string;
}>;

export type EmptyStateProps = Readonly<{
  action?: EmptyStateAction;
  body: string;
  className?: string;
  icon: EmptyStateIcon;
  title: string;
}>;

/** C12 centred empty treatment; all visible copy is supplied by the caller. */
export function EmptyState({
  action,
  body,
  className,
  icon,
  title,
}: EmptyStateProps) {
  const classes = ["empty-state", className].filter(Boolean).join(" ");

  return (
    <>
      <section className={classes}>
        <span aria-hidden="true" className="empty-state__icon">
          <MaterialSymbol
            decorative
            fill="state"
            name={icon}
            size={32}
          />
        </span>
        <h2 className="empty-state__title">{title}</h2>
        <p className="empty-state__body">{body}</p>
        {action ? (
          <div className="empty-state__action">
            <SaayaButton
              disabled={action.disabled}
              onClick={action.onClick}
              variant="ghost"
              workingLabel={action.workingLabel}
            >
              {action.label}
            </SaayaButton>
          </div>
        ) : null}
      </section>

      <style jsx>{`
        .empty-state {
          box-sizing: border-box;
          display: flex;
          flex: 1 1 auto;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          inline-size: 100%; /* GROUNDED-EXEMPT: structural fill of the caller-provided available space */
          min-block-size: 100%; /* GROUNDED-EXEMPT: structural fill required for vertical centring */
          color: var(--color-text-primary);
          text-align: center;
          animation: none;
          transition: none;
        }

        .empty-state__icon {
          display: inline-flex;
          flex: 0 0 32px;
          inline-size: 32px;
          block-size: 32px;
          color: var(--color-text-tertiary);
          align-items: center;
          justify-content: center;
          animation: none;
          transition: none;
        }

        .empty-state__title {
          margin: 0;
          color: inherit;
          font-size: var(--type-headline-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-headline-line-height);
        }

        .empty-state__body {
          margin: 0;
          color: inherit;
          font-size: var(--type-caption-size);
          font-weight: var(--weight-regular);
          line-height: var(--type-caption-line-height);
        }

        .empty-state__action {
          inline-size: 100%; /* GROUNDED-EXEMPT: preserves C1 Ghost's specified full-width default */
        }
      `}</style>
    </>
  );
}
