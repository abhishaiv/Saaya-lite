"use client";

import type { ReactNode } from "react";

export interface SurfacePanelProps {
  readonly children: ReactNode;
  /** The row under the heading: tabs, a field, a count. */
  readonly controls?: ReactNode;
  readonly heading: string;
}

/**
 * The paper a feed, search or profile surface is drawn on: the board's tinted paper, with
 * the interface's dark ink, so the surfaces she opens from the nav read as pages of one
 * product rather than three dialogs.
 *
 * It sits above the map and below the nav, the two view controls and the SOS/SUS rail, so
 * the ladder's own controls stay reachable with any surface open. Its own padding clears
 * both fixed edges for the same reason.
 */
export function SurfacePanel({ children, controls, heading }: SurfacePanelProps) {
  return (
    <section aria-label={heading} className="surface-panel">
      <header className="surface-panel__header">
        <h1 className="surface-panel__heading">{heading}</h1>
        {controls === undefined ? null : (
          <div className="surface-panel__controls">{controls}</div>
        )}
      </header>
      {children}

      <style jsx>{`
        .surface-panel {
          /* No z-index of its own: a surface is the last ordinary overlay in tree order -
             after the map, before every sheet. The nav (3) sits above it, so the tabs stay
             reachable from any board; the view's two controls (4) and the SOS/SUS rail (6)
             sit above both; and every sheet carries a rung of its own, above all of these,
             so a sheet opened from a board is never covered by the chrome. */
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
          /* The top clears the settings rail the way the map's own search pill does; the
             bottom clears the nav and the safe area, both read in the same tokens the nav
             measures itself with. */
          padding-block: calc(
              env(safe-area-inset-top) + var(--space-12) +
                var(--minimum-touch-target) + var(--space-8)
            )
            calc(
              env(safe-area-inset-bottom) + var(--space-12) +
                var(--minimum-touch-target) + var(--space-8) + var(--space-8) +
                var(--space-24)
            );
          padding-inline: var(--screen-padding);
          overflow-y: auto;
          overscroll-behavior: contain;
          /* The board's paper, not the card white: the white cards stand on it, so this is
             the one surface in the product that is neither white nor the map. Brand mixed
             into paper white, at the one weight the three surfaces share. */
          background: color-mix(
            in srgb,
            var(--color-brand) 18%,
            var(--color-text-primary)
          ); /* fact: alpha.board.paper */
          color: var(--color-background);
          pointer-events: auto;
        }

        .surface-panel__header {
          display: grid;
          gap: var(--space-12);
        }

        .surface-panel__heading {
          margin: 0;
          font-size: var(--type-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-title-line-height);
        }

        .surface-panel__controls {
          display: flex;
          gap: var(--space-8);
        }
      `}</style>
    </section>
  );
}
