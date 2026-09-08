"use client";

import { useEffect, useState } from "react";

import { CountdownRing } from "../../components/CountdownRing";
import { BigActionButton } from "../../components/BigActionButton";
import { LadderCard } from "../../components/LadderCard";
import { DEMO_GAP_SEC, DEMO_WINDOW_SEC } from "../../../domain/engine/rules";
import { SaayaButton } from "../../components/SaayaButton";
import type { FamilyAlertStatus } from "../../../platform/familyAlertChannel";
import { formatCopy, type M4Copy } from "../../copy/strings";

const COUNTDOWN_TICK_MS = 1000; // fact: motion.1000ms

export interface CheckInOverlayProps {
  readonly copy: M4Copy;
  readonly demo?: boolean;
  readonly deadlineEpochMs: number | null;
  /** Window length for the visible ring; the engine's absolute deadline governs. */
  readonly windowSec: number;
  /** Truthful first-miss alert state; null before any alert has been requested. */
  readonly familyAlertStatus: FamilyAlertStatus | null;
  readonly onHelpNow: () => void;
  readonly onMinimize: () => void;
  readonly onOk: () => void;
  readonly reason: string | null;
  readonly state: "CHECKIN_1" | "CHECKIN_2" | "CHECKIN_3";
}

/** M1 step 2: the three answerable, in-page rungs of the safety ladder. */
export function CheckInOverlay({
  copy,
  demo = false,
  deadlineEpochMs,
  windowSec,
  familyAlertStatus,
  onHelpNow,
  onMinimize,
  onOk,
  reason,
  state,
}: CheckInOverlayProps) {
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());

  useEffect(() => {
    setNowEpochMs(Date.now());
    const interval = globalThis.setInterval(
      () => setNowEpochMs(Date.now()),
      COUNTDOWN_TICK_MS,
    );
    return () => globalThis.clearInterval(interval);
  }, [deadlineEpochMs, state]);

  const seconds = remainingSeconds(deadlineEpochMs, nowEpochMs, windowSec);
  const isFirst = state === "CHECKIN_1";
  const isSecond = state === "CHECKIN_2";
  // The absolute expiry includes the pre-prompt gap; never start a fresh gap on reload.
  if (demo && !isFirst && seconds > windowSec) return (
    <div className="checkin-overlay__gap">
      <p role="status">{formatCopy(copy.demoTimingNote, DEMO_WINDOW_SEC, DEMO_GAP_SEC)}</p>
      <SaayaButton data-home-action="sos" accent="danger" onClick={onHelpNow} variant="accent" workingLabel={copy.stateWorking}>
        {copy.ctaSos}
      </SaayaButton>
      <style jsx>{`
        .checkin-overlay__gap {
          position: fixed;
          z-index: 9; /* GROUNDED-EXEMPT: existing foreground safety-surface stack. */
          inset-inline: var(--screen-padding);
          inset-block-end: calc(env(safe-area-inset-bottom) + var(--space-12));
          display: grid;
          gap: var(--space-8);
          padding: var(--space-12);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
        }
        .checkin-overlay__gap p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </div>
  );
  const title = isFirst
    ? copy.checkin1Title
    : isSecond
      ? copy.checkin2Title
      : copy.checkin3Title;
  const body = isFirst
    ? copy.checkin1Body
    : isSecond
      ? copy.checkin2Body
      : copy.checkin3Body;
  const alertStatusLine = familyAlertLine(copy, familyAlertStatus);
  const message = (
    <div className="checkin-overlay__message">
      <p>{demo ? `${copy.ctaDemo} · ` : ""}{isFirst ? "1" : isSecond ? "2" : "3"} / 3</p>
      {demo ? <p className="checkin-overlay__alert-note">{formatCopy(copy.demoTimingNote, DEMO_WINDOW_SEC, DEMO_GAP_SEC)}</p> : null}
      <CountdownRing
        ariaLabel={formatCountdownLabel(copy.cdCountdown, seconds)}
        formatAnnouncement={(value) => formatCountdownLabel(copy.cdCountdown, value)}
        rung={state}
        seconds={seconds}
        totalSeconds={windowSec}
        variant="card"
      />
      <p>{body}</p>
      {reason === null ? null : <p>{reason}</p>}
      {isFirst ? <p>{copy.checkinPersistNote}</p> : null}
      {alertStatusLine === null ? null : (
        <p className="checkin-overlay__alert-status" role="status">
          {alertStatusLine}
        </p>
      )}
      {familyAlertStatus === "accepted" ? (
        <p className="checkin-overlay__alert-note">{copy.alertCancelNote}</p>
      ) : null}
      <style jsx>{`
        .checkin-overlay__message {
          display: grid;
          justify-items: center;
          gap: var(--space-8);
        }

        .checkin-overlay__message p {
          margin: 0;
        }

        .checkin-overlay__alert-status,
        .checkin-overlay__alert-note {
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
          color: var(--color-text-on-card);
          text-align: center;
        }
      `}</style>
    </div>
  );

  return (
    <LadderCard
      ariaLabel={title}
      message={message}
      phase="visible"
      primary={
        <BigActionButton
          accent={isFirst ? "brand" : isSecond ? "amber" : "danger"}
          aria-label={copy.cdImOk}
          countdownLabel={formatCopy(copy.ctaCountdown, copy.ctaImOk, seconds)}
          countdownSeconds={seconds}
          label={copy.ctaImOk}
          onClick={onOk}
          workingLabel={copy.stateWorking}
        />
      }
      rung={state}
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

export function familyAlertLine(
  copy: M4Copy,
  status: FamilyAlertStatus | null,
): string | null {
  if (status === null) return null;
  switch (status) {
    case "sending":
      return copy.alertStatusSending;
    case "accepted":
      return copy.alertStatusAccepted;
    case "failed":
      return copy.alertStatusFailed;
    case "unknown":
      return copy.alertStatusUnknown;
    case "notready":
      return copy.alertStatusNotReady;
  }
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
