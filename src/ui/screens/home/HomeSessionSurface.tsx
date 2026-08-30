"use client";

import { useEffect, useState } from "react";

import type { SessionState } from "../../../domain/model/session";
import { nearestStation } from "../../../domain/engine/nearestStation";
import type { ZoneDetail } from "../../../data/repository/zoneRepository";
import type { PoliceStation } from "../../../domain/model/policeStation";
import type { LatLng } from "../../../domain/model/zone";
import type { LocationStatus } from "../../../platform/locationWatch";
import { ArmBanner } from "../../components/ArmBanner";
import type { M4Copy } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";
import { CheckInOverlay } from "./CheckInOverlay";
import { FamilyEscalationOverlay } from "./FamilyEscalationOverlay";
import { SosOverlay } from "./SosOverlay";

export interface ArmAcknowledgement {
  readonly body: string;
  readonly title: string;
}

export interface HomeSessionSurfaceProps {
  readonly activeZoneDetail: ZoneDetail | null;
  readonly armAcknowledgement: ArmAcknowledgement | null;
  readonly armBannerVisible: boolean;
  readonly demoSpeedEnabled: boolean;
  readonly checkInReason: string | null;
  readonly currentPoint: LatLng | null;
  readonly copy: M4Copy;
  readonly demoModeActive: boolean;
  readonly engineView: HomeEngineView;
  readonly locationStatus: LocationStatus;
  readonly onArmBannerHidden: () => void;
  readonly onCheckInOk: () => void;
  readonly onFamilyCancel: () => void;
  readonly onHelpNow: () => void;
  readonly onLocationHelpOpen: () => void;
  readonly onManualArm: () => void;
  readonly onManualDisarm: () => void;
  readonly onOpenDemo: () => void;
  readonly onPinAccepted: () => void;
  readonly pageStoppedWarning: boolean;
  readonly policeStations: readonly PoliceStation[];
}

type MinimizedRung = "CHECKIN_1" | "CHECKIN_2" | "FAMILY_ESCALATED";

export function HomeSessionSurface({
  activeZoneDetail,
  armAcknowledgement,
  armBannerVisible,
  checkInReason,
  currentPoint,
  demoSpeedEnabled,
  copy,
  demoModeActive,
  engineView,
  locationStatus,
  onArmBannerHidden,
  onCheckInOk,
  onFamilyCancel,
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
    locationStatus === "PERMISSION_DENIED"
      ? copy.warnLocationDenied
      : pageStoppedWarning
        ? copy.warnPageStopped
        : null;
  const minimizedLabel =
    state === "CHECKIN_1"
      ? copy.statusCheckin1
      : state === "CHECKIN_2"
        ? copy.statusCheckin2
        : copy.statusFamily;

  return (
    <>
      {armAcknowledgement !== null && armBannerVisible ? (
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

      {state === "IDLE" || state === "SHADOW" || isMinimized ? (
        <div
          aria-label={copy.appName}
          className="home-session-action-dock"
          data-demo-active={demoModeActive || undefined}
        >
          {demoModeActive && state !== "IDLE" ? (
            <span className="home-session-demo-badge" role="status">
              Demo
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
                aria-label="SUS"
                className="home-session-action home-session-action--sus"
                data-home-action="sus"
                onClick={onManualArm}
                type="button"
              >
                SUS
              </button>
              <button
                aria-label={copy.cdDemoPanel}
                className="home-session-action home-session-action--demo"
                data-home-action="demo"
                onClick={onOpenDemo}
                type="button"
              >
                Demo
              </button>
            </>
          ) : (
            <button
              aria-label="End SUS"
              className="home-session-action home-session-action--sus"
              data-home-action="sus"
              onClick={onManualDisarm}
              type="button"
            >
              End SUS
            </button>
          )}

          <button
            aria-label={copy.cdHelpNow}
            className="home-session-action home-session-action--sos"
            data-home-action="sos"
            onClick={onHelpNow}
            type="button"
          >
            SOS
          </button>
        </div>
      ) : null}

      {(state === "CHECKIN_1" || state === "CHECKIN_2") && !isMinimized ? (
        <CheckInOverlay
          copy={copy}
          deadlineEpochMs={engineView.deadlineEpochMs}
          demoSpeedEnabled={demoSpeedEnabled}
          onHelpNow={onHelpNow}
          onMinimize={() => setMinimizedRung(state)}
          onOk={onCheckInOk}
          reason={state === "CHECKIN_1" ? checkInReason : null}
          state={state}
        />
      ) : null}

      {state === "FAMILY_ESCALATED" && !isMinimized ? (
        <FamilyEscalationOverlay
          copy={copy}
          currentPoint={currentPoint}
          deadlineEpochMs={engineView.deadlineEpochMs}
          demoSpeedEnabled={demoSpeedEnabled}
          detail={activeZoneDetail}
          onCancel={onFamilyCancel}
          onHelpNow={onHelpNow}
          onMinimize={() => setMinimizedRung(state)}
          policeStations={policeStations}
        />
      ) : null}

      {state === "SOS_ACTIVE" ? (
        <SosOverlay
          copy={copy}
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
          display: inline-flex;
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: center;
          padding-inline: var(--space-12);
          border: var(--border-hairline) solid var(--color-amber);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-amber);
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-body-line-height);
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
