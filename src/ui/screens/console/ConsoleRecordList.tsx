"use client";

import { useState } from "react";

import type { ConsoleRecordItem, ConsoleSosRecord, ConsoleSusRecord } from "./consoleStore";

export interface ConsoleRecordListProps {
  readonly records: readonly ConsoleRecordItem[];
  readonly autoExpandedSosId: string | null;
}

export function ConsoleRecordList({
  records,
  autoExpandedSosId,
}: ConsoleRecordListProps) {
  const [expandedSosIds, setExpandedSosIds] = useState<Set<string>>(new Set());

  const toggleExpandSos = (id: string) => {
    setExpandedSosIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (records.length === 0) {
    return (
      <div className="console-empty">
        <p>No records match the current filter window.</p>
        <style jsx>{`
          .console-empty {
            padding: var(--space-32);
            text-align: center;
            color: var(--color-text-secondary);
            font-size: var(--type-body-size);
          }
        `}</style>
      </div>
    );
  }

  return (
    <ul className="console-record-list" aria-label="Incident and signal record stream">
      {records.map((item) => {
        if (item.kind === "SUS") {
          return <SusRecordRow key={`sus-${item.record.id}`} record={item.record} />;
        }
        const isExpanded =
          expandedSosIds.has(item.record.id) ||
          autoExpandedSosId === item.record.id;
        return (
          <SosRecordRow
            key={`sos-${item.record.id}`}
            record={item.record}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleExpandSos(item.record.id)}
          />
        );
      })}

      <style jsx>{`
        .console-record-list {
          list-style: none;
          margin: 0;
          padding: var(--space-16);
          display: grid;
          gap: var(--space-12);
        }
      `}</style>
    </ul>
  );
}

function SusRecordRow({ record }: { record: ConsoleSusRecord }) {
  const isDemo = record.source === "CONSOLE_DEMO";

  return (
    <li className="console-row console-row--sus" data-testid={`sus-row-${record.id}`}>
      <div className="console-row__header">
        <div className="console-row__tags">
          <span className="console-row__badge console-row__badge--sus">SUS</span>
          {isDemo ? <span className="console-row__badge console-row__badge--demo">DEMO</span> : null}
          <strong className="console-row__title">{record.zoneId}</strong>
        </div>
        <span className="console-row__outcome console-row__outcome--pending">
          {record.outcome}
        </span>
      </div>

      <div className="console-row__details">
        <span><strong>Risk tier:</strong> {record.riskTier}</span>
        <span><strong>Hour band:</strong> {record.hourBand} ({record.hourLocal}:00)</span>
        <span><strong>Date:</strong> {record.dateLocal}</span>
        <span><strong>Arm mode:</strong> {record.armMode}</span>
      </div>

      <p className="console-row__annotation">
        No coordinate • No session ID • No personal identifier
      </p>

      <style jsx>{`
        .console-row {
          padding: var(--space-16);
          border-radius: var(--radius-card);
          background: var(--color-surface);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          display: grid;
          gap: var(--space-8);
        }

        .console-row--sus {
          border-inline-start: 4px solid var(--color-brand);
        }

        .console-row__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-8);
          flex-wrap: wrap;
        }

        .console-row__tags {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .console-row__badge {
          padding: var(--space-2) var(--space-6);
          border-radius: var(--radius-control);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-bold);
        }

        .console-row__badge--sus {
          background: var(--color-brand);
          color: var(--color-text-primary);
        }

        .console-row__badge--demo {
          background: var(--color-surface-elevated);
          color: var(--color-text-secondary);
          border: var(--border-hairline) solid var(--color-text-secondary);
        }

        .console-row__title {
          font-size: var(--type-body-size);
          color: var(--color-text-primary);
        }

        .console-row__outcome {
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          padding: var(--space-2) var(--space-8);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-secondary);
        }

        .console-row__details {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-16);
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
        }

        .console-row__details strong {
          color: var(--color-text-primary);
        }

        .console-row__annotation {
          margin: 0;
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
          border-block-start: var(--border-hairline) solid var(--color-surface-elevated);
          padding-block-start: var(--space-6);
        }
      `}</style>
    </li>
  );
}

function SosRecordRow({
  record,
  isExpanded,
  onToggleExpand,
}: {
  record: ConsoleSosRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const isDemo = record.source === "CONSOLE_DEMO";
  const truncatedUid = record.uid.slice(0, 10); // GROUNDED-EXEMPT: truncate UID for display.

  return (
    <li className="console-row console-row--sos" data-testid={`sos-row-${record.id}`}>
      <div className="console-row__header">
        <div className="console-row__tags">
          <span className="console-row__badge console-row__badge--sos">SOS</span>
          {isDemo ? <span className="console-row__badge console-row__badge--demo">DEMO</span> : null}
          <strong className="console-row__title">{record.zoneName ?? record.zoneId ?? "Emergency SOS"}</strong>
        </div>
        <span className="console-row__status console-row__status--active">
          {record.status}
        </span>
      </div>

      <div className="console-row__details">
        <span><strong>Location:</strong> {record.location.lat}, {record.location.lon} (±{record.location.accuracyM}m)</span>
        <span><strong>Station:</strong> {record.nearestStation?.name ?? "None"} ({record.nearestStation?.distanceM ?? 0}m)</span>
        <span><strong>UID:</strong> {truncatedUid}...</span>
        <span><strong>Contacts notified:</strong> {record.contactsNotified}</span>
      </div>

      <div className="console-row__timeline-toggle">
        <button
          className="console-row__expand-btn"
          onClick={onToggleExpand}
          type="button"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? `▲ Hide sequence timeline (${record.timeline.length} events)`
            : `▼ Open sequence timeline (${record.timeline.length} events)`}
        </button>
      </div>

      {isExpanded ? (
        <div className="console-timeline" data-testid={`timeline-${record.id}`}>
          <ol className="console-timeline__list">
            {record.timeline.map((step, index) => (
              <li key={`step-${index}`} className="console-timeline__item">
                <span className="console-timeline__time">{step.at}</span>
                <span className="console-timeline__type">{step.type}</span>
                {step.detail ? <span className="console-timeline__detail">{step.detail}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="console-row__annotation">
        Precise coordinates & session timeline cross only at SOS • Control room receives sequence not a dot
      </p>

      <style jsx>{`
        .console-row {
          padding: var(--space-16);
          border-radius: var(--radius-card);
          background: var(--color-surface);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          display: grid;
          gap: var(--space-8);
        }

        .console-row--sos {
          border-inline-start: 4px solid var(--color-amber);
        }

        .console-row__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-8);
          flex-wrap: wrap;
        }

        .console-row__tags {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .console-row__badge {
          padding: var(--space-2) var(--space-6);
          border-radius: var(--radius-control);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-bold);
        }

        .console-row__badge--sos {
          background: var(--color-amber);
          color: var(--color-background);
        }

        .console-row__badge--demo {
          background: var(--color-surface-elevated);
          color: var(--color-text-secondary);
          border: var(--border-hairline) solid var(--color-text-secondary);
        }

        .console-row__title {
          font-size: var(--type-body-size);
          color: var(--color-text-primary);
        }

        .console-row__status {
          font-size: var(--type-caption-size);
          font-weight: var(--weight-bold);
          padding: var(--space-2) var(--space-8);
          border-radius: var(--radius-control);
          background: var(--color-amber);
          color: var(--color-background);
        }

        .console-row__details {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-16);
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
        }

        .console-row__details strong {
          color: var(--color-text-primary);
        }

        .console-row__timeline-toggle {
          margin-block-start: var(--space-4);
        }

        .console-row__expand-btn {
          background: transparent;
          border: 0;
          padding: 0;
          color: var(--color-brand-light);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          cursor: pointer;
          text-decoration: underline;
        }

        .console-timeline {
          margin-block-start: var(--space-8);
          padding: var(--space-12);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          border: var(--border-hairline) solid var(--color-surface-elevated);
        }

        .console-timeline__list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: var(--space-6);
        }

        .console-timeline__item {
          display: flex;
          gap: var(--space-12);
          font-size: var(--type-caption-size);
          font-feature-settings: var(--font-feature-numerals);
        }

        .console-timeline__time {
          color: var(--color-brand-light);
          font-weight: var(--weight-semibold);
          min-inline-size: 60px;
        }

        .console-timeline__type {
          color: var(--color-text-primary);
          font-weight: var(--weight-semibold);
        }

        .console-timeline__detail {
          color: var(--color-text-secondary);
        }

        .console-row__annotation {
          margin: 0;
          font-size: var(--type-caption-size);
          color: var(--color-text-secondary);
          border-block-start: var(--border-hairline) solid var(--color-surface-elevated);
          padding-block-start: var(--space-6);
        }
      `}</style>
    </li>
  );
}
