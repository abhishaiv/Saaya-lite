"use client";

import type { M4Copy, SaayaLocale } from "../../copy/strings";
import { MaterialSymbol } from "../../icons/MaterialSymbol";

export interface SettingsScreenProps {
  readonly copy: M4Copy;
  readonly locale: SaayaLocale;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SaayaLocale) => void;
  readonly onOpenAbout: () => void;
  readonly onOpenDemo: () => void;
}

export function SettingsScreen({
  copy,
  locale,
  onBack,
  onLocaleChange,
  onOpenAbout,
  onOpenDemo,
}: SettingsScreenProps) {
  return (
    <main className="settings-screen">
      <header className="settings-screen__header">
        <button className="settings-screen__back" onClick={onBack} type="button">
          {copy.cdBack}
        </button>
        <h1>{copy.setTitle}</h1>
      </header>

      <nav aria-label={copy.setTitle} className="settings-screen__rows">
        <SettingsRow label={copy.setAbout} onClick={onOpenAbout} />
        <SettingsRow
          label={copy.setDemo}
          onClick={onOpenDemo}
          supporting={copy.setDemoSub}
        />
        <SettingsLanguageRow
          copy={copy}
          locale={locale}
          onLocaleChange={onLocaleChange}
        />
      </nav>

      <p className="settings-screen__disclaimer">{copy.policeNoGovtLink}</p>

      <style jsx>{`
        .settings-screen {
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: full-screen Settings surface. */
          overflow-y: auto;
          padding: env(safe-area-inset-top) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .settings-screen__header {
          position: sticky;
          z-index: 1; /* GROUNDED-EXEMPT: structural header stacking within this screen. */
          inset-block-start: 0;
          display: grid;
          gap: var(--space-16);
          padding-block: var(--space-16);
          background: var(--color-background);
        }

        .settings-screen__header h1 {
          margin: 0;
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
        }

        .settings-screen__back {
          justify-self: start;
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border: 0;
          border-radius: var(--radius-control);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font: inherit;
        }

        .settings-screen__rows {
          overflow: hidden;
          border: var(--border-hairline) solid var(--color-surface-elevated);
          border-radius: var(--radius-card);
          background: var(--color-card-fill);
        }

        .settings-screen__disclaimer {
          margin: var(--space-24) 0 0;
          padding: var(--space-14);
          border-inline-start: 3px solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .settings-screen__back:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
}

type SettingsRowProps = Readonly<{
  label: string;
  onClick: () => void;
  supporting?: string;
}>;

function SettingsRow({ label, onClick, supporting }: SettingsRowProps) {
  return (
    <button className="settings-row" onClick={onClick} type="button">
      <span>
        <strong>{label}</strong>
        {supporting === undefined ? null : <small>{supporting}</small>}
      </span>
      <MaterialSymbol
        decorative
        fill="utility"
        name="chevron_right"
        size={24}
      />

      <style jsx>{`
        .settings-row {
          display: flex;
          inline-size: 100%; /* GROUNDED-EXEMPT: row fills its Settings container. */
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: space-between;
          gap: var(--space-16);
          padding: var(--space-16);
          border: 0;
          border-block-end: var(--border-hairline) solid var(--color-surface-elevated);
          background: transparent;
          color: var(--color-text-primary);
          font: inherit;
          text-align: start;
        }

        .settings-row:last-child {
          border-block-end: 0;
        }

        .settings-row > span:first-child {
          display: grid;
          min-inline-size: 0;
          gap: var(--space-4);
        }

        .settings-row strong {
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .settings-row small {
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .settings-row:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: -2px;
        }
      `}</style>
    </button>
  );
}

type SettingsLanguageRowProps = Readonly<{
  copy: M4Copy;
  locale: SaayaLocale;
  onLocaleChange: (locale: SaayaLocale) => void;
}>;

function SettingsLanguageRow({
  copy,
  locale,
  onLocaleChange,
}: SettingsLanguageRowProps) {
  return (
    <div aria-label={copy.setLanguage} className="settings-language-row" role="group">
      <strong>{copy.setLanguage}</strong>
      <div className="settings-language-row__choices">
        <button
          aria-pressed={locale === "en"}
          onClick={() => onLocaleChange("en")}
          type="button"
        >
          {copy.setLanguageEnglish}
        </button>
        <button
          aria-pressed={locale === "te"}
          onClick={() => onLocaleChange("te")}
          type="button"
        >
          {copy.setLanguageTelugu}
        </button>
      </div>

      <style jsx>{`
        .settings-language-row {
          display: grid;
          gap: var(--space-12);
          padding: var(--space-16);
          border-block-end: var(--border-hairline) solid var(--color-surface-elevated);
        }

        .settings-language-row > strong {
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .settings-language-row__choices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr)); /* GROUNDED-EXEMPT: exactly two supported local language choices. */
          gap: var(--space-8);
        }

        .settings-language-row button {
          min-block-size: var(--minimum-touch-target);
          padding-inline: var(--space-12);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          border-radius: var(--radius-control);
          background: transparent;
          color: var(--color-text-primary);
          font: inherit;
        }

        .settings-language-row button[aria-pressed="true"] {
          border-color: var(--color-brand-light);
          background: var(--color-surface-elevated);
        }

        .settings-language-row button:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
