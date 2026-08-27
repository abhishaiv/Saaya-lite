"use client";

import { useState } from "react";

import type { DemoZone } from "../../../data/repository/zoneRepository";
import {
  DEMO_DIVISOR,
  LADDER_TOTAL_SEC,
  NORMAL_DEMO_DIVISOR,
} from "../../../domain/engine/rules";
import type { SessionState } from "../../../domain/model/session";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { SaayaButton } from "../../components/SaayaButton";
import { formatCopy, type M4Copy } from "../../copy/strings";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import { nextMissedCheckInEvent } from "./demoControls";

export interface DemoPanelProps {
  readonly copy: M4Copy;
  readonly demoSpeedEnabled: boolean;
  readonly demoZones: readonly DemoZone[];
  readonly onClose: () => void;
  readonly onDemoSpeedChanged: (enabled: boolean) => void;
  readonly onJumpFamily: () => void;
  readonly onMissCheckIn: () => void;
  readonly onReset: () => void;
  readonly onTriggerSos: () => void;
  readonly onZoneSelected: (zoneId: string) => void;
  readonly sessionState: SessionState;
}

export function DemoPanel({
  copy,
  demoSpeedEnabled,
  demoZones,
  onClose,
  onDemoSpeedChanged,
  onJumpFamily,
  onMissCheckIn,
  onReset,
  onTriggerSos,
  onZoneSelected,
  sessionState,
}: DemoPanelProps) {
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [resetAnnounced, setResetAnnounced] = useState(false);
  const idle = sessionState === "IDLE" || sessionState === "RESOLVED";
  const canMiss = nextMissedCheckInEvent(sessionState) !== null;
  const canJumpFamily =
    sessionState !== "FAMILY_ESCALATED" && sessionState !== "SOS_ACTIVE";
  const canTriggerSos = sessionState !== "SOS_ACTIVE";
  const currentDivisor = demoSpeedEnabled
    ? DEMO_DIVISOR
    : NORMAL_DEMO_DIVISOR;
  const currentTotalSec = LADDER_TOTAL_SEC / currentDivisor;
  const speedNote = formatCopy(
    copy.demoSpeedNote,
    currentDivisor,
    currentTotalSec,
    LADDER_TOTAL_SEC,
  );

  function selectZone(zoneId: string) {
    setSelectedZoneId(zoneId);
    setResetAnnounced(false);
    if (zoneId !== "") onZoneSelected(zoneId);
  }

  function resetDemo() {
    onReset();
    setResetAnnounced(true);
  }

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

        <label className="demo-panel__toggle">
          <span>{copy.demoSpeedToggle}</span>
          <input
            checked={demoSpeedEnabled}
            onChange={(event) => onDemoSpeedChanged(event.currentTarget.checked)}
            role="switch"
            type="checkbox"
          />
        </label>
        <p className="demo-panel__note">{speedNote}</p>
        {idle ? null : (
          <p className="demo-panel__live-reason" role="status">
            {copy.demoSessionLiveReason}
          </p>
        )}

        <div className="demo-panel__field">
          <label htmlFor="demo-zone-picker">{copy.demoPickZone}</label>
          <span>{copy.demoPickZoneHint}</span>
          <select
            aria-label={copy.cdDemoZonePicker}
            disabled={!demoSpeedEnabled || !idle}
            id="demo-zone-picker"
            onChange={(event) => selectZone(event.currentTarget.value)}
            value={selectedZoneId}
          >
            <option value="">{copy.demoPickZone}</option>
            {demoZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </div>

        <div className="demo-panel__actions">
          <SaayaButton
            disabled={!demoSpeedEnabled || !canMiss}
            onClick={onMissCheckIn}
            variant="ghost"
            workingLabel={copy.stateWorking}
          >
            {copy.demoMissCheckin}
          </SaayaButton>
          <SaayaButton
            disabled={!demoSpeedEnabled || !canJumpFamily}
            onClick={onJumpFamily}
            variant="ghost"
            workingLabel={copy.stateWorking}
          >
            {copy.demoJumpFamily}
          </SaayaButton>
          <SaayaButton
            accent="danger"
            disabled={!demoSpeedEnabled || !canTriggerSos}
            onClick={onTriggerSos}
            variant="accent"
            workingLabel={copy.stateWorking}
          >
            {copy.demoTriggerSos}
          </SaayaButton>
          <SaayaButton
            aria-label={copy.cdDemoReset}
            disabled={!demoSpeedEnabled}
            onClick={resetDemo}
            variant="textOnly"
            workingLabel={copy.stateWorking}
          >
            {copy.demoReset}
          </SaayaButton>
        </div>

        <p aria-live="polite" className="demo-panel__reset-status" role="status">
          {resetAnnounced ? copy.demoResetDone : null}
        </p>
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

        .demo-panel__toggle {
          display: flex;
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: space-between;
          gap: var(--space-16);
          font-weight: var(--weight-semibold);
        }

        .demo-panel__toggle input {
          inline-size: var(--minimum-touch-target);
          block-size: var(--space-24);
          accent-color: var(--color-brand);
        }

        .demo-panel__note,
        .demo-panel__field span {
          color: var(--color-text-on-card);
        }

        .demo-panel__live-reason {
          padding: var(--space-14);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-amber) r g b / 0.1);
          color: var(--color-text-on-card);
        }

        .demo-panel__field {
          display: grid;
          min-inline-size: 0;
          gap: var(--space-8);
        }

        .demo-panel__field label {
          font-weight: var(--weight-semibold);
        }

        .demo-panel__field span {
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .demo-panel__field select {
          inline-size: 100%; /* GROUNDED-EXEMPT: the native picker fills its mobile field without creating a product dimension. */
          min-inline-size: 0;
          min-block-size: var(--minimum-touch-target);
          padding-inline: var(--space-14);
          border: 1px solid var(--color-brand);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-primary);
        }

        .demo-panel__actions {
          display: grid;
          gap: var(--space-8);
        }

        .demo-panel__reset-status {
          min-block-size: var(--type-caption-line-height);
          color: var(--color-text-secondary);
        }

        .demo-panel__close:focus-visible,
        .demo-panel__field select:focus-visible,
        .demo-panel__toggle input:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }
      `}</style>
    </SaayaBottomSheet>
  );
}
