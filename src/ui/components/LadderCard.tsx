import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";
import { capturePointer, releasePointer } from "../../platform/pointerCapture";
import { installConsumeBackGuard } from "../../platform/sosBackGuard";

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
  /** A vertical swipe only hides the visual card. The safety state and deadline keep running. */
  onMinimize?: () => void;
  /** Localized visible-action label for the visual-only minimize gesture. */
  minimizeLabel?: string;
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

type LadderCardSwipe = Readonly<{
  pointerId: number;
  startClientX: number;
  startClientY: number;
}>;

/** A direction-only swipe rule avoids inventing an unproven pixel threshold. */
export function ladderCardSwipeRelease(
  startClientX: number,
  startClientY: number,
  endClientX: number,
  endClientY: number,
): boolean {
  const deltaX = endClientX - startClientX;
  const deltaY = endClientY - startClientY;

  return deltaY !== 0 && Math.abs(deltaY) > Math.abs(deltaX);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("a, button, input, select, textarea") !== null
  );
}

/**
 * C3's modal ladder surface. Browser back/history handling belongs to the screen or
 * platform adapter; this component exposes the required policy as data and a typed prop.
 */
export function LadderCard(props: LadderCardProps) {
  const backPolicy = props.backPolicy ?? LADDER_CARD_BACK_POLICY[props.rung];
  const [swipe, setSwipe] = useState<LadderCardSwipe | null>(null);

  useEffect(
    () =>
      props.phase !== "deadline-passed" && backPolicy === "consume"
        ? installConsumeBackGuard()
        : undefined,
    [backPolicy, props.phase],
  );

  if (props.phase === "deadline-passed") {
    return null;
  }

  const {
    ariaLabel,
    className,
    id = "ladder-card",
    message,
    minimizeLabel,
    onMinimize,
    phase,
    primary,
    rung,
    secondary,
    title,
  } = props;
  const presentation = rungPresentation[rung];
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  const canMinimize = onMinimize !== undefined && minimizeLabel !== undefined;
  const classes = [
    "ladder-card",
    presentation.className,
    phaseClassNames[phase],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !canMinimize ||
      !event.isPrimary ||
      event.button !== 0 ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }

    capturePointer(event.currentTarget, event.pointerId);
    setSwipe({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipe?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.currentTarget, event.pointerId);
    const minimize = ladderCardSwipeRelease(
      swipe.startClientX,
      swipe.startClientY,
      event.clientX,
      event.clientY,
    );
    setSwipe(null);

    if (minimize) {
      event.preventDefault();
      onMinimize?.();
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipe?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.currentTarget, event.pointerId);
    setSwipe(null);
  }

  return (
    <>
      <div
        aria-describedby={messageId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        className={classes}
        data-back-policy={backPolicy}
        data-phase={phase}
        data-rung={rung}
        data-scrim-dismisses="false"
        data-swipe-dismisses={canMinimize ? "visual-only" : "false"}
        role="dialog"
      >
        <div aria-hidden="true" className="ladder-card__scrim" />

        <div
          aria-label={canMinimize ? minimizeLabel : undefined}
          className="ladder-card__surface"
          onPointerCancel={canMinimize ? handlePointerCancel : undefined}
          onPointerDown={canMinimize ? handlePointerDown : undefined}
          onPointerUp={canMinimize ? handlePointerUp : undefined}
        >
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
          z-index: 10; /* GROUNDED-EXEMPT: the active ladder must stay above the Home demo sheet and below session truth and SOS. */
          inset: 0;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-inline: var(--space-30);
          padding-block-end: calc(44px + env(safe-area-inset-bottom));
          pointer-events: none;
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
          background: transparent;
          pointer-events: none;
        }

        .ladder-card__surface {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--space-14);
          padding: var(--space-22);
          border-radius: var(--radius-card);
          background: var(--color-card-fill);
          pointer-events: auto;
          touch-action: none;
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
