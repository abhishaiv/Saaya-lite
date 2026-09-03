import type { ButtonHTMLAttributes } from "react";

export type BigActionButtonAccent = "brand" | "amber" | "danger";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "color"
>;

export type BigActionButtonProps = NativeButtonProps & {
  accent: BigActionButtonAccent;
  /** Localized COPY.md label shown when a live countdown is present. */
  countdownLabel?: string;
  countdownSeconds?: number;
  label: string;
  loading?: boolean;
  /** Localized COPY.md `state_working` value used while loading. */
  workingLabel: string;
};

const accentClassNames: Record<BigActionButtonAccent, string> = {
  brand: "big-action-button--brand",
  amber: "big-action-button--amber",
  danger: "big-action-button--danger",
};

/**
 * The C2 stress-action control. The fixed test tag stays stable while the visible
 * countdown label changes, and loading retains the current ladder accent.
 */
export function BigActionButton({
  accent,
  "aria-label": ariaLabel,
  className,
  countdownLabel,
  countdownSeconds,
  disabled = false,
  label,
  loading = false,
  type = "button",
  workingLabel,
  ...nativeProps
}: BigActionButtonProps) {
  const hasCountdown =
    typeof countdownSeconds === "number" && countdownSeconds > 0;
  const visibleLabel = hasCountdown
    ? (countdownLabel ?? label)
    : label;
  const isDisabled = disabled || loading;
  const classes = [
    "big-action-button",
    accentClassNames[accent],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        {...nativeProps}
        aria-busy={loading || undefined}
        aria-label={loading ? workingLabel : ariaLabel}
        className={classes}
        data-loading={loading ? "true" : undefined}
        data-testid="checkin-imok"
        disabled={isDisabled}
        type={type}
      >
        <span className="big-action-button__surface">
          <span className="big-action-button__content">
            {loading ? (
              <progress
                aria-hidden="true"
                className="big-action-button__indicator"
              />
            ) : (
              visibleLabel
            )}
          </span>
        </span>
      </button>

      <style jsx>{`
        .big-action-button {
          --big-action-button-fill: var(--color-brand);
          --big-action-button-text: var(--color-text-primary);

          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: 100%; /* GROUNDED-EXEMPT: full-width percentage is the structural CSS representation of the specified C2 width */
          block-size: 72px;
          min-block-size: var(--minimum-touch-target);
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .big-action-button__surface {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: 100%; /* GROUNDED-EXEMPT: the visual surface fills its semantic button without introducing a product dimension */
          block-size: 72px;
          padding: 0 var(--space-20);
          overflow: hidden;
          border: 0;
          border-radius: var(--radius-control);
          background: var(--big-action-button-fill);
          color: var(--big-action-button-text);
          font-family: inherit;
          font-size: var(--type-big-action-size);
          font-weight: var(--weight-bold);
          line-height: normal;
          text-align: center;
          transform: scale(1);
          transition: transform var(--motion-180) var(--motion-spring);
          user-select: none;
        }

        .big-action-button__content {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-feature-settings: var(--font-feature-numerals);
        }

        .big-action-button--brand {
          --big-action-button-fill: var(--color-brand);
        }

        .big-action-button--amber {
          --big-action-button-fill: var(--color-amber);
        }

        .big-action-button--danger {
          --big-action-button-fill: var(--color-danger);
        }

        .big-action-button:focus-visible {
          outline: none;
        }

        .big-action-button:focus-visible .big-action-button__surface {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .big-action-button:not(:disabled):active
          .big-action-button__surface {
          background: color-mix(
            in srgb,
            black 8%,
            var(--big-action-button-fill)
          );
          transform: scale(0.97);
          transition-duration: var(--motion-120);
        }

        .big-action-button:disabled {
          cursor: not-allowed;
        }

        .big-action-button:disabled:not([data-loading="true"])
          .big-action-button__surface {
          background: rgb(
            from var(--big-action-button-fill) r g b / 0.3
          );
          color: rgb(from var(--big-action-button-text) r g b / 0.4);
        }

        .big-action-button__indicator {
          display: block;
          inline-size: 20px;
          block-size: 20px;
          color: currentColor;
          accent-color: currentColor;
        }
      `}</style>
    </>
  );
}
