import type { CSSProperties, ReactNode } from "react";

export type CountdownRingProps = Readonly<{
  ariaLabel: string;
  className?: string;
  formatAnnouncement: (seconds: number) => ReactNode;
  seconds: number;
  totalSeconds: number;
} &
  (
    | {
        variant: "card";
        rung: "CHECKIN_1" | "CHECKIN_2" | "FAMILY_ESCALATED";
      }
    | {
        variant: "sos";
        rung: "SOS_ACTIVE";
      }
  )>;

const DIAMETER_BY_VARIANT = {
  card: 88,
  sos: 140,
} as const;

const STROKE_WIDTH = 6;

export function CountdownRing({
  ariaLabel,
  className,
  formatAnnouncement,
  rung,
  seconds,
  totalSeconds,
  variant,
}: CountdownRingProps) {
  const duration = Math.max(0, totalSeconds);
  const remaining = Math.max(0, Math.min(seconds, duration));
  const progress = duration === 0 ? 0 : remaining / duration;
  const diameter = DIAMETER_BY_VARIANT[variant];
  const center = diameter / 2;
  const radius = (diameter - STROKE_WIDTH) / 2;
  const shouldAnnounce =
    remaining === 60 ||
    remaining === 30 ||
    remaining === 10 ||
    remaining < 5;
  const classes = ["countdown-ring", className].filter(Boolean).join(" ");
  const style = {
    "--countdown-ring-diameter": `${diameter}px`,
  } as CSSProperties;

  return (
    <div
      aria-label={ariaLabel}
      className={classes}
      data-rung={rung}
      data-variant={variant}
      role="timer"
      style={style}
    >
      <svg
        aria-hidden="true"
        className="countdown-ring__graphic"
        viewBox={`0 0 ${diameter} ${diameter}`}
      >
        <circle
          className="countdown-ring__track"
          cx={center}
          cy={center}
          fill="none"
          pathLength={1}
          r={radius}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          className="countdown-ring__progress"
          cx={center}
          cy={center}
          fill="none"
          pathLength={1}
          r={radius}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
        />
      </svg>

      <span aria-hidden="true" className="countdown-ring__numeral">
        {remaining}
      </span>

      <span
        aria-atomic="true"
        aria-live="polite"
        className="countdown-ring__live"
      >
        {shouldAnnounce ? formatAnnouncement(remaining) : null}
      </span>

      <style jsx>{`
        .countdown-ring {
          position: relative;
          display: inline-grid;
          inline-size: var(--countdown-ring-diameter);
          block-size: var(--countdown-ring-diameter);
          color: var(--color-text-primary);
          place-items: center;
        }

        .countdown-ring[data-rung="CHECKIN_1"] {
          --countdown-ring-accent: var(--accent-checkin-1);
        }

        .countdown-ring[data-rung="CHECKIN_2"] {
          --countdown-ring-accent: var(--accent-checkin-2);
        }

        .countdown-ring[data-rung="FAMILY_ESCALATED"] {
          --countdown-ring-accent: var(--accent-family);
        }

        .countdown-ring[data-rung="SOS_ACTIVE"] {
          --countdown-ring-accent: var(--accent-sos);
        }

        .countdown-ring__graphic,
        .countdown-ring__numeral {
          position: absolute;
          inset: 0;
          inline-size: var(--countdown-ring-diameter);
          block-size: var(--countdown-ring-diameter);
        }

        .countdown-ring__track {
          opacity: 0.12;
          stroke: var(--color-text-primary);
        }

        .countdown-ring__progress {
          stroke: var(--countdown-ring-accent);
          transition: stroke-dashoffset 1000ms linear;
        }

        .countdown-ring__numeral {
          display: grid;
          font-feature-settings: var(--font-feature-numerals);
          font-size: var(--type-display-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-display-line-height);
          place-items: center;
          transition: none;
        }

        .countdown-ring__live {
          position: absolute;
          overflow: hidden;
          inline-size: 1px;
          block-size: 1px;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .countdown-ring__progress {
            transition-duration: 1000ms !important;
          }
        }
      `}</style>
    </div>
  );
}
