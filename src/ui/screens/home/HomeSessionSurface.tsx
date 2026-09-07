"use client";

import { useEffect, useState } from "react";

import type { SessionState } from "../../../domain/model/session";
import { nearestStation } from "../../../domain/engine/nearestStation";
import { DEMO_GAP_SEC, DEMO_WINDOW_SEC } from "../../../domain/engine/rules";
import type { ZoneDetail } from "../../../data/repository/zoneRepository";
import type { PoliceStation } from "../../../domain/model/policeStation";
import type { LatLng } from "../../../domain/model/zone";
import type { LocationStatus } from "../../../platform/locationWatch";
import type { FamilyAlertStatus } from "../../../platform/familyAlertChannel";
import { ArmBanner } from "../../components/ArmBanner";
import { formatCopy, type M4Copy, type SaayaLocale } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";
import { CheckInOverlay } from "./CheckInOverlay";
import { SosOverlay, type SosDemoIncident } from "./SosOverlay";

export interface ArmAcknowledgement {
  readonly body: string;
  readonly title: string;
}

export interface HomeSessionSurfaceProps {
  readonly activeZoneDetail: ZoneDetail | null;
  readonly armAcknowledgement: ArmAcknowledgement | null;
  readonly armBannerVisible: boolean;
  readonly checkInReason: string | null;
  /** Window length of the visible check-in ring for the current rung. */
  readonly checkInWindowSec: number;
  readonly currentPoint: LatLng | null;
  readonly copy: M4Copy;
  /** Truthful first-miss alert state; null before any alert has been requested. */
  readonly familyAlertStatus: FamilyAlertStatus | null;
  readonly engineView: HomeEngineView;
  /** Acknowledgement card shown while SHADOW after I'm OK resets the ladder. */
  readonly okAcknowledgement: ArmAcknowledgement | null;
  /** Acknowledgement card shown on the quiet screen after a demo PIN stop. */
  readonly demoStopAcknowledgement: ArmAcknowledgement | null;
  readonly locale: SaayaLocale;
  readonly locationStatus: LocationStatus;
  readonly demoModeActive: boolean;
  readonly demoMissedCheckins?: number;
  readonly onArmBannerHidden: () => void;
  readonly onCheckInOk: () => void;
  readonly onHelpNow: () => void;
  readonly onLocationHelpOpen: () => void;
  readonly onManualArm: () => void;
  readonly onManualDisarm: () => void;
  readonly onOpenDemo: () => void;
  readonly onPinAccepted: () => void;
  readonly pageStoppedWarning: boolean;
  readonly policeStations: readonly PoliceStation[];
}

type MinimizedRung = "CHECKIN_1" | "CHECKIN_2" | "CHECKIN_3";

export function HomeSessionSurface({
  activeZoneDetail,
  armAcknowledgement,
  armBannerVisible,
  checkInReason,
  checkInWindowSec,
  currentPoint,
  copy,
  demoModeActive,
  demoMissedCheckins = 0,
  demoStopAcknowledgement,
  engineView,
  familyAlertStatus,
  locale,
  locationStatus,
  okAcknowledgement,
  onArmBannerHidden,
  onCheckInOk,
  onHelpNow,
  onLocationHelpOpen,
  onManualArm,
  onManualDisarm,
  onOpenDemo,
  onPinAccepted,
  pageStoppedWarning,
  policeStations,
}: HomeSessionSurfaceProps) {
  const [minimizedRung, setMinimizedRung] = useState<MinimizedRung | null>(
    null,
  );
  const state = visibleSessionState(engineView.state);
  const isMinimized = minimizedRung === state;

  useEffect(() => {
    setMinimizedRung(null);
  }, [state]);

  const sosPoint = currentPoint ?? activeZoneDetail?.zone.centroid ?? null;
  const sosStation =
    sosPoint === null ? null : nearestStation(sosPoint, policeStations)?.station ?? null;
  const compactNotice =
    demoModeActive ? null : locationStatus === "PERMISSION_DENIED"
      ? copy.warnLocationDenied
      : pageStoppedWarning
        ? copy.warnPageStopped
        : null;
  const minimizedLabel =
    state === "CHECKIN_1"
      ? copy.statusCheckin1
      : state === "CHECKIN_2"
        ? copy.statusCheckin2
        : copy.statusCheckin3;

  return (
    <>
      {armAcknowledgement !== null && armBannerVisible && !demoModeActive ? (
        <div className="home-session-arm-banner">
          <ArmBanner
            body={armAcknowledgement.body}
            onAutoHide={onArmBannerHidden}
            title={armAcknowledgement.title}
          />
        </div>
      ) : null}

      {compactNotice === null ? null : locationStatus === "PERMISSION_DENIED" ? (
        <button
          aria-label={compactNotice}
          className="home-session-compact-notice"
          data-location-help-trigger
          onClick={onLocationHelpOpen}
          type="button"
        >
          {compactNotice}
        </button>
      ) : (
        <p className="home-session-compact-notice" role="status">
          {compactNotice}
        </p>
      )}

      {okAcknowledgement !== null && state === "SHADOW" ? (
        <div
          aria-label={okAcknowledgement.title}
          className="home-session-ack"
          role="status"
        >
          <p className="home-session-ack__title">{okAcknowledgement.title}</p>
          <p>{okAcknowledgement.body}</p>
        </div>
      ) : null}

      {demoStopAcknowledgement !== null && state === "IDLE" ? (
        <div
          aria-label={demoStopAcknowledgement.title}
          className="home-session-ack"
          role="status"
        >
          <p className="home-session-ack__title">{demoStopAcknowledgement.title}</p>
          <p>{demoStopAcknowledgement.body}</p>
        </div>
      ) : null}

      {state === "IDLE" || state === "SHADOW" || isMinimized ? (
        <div
          aria-label={copy.appName}
          className="home-session-action-dock"
          data-demo-active={demoModeActive || undefined}
        >
          {demoModeActive && state !== "IDLE" ? (
            <span className="home-session-demo-badge" role="status">
              {formatCopy(copy.demoTimingNote, DEMO_WINDOW_SEC, DEMO_GAP_SEC)}
            </span>
          ) : null}
          {isMinimized ? (
            <button
              aria-label={minimizedLabel}
              className="home-session-action home-session-action--resume"
              onClick={() => setMinimizedRung(null)}
              type="button"
            >
              {minimizedLabel}
            </button>
          ) : state === "IDLE" ? (
            <>
              <button
                aria-label={copy.ctaSus}
                className="home-session-action home-session-action--sus"
                data-home-action="sus"
                onClick={onManualArm}
                type="button"
              >
                {copy.ctaSus}
              </button>
              <button
                aria-label={copy.ctaDemo}
                className="home-session-action home-session-action--demo"
                data-home-action="demo"
                onClick={onOpenDemo}
                type="button"
              >
                {copy.ctaDemo}
              </button>
            </>
          ) : (
            <button
              aria-label={copy.ctaEndSus}
              className="home-session-action home-session-action--sus"
              data-home-action="sus"
              onClick={onManualDisarm}
              type="button"
            >
              {copy.ctaEndSus}
            </button>
          )}

          <button
            aria-label={copy.ctaSos}
            className="home-session-action home-session-action--sos"
            data-home-action="sos"
            onClick={onHelpNow}
            type="button"
          >
            {copy.ctaSos}
          </button>
        </div>
      ) : null}

      {(state === "CHECKIN_1" || state === "CHECKIN_2" || state === "CHECKIN_3") &&
      !isMinimized ? (
        <CheckInOverlay
          copy={copy}
          demo={demoModeActive}
          deadlineEpochMs={engineView.deadlineEpochMs}
          windowSec={checkInWindowSec}
          familyAlertStatus={familyAlertStatus}
          onHelpNow={onHelpNow}
          onMinimize={() => setMinimizedRung(state)}
          onOk={onCheckInOk}
          reason={state === "CHECKIN_1" && !demoModeActive ? checkInReason : null}
          state={state}
        />
      ) : null}

      {state === "SOS_ACTIVE" ? (
        <SosOverlay
          copy={copy}
          demoIncident={demoModeActive ? demoIncidentFor(copy, activeZoneDetail, demoMissedCheckins) : null}
          nearestStation={sosStation}
          onPinAccepted={onPinAccepted}
        />
      ) : null}

      <style jsx>{`
        .home-session-arm-banner {
          position: fixed;
          z-index: 9; /* GROUNDED-EXEMPT: local stack above Home and the demo sheet for a transient acknowledgement. */
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12) +
              var(--status-pill-height) + var(--space-8)
          );
          inset-inline: 0;
          pointer-events: none;
        }

        .home-session-compact-notice {
          position: fixed;
          z-index: 6; /* GROUNDED-EXEMPT: compact recovery notice sits above map controls and below a live ladder surface. */
          inset-inline-start: var(--screen-padding);
          inset-block-end: calc(
            var(--home-action-dock-clearance) +
              var(--minimum-touch-target) + var(--space-8)
          );
          max-inline-size: calc(100% - (var(--screen-padding) * 2)); /* GROUNDED-EXEMPT: the compact notice stays inside the viewport gutters. */
          margin: 0;
          padding: var(--space-8) var(--space-12);
          overflow: hidden;
          border: var(--border-hairline) solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font: inherit;
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
          text-align: start;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .home-session-ack {
          position: fixed;
          z-index: 6; /* GROUNDED-EXEMPT: a quiet acknowledgement sits above the map and below any live ladder surface. */
          inset-inline: var(--screen-padding);
          inset-block-end: calc(
            var(--home-action-dock-clearance) +
              var(--minimum-touch-target) + var(--space-8)
          );
          display: grid;
          gap: var(--space-4);
          padding: var(--space-12) var(--space-14);
          border: var(--border-hairline) solid var(--color-brand);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
          text-align: center;
        }

        .home-session-ack p {
          margin: 0;
        }

        .home-session-ack__title {
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
        }

        .home-session-compact-notice:focus-visible,
        .home-session-action:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .home-session-action-dock {
          position: fixed;
          z-index: 6; /* GROUNDED-EXEMPT: direct actions remain above the map and below an active ladder or SOS. */
          inset-inline: var(--screen-padding);
          inset-block-end: calc(
            env(safe-area-inset-bottom) + var(--space-12)
          );
          display: grid;
          grid-auto-columns: minmax(0, 1fr); /* GROUNDED-EXEMPT: every available direct action receives an equal map-safe column. */
          grid-auto-flow: column;
          gap: var(--space-8);
        }

        .home-session-action {
          display: inline-flex;
          min-inline-size: 0;
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: center;
          padding-inline: var(--space-12);
          border: var(--border-hairline) solid transparent;
          border-radius: var(--radius-control);
          color: var(--color-text-primary);
          font: inherit;
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-body-line-height);
          text-align: center;
        }

        .home-session-action--sus {
          background: var(--color-brand);
        }

        .home-session-action--demo,
        .home-session-action--resume {
          border-color: var(--color-brand);
          background: var(--color-card-fill);
        }

        .home-session-action-dock[data-demo-active="true"]
          .home-session-action--demo {
          border-color: var(--color-amber);
          color: var(--color-amber);
        }

        .home-session-demo-badge {
          grid-column: 1 / -1;
          display: inline-flex;
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: center;
          padding-inline: var(--space-12);
          border: var(--border-hairline) solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-amber);
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-caption-line-height);
        }

        .home-session-action--sos {
          background: var(--color-danger);
        }
      `}</style>
    </>
  );
}

function visibleSessionState(state: SessionState): Exclude<SessionState, "RESOLVED"> {
  return state === "RESOLVED" ? "IDLE" : state;
}

/** The demo's synthetic incident preview: local copy only, never a police claim. */
function demoIncidentFor(copy: M4Copy, detail: ZoneDetail | null, misses: number): SosDemoIncident {
  return {
    label: copy.policeDemoLabel,
    localNote: copy.policeDemoLocalNote,
    rows: [
      copy.policeDemoRowArmed,
      ...Array.from({ length: misses }, (_, index) => formatCopy(copy.policeDemoRowMissed, index + 1)),
      copy.policeDemoRowSos,
    ],
    statusActive: copy.policeDemoStatusActive,
    zoneRow:
      detail === null ? null : `${copy.policeDemoZone}: ${detail.label}`,
  };
}
