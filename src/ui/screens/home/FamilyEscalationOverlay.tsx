"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ZoneDetail } from "../../../data/repository/zoneRepository";
import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import type { Favourite } from "../../../data/repository/onboardingRepository";
import { CANCEL_WINDOW_SEC, DEMO_DIVISOR } from "../../../domain/engine/rules";
import { nearestStation } from "../../../domain/engine/nearestStation";
import type { PoliceStation } from "../../../domain/model/policeStation";
import type { LatLng } from "../../../domain/model/zone";
import { BrowserPinHasher } from "../../../platform/pinHash";
import {
  formatIndiaFamilyDay,
  formatIndiaFamilyTime,
} from "../../../platform/indiaTime";
import { BigActionButton } from "../../components/BigActionButton";
import { CountdownRing } from "../../components/CountdownRing";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { LadderCard } from "../../components/LadderCard";
import { SaayaButton } from "../../components/SaayaButton";
import { localizedStaticRiskLevel } from "../../copy/localizedRiskLevel";
import { formatCopy, type M4Copy, type SaayaLocale } from "../../copy/strings";

const COUNTDOWN_TICK_MS = 1000; // fact: motion.1000ms

type FamilyIdentity = Readonly<{
  favourite: Favourite | null;
  userName: string | null;
}>;

export interface FamilyEscalationOverlayProps {
  readonly copy: M4Copy;
  readonly currentPoint: LatLng | null;
  readonly deadlineEpochMs: number | null;
  readonly demoSpeedEnabled: boolean;
  readonly detail: ZoneDetail | null;
  readonly locale: SaayaLocale;
  readonly onCancel: () => void;
  readonly onHelpNow: () => void;
  readonly onMinimize: () => void;
  readonly policeStations: readonly PoliceStation[];
}

/** M1 step 3: a local-only, explicitly mocked family escalation. */
export function FamilyEscalationOverlay({
  copy,
  currentPoint,
  deadlineEpochMs,
  demoSpeedEnabled,
  detail,
  locale,
  onCancel,
  onHelpNow,
  onMinimize,
  policeStations,
}: FamilyEscalationOverlayProps) {
  const repositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = new IndexedDbOnboardingRepository(
      new BrowserPinHasher(),
    );
  }
  const repository = repositoryRef.current;
  const [identity, setIdentity] = useState<FamilyIdentity | null>(null);
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());
  const totalSeconds = CANCEL_WINDOW_SEC / (demoSpeedEnabled ? DEMO_DIVISOR : 1); // fact: demo.normal.divisor

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      repository.loadUserName(),
      repository.loadPrimaryFavourite(),
    ]).then(([userName, favourite]) => {
      if (!cancelled) setIdentity({ favourite, userName });
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    setNowEpochMs(Date.now());
    const interval = globalThis.setInterval(
      () => setNowEpochMs(Date.now()),
      COUNTDOWN_TICK_MS,
    );
    return () => globalThis.clearInterval(interval);
  }, [deadlineEpochMs]);

  const seconds = remainingSeconds(deadlineEpochMs, nowEpochMs, totalSeconds);
  const message = useMemo(() => {
    if (identity === null || detail === null || detail.card === null) return null;
    const point = currentPoint ?? detail.zone.centroid;
    const stationDistance = nearestStation(point, policeStations);
    if (stationDistance === null) return null;
    return composeFamilyMessage(copy, {
      cancelWindowSec: totalSeconds,
      day: formatIndiaFamilyDay(nowEpochMs, locale),
      distanceM: Math.round(stationDistance.distanceM),
      name: identity.userName ?? copy.familySubjectFallback,
      stationName: stationDistance.station.name,
      stationPhone: stationDistance.station.phone,
      time: formatIndiaFamilyTime(nowEpochMs, locale),
      womenSafetyCases: detail.zone.womenSafetyCases,
      zoneName: detail.label,
      zoneRisk: localizedStaticRiskLevel(copy, detail.card.riskLevel),
      zoneArea: detail.zone.areasCovered.split(",")[0]?.trim() ?? detail.zone.areasCovered,
    });
  }, [copy, currentPoint, detail, identity, locale, nowEpochMs, policeStations, totalSeconds]);

  const title =
    identity !== null && identity.favourite === null
      ? copy.familyNoContact
      : copy.familyTitle;
  return (
    <LadderCard
      ariaLabel={title}
      message={
        <div className="family-escalation__message">
          <CountdownRing
            ariaLabel={formatCountdownLabel(copy.cdCountdown, seconds)}
            formatAnnouncement={(value) => formatCountdownLabel(copy.cdCountdown, value)}
            rung="FAMILY_ESCALATED"
            seconds={seconds}
            totalSeconds={totalSeconds}
            variant="card"
          />
          <p>{copy.familyBody}</p>
          <p>{formatCountdownLabel(copy.familyCancelNote, seconds)}</p>
          {identity?.favourite === null ? <p>{copy.familyNoContact}</p> : null}
          {message === null ? <p>{copy.stateWorking}</p> : <pre>{message}</pre>}
          <DisclosureBanner content={copy.familyMockDisclosure} kind="mock" />
          <style jsx>{`
            .family-escalation__message {
              display: grid;
              justify-items: center;
              gap: var(--space-12);
            }

            .family-escalation__message p,
            .family-escalation__message pre {
              margin: 0;
            }

            .family-escalation__message pre {
              inline-size: 100%; /* GROUNDED-EXEMPT: the local message fills its card column. */
              overflow-wrap: anywhere;
              color: var(--color-text-on-card);
              font-family: inherit;
              font-size: var(--type-caption-size);
              line-height: var(--type-caption-line-height);
              text-align: start;
              white-space: pre-wrap;
            }
          `}</style>
        </div>
      }
      phase="visible"
      primary={
        <BigActionButton
          accent="danger"
          aria-label={copy.cdCancelEscalation}
          countdownLabel={formatCopy(copy.ctaCountdown, copy.ctaCancelImFine, seconds)}
          countdownSeconds={seconds}
          label={copy.ctaCancelImFine}
          onClick={onCancel}
          workingLabel={copy.stateWorking}
        />
      }
      rung="FAMILY_ESCALATED"
      minimizeLabel={copy.cdCloseSheet}
      onMinimize={onMinimize}
      secondary={
        <SaayaButton
          aria-label={copy.cdHelpNow}
          onClick={onHelpNow}
          variant="textOnly"
          workingLabel={copy.stateWorking}
        >
          {copy.ctaSos}
        </SaayaButton>
      }
      title={title}
    />
  );
}

export function composeFamilyMessage(copy: M4Copy, {
  cancelWindowSec,
  day,
  distanceM,
  name,
  stationName,
  stationPhone,
  time,
  womenSafetyCases,
  zoneArea,
  zoneName,
  zoneRisk,
}: Readonly<{
  cancelWindowSec: number;
  day: string;
  distanceM: number;
  name: string;
  stationName: string;
  stationPhone: string;
  time: string;
  womenSafetyCases: number;
  zoneArea: string;
  zoneName: string;
  zoneRisk: string;
}>): string {
  return formatCopy(
    copy.familyMessageTemplate,
    name,
    zoneName,
    time,
    day,
    zoneRisk,
    womenSafetyCases,
    zoneArea,
    stationName,
    stationPhone,
    distanceM,
    cancelWindowSec,
  );
}

function remainingSeconds(
  deadlineEpochMs: number | null,
  nowEpochMs: number,
  fallbackSeconds: number,
): number {
  if (deadlineEpochMs === null) return fallbackSeconds;
  return Math.max(0, Math.ceil((deadlineEpochMs - nowEpochMs) / COUNTDOWN_TICK_MS));
}

function formatCountdownLabel(template: string, seconds: number): string {
  return template.replace("%1$d", String(seconds));
}
