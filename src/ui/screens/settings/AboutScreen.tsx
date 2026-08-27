"use client";

import type { ReactNode } from "react";

import { formatCopy, type M4Copy } from "../../copy/strings";

export interface AboutScreenProps {
  readonly copy: M4Copy;
  readonly founderContact: string | null;
  readonly mockedClaims: readonly string[];
  readonly onBack: () => void;
  readonly realClaims: readonly string[];
  readonly versionCode: number;
  readonly versionName: string;
}

export function AboutScreen({
  copy,
  founderContact,
  mockedClaims,
  onBack,
  realClaims,
  versionCode,
  versionName,
}: AboutScreenProps) {
  return (
    <main className="about-screen">
      <header className="about-screen__header">
        <button className="about-screen__back" onClick={onBack} type="button">
          {copy.cdBack}
        </button>
        <h1>{copy.aboutTitle}</h1>
      </header>

      <div aria-label={copy.appName} className="about-screen__wordmark">
        {copy.appName}
      </div>
      <p className="about-screen__version">
        {formatCopy(copy.aboutVersion, versionName, versionCode)}
      </p>

      <AboutSection title={copy.aboutWhatTitle}>
        <p>{copy.aboutWhatBody}</p>
      </AboutSection>

      <AboutSection title={copy.aboutRealTitle}>
        <ul>
          {realClaims.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </AboutSection>

      {mockedClaims.length === 0 ? null : (
        <AboutSection title={copy.aboutMockTitle}>
          <ul>
            {mockedClaims.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AboutSection>
      )}

      <AboutSection title={copy.aboutNotTitle}>
        <p>{copy.policeNoGovtLink}</p>
      </AboutSection>

      <AboutSection title={copy.aboutNoAiTitle}>
        <p>{copy.aboutNoAiBody}</p>
      </AboutSection>

      <AboutSection title={copy.aboutDataTitle}>
        <p>{copy.aboutDataBody}</p>
      </AboutSection>

      <AboutSection title={copy.aboutAttribTitle}>
        <p>{copy.aboutAttribMap}</p>
        <p>{copy.aboutAttribFonts}</p>
      </AboutSection>

      <AboutSection title={copy.aboutContactTitle}>
        {founderContact === null ? null : (
          <address>
            <a href={`mailto:${founderContact}`}>{founderContact}</a>
          </address>
        )}
      </AboutSection>

      <style jsx>{`
        .about-screen {
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: full-screen About surface. */
          overflow-y: auto;
          padding: env(safe-area-inset-top) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .about-screen__header {
          position: sticky;
          z-index: 1; /* GROUNDED-EXEMPT: structural header stacking within this screen. */
          inset-block-start: 0;
          display: grid;
          gap: var(--space-16);
          padding-block: var(--space-16);
          background: var(--color-background);
        }

        .about-screen__header h1 {
          margin: 0;
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
        }

        .about-screen__back {
          justify-self: start;
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border: 0;
          border-radius: var(--radius-control);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font: inherit;
        }

        .about-screen__wordmark {
          padding-block-start: var(--space-24);
          color: var(--color-brand-light);
          font-size: var(--type-display-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-display-line-height);
        }

        .about-screen__version {
          margin: var(--space-4) 0 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          font-feature-settings: var(--font-feature-numerals);
          line-height: var(--type-caption-line-height);
        }

        .about-screen__back:focus-visible,
        .about-screen a:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
}

type AboutSectionProps = Readonly<{
  children: ReactNode;
  title: string;
}>;

function AboutSection({ children, title }: AboutSectionProps) {
  return (
    <section className="about-section">
      <h2>{title}</h2>
      <div className="about-section__body">{children}</div>

      <style jsx>{`
        .about-section {
          padding-block-start: var(--space-24);
        }

        .about-section h2 {
          margin: 0 0 var(--space-8);
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .about-section__body {
          display: grid;
          gap: var(--space-8);
          color: var(--color-text-on-card);
          font-size: var(--type-card-body-size);
          line-height: var(--type-card-body-line-height);
        }

        .about-section__body :global(p),
        .about-section__body :global(ul),
        .about-section__body :global(address) {
          margin: 0;
        }

        .about-section__body :global(ul) {
          display: grid;
          gap: var(--space-8);
          padding-inline-start: var(--space-20);
        }

        .about-section__body :global(address) {
          font-style: normal;
        }

        .about-section__body :global(a) {
          color: var(--color-brand-light);
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  );
}
