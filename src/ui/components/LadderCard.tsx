import type { ReactNode } from "react";

import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";

export type LadderCardRung =
  | "CHECKIN_1"
  | "CHECKIN_2"
  | "FAMILY_ESCALATED";

export type LadderCardPhase =
  | "entering"
  | "visible"
  | "answered"
  | "deadline-passed";

export type LadderCardBackPolicy = "consume" | "delegate";

type LadderCardRungContract =
  | { rung: "CHECKIN_1"; backPolicy?: "delegate" }
  | { rung: "CHECKIN_2"; backPolicy?: "consume" }
  | { rung: "FAMILY_ESCALATED"; backPolicy?: "consume" };

type LadderCardSharedProps = {
  id?: string;
  phase: LadderCardPhase;
  title: ReactNode;
  message: ReactNode;
  primary: ReactNode;
  secondary: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export type LadderCardProps = Readonly<
  LadderCardSharedProps & LadderCardRungContract
>;

export const LADDER_CARD_BACK_POLICY: Readonly<
  Record<LadderCardRung, LadderCardBackPolicy>
> = {
  CHECKIN_1: "delegate",
  CHECKIN_2: "consume",
  FAMILY_ESCALATED: "consume",
};

const rungPresentation: Readonly<
  Record<LadderCardRung, { className: string; icon: MaterialSymbolName }>
> = {
  CHECKIN_1: {
    className: "ladder-card--checkin-one",
    icon: "verified_user",
  },
  CHECKIN_2: {
    className: "ladder-card--checkin-two",
    icon: "verified_user",
  },
  FAMILY_ESCALATED: {
    className: "ladder-card--family",
    icon: "gpp_maybe",
  },
};

const phaseClassNames: Readonly<
  Record<Exclude<LadderCardPhase, "deadline-passed">, string>
> = {
  entering: "ladder-card--entering",
  visible: "ladder-card--visible",
  answered: "ladder-card--answered",
};

/**
 * C3's modal ladder surface. Browser back/history handling belongs to the screen or
 * platform adapter; this component exposes the required policy as data and a typed prop.
 */
export function LadderCard(props: LadderCardProps) {
  if (props.phase === "deadline-passed") {
    return null;
  }

  const {
    ariaLabel,
    className,
    id = "ladder-card",
    message,
    phase,
    primary,
    rung,
    secondary,
    title,
  } = props;
  const presentation = rungPresentation[rung];
  const backPolicy = props.backPolicy ?? LADDER_CARD_BACK_POLICY[rung];
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  const classes = [
    "ladder-card",
    presentation.className,
    phaseClassNames[phase],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        aria-describedby={messageId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-modal="true"
        className={classes}
        data-back-policy={backPolicy}
        data-phase={phase}
        data-rung={rung}
        data-scrim-dismisses="false"
        data-swipe-dismisses="false"
        role="dialog"
      >
        <div aria-hidden="true" className="ladder-card__scrim" />

        <div className="ladder-card__surface">
          <span aria-hidden="true" className="ladder-card__icon">
            <MaterialSymbol
              decorative
              fill="state"
              name={presentation.icon}
              size={40}
            />
          </span>
          <h2 className="ladder-card__title" id={titleId}>
            {title}
          </h2>
          <div className="ladder-card__message" id={messageId}>
            {message}
          </div>
          <div className="ladder-card__primary">{primary}</div>
          <div className="ladder-card__secondary">{secondary}</div>
        </div>
      </div>

      <style jsx>{`
        .ladder-card {
          position: fixed;
          inset: 0;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-inline: var(--space-30);
          padding-block-end: calc(44px + env(safe-area-inset-bottom));
        }

        .ladder-card--checkin-one {
          --ladder-card-accent: var(--accent-checkin-1);
          --ladder-card-border-width: var(--border-checkin-1);
        }

        .ladder-card--checkin-two {
          --ladder-card-accent: var(--accent-checkin-2);
          --ladder-card-border-width: var(--border-checkin-2);
        }

        .ladder-card--family {
          --ladder-card-accent: var(--accent-family);
          --ladder-card-border-width: var(--border-family);
        }

        .ladder-card__scrim {
          position: absolute;
          inset: 0;
          background: var(--color-scrim);
        }

        .ladder-card__surface {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--space-14);
          padding: var(--space-22);
          border-radius: var(--radius-card);
          background: var(--color-card-fill);
          transform: translateY(0) scale(1);
        }

        .ladder-card__surface::before {
          position: absolute;
          inset: 0;
          border: var(--ladder-card-border-width) solid
            var(--ladder-card-accent);
          border-radius: inherit;
          opacity: var(--border-accent-alpha);
          pointer-events: none;
          content: "";
        }

        .ladder-card__icon {
          display: inline-flex;
          align-self: center;
          inline-size: 40px;
          block-size: 40px;
          align-items: center;
          justify-content: center;
          color: var(--ladder-card-accent);
        }

        .ladder-card__title {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--type-card-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-card-title-line-height);
          text-align: center;
        }

        .ladder-card__message {
          margin: 0;
          color: var(--color-text-on-card);
          font-size: var(--type-card-body-size);
          font-weight: var(--weight-regular);
          line-height: var(--type-card-body-line-height);
          text-align: center;
        }

        .ladder-card__primary,
        .ladder-card__secondary {
          align-self: stretch;
        }

        .ladder-card--entering .ladder-card__scrim {
          animation: ladder-card-scrim-enter var(--motion-180)
            var(--motion-standard) both;
        }

        .ladder-card--entering .ladder-card__surface {
          animation: ladder-card-enter var(--motion-320)
            var(--motion-spring) both;
        }

        .ladder-card--answered .ladder-card__surface {
          animation: ladder-card-answer var(--motion-160)
            var(--motion-standard) both;
        }

        @keyframes ladder-card-scrim-enter {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes ladder-card-enter {
          from {
            transform: translateY(16px) scale(0.94);
          }
          to {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ladder-card-answer {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(0) scale(0.96);
          }
        }
      `}</style>
    </>
  );
}
