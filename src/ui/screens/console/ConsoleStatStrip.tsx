"use client";

import type { ConsoleStats } from "./consoleStore";

export interface ConsoleStatStripProps {
  readonly stats: ConsoleStats;
}

export function ConsoleStatStrip({ stats }: ConsoleStatStripProps) {
  const fprPercent = Math.round(stats.falsePositiveRate * 100); // GROUNDED-EXEMPT: percentage conversion (0..100).

  return (
    <section className="console-stat-strip" aria-label="Incident and signal statistics">
      <div className="console-stat-strip__card">
        <span className="console-stat-strip__label">SUS events</span>
        <strong className="console-stat-strip__value">{stats.susCount}</strong>
      </div>
      <div className="console-stat-strip__card console-stat-strip__card--sos">
        <span className="console-stat-strip__label">SOS incidents</span>
        <strong className="console-stat-strip__value">{stats.sosCount}</strong>
      </div>
      <div className="console-stat-strip__card">
        <span className="console-stat-strip__label">Zones flagged</span>
        <strong className="console-stat-strip__value">{stats.zonesFlaggedCount}</strong>
      </div>
      <div className="console-stat-strip__card">
        <span className="console-stat-strip__label">Repeat zones</span>
        <strong className="console-stat-strip__value">{stats.repeatZonesCount}</strong>
      </div>
      <div className="console-stat-strip__card console-stat-strip__card--fpr">
        <span className="console-stat-strip__label">False-positive rate</span>
        <strong className="console-stat-strip__value">{fprPercent}%</strong>
        <small className="console-stat-strip__sub">({stats.cancelledCount} cancelled by user)</small>
      </div>

      <style jsx>{`
        .console-stat-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-12);
          padding: var(--space-16);
          background: var(--color-background);
        }

        .console-stat-strip__card {
          padding: var(--space-12) var(--space-16);
          border-radius: var(--radius-card);
          background: var(--color-surface);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          display: grid;
          gap: var(--space-4);
        }

        .console-stat-strip__card--sos {
          border-inline-start: 3px solid var(--color-amber);
        }

        .console-stat-strip__card--fpr {
          border-inline-start: 3px solid var(--color-brand);
        }

        .console-stat-strip__label {
          font-size: var(--type-label-size);
          color: var(--color-text-secondary);
          letter-spacing: var(--type-label-tracking);
          font-weight: var(--weight-semibold);
        }

        .console-stat-strip__value {
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
          color: var(--color-text-primary);
          font-feature-settings: var(--font-feature-numerals);
        }

        .console-stat-strip__sub {
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
        }
      `}</style>
    </section>
  );
}
