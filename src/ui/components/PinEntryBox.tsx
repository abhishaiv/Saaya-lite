"use client";

import { useId, type ChangeEvent, type ClipboardEvent } from "react";

const PIN_LENGTH = 4;
const DIGITS_ONLY = /^\d*$/;

type SharedPinEntryBoxProps = {
  /** Localized accessible name for the secure input. */
  ariaLabel: string;
  className?: string;
  onChange: (pin: string) => void;
  value: string;
};

type EditablePinEntryBoxProps = SharedPinEntryBoxProps & {
  state?: "default" | "error";
  lockedCountdown?: never;
  lockedMessage?: never;
};

type LockedPinEntryBoxProps = SharedPinEntryBoxProps & {
  state: "locked";
  /** Localized countdown text supplied by the caller. */
  lockedCountdown: string;
  /** Localized lockout message supplied by the caller. */
  lockedMessage: string;
};

export type PinEntryBoxProps = Readonly<
  EditablePinEntryBoxProps | LockedPinEntryBoxProps
>;

/** C9's controlled, masked four-digit PIN input. */
export function PinEntryBox(props: PinEntryBoxProps) {
  const {
    ariaLabel,
    className,
    onChange,
    state = "default",
    value,
  } = props;
  const lockoutDescriptionId = useId();
  const isLocked = state === "locked";
  const currentIndex = value.length >= PIN_LENGTH ? -1 : value.length;
  const classes = ["pin-entry", `pin-entry--${state}`, className]
    .filter(Boolean)
    .join(" ");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextPin = event.currentTarget.value;

    if (nextPin.length <= PIN_LENGTH && DIGITS_ONLY.test(nextPin)) {
      onChange(nextPin);
    }
  }

  function preventPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
  }

  return (
    <div className={classes} data-state={state}>
      <div className="pin-entry__control">
        <input
          aria-describedby={isLocked ? lockoutDescriptionId : undefined}
          aria-disabled={isLocked || undefined}
          aria-invalid={state === "error" || undefined}
          aria-label={ariaLabel}
          autoComplete="off"
          className="pin-entry__input"
          disabled={isLocked}
          inputMode="numeric"
          maxLength={PIN_LENGTH}
          onChange={handleChange}
          onPaste={preventPaste}
          type="password"
          value={value}
        />

        <div aria-hidden="true" className="pin-entry__boxes">
          {Array.from({ length: PIN_LENGTH }, (_, index) => {
            const isFilled = index < value.length;

            return (
              <span
                className="pin-entry__box"
                data-current={index === currentIndex ? "true" : undefined}
                key={index}
              >
                {isFilled ? <span className="pin-entry__dot" /> : null}
              </span>
            );
          })}
        </div>
      </div>

      {isLocked ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="pin-entry__lockout"
          id={lockoutDescriptionId}
          role="status"
        >
          <span>{props.lockedMessage}</span>{" "}
          <span className="pin-entry__countdown">
            {props.lockedCountdown}
          </span>
        </p>
      ) : null}

      <style jsx>{`
        .pin-entry {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
        }

        .pin-entry__control {
          position: relative;
        }

        .pin-entry__input {
          position: absolute;
          z-index: 1;
          inset: 0;
          inline-size: 100%; /* GROUNDED-EXEMPT: the secure input overlays the full specified box row */
          block-size: 100%; /* GROUNDED-EXEMPT: the secure input overlays the full specified box row */
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: transparent;
          caret-color: transparent;
          opacity: 0;
          cursor: text;
        }

        .pin-entry__input:disabled {
          cursor: not-allowed;
        }

        .pin-entry__boxes {
          display: flex;
          gap: var(--space-12);
          opacity: 1;
          animation: none;
          transition: none;
        }

        .pin-entry__box {
          display: grid;
          place-items: center;
          box-sizing: border-box;
          inline-size: 56px;
          block-size: 64px;
          border: 2px solid transparent;
          border-radius: var(--radius-control);
          background: var(--color-surface-elevated);
          animation: none;
          transition: none;
        }

        .pin-entry__dot {
          inline-size: 12px;
          block-size: 12px;
          border-radius: 50%; /* GROUNDED-EXEMPT: a circle requires half-radius geometry */
          background: var(--color-brand);
        }

        .pin-entry:focus-within
          .pin-entry__box[data-current="true"] {
          border-color: var(--color-brand);
        }

        .pin-entry.pin-entry--error .pin-entry__box {
          border-color: var(--color-danger);
        }

        .pin-entry--locked .pin-entry__boxes {
          opacity: 0.3;
        }

        .pin-entry__lockout {
          margin: var(--space-12) 0 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-regular);
          line-height: var(--type-caption-line-height);
          text-align: center;
        }

        .pin-entry__countdown {
          font-feature-settings: var(--font-feature-numerals);
        }
      `}</style>
    </div>
  );
}
