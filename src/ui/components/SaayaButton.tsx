import type { ButtonHTMLAttributes, ReactNode } from "react";

export type SaayaButtonVariant =
  | "primary"
  | "accent"
  | "ghost"
  | "destructive"
  | "textOnly";

export type SaayaButtonAccent = "brand" | "amber" | "danger";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "color"
>;

type SharedSaayaButtonProps = NativeButtonProps & {
  children: ReactNode;
  loading?: boolean;
};

type AccentSaayaButtonProps = SharedSaayaButtonProps & {
  variant: "accent";
  accent: SaayaButtonAccent;
};

type NonAccentSaayaButtonProps = SharedSaayaButtonProps & {
  variant?: Exclude<SaayaButtonVariant, "accent">;
  accent?: never;
};

export type SaayaButtonProps =
  | AccentSaayaButtonProps
  | NonAccentSaayaButtonProps;

const variantClassNames: Record<SaayaButtonVariant, string> = {
  primary: "saaya-button--primary",
  accent: "saaya-button--accent",
  ghost: "saaya-button--ghost",
  destructive: "saaya-button--destructive",
  textOnly: "saaya-button--text-only",
};

const accentClassNames: Record<SaayaButtonAccent, string> = {
  brand: "saaya-button--accent-brand",
  amber: "saaya-button--accent-amber",
  danger: "saaya-button--accent-danger",
};

/**
 * The shared C1 action control. The outer semantic button owns the hit target while the
 * inner surface preserves the smaller visual height of the iOS TextOnly variant.
 */
export function SaayaButton(props: SaayaButtonProps) {
  const {
    "aria-label": ariaLabel,
    accent,
    children,
    className,
    disabled = false,
    loading = false,
    type = "button",
    variant = "primary",
    ...nativeProps
  } = props;

  const isDisabled = disabled || loading;
  const accentClassName =
    variant === "accent" && accent ? accentClassNames[accent] : undefined;
  const classes = [
    "saaya-button",
    variantClassNames[variant],
    accentClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        {...nativeProps}
        aria-busy={loading || undefined}
        aria-label={loading ? "Working" : ariaLabel}
        className={classes}
        data-loading={loading ? "true" : undefined}
        disabled={isDisabled}
        type={type}
      >
        <span className="saaya-button__surface">
          <span className="saaya-button__content">
            {loading ? (
              <progress
                aria-hidden="true"
                className="saaya-button__indicator"
              />
            ) : (
              children
            )}
          </span>
        </span>
      </button>

      <style jsx>{`
        .saaya-button {
          --saaya-button-fill: var(--color-brand);
          --saaya-button-text: var(--color-text-primary);
          --saaya-button-border: transparent;
          --saaya-button-border-width: 0;
          --saaya-button-visual-height: 56px;
          --saaya-button-pressed-darkening: 8%;

          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: 100%; /* GROUNDED-EXEMPT: full-width percentage is the structural CSS representation of the specified default */
          block-size: max(
            var(--minimum-touch-target),
            var(--saaya-button-visual-height)
          );
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

        .saaya-button__surface {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: 100%; /* GROUNDED-EXEMPT: surface fills its semantic button without adding a product dimension */
          block-size: var(--saaya-button-visual-height);
          padding: 0 var(--space-20);
          overflow: hidden;
          border: var(--saaya-button-border-width) solid
            var(--saaya-button-border);
          border-radius: var(--radius-control);
          background: var(--saaya-button-fill);
          color: var(--saaya-button-text);
          font-family: inherit;
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-body-line-height);
          text-align: center;
          transform: scale(1);
          transition: transform 180ms cubic-bezier(0.34, 1.3, 0.64, 1);
          user-select: none;
        }

        .saaya-button__content {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .saaya-button--accent {
          --saaya-button-visual-height: 50px;
        }

        .saaya-button--accent .saaya-button__surface {
          font-size: var(--type-body-size);
          font-weight: var(--weight-bold);
        }

        .saaya-button--accent-brand {
          --saaya-button-fill: var(--color-brand);
        }

        .saaya-button--accent-amber {
          --saaya-button-fill: var(--color-amber);
        }

        .saaya-button--accent-danger {
          --saaya-button-fill: var(--color-danger);
        }

        .saaya-button--ghost {
          --saaya-button-fill: transparent;
          --saaya-button-text: var(--color-brand);
          --saaya-button-border: var(--color-brand);
          --saaya-button-border-width: 1px;
        }

        .saaya-button--destructive {
          --saaya-button-fill: var(--color-danger);
        }

        .saaya-button--text-only {
          --saaya-button-fill: transparent;
          --saaya-button-text: rgb(
            from var(--color-danger) r g b / 0.9
          );
          --saaya-button-visual-height: 34px;
        }

        .saaya-button--text-only .saaya-button__surface {
          border-radius: 0;
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-caption-line-height);
        }

        .saaya-button:focus-visible {
          outline: none;
        }

        .saaya-button:focus-visible .saaya-button__surface {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .saaya-button:not(:disabled):active .saaya-button__surface {
          transform: scale(0.97);
          transition-duration: 120ms;
        }

        .saaya-button--primary:not(:disabled):active
          .saaya-button__surface {
          background: var(--color-brand-dark);
        }

        .saaya-button--accent:not(:disabled):active .saaya-button__surface,
        .saaya-button--destructive:not(:disabled):active
          .saaya-button__surface {
          filter: brightness(calc(100% - var(--saaya-button-pressed-darkening))); /* GROUNDED-EXEMPT: 100% is the structural brightness baseline for the specified 8% darkening */
        }

        .saaya-button:disabled {
          cursor: not-allowed;
        }

        .saaya-button:disabled:not([data-loading="true"])
          .saaya-button__surface {
          border-color: rgb(
            from var(--saaya-button-border) r g b / 0.3
          );
          background: rgb(from var(--saaya-button-fill) r g b / 0.3);
          color: rgb(from var(--saaya-button-text) r g b / 0.4);
        }

        .saaya-button--ghost:disabled:not([data-loading="true"])
          .saaya-button__surface,
        .saaya-button--text-only:disabled:not([data-loading="true"])
          .saaya-button__surface {
          background: transparent;
        }

        .saaya-button__indicator {
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
