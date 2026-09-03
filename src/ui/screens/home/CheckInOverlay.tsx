"use client";

import { useEffect, useState } from "react";

import { CHECK_IN_1_SEC, CHECK_IN_2_SEC, DEMO_DIVISOR } from "../../../domain/engine/rules";
import { CountdownRing } from "../../components/CountdownRing";
import { BigActionButton } from "../../components/BigActionButton";
import { LadderCard } from "../../components/LadderCard";
import { SaayaButton } from "../../components/SaayaButton";
import { formatCopy, type M4Copy } from "../../copy/strings";

const COUNTDOWN_TICK_MS = 1000; // fact: motion.1000ms

export interface CheckInOverlayProps {
  readonly copy: M4Copy;
  readonly deadlineEpochMs: number | null;
  readonly demoSpeedEnabled: boolean;
  readonly onHelpNow: () => void;
  readonly onMinimize: () => void;
  readonly onOk: () => void;
  readonly reason: string | null;
  readonly state: "CHECKIN_1" | "CHECKIN_2";
}

/** M1 step 2: the two answerable, in-page rungs of the safety ladder. */
export function CheckInOverlay({
  copy,
  deadlineEpochMs,
  demoSpeedEnabled,
  onHelpNow,
  onMinimize,
  onOk,
  reason,
  state,
}: CheckInOverlayProps) {
  const totalSeconds =
    (state === "CHECKIN_1" ? CHECK_IN_1_SEC : CHECK_IN_2_SEC) /
    (demoSpeedEnabled ? DEMO_DIVISOR : 1); // fact: demo.normal.divisor
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());

  useEffect(() => {
    setNowEpochMs(Date.now());
    const interval = globalThis.setInterval(
      () => setNowEpochMs(Date.now()),
      COUNTDOWN_TICK_MS,
    );
    return () => globalThis.clearInterval(interval);
  }, [deadlineEpochMs, state]);

  const seconds = remainingSeconds(deadlineEpochMs, nowEpochMs, totalSeconds);
  const isFirst = state === "CHECKIN_1";
  const title = isFirst ? copy.checkin1Title : copy.checkin2Title;
  const body = isFirst ? copy.checkin1Body : copy.checkin2Body;
  const message = (
    <div className="checkin-overlay__message">
      <CountdownRing
        ariaLabel={formatCountdownLabel(copy.cdCountdown, seconds)}
        formatAnnouncement={(value) => formatCountdownLabel(copy.cdCountdown, value)}
        rung={state}
        seconds={seconds}
        totalSeconds={totalSeconds}
        variant="card"
      />
      <p>{body}</p>
      {reason === null ? null : <p>{reason}</p>}
      {isFirst ? <p>{copy.checkinPersistNote}</p> : null}
      <style jsx>{`
        .checkin-overlay__message {
          display: grid;
          justify-items: center;
          gap: var(--space-12);
        }

        .checkin-overlay__message p {
          margin: 0;
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
          accent={isFirst ? "brand" : "amber"}
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
