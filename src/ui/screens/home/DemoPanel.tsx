"use client";

import type { SessionState } from "../../../domain/model/session";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { SaayaButton } from "../../components/SaayaButton";
import { formatCopy, type M4Copy } from "../../copy/strings";
import { DEMO_GAP_SEC, DEMO_WINDOW_SEC } from "../../../domain/engine/rules";
import { MaterialSymbol } from "../../icons/MaterialSymbol";

export interface DemoPanelProps {
  readonly copy: M4Copy;
  readonly onClose: () => void;
  readonly onStartDemo: () => void;
  readonly onReset: () => void;
  readonly sessionState: SessionState;
  readonly isDemoSession?: boolean;
}

export function DemoPanel({
  copy,
  onClose,
  onStartDemo,
  onReset,
  sessionState,
  isDemoSession = false,
}: DemoPanelProps) {
  const idle = sessionState === "IDLE" || sessionState === "RESOLVED";
  // Reset must never bypass the PIN: the bridge refuses during SOS_ACTIVE and
  // the button states that instead of appearing broken.
  const resetBlocked = sessionState === "SOS_ACTIVE" || !isDemoSession;

  return (
    <SaayaBottomSheet
      ariaLabel={copy.cdCloseSheet}
      className="demo-panel-sheet"
      dragRangePx={null}
      onDismiss={onClose}
      onPositionChange={(position) => {
        if (position === "peek") onClose();
      }}
      position="expanded"
    >
      <section
        aria-label={copy.cdDemoPanel}
        className="demo-panel"
        role="dialog"
      >
        <header className="demo-panel__header">
          <p>{copy.demoPanelHeader}</p>
          <button
            aria-label={copy.cdCloseSheet}
            className="demo-panel__close"
            onClick={onClose}
            type="button"
          >
            <MaterialSymbol decorative fill="utility" name="close" size={24} />
          </button>
        </header>

        <p className="demo-panel__disclosure">{copy.demoStartDisclosure}</p>
        <p className="demo-panel__note">{formatCopy(copy.demoTimingNote, DEMO_WINDOW_SEC, DEMO_GAP_SEC)}</p>

        {idle ? null : (
          <p className="demo-panel__live-reason" role="status">
            {copy.demoSessionLiveReason}
          </p>
        )}

        <div className="demo-panel__actions">
          <SaayaButton
            accent="danger"
            aria-label={copy.ctaStartDemo}
            disabled={!idle}
            onClick={onStartDemo}
            variant="accent"
            workingLabel={copy.stateWorking}
          >
            {copy.ctaStartDemo}
          </SaayaButton>
          <SaayaButton
            aria-label={copy.cdDemoReset}
            disabled={resetBlocked}
            onClick={onReset}
            variant="textOnly"
            workingLabel={copy.stateWorking}
          >
            {copy.demoReset}
          </SaayaButton>
        </div>

        {sessionState === "SOS_ACTIVE" ? (
          <p className="demo-panel__reset-status" role="status">
            {copy.demoResetBlockedSos}
          </p>
        ) : null}
      </section>

      <style jsx>{`
        .demo-panel {
          display: flex;
          min-block-size: 100%; /* GROUNDED-EXEMPT: content fills the expanded demo sheet. */
          flex-direction: column;
          gap: var(--space-16);
          padding: var(--space-48) var(--screen-padding)
            calc(var(--space-24) + env(safe-area-inset-bottom));
          color: var(--color-text-primary);
        }

        .demo-panel__header {
          position: sticky;
          z-index: 1;
          inset-block-start: 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-12);
          padding: var(--space-14);
          border-inline-start: 3px solid var(--color-amber);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-amber) r g b / 0.1);
        }

        .demo-panel__header p,
        .demo-panel__note,
        .demo-panel__live-reason,
        .demo-panel__reset-status {
          margin: 0;
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .demo-panel__close {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          inline-size: var(--minimum-touch-target);
          block-size: var(--minimum-touch-target);
          margin: calc(var(--space-8) * -1);
          padding: 0;
          border: 0;
          border-radius: var(--radius-small);
          background: transparent;
          color: var(--color-text-secondary);
        }

        .demo-panel__disclosure,
        .demo-panel__note {
          color: var(--color-text-on-card);
        }

        .demo-panel__live-reason {
          padding: var(--space-14);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-amber) r g b / 0.1);
          color: var(--color-text-on-card);
        }

        .demo-panel__actions {
          display: grid;
          gap: var(--space-8);
        }

        .demo-panel__reset-status {
          min-block-size: var(--type-caption-line-height);
          color: var(--color-text-secondary);
        }

        .demo-panel__close:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </SaayaBottomSheet>
  );
}
