"use client";

import { useEffect, useState } from "react";

import type { SessionState } from "../../../domain/model/session";
import type { LocationStatus } from "../../../platform/locationWatch";
import { subscribeBottomSheetDragRange } from "../../../platform/viewportMetrics";
import { ArmBanner } from "../../components/ArmBanner";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { SaayaBottomSheet } from "../../components/SaayaBottomSheet";
import { SaayaButton } from "../../components/SaayaButton";
import { StatusPill, type StatusPillLabels } from "../../components/StatusPill";
import type { M4Copy } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";

export interface ArmAcknowledgement {
  readonly body: string;
  readonly title: string;
}

type VisibleHomeEngineView = Omit<HomeEngineView, "state"> & {
  readonly state: Exclude<SessionState, "RESOLVED">;
};

export interface HomeSessionSurfaceProps {
  readonly armAcknowledgement: ArmAcknowledgement | null;
  readonly armBannerVisible: boolean;
  readonly contextLine: string | null;
  readonly copy: M4Copy;
  readonly engineView: HomeEngineView;
  readonly locationStatus: LocationStatus;
  readonly onArmBannerHidden: () => void;
  readonly onManualArm: () => void;
  readonly onManualDisarm: () => void;
  readonly pageStoppedWarning: boolean;
}

export function HomeSessionSurface({
  armAcknowledgement,
  armBannerVisible,
  contextLine,
  copy,
  engineView,
  locationStatus,
  onArmBannerHidden,
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
      <div className="home-session-status">
        <HomeStatusPill copy={copy} view={{ ...engineView, state }} />
      </div>

      {armAcknowledgement !== null && armBannerVisible ? (
        <div className="home-session-arm-banner">
          <ArmBanner
            body={armAcknowledgement.body}
            onAutoHide={onArmBannerHidden}
            title={armAcknowledgement.title}
          />
        </div>
      ) : null}

      {locationStatus === "PERMISSION_DENIED" ? (
        <div className="home-session-disclosure">
          <DisclosureBanner
            content={copy.warnLocationDenied}
            kind="prototype-limitation"
          />
        </div>
      ) : pageStoppedWarning ? (
        <div className="home-session-disclosure">
          <DisclosureBanner
            content={copy.warnPageStopped}
            kind="prototype-limitation"
          />
        </div>
      ) : active ? (
        <div className="home-session-disclosure">
          <DisclosureBanner
            content={copy.warnKeepOpenBody}
            kind="prototype-limitation"
          />
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
        .home-session-status {
          position: fixed;
          z-index: 4; /* GROUNDED-EXEMPT: local stack above map and below transient arm acknowledgement. */
          inset-block: 0;
          inset-inline: var(--screen-padding);
          pointer-events: none;
        }

        .home-session-arm-banner {
          position: fixed;
          z-index: 7; /* GROUNDED-EXEMPT: local stack above the status and sheets for a transient acknowledgement. */
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
          pointer-events: none;
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

function HomeStatusPill({
  copy,
  view,
}: {
  copy: M4Copy;
  view: VisibleHomeEngineView;
}) {
  const labels: StatusPillLabels = {
    checkIn1: copy.statusCheckin1,
    checkIn2: copy.statusCheckin2,
    family: copy.statusFamily,
    idle: copy.statusIdle,
    shadowAuto: copy.statusShadowAuto,
    shadowManual: copy.statusShadowManual,
    sos: copy.statusSos,
  };

  if (view.state === "IDLE") {
    return <StatusPill icon="shield" labels={labels} state="IDLE" />;
  }
  if (view.state === "SHADOW") {
    return (
      <StatusPill
        armMode={view.armMode}
        labels={labels}
        state="SHADOW"
      />
    );
  }
  return <StatusPill labels={labels} state={view.state} />;
}

function visibleSessionState(state: SessionState): Exclude<SessionState, "RESOLVED"> {
  return state === "RESOLVED" ? "IDLE" : state;
}
