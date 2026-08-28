"use client";

import type { ReactNode } from "react";

import {
  createSosIncidentPayload,
  createSusEventPayload,
  type SosIncidentPayload,
  type SusEventPayload,
} from "../../../domain/anonymiser/anonymiser";
import type { M4Copy } from "../../copy/strings";

export interface PoliceViewScreenProps {
  readonly copy: M4Copy;
  readonly onBack: () => void;
}

const SAMPLE_SUS: SusEventPayload = createSusEventPayload({
  zoneId: "dwaraka_police_station",
  riskTier: "high",
  hourBand: "NIGHT_DEEP",
  hourLocal: 4, // GROUNDED-EXEMPT: fixture sample hour.
  dateLocal: "2026-08-22", // GROUNDED-EXEMPT: fixture sample date.
  armMode: "AUTO_ZONE",
  source: "APP",
});

const SAMPLE_SOS: SosIncidentPayload = createSosIncidentPayload({
  uid: "anon-c78f92b", // GROUNDED-EXEMPT: pseudonymous sample ID.
  trigger: "LADDER_LAPSE",
  location: {
    lat: 17.7242, // GROUNDED-EXEMPT: Vizag centroid sample.
    lon: 83.3024, // GROUNDED-EXEMPT: Vizag centroid sample.
    accuracyM: 12.4, // GROUNDED-EXEMPT: accuracy sample in meters.
  },
  zoneId: "dwaraka_police_station",
  zoneName: "Dwaraka Police Station",
  riskTier: "high",
  hourLocal: 4, // GROUNDED-EXEMPT: fixture sample hour.
  nearestStation: {
    id: "PS-004", // GROUNDED-EXEMPT: station ID sample.
    name: "Dwaraka PS",
    phone: "0891-2565100", // GROUNDED-EXEMPT: station phone sample.
    distanceM: 298, // GROUNDED-EXEMPT: distance sample in meters.
  },
  timeline: [
    { at: "04:05:12", type: "ARMED", detail: "auto, zone entry" }, // GROUNDED-EXEMPT: sample timeline time.
    { at: "04:10:12", type: "CHECKIN_1_SHOWN" }, // GROUNDED-EXEMPT: sample timeline time.
    { at: "04:11:42", type: "CHECKIN_1_MISSED" }, // GROUNDED-EXEMPT: sample timeline time.
    { at: "04:12:42", type: "CHECKIN_2_MISSED" }, // GROUNDED-EXEMPT: sample timeline time.
    { at: "04:13:42", type: "FAMILY_NOTIFIED" }, // GROUNDED-EXEMPT: sample timeline time.
    { at: "04:14:42", type: "SOS_TRIGGERED" }, // GROUNDED-EXEMPT: sample timeline time.
  ],
  contactsNotified: 1, // GROUNDED-EXEMPT: contact count sample.
});

export function PoliceViewScreen({ copy, onBack }: PoliceViewScreenProps) {
  return (
    <main className="police-screen">
      <header className="police-screen__header">
        <button
          className="police-screen__back"
          onClick={onBack}
          type="button"
          aria-label={copy.cdBack}
        >
          {copy.cdBack}
        </button>
        <h1>{copy.policeTitle}</h1>
      </header>

      {/* Section 1: Right now */}
      <PoliceSection title={copy.policeNowNothing}>
        <p className="police-screen__highlight-body">{copy.policeNowBody}</p>
      </PoliceSection>

      {/* Section 2: If you miss two check-ins */}
      <PoliceSection title={copy.policeSusTitle}>
        <p>{copy.policeSusBody}</p>
        <div className="police-screen__record-card" data-testid="sample-sus-card">
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Zone</span>
            <strong className="police-screen__record-value">{SAMPLE_SUS.zoneId}</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Risk tier</span>
            <strong className="police-screen__record-value">{SAMPLE_SUS.riskTier}</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Hour band</span>
            <strong className="police-screen__record-value">{SAMPLE_SUS.hourBand} ({SAMPLE_SUS.hourLocal}:00)</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Date</span>
            <strong className="police-screen__record-value">{SAMPLE_SUS.dateLocal}</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Outcome</span>
            <strong className="police-screen__record-value">{SAMPLE_SUS.outcome}</strong>
          </div>
          <p className="police-screen__annotation">
            No coordinate • No session ID • No name • Unlinkable
          </p>
        </div>
      </PoliceSection>

      {/* Section 3: If SOS triggers */}
      <PoliceSection title={copy.policeSosTitle}>
        <p>{copy.policeSosBody}</p>
        <div className="police-screen__record-card police-screen__record-card--sos" data-testid="sample-sos-card">
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Location</span>
            <strong className="police-screen__record-value">
              {SAMPLE_SOS.location.lat}, {SAMPLE_SOS.location.lon} (±{SAMPLE_SOS.location.accuracyM}m)
            </strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Nearest station</span>
            <strong className="police-screen__record-value">
              {SAMPLE_SOS.nearestStation?.name} ({SAMPLE_SOS.nearestStation?.distanceM}m)
            </strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Status</span>
            <strong className="police-screen__record-value">{SAMPLE_SOS.status}</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Contacts notified</span>
            <strong className="police-screen__record-value">{SAMPLE_SOS.contactsNotified} contact</strong>
          </div>
          <div className="police-screen__record-row">
            <span className="police-screen__record-label">Timeline events</span>
            <strong className="police-screen__record-value">{SAMPLE_SOS.timeline.length} steps recorded</strong>
          </div>
          <p className="police-screen__annotation">
            Pseudonymous ID ({SAMPLE_SOS.uid}) • Identity crosses only at SOS
          </p>
        </div>
      </PoliceSection>

      {/* Permanent Footer */}
      <footer className="police-screen__disclaimer">
        <p>{copy.policeNoGovtLink}</p>
      </footer>

      <style jsx>{`
        .police-screen {
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: full-screen trust surface. */
          overflow-y: auto;
          padding: env(safe-area-inset-top) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .police-screen__header {
          position: sticky;
          z-index: 1; /* GROUNDED-EXEMPT: header stacking order. */
          inset-block-start: 0;
          display: grid;
          gap: var(--space-16);
          padding-block: var(--space-16);
          background: var(--color-background);
        }

        .police-screen__header h1 {
          margin: 0;
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
        }

        .police-screen__back {
          justify-self: start;
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border: 0;
          border-radius: var(--radius-control);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font: inherit;
        }

        .police-screen__highlight-body {
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
          color: var(--color-brand-light);
        }

        .police-screen__record-card {
          margin-block-start: var(--space-12);
          padding: var(--space-16);
          border-radius: var(--radius-card);
          background: var(--color-surface);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          display: grid;
          gap: var(--space-8);
        }

        .police-screen__record-card--sos {
          border-inline-start: 3px solid var(--color-amber);
        }

        .police-screen__record-row {
          display: flex;
          justify-content: space-between;
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
          gap: var(--space-8);
        }

        .police-screen__record-label {
          color: var(--color-text-secondary);
        }

        .police-screen__record-value {
          color: var(--color-text-primary);
          font-feature-settings: var(--font-feature-numerals);
        }

        .police-screen__annotation {
          margin: var(--space-8) 0 0;
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
          color: var(--color-text-secondary);
          border-block-start: var(--border-hairline) solid var(--color-surface-elevated);
          padding-block-start: var(--space-8);
        }

        .police-screen__disclaimer {
          margin: var(--space-24) 0 0;
          padding: var(--space-14);
          border-inline-start: 3px solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .police-screen__back:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
}

type PoliceSectionProps = Readonly<{
  children: ReactNode;
  title: string;
}>;

function PoliceSection({ children, title }: PoliceSectionProps) {
  return (
    <section className="police-section">
      <h2>{title}</h2>
      <div className="police-section__body">{children}</div>

      <style jsx>{`
        .police-section {
          padding-block-start: var(--space-24);
        }

        .police-section h2 {
          margin: 0 0 var(--space-8);
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .police-section__body {
          display: grid;
          gap: var(--space-8);
          color: var(--color-text-on-card);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .police-section__body :global(p) {
          margin: 0;
        }
      `}</style>
    </section>
  );
}
