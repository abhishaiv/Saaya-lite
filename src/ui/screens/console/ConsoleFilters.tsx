"use client";

import type { TimeWindow, TypeFilter } from "./consoleStore";

export interface ConsoleFiltersProps {
  readonly window: TimeWindow;
  readonly typeFilter: TypeFilter;
  readonly hideCancelled: boolean;
  readonly hiddenCancelledCount: number;
  readonly onWindowChange: (window: TimeWindow) => void;
  readonly onTypeFilterChange: (type: TypeFilter) => void;
  readonly onHideCancelledChange: (hide: boolean) => void;
}

export function ConsoleFilters({
  window,
  typeFilter,
  hideCancelled,
  hiddenCancelledCount,
  onWindowChange,
  onTypeFilterChange,
  onHideCancelledChange,
}: ConsoleFiltersProps) {
  return (
    <section className="console-filters" aria-label="Console query filters">
      {/* Time Window Buttons */}
      <div className="console-filters__group" role="group" aria-label="Time window">
        <span className="console-filters__label">Window:</span>
        <button
          className={`console-filters__btn ${window === "24h" ? "console-filters__btn--active" : ""}`}
          onClick={() => onWindowChange("24h")}
          type="button"
        >
          24h
        </button>
        <button
          className={`console-filters__btn ${window === "7d" ? "console-filters__btn--active" : ""}`}
          onClick={() => onWindowChange("7d")}
          type="button"
        >
          7d
        </button>
        <button
          className={`console-filters__btn ${window === "30d" ? "console-filters__btn--active" : ""}`}
          onClick={() => onWindowChange("30d")}
          type="button"
        >
          30d
        </button>
      </div>

      {/* Type Filter Buttons */}
      <div className="console-filters__group" role="group" aria-label="Signal type">
        <span className="console-filters__label">Type:</span>
        <button
          className={`console-filters__btn ${typeFilter === "ALL" ? "console-filters__btn--active" : ""}`}
          onClick={() => onTypeFilterChange("ALL")}
          type="button"
        >
          All
        </button>
        <button
          className={`console-filters__btn ${typeFilter === "SUS" ? "console-filters__btn--active" : ""}`}
          onClick={() => onTypeFilterChange("SUS")}
          type="button"
        >
          SUS only
        </button>
        <button
          className={`console-filters__btn ${typeFilter === "SOS" ? "console-filters__btn--active" : ""}`}
          onClick={() => onTypeFilterChange("SOS")}
          type="button"
        >
          SOS only
        </button>
      </div>

      {/* Hide Cancelled Toggle */}
      <label className="console-filters__checkbox-label">
        <input
          type="checkbox"
          checked={hideCancelled}
          onChange={(e) => onHideCancelledChange(e.target.checked)}
        />
        <span>Hide cancelled ({hiddenCancelledCount} hidden)</span>
      </label>

      <style jsx>{`
        .console-filters {
          display: flex;
          align-items: center;
          gap: var(--space-20);
          padding: var(--space-12) var(--space-16);
          background: var(--color-surface);
          border-block-end: var(--border-hairline) solid var(--color-surface-elevated);
          flex-wrap: wrap;
        }

        .console-filters__group {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }

        .console-filters__label {
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
          font-weight: var(--weight-semibold);
        }

        .console-filters__btn {
          min-block-size: 32px;
          padding: 0 var(--space-12);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          cursor: pointer;
        }

        .console-filters__btn--active {
          background: var(--color-brand);
          color: var(--color-text-primary);
          border-color: var(--color-brand-light);
          font-weight: var(--weight-semibold);
        }

        .console-filters__checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
