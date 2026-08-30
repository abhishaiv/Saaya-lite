import type { ArmMode, SessionState } from "../../domain/model/session";
import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../icons/MaterialSymbol";

export type StatusPillState = Exclude<SessionState, "RESOLVED">;

export type StatusPillLabels = Readonly<{
  checkIn1: string;
  checkIn2: string;
  family: string;
  idle: string;
  shadowAuto: string;
  shadowManual: string;
  sos: string;
}>;

type SharedStatusPillProps = {
  className?: string;
  /** Localized values for all seven COPY.md status keys. */
  labels: StatusPillLabels;
};

type IdleStatusPillProps = SharedStatusPillProps & {
  state: "IDLE";
  armMode?: never;
  /** C5 does not specify IDLE's icon, so its caller must choose from the frozen set. */
  icon: MaterialSymbolName;
};

type ShadowStatusPillProps = SharedStatusPillProps & {
  state: "SHADOW";
  armMode: ArmMode;
  icon?: never;
};

type ActiveStatusPillProps = SharedStatusPillProps & {
  state: Exclude<StatusPillState, "IDLE" | "SHADOW">;
  armMode?: never;
  icon?: never;
};

export type StatusPillProps = Readonly<
  IdleStatusPillProps | ShadowStatusPillProps | ActiveStatusPillProps
>;

type StatusPillPresentation = {
  accentClassName: string;
  icon: MaterialSymbolName;
  labelKey: keyof StatusPillLabels;
};

const activePresentation: Readonly<
  Record<ActiveStatusPillProps["state"], StatusPillPresentation>
> = {
  CHECKIN_1: {
    accentClassName: "status-pill--brand",
    icon: "verified_user",
    labelKey: "checkIn1",
  },
  CHECKIN_2: {
    accentClassName: "status-pill--amber",
    icon: "verified_user",
    labelKey: "checkIn2",
  },
  FAMILY_ESCALATED: {
    accentClassName: "status-pill--danger",
    icon: "gpp_maybe",
    labelKey: "family",
  },
  SOS_ACTIVE: {
    accentClassName: "status-pill--danger",
    icon: "sos",
    labelKey: "sos",
  },
};

function presentationFor(props: StatusPillProps): StatusPillPresentation {
  if (props.state === "IDLE") {
    return {
      accentClassName: "status-pill--idle",
      icon: props.icon,
      labelKey: "idle",
    };
  }

  if (props.state === "SHADOW") {
    return {
      accentClassName: "status-pill--brand",
      icon: "shield",
      labelKey:
        props.armMode === "AUTO_ZONE" ? "shadowAuto" : "shadowManual",
    };
  }

  return activePresentation[props.state];
}

/** C5's always-visible, non-interactive session status over the map. */
export function StatusPill(props: StatusPillProps) {
  const presentation = presentationFor(props);
  const classes = [
    "status-pill",
    presentation.accentClassName,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <span
        aria-atomic="true"
        className={classes}
        data-arm-mode={props.state === "SHADOW" ? props.armMode : undefined}
        data-state={props.state}
        role="status"
      >
        <span className="status-pill__content">
          <span aria-hidden="true" className="status-pill__icon">
            <MaterialSymbol
              decorative
              fill="state"
              name={presentation.icon}
              size={16}
            />
          </span>{" "}
          <span className="status-pill__label">
            {props.labels[presentation.labelKey]}
          </span>
        </span>
      </span>

      <style jsx>{`
        .status-pill {
          --status-pill-accent: var(--color-text-secondary);

          position: absolute;
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12)
          );
          inset-inline-start: 0;
          display: inline-flex;
          align-items: center;
          block-size: var(--status-pill-height);
          padding-inline: var(--space-14);
          border: 1px solid
            rgb(from var(--status-pill-accent) r g b / 0.4);
          border-radius: 18px;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-primary);
          white-space: nowrap;
          animation: none;
          transition: none;
        }

        .status-pill--idle {
          --status-pill-accent: var(--color-text-secondary);
        }

        .status-pill--brand {
          --status-pill-accent: var(--color-brand);
        }

        .status-pill--amber {
          --status-pill-accent: var(--color-amber);
        }

        .status-pill--danger {
          --status-pill-accent: var(--color-danger);
        }

        .status-pill__content {
          white-space: nowrap;
          animation: none;
          transition: none;
        }

        .status-pill__icon {
          display: inline-flex;
          inline-size: 16px;
          block-size: 16px;
          color: var(--status-pill-accent);
          align-items: center;
          justify-content: center;
          animation: none;
          transition: none;
        }

        .status-pill__label {
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          vertical-align: middle;
          animation: none;
          transition: none;
        }
      `}</style>
    </>
  );
}
