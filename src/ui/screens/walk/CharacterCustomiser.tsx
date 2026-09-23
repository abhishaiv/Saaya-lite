"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  CHARACTER_AXES,
  DEFAULT_CHARACTER,
  type CharacterSelection,
  withAxis,
} from "../../../platform/walk/characterParts";
import { SaayaButton } from "../../components/SaayaButton";
import { SectionHeader } from "../../components/SectionHeader";
import type { M4Copy } from "../../copy/strings";

export interface CharacterCustomiserProps {
  /**
   * True the first time she switches to the walk view, when there is no character yet.
   * It changes the framing and the two actions, which is what `walk_first_*` exists for.
   */
  readonly firstRun: boolean;
  readonly copy: M4Copy;
  readonly initial: CharacterSelection;
  readonly onCancel: () => void;
  readonly onSave: (selection: CharacterSelection) => void;
}

/**
 * The localized name of an axis.
 *
 * A switch rather than a lookup table on purpose: `CHARACTER_AXES[].id` is a plain
 * `string`, so a table read would have to admit an undefined case, and the honest answer
 * to an axis with no copy row is to fail loudly rather than fall back to English inside a
 * Telugu screen.
 */
function axisLabel(copy: M4Copy, axisId: string): string {
  switch (axisId) {
    case "body":
      return copy.custAxisBody;
    case "brows":
      return copy.custAxisBrows;
    case "hair":
      return copy.custAxisHair;
    case "eyes":
      return copy.custAxisEyes;
    case "top":
      return copy.custAxisTop;
    case "bottom":
      return copy.custAxisBottom;
    case "acc":
      return copy.custAxisAccessories;
    default:
      throw new Error(`No copy row for character axis ${axisId}`);
  }
}

/**
 * A readable name for a part, derived from its id.
 *
 * **This is a placeholder, not authored copy.** COPY.md has a row for each axis and none
 * for the parts inside them, so `hair_buns` is shown as "Buns" by stripping the axis
 * prefix and title-casing what is left. It reads acceptably in English and not at all in
 * Telugu, which is why it is flagged in progress.md rather than left to be discovered.
 * Replacing it means one copy row per part, which is 16 rows.
 */
function optionLabel(axisId: string, optionId: string): string {
  const bare = optionId.startsWith(`${axisId}_`)
    ? optionId.slice(axisId.length + 1)
    : optionId;
  return bare
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * The character creator, as an overlay rather than a screen she navigates to.
 *
 * It has to sit over the walk view and not replace it. `HomeScreen` early-returns a whole
 * `<main>` for Settings and About, which is right for those, but doing it here would
 * unmount the scene and send it back to fetch and decode the world when she came back
 * from changing a jacket. The scene stays mounted underneath and the save goes through
 * `setCharacter`, which swaps the rig in place.
 */
export function CharacterCustomiser({
  copy,
  firstRun,
  initial,
  onCancel,
  onSave,
}: CharacterCustomiserProps) {
  const [selection, setSelection] = useState<CharacterSelection>(initial);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusRef.current = globalThis.document.activeElement;
    dialogRef.current?.focus();
    return () => {
      const previous = returnFocusRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div
      aria-label={firstRun ? copy.walkFirstTitle : copy.custTitle}
      aria-modal="true"
      className="cust"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className="cust__header">
        <h1 className="cust__title">
          {firstRun ? copy.walkFirstTitle : copy.custTitle}
        </h1>
        {firstRun ? <p className="cust__body">{copy.walkFirstBody}</p> : null}
      </header>

      <div className="cust__axes">
        {CHARACTER_AXES.map((axis) => {
          const headingId = `cust-axis-${axis.id}`;
          return (
            <section
              aria-labelledby={headingId}
              className="cust__axis"
              key={axis.id}
              role="group"
            >
              <SectionHeader id={headingId} level={3}>
                {axisLabel(copy, axis.id)}
              </SectionHeader>

              <div className="cust__options">
                {axis.options.map((optionId) => {
                  const chosen = selection[axis.id] === optionId;
                  return (
                    <button
                      aria-pressed={chosen}
                      className={
                        chosen ? "cust__option cust__option--on" : "cust__option"
                      }
                      key={optionId}
                      onClick={() =>
                        setSelection((current) =>
                          withAxis(current, axis.id, optionId),
                        )
                      }
                      type="button"
                    >
                      {optionLabel(axis.id, optionId)}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="cust__footer">
        <p className="cust__local">{copy.custStaysLocal}</p>

        {firstRun ? (
          <div className="cust__actions">
            <SaayaButton
              onClick={() => onSave(selection)}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.walkFirstCta}
            </SaayaButton>
            <SaayaButton
              onClick={() => onSave(DEFAULT_CHARACTER)}
              variant="ghost"
              workingLabel={copy.stateWorking}
            >
              {copy.walkFirstSkip}
            </SaayaButton>
          </div>
        ) : (
          <div className="cust__actions">
            <SaayaButton
              onClick={() => setSelection(DEFAULT_CHARACTER)}
              variant="ghost"
              workingLabel={copy.stateWorking}
            >
              {copy.custReset}
            </SaayaButton>
            <SaayaButton
              onClick={onCancel}
              variant="ghost"
              workingLabel={copy.stateWorking}
            >
              {copy.custCancel}
            </SaayaButton>
            <SaayaButton
              onClick={() => onSave(selection)}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.custSave}
            </SaayaButton>
          </div>
        )}
      </footer>

      <style jsx>{`
        .cust {
          position: fixed;
          inset: 0;
          /* Above the ordinary chrome and the SOS/SUS rail, below every safety surface: the
             walk view's own character mark reopens this at any time, so a ladder (10),
             session truth (11) or the SOS overlay (20) must be able to stand over it. */
          z-index: 8; /* GROUNDED-EXEMPT: local stack above Home chrome and below every safety surface. */
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: env(safe-area-inset-top) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          background: var(--color-background);
          color: var(--color-text-primary);
          font-family: var(--font-family);
          outline: none;
        }

        .cust__title {
          margin: 0;
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-card-title-line-height);
        }

        .cust__body {
          margin: var(--space-8) 0 0;
          color: var(--color-text-secondary);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .cust__axis {
          margin-block-start: var(--space-8);
        }

        .cust__options {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-8);
        }

        .cust__option {
          min-block-size: var(--minimum-touch-target);
          padding: var(--space-8) var(--space-16);
          border: 1px solid var(--color-text-tertiary);
          border-radius: var(--radius-control);
          appearance: none;
          background: transparent;
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: var(--type-label-size);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .cust__option--on {
          border-color: var(--color-brand);
          background: var(--color-brand);
          color: var(--color-text-on-card);
          font-weight: var(--weight-semibold);
        }

        .cust__footer {
          margin-block-start: var(--space-24);
        }

        .cust__local {
          margin: 0 0 var(--space-12);
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .cust__actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-8);
        }
      `}</style>
    </div>
  );
}
