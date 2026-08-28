"use client";

import { useEffect, useState } from "react";

export interface ConsoleHeaderProps {
  readonly onTriggerJourney: () => Promise<void>;
  readonly isRunningJourney: boolean;
  readonly currentNarration: string | null;
}

const COOLDOWN_SECONDS = 90; // GROUNDED-EXEMPT: 90s cooldown requirement from CONSOLE_SPEC.md.

export function ConsoleHeader({
  onTriggerJourney,
  isRunningJourney,
  currentNarration,
}: ConsoleHeaderProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1)); // GROUNDED-EXEMPT: 1-second countdown tick.
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleTrigger = async () => {
    if (isRunningJourney || cooldownRemaining > 0) return;
    setCooldownRemaining(COOLDOWN_SECONDS);
    await onTriggerJourney();
  };

  return (
    <header className="console-header">
      <div className="console-header__title-row">
        <div className="console-header__title-group">
          <span className="console-header__badge">PROTOTYPE</span>
          <h1>SAAYA LITE — STATE VIEW</h1>
        </div>
        <button
          className="console-header__journey-btn"
          disabled={isRunningJourney || cooldownRemaining > 0}
          onClick={handleTrigger}
          type="button"
        >
          {isRunningJourney
            ? "▶ Playing synthetic journey..."
            : cooldownRemaining > 0
            ? `▶ Watch a journey happen (${cooldownRemaining}s)`
            : "▶ Watch a journey happen"}
        </button>
      </div>

      <p className="console-header__disclaimer">
        Not connected to AP Police, Shakthi, T-Safe, 112 or ERSS. All records are synthetic.
      </p>
      <p className="console-header__subcaption">
        Nothing is installed and nobody is in danger. This writes a synthetic session and shows you what a control room would receive.
      </p>

      {currentNarration === null ? null : (
        <div className="console-header__narration" role="status" aria-live="polite">
          <span className="console-header__narration-label">LIVE JOURNEY STEP:</span>
          <p className="console-header__narration-text">{currentNarration}</p>
        </div>
      )}

      <style jsx>{`
        .console-header {
          display: grid;
          gap: var(--space-8);
          padding: var(--space-16);
          background: var(--color-surface);
          border-block-end: var(--border-hairline) solid var(--color-surface-elevated);
        }

        .console-header__title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-16);
          flex-wrap: wrap;
        }

        .console-header__title-group {
          display: flex;
          align-items: center;
          gap: var(--space-12);
        }

        .console-header__badge {
          display: inline-block;
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-control);
          background: var(--color-amber);
          color: var(--color-background);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-bold);
          letter-spacing: var(--type-label-tracking);
        }

        .console-header h1 {
          margin: 0;
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
          color: var(--color-text-primary);
        }

        .console-header__journey-btn {
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-16);
          border: 0;
          border-radius: var(--radius-control);
          background: var(--color-brand);
          color: var(--color-text-primary);
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          cursor: pointer;
        }

        .console-header__journey-btn:disabled {
          opacity: 0.5; /* GROUNDED-EXEMPT: disabled state opacity. */
          cursor: not-allowed;
        }

        .console-header__disclaimer {
          margin: 0;
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
        }

        .console-header__subcaption {
          margin: 0;
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .console-header__narration {
          margin-block-start: var(--space-8);
          padding: var(--space-12) var(--space-16);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          border-inline-start: 4px solid var(--color-brand-light);
          display: grid;
          gap: var(--space-4);
        }

        .console-header__narration-label {
          font-size: var(--type-label-size);
          font-weight: var(--weight-bold);
          color: var(--color-brand-light);
          letter-spacing: var(--type-label-tracking);
        }

        .console-header__narration-text {
          margin: 0;
          font-size: var(--type-body-size);
          color: var(--color-text-primary);
        }
      `}</style>
    </header>
  );
}
