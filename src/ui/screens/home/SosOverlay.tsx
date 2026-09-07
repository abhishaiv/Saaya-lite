"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import type { PoliceStation } from "../../../domain/model/policeStation";
import {
  MINUTES_PER_HOUR,
  PIN_INITIAL_LOCKOUT_SEC,
  PIN_LENGTH,
  PIN_MAX_ATTEMPTS,
  PIN_MAX_LOCKOUT_MIN,
} from "../../../domain/engine/rules";
import { browserClock } from "../../../platform/clock";
import { DemoPinStore } from "../../../platform/demoPinStore";
import { BrowserPinHasher } from "../../../platform/pinHash";
import { installConsumeBackGuard } from "../../../platform/sosBackGuard";
import { installSosFocusTrap } from "../../../platform/sosFocusTrap";
import { BigActionButton } from "../../components/BigActionButton";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { PinEntryBox } from "../../components/PinEntryBox";
import { formatCopy, type M4Copy } from "../../copy/strings";

const MILLIS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI conversion between an epoch-millis deadline and seconds.
const TWO_DIGIT_CLOCK = 2; // GROUNDED-EXEMPT: structural fixed-width rendering of seconds in an elapsed-duration clock.
const PIN_MAX_LOCKOUT_SEC = PIN_MAX_LOCKOUT_MIN * MINUTES_PER_HOUR;
const INDIA_EMERGENCY_NUMBER = "112"; // fact: data.emergency.number.in
const WOMEN_SUPPORT_NUMBER = "181"; // fact: data.emergency.number.women_support

/**
 * The demo's synthetic police-dispatch preview. Every field is local copy;
 * nothing here is or implies an actual police record, dispatch or receipt.
 */
export interface SosDemoIncident {
  readonly label: string;
  readonly localNote: string;
  /** Ordered incident rows, rendered verbatim. */
  readonly rows: readonly string[];
  readonly statusActive: string;
  readonly zoneRow: string | null;
}

export interface SosOverlayProps {
  readonly copy: M4Copy;
  readonly demoIncident: SosDemoIncident | null;
  readonly nearestStation: PoliceStation | null;
  readonly onPinAccepted: () => void;
}

/** M1 step 4: a sticky, non-animated SOS surface with its local PIN gate. */
export function SosOverlay({
  copy,
  demoIncident,
  nearestStation,
  onPinAccepted,
}: SosOverlayProps) {
  const repositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  const demoPinStoreRef = useRef<DemoPinStore | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = new IndexedDbOnboardingRepository(
      new BrowserPinHasher(),
    );
  }
  if (demoPinStoreRef.current === null) {
    demoPinStoreRef.current = new DemoPinStore();
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
  const demoPinStore = demoPinStoreRef.current;
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
    const pinVerifier = demoIncident === null ? repository : demoPinStore;
    void pinVerifier
      .verifyPin(nextPin)
      .then((accepted) => {
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
      })
      .catch(() => {
        setPin("");
        setIsChecking(false);
        setError(formatCopy(copy.errPinWrong, PIN_MAX_ATTEMPTS));
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
          <>
            <DisclosureBanner
              content={copy.sosLocalOnly}
              kind="prototype-limitation"
            />
            <div className="sos-overlay__dials">
              <DialAction copy={copy} number={INDIA_EMERGENCY_NUMBER} />
              <DialAction copy={copy} number={WOMEN_SUPPORT_NUMBER} />
              {nearestStation === null ? null : (
                <DialAction
                  copy={copy}
                  number={nearestStation.phone}
                  label={nearestStation.name}
                />
              )}
            </div>
            <BigActionButton
              accent="danger"
              className="sos-overlay__stop"
              aria-label={copy.cdStopSos}
              label={copy.ctaStopSos}
              onClick={() => setView("PIN")}
              workingLabel={copy.stateWorking}
            />
            <DisclosureBanner
              content={copy.policeNoGovtLink}
              kind="prototype-limitation"
            />
            {demoIncident === null ? null : (
              <section
                aria-label={demoIncident.label}
                className="sos-overlay__demo"
              >
                <h2>{demoIncident.label}</h2>
                <ul>
                  {demoIncident.rows.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
                {demoIncident.zoneRow === null ? null : (
                  <p>{demoIncident.zoneRow}</p>
                )}
                <p className="sos-overlay__demo-status">
                  {demoIncident.statusActive}
                </p>
                <p className="sos-overlay__demo-note">
                  {demoIncident.localNote}
                </p>
              </section>
            )}
          </>
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
          box-sizing: border-box;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural viewport fill for an in-page emergency overlay. */
          max-block-size: 100dvh; /* GROUNDED-EXEMPT: the fixed emergency surface is bounded by the viewport. */
          overflow-y: auto;
          place-items: center;
          padding: var(--screen-padding);
          padding-block-start: calc(var(--screen-padding) + env(safe-area-inset-top));
          padding-block-end: calc(var(--screen-padding) + env(safe-area-inset-bottom));
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

        .sos-overlay__dials {
          display: grid;
          gap: var(--space-8);
        }

        :global(.sos-overlay__call) {
          display: inline-flex;
          min-block-size: var(--minimum-touch-target);
          align-items: center;
          justify-content: center;
          border: var(--border-hairline) solid var(--color-text-primary);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-primary);
          font-size: var(--type-body-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-body-line-height);
          text-decoration: none;
        }

        :global(.sos-overlay__stop .big-action-button__surface) {
          background: var(--color-card-fill);
          color: var(--color-text-primary);
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

        :global(.sos-overlay__call:focus-visible) {
          outline: 2px solid var(--color-brand-light);
          outline-offset: 2px;
        }

        .sos-overlay__demo {
          display: grid;
          justify-items: center;
          gap: var(--space-4);
          inline-size: 100%; /* GROUNDED-EXEMPT: the preview card fills the already padded overlay column. */
          padding: var(--space-12) var(--space-14);
          border: var(--border-hairline) solid var(--color-text-primary);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
          text-align: center;
        }

        .sos-overlay__demo h2 {
          margin: 0;
          font-size: var(--type-label-size);
          font-weight: var(--weight-bold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .sos-overlay__demo ul {
          display: grid;
          gap: var(--space-4);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .sos-overlay__demo p {
          margin: 0;
        }

        .sos-overlay__demo-status {
          font-weight: var(--weight-semibold);
        }

        .sos-overlay__demo-note {
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </section>
  );
}

type DialActionProps = Readonly<{
  copy: M4Copy;
  label?: string;
  number: string;
}>;

function DialAction({ copy, label, number }: DialActionProps) {
  const destination = label ?? number;

  return (
    <a
      aria-label={formatCopy(copy.cdStationCall, destination)}
      className="sos-overlay__call"
      href={`tel:${number}`}
    >
      {formatCopy(copy.cdStationCall, destination)}
    </a>
  );
}

function formatLockoutClock(seconds: number): string {
  const minutes = Math.floor(seconds / MINUTES_PER_HOUR);
  const remainder = seconds % MINUTES_PER_HOUR;
  return `${minutes}:${String(remainder).padStart(TWO_DIGIT_CLOCK, "0")}`;
}
