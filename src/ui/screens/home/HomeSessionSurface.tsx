"use client";

import { useEffect, useState } from "react";

import type { SessionState } from "../../../domain/model/session";
import type { LocationStatus } from "../../../platform/locationWatch";
import { subscribeBottomSheetDragRange } from "../../../platform/viewportMetrics";
import { ArmBanner } from "../../components/ArmBanner";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";

export interface ArmAcknowledgement {
  readonly body: string;
  readonly title: string;
}

export interface HomeSessionSurfaceProps {
  readonly armAcknowledgement: ArmAcknowledgement | null;
  readonly armBannerVisible: boolean;
  readonly contextLine: string | null;
  readonly copy: M4Copy;
  readonly demoModeActive: boolean;
  readonly engineView: HomeEngineView;
  readonly locationStatus: LocationStatus;
  readonly onArmBannerHidden: () => void;
  readonly onLocationHelpOpen: () => void;
  readonly onManualArm: () => void;
  readonly onManualDisarm: () => void;
  readonly pageStoppedWarning: boolean;
}

export function HomeSessionSurface({
  armAcknowledgement,
  armBannerVisible,
  contextLine,
  copy,
  demoModeActive,
  engineView,
  locationStatus,
  onArmBannerHidden,
  onLocationHelpOpen,
  onManualArm,
  onManualDisarm,
  pageStoppedWarning,
}: HomeSessionSurfaceProps) {
  const [dragRangePx, setDragRangePx] = useState<number | null>(null);
  const [sheetPosition, setSheetPosition] = useState<"peek" | "expanded">(
    "peek",
  );
  const state = visibleSessionState(engineView.state);
  const active = state !== "IDLE";

  useEffect(() => subscribeBottomSheetDragRange(setDragRangePx), []);

  const locationLine =
    locationStatus === "SEARCHING"
      ? copy.locSearching
      : locationStatus === "SLOW" || locationStatus === "POSITION_UNAVAILABLE"
        ? copy.locSlow
        : contextLine;

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

      {demoModeActive ||
      locationStatus === "PERMISSION_DENIED" ||
      pageStoppedWarning ||
      active ? (
        <div className="home-session-disclosure">
          {demoModeActive ? (
            <DisclosureBanner content={copy.demoModeActive} kind="mock" />
          ) : null}
          {locationStatus === "PERMISSION_DENIED" ? (
            <button
              aria-label={copy.warnLocationDenied}
              className="home-session-location-help-trigger"
              data-location-help-trigger
              onClick={onLocationHelpOpen}
              type="button"
            >
              <DisclosureBanner
                content={copy.warnLocationDenied}
                kind="prototype-limitation"
              />
            </button>
          ) : pageStoppedWarning ? (
            <DisclosureBanner
              content={copy.warnPageStopped}
              kind="prototype-limitation"
            />
          ) : active ? (
            <DisclosureBanner
              content={copy.warnKeepOpenBody}
              kind="prototype-limitation"
            />
          ) : null}
        </div>
      ) : null}

      <SaayaBottomSheet
        ariaLabel={copy.appName}
        className="home-session-sheet"
        dragRangePx={dragRangePx}
        onDismiss={() => setSheetPosition("peek")}
        onPositionChange={setSheetPosition}
        position={sheetPosition}
      >
        <section className="home-session-sheet-content">
          <div className="home-session-sheet-copy">
            {locationLine === null ? null : <p>{locationLine}</p>}
            {armAcknowledgement === null || engineView.armMode !== "AUTO_ZONE" ? null : (
              <p className="home-session-sheet-arm-copy">
                {armAcknowledgement.body}
              </p>
            )}
          </div>

          {state === "IDLE" ? (
            <SaayaButton
              onClick={onManualArm}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaArmManually}
            </SaayaButton>
          ) : state === "SHADOW" ? (
            <SaayaButton
              onClick={onManualDisarm}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaImHome}
            </SaayaButton>
          ) : null}
        </section>
      </SaayaBottomSheet>

      <style jsx>{`
        .home-session-arm-banner {
          position: fixed;
          z-index: 9; /* GROUNDED-EXEMPT: local stack above Home and the demo sheet for a transient acknowledgement. */
          inset-block-start: env(safe-area-inset-top);
          inset-inline: 0;
          pointer-events: none;
        }

        .home-session-disclosure {
          position: fixed;
          z-index: 5; /* GROUNDED-EXEMPT: local stack above the map and below an open detail sheet. */
          inset-inline: 0;
          inset-block-end: calc(
            var(--sheet-peek-height) + var(--space-12)
          );
          display: grid;
          gap: var(--space-8);
          pointer-events: none;
        }

        .home-session-location-help-trigger {
          inline-size: 100%; /* GROUNDED-EXEMPT: the recovery trigger preserves the banner's full-width layout. */
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: start;
          pointer-events: auto;
        }

        .home-session-location-help-trigger:focus-visible {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .home-session-sheet-content {
          display: flex;
          min-block-size: 100%; /* GROUNDED-EXEMPT: content fills its sheet surface. */
          flex-direction: column;
          gap: var(--space-12);
          padding: var(--space-48) var(--screen-padding)
            calc(var(--space-20) + env(safe-area-inset-bottom));
        }

        .home-session-sheet-copy {
          display: grid;
          gap: var(--space-8);
        }

        .home-session-sheet-copy p {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .home-session-sheet-copy .home-session-sheet-arm-copy {
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </>
  );
}

function visibleSessionState(state: SessionState): Exclude<SessionState, "RESOLVED"> {
  return state === "RESOLVED" ? "IDLE" : state;
}
