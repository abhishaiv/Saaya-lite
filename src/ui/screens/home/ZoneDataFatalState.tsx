"use client";

import { SaayaButton } from "../../components/SaayaButton";
import { M4_COPY, type SaayaLocale } from "../../copy/strings";

export interface ZoneDataFatalStateProps {
  readonly locale: SaayaLocale;
  readonly onRetry: () => void;
}

/** Fatal by design: an empty map must never be allowed to look like a safe city. */
export function ZoneDataFatalState({
  locale,
  onRetry,
}: ZoneDataFatalStateProps) {
  const copy = M4_COPY[locale];

  return (
    <main className="zone-data-fatal-state">
      <section className="zone-data-fatal-state__content" role="alert">
        <h1>{copy.appName}</h1>
        <p>{copy.errZoneData}</p>
        <SaayaButton
          onClick={onRetry}
          variant="primary"
          workingLabel={copy.stateWorking}
        >
          {copy.ctaRetry}
        </SaayaButton>
      </section>

      <style jsx>{`
        .zone-data-fatal-state {
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: fatal route state fills the viewport. */
          display: grid;
          place-items: center;
          padding: var(--screen-padding);
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .zone-data-fatal-state__content {
          display: grid;
          gap: var(--space-16);
          inline-size: 100%; /* GROUNDED-EXEMPT: content uses the padded mobile viewport. */
        }

        .zone-data-fatal-state h1,
        .zone-data-fatal-state p {
          margin: 0;
        }

        .zone-data-fatal-state h1 {
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
        }

        .zone-data-fatal-state p {
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }
      `}</style>
    </main>
  );
}
