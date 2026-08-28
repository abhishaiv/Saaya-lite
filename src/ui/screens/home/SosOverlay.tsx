"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import {
  MINUTES_PER_HOUR,
  PIN_INITIAL_LOCKOUT_SEC,
  PIN_LENGTH,
  PIN_MAX_ATTEMPTS,
  PIN_MAX_LOCKOUT_MIN,
} from "../../../domain/engine/rules";
import { browserClock } from "../../../platform/clock";
import { BrowserPinHasher } from "../../../platform/pinHash";
import { installConsumeBackGuard } from "../../../platform/sosBackGuard";
import { installSosFocusTrap } from "../../../platform/sosFocusTrap";
import { BigActionButton } from "../../components/BigActionButton";
import { PinEntryBox } from "../../components/PinEntryBox";
import { formatCopy, type M4Copy } from "../../copy/strings";

const MILLIS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI conversion between an epoch-millis deadline and seconds.
const TWO_DIGIT_CLOCK = 2; // GROUNDED-EXEMPT: structural fixed-width rendering of seconds in an elapsed-duration clock.
const PIN_MAX_LOCKOUT_SEC = PIN_MAX_LOCKOUT_MIN * MINUTES_PER_HOUR;

export interface SosOverlayProps {
  readonly copy: M4Copy;
  readonly onPinAccepted: () => void;
}

/** M1 step 4: a sticky, non-animated SOS surface with its local PIN gate. */
export function SosOverlay({ copy, onPinAccepted }: SosOverlayProps) {
  const repositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = new IndexedDbOnboardingRepository(
      new BrowserPinHasher(),
    );
  }

  const [view, setView] = useState<"SOS" | "PIN">("SOS");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(PIN_INITIAL_LOCKOUT_SEC);
  const [lockedUntilEpochMs, setLockedUntilEpochMs] = useState<number | null>(
    null,
  );
  const [nowEpochMs, setNowEpochMs] = useState(() => browserClock.nowEpochMs());
  const repository = repositoryRef.current;
  const isLocked =
    lockedUntilEpochMs !== null && nowEpochMs < lockedUntilEpochMs;

  useEffect(
    () => installConsumeBackGuard(() => setView("SOS")),
    [],
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    return overlay === null ? undefined : installSosFocusTrap(overlay);
  }, [view]);

  useEffect(() => {
    if (lockedUntilEpochMs === null) return;
    const tick = () => setNowEpochMs(browserClock.nowEpochMs());
    tick();
    const interval = globalThis.setInterval(tick, MILLIS_PER_SECOND);
    return () => globalThis.clearInterval(interval);
  }, [lockedUntilEpochMs]);

  useEffect(() => {
    if (
      lockedUntilEpochMs !== null &&
      nowEpochMs >= lockedUntilEpochMs
    ) {
      setLockedUntilEpochMs(null);
      setError(null);
      setPin("");
    }
  }, [lockedUntilEpochMs, nowEpochMs]);

  function handlePinChange(nextPin: string) {
    setPin(nextPin);
    setError(null);
    if (
      nextPin.length !== PIN_LENGTH ||
      isChecking ||
      isLocked
    ) {
      return;
    }

    setIsChecking(true);
    void repository.verifyPin(nextPin).then((accepted) => {
      if (accepted) {
        onPinAccepted();
        return;
      }

      const nextAttempts = failedAttempts + 1;
      setPin("");
      setIsChecking(false);
      if (nextAttempts >= PIN_MAX_ATTEMPTS) {
        const now = browserClock.nowEpochMs();
        setNowEpochMs(now);
        setLockedUntilEpochMs(
          now + lockoutSeconds * MILLIS_PER_SECOND,
        );
        setLockoutSeconds((current) =>
          Math.min(PIN_MAX_LOCKOUT_SEC, current + current),
        );
        setFailedAttempts(0);
        return;
      }

      setFailedAttempts(nextAttempts);
      setError(
        formatCopy(copy.errPinWrong, PIN_MAX_ATTEMPTS - nextAttempts),
      );
    });
  }

  const lockoutRemainingSeconds =
    lockedUntilEpochMs === null
      ? 0
      : Math.max(
          0,
          Math.ceil(
            (lockedUntilEpochMs - nowEpochMs) / MILLIS_PER_SECOND,
          ),
        );
  const pinAriaLabel = formatCopy(
    copy.cdPinBox,
    Math.min(PIN_LENGTH, pin.length + 1),
  );

  return (
    <section
      aria-label={view === "SOS" ? copy.sosTitle : copy.pinTitle}
      aria-modal="true"
      className="sos-overlay"
      data-sos-view={view.toLowerCase()}
      ref={overlayRef}
      role="dialog"
    >
      <div className="sos-overlay__surface">
        <h1>{view === "SOS" ? copy.sosTitle : copy.pinTitle}</h1>
        {view === "SOS" ? (
          <BigActionButton
            accent="danger"
            aria-label={copy.cdStopSos}
            label={copy.ctaStopSos}
            onClick={() => setView("PIN")}
            workingLabel={copy.stateWorking}
          />
        ) : (
          <div className="sos-overlay__pin">
            {isLocked ? (
              <PinEntryBox
                ariaLabel={pinAriaLabel}
                lockedCountdown={formatLockoutClock(lockoutRemainingSeconds)}
                lockedMessage={formatCopy(
                  copy.errPinLocked,
                  formatLockoutClock(lockoutRemainingSeconds),
                )}
                onChange={handlePinChange}
                state="locked"
                value={pin}
              />
            ) : (
              <PinEntryBox
                ariaLabel={pinAriaLabel}
                onChange={handlePinChange}
                state={error === null ? "default" : "error"}
                value={pin}
              />
            )}
            {error === null ? null : (
              <p aria-live="polite" className="sos-overlay__error" role="status">
                {error}
              </p>
            )}
            <p className="sos-overlay__no-recovery">{copy.pinNoRecovery}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .sos-overlay {
          position: fixed;
          z-index: 20; /* GROUNDED-EXEMPT: SOS must cover every app surface while its sticky state is active. */
          inset: 0;
          display: grid;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural viewport fill for an in-page emergency overlay. */
          place-items: center;
          padding: var(--screen-padding);
          background: var(--color-danger);
          color: var(--color-text-primary);
          animation: none;
          transition: none;
        }

        .sos-overlay__surface {
          display: grid;
          inline-size: 100%; /* GROUNDED-EXEMPT: the emergency surface fills the already padded viewport. */
          gap: var(--space-24);
          text-align: center;
        }

        .sos-overlay h1,
        .sos-overlay p {
          margin: 0;
        }

        .sos-overlay h1 {
          font-size: var(--type-title-size);
          font-weight: var(--weight-bold);
          line-height: var(--type-title-line-height);
        }

        .sos-overlay__pin {
          display: grid;
          justify-items: center;
          gap: var(--space-16);
        }

        .sos-overlay__error,
        .sos-overlay__no-recovery {
          max-inline-size: 100%; /* GROUNDED-EXEMPT: local text must remain inside the overlay surface. */
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .sos-overlay__no-recovery {
          color: var(--color-text-on-card);
        }
      `}</style>
    </section>
  );
}

function formatLockoutClock(seconds: number): string {
  const minutes = Math.floor(seconds / MINUTES_PER_HOUR);
  const remainder = seconds % MINUTES_PER_HOUR;
  return `${minutes}:${String(remainder).padStart(TWO_DIGIT_CLOCK, "0")}`;
}
