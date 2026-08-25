"use client";

import type { AnimationEvent } from "react";

import { MaterialSymbol } from "../icons/MaterialSymbol";

export type ArmBannerProps = Readonly<{
  /** Already-localized home_arm_banner_body with the zone and hour formatted in. */
  body: string;
  className?: string;
  onAutoHide: () => void;
  /** Already-localized home_arm_banner_title. */
  title: string;
}>;

/** C14's transient acknowledgement that an AUTO_ZONE session armed itself. */
export function ArmBanner({
  body,
  className,
  onAutoHide,
  title,
}: ArmBannerProps) {
  const classes = ["arm-banner", className].filter(Boolean).join(" ");

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target) {
      onAutoHide();
    }
  }

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={classes}
      onAnimationEnd={handleAnimationEnd}
      role="status"
    >
      <div className="arm-banner__surface">
        <span aria-hidden="true" className="arm-banner__icon">
          <MaterialSymbol
            decorative
            fill="state"
            name="shield"
            size={24}
          />
        </span>

        <span className="arm-banner__copy">
          <span className="arm-banner__title">{title}</span>
          <span className="arm-banner__body">{body}</span>
        </span>
      </div>

      <style jsx>{`
        .arm-banner {
          display: block;
          box-sizing: border-box;
          margin: var(--space-20);
          animation: arm-banner-hide var(--motion-200)
            var(--motion-standard) var(--arm-banner-delay) forwards;
        }

        .arm-banner__surface {
          display: flex;
          align-items: flex-start;
          gap: var(--space-12);
          box-sizing: border-box;
          padding: var(--space-16);
          border: 1px solid
            rgb(from var(--color-brand) r g b / 0.4);
          border-radius: var(--radius-card);
          background: var(--color-card-fill);
          animation: arm-banner-enter var(--motion-300)
            var(--motion-spring) both;
        }

        .arm-banner__icon {
          flex: 0 0 auto;
          display: inline-flex;
          inline-size: 24px;
          block-size: 24px;
          align-items: center;
          justify-content: center;
          color: var(--color-brand);
        }

        .arm-banner__copy {
          display: flex;
          min-inline-size: 0;
          flex: 1;
          flex-direction: column;
          gap: var(--space-4);
        }

        .arm-banner__title {
          color: var(--color-text-primary);
          font-size: var(--type-headline-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-headline-line-height);
        }

        .arm-banner__body {
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-regular);
          line-height: var(--type-caption-line-height);
        }

        @keyframes arm-banner-enter {
          from {
            opacity: 0;
            transform: translateY(-100%); /* GROUNDED-EXEMPT: full self-height is the structural origin for a slide down from the top */
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes arm-banner-hide {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
