import type { ArmMode, SessionState } from "../../domain/model/session";

export type StatusPillState = Exclude<SessionState, "RESOLVED">;

export type StatusPillIcon =
  | "verified_user"
  | "gpp_maybe"
  | "shield"
  | "sos"
  | "my_location"
  | "call"
  | "settings"
  | "visibility"
  | "home"
  | "group"
  | "chevron_right"
  | "close"
  | "check_circle"
  | "warning"
  | "cloud_off"
  | "lock";

type SharedStatusPillProps = {
  className?: string;
};

type IdleStatusPillProps = SharedStatusPillProps & {
  state: "IDLE";
  armMode?: never;
  /** C5 does not specify IDLE's icon, so its caller must choose from the frozen set. */
  icon: StatusPillIcon;
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
  icon: StatusPillIcon;
  label: string;
};

const activePresentation: Readonly<
  Record<ActiveStatusPillProps["state"], StatusPillPresentation>
> = {
  CHECKIN_1: {
    accentClassName: "status-pill--brand",
    icon: "verified_user",
    label: "CHECKING IN",
  },
  CHECKIN_2: {
    accentClassName: "status-pill--amber",
    icon: "verified_user",
    label: "STILL THERE?",
  },
  FAMILY_ESCALATED: {
    accentClassName: "status-pill--danger",
    icon: "gpp_maybe",
    label: "TELLING YOUR FAVOURITES",
  },
  SOS_ACTIVE: {
    accentClassName: "status-pill--danger",
    icon: "sos",
    label: "SOS ACTIVE",
  },
};

function presentationFor(props: StatusPillProps): StatusPillPresentation {
  if (props.state === "IDLE") {
    return {
      accentClassName: "status-pill--idle",
      icon: props.icon,
      label: "NOT WATCHING",
    };
  }

  if (props.state === "SHADOW") {
    return {
      accentClassName: "status-pill--brand",
      icon: "shield",
      label:
        props.armMode === "AUTO_ZONE" ? "WATCHING THIS STRETCH" : "WATCHING",
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
            {presentation.icon}
          </span>{" "}
          <span className="status-pill__label">{presentation.label}</span>
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
          block-size: 36px;
          padding-inline: var(--space-14);
          border: var(--status-pill-border-width) solid
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
          display: inline-block;
          inline-size: 16px;
          block-size: 16px;
          color: var(--status-pill-accent);
          font-family: "Material Symbols Rounded";
          font-size: 16px;
          font-style: normal;
          font-weight: normal;
          font-variation-settings: var(
            --status-pill-icon-variation-settings
          );
          line-height: 16px;
          text-align: center;
          text-transform: none;
          vertical-align: middle;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-feature-settings: "liga";
          user-select: none;
          animation: none;
          transition: none;
        }

        .status-pill__label {
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
          text-transform: uppercase;
          vertical-align: middle;
          animation: none;
          transition: none;
        }
      `}</style>
    </>
  );
}
