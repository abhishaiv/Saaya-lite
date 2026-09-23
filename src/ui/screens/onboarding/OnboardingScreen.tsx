"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { OnboardingRepository } from "../../../data/repository/onboardingRepository";
import type { MapZone, ZoneDetail } from "../../../data/repository/zoneRepository";
import type { PoliceStation } from "../../../domain/model/policeStation";
import { browserClock } from "../../../platform/clock";
import { requestGeolocationPermission } from "../../../platform/geolocationPermission";
import { hourBandAtEpochMs } from "../../../platform/hourBandClock";
import {
  readCurrentPositionFix,
  type LiveLocationFix,
} from "../../../platform/locationWatch";
import { DEFAULT_CHARACTER } from "../../../platform/walk/characterParts";
import { COLOR_WALK_SKY } from "../../../platform/walk/walkFacts";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { PinEntryBox } from "../../components/PinEntryBox";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";
import { ZoneDetailSheet } from "../home/ZoneDetailSheet";
import { WalkView } from "../walk/WalkView";
import {
  hasFavouriteInput,
  isCompletePin,
  isValidIndianMobileNumber,
  isWeakPin,
  ONBOARDING_PHONE_COUNTRY_CODE,
  ONBOARDING_PHONE_DIGITS,
  toIndianE164,
} from "./onboardingRules";

type OnboardingStep =
  | "PROMISES"
  | "FAVOURITE"
  | "LOCATION"
  | "STREET"
  | "PIN"
  | "TOUR"
  | "CELEBRATE";
type LocationResult = "RATIONALE" | "GRANTED" | "DENIED";
type WorldOutcome = "loading" | "ready" | "failed";

/**
 * How long a promise holds the splash before the next one takes its place. Long enough to
 * read one short sentence, short enough that three of them do not become a screen she waits
 * at. `MOTION_SPEC.md` carries the row.
 */
const PROMISE_FRAME_MS = 2400; // fact: motion.2400ms

export interface OnboardingScreenProps {
  readonly copy: M4Copy;
  readonly mapZones: readonly MapZone[];
  readonly onCompleted: () => void;
  readonly policeStations: readonly PoliceStation[];
  readonly repository: OnboardingRepository;
  readonly zoneDetails: readonly ZoneDetail[];
}

/**
 * S2, in the craft the founder ruled on 2026-09-23: one idea per screen, the promise
 * splash, the street she is being set up over, and the tour as cards rather than a list.
 *
 * The five spec'd moments keep their substance and their order - welcome, favourite,
 * location, PIN, tour. What is new is presentation plus two connective moments the ruling
 * asked for: the street (the walk view of her own area, between location and PIN) and the
 * celebration before Home. `onboarded` is still written only when she opens the demo.
 */
export function OnboardingScreen({
  copy,
  mapZones,
  onCompleted,
  policeStations,
  repository,
  zoneDetails,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>("PROMISES");
  const [promiseFrame, setPromiseFrame] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [locationResult, setLocationResult] =
    useState<LocationResult>("RATIONALE");
  const [fixedLocation, setFixedLocation] = useState<LiveLocationFix | null>(
    null,
  );
  const [worldOutcome, setWorldOutcome] = useState<WorldOutcome>("loading");
  const [tourFrame, setTourFrame] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const promises = useMemo(
    () => [
      { body: copy.onbWelcomeBody, title: copy.onbWelcomeTitle },
      { body: copy.onbLocationPartial, title: copy.onbPromiseWatchTitle },
      { body: copy.onbContactPrivacy, title: copy.onbPromiseFavouritesTitle },
    ],
    [copy],
  );
  const lastPromise = promises.length - 1;
  // Frame 3 is the question, so the rotation has one more stop than it has promises.
  const onQuestion = reducedMotion || promiseFrame > lastPromise;
  const promise = promises[Math.min(promiseFrame, lastPromise)] ?? promises[0];

  const tourCards = useMemo(
    () => [
      { body: copy.onbTourBody, title: copy.onbTourTitle },
      { body: copy.onbTourShadow, title: copy.onbTourShadowTitle },
      { body: copy.onbTourCheckins, title: copy.onbTourCheckinsTitle },
      { body: copy.onbTourSos, title: copy.onbTourSosTitle },
    ],
    [copy],
  );
  const lastTourCard = tourCards.length - 1;
  const card = tourCards[Math.min(tourFrame, lastTourCard)] ?? tourCards[0];

  const worldVisible =
    fixedLocation !== null &&
    (step === "STREET" ||
      step === "PIN" ||
      step === "TOUR" ||
      step === "CELEBRATE");
  const streetLoading = step === "STREET" && worldOutcome === "loading";

  const selectedZone = useMemo(
    () =>
      selectedZoneId === null
        ? null
        : zoneDetails.find(({ id }) => id === selectedZoneId) ?? null,
    [selectedZoneId, zoneDetails],
  );

  useEffect(() => {
    const query =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    if (query === null) return undefined;
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    // Reduced motion holds the whole splash on one screen instead: the promises read as a
    // short list and the question and its button are simply there. Nothing rotates.
    if (step !== "PROMISES" || reducedMotion || promiseFrame > lastPromise) {
      return undefined;
    }
    const timer = globalThis.setTimeout(
      () => setPromiseFrame((frame) => frame + 1),
      PROMISE_FRAME_MS,
    );
    return () => globalThis.clearTimeout(timer);
  }, [lastPromise, promiseFrame, reducedMotion, step]);

  async function saveFavourite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasFavouriteInput(name, phone)) return;
    setSaving(true);
    try {
      await repository.saveUserName(userName.trim() || null);
      await repository.savePrimaryFavourite({
        name: name.trim(),
        phone: toIndianE164(phone),
      });
      setStep("LOCATION");
    } finally {
      setSaving(false);
    }
  }

  async function askForLocation() {
    setSaving(true);
    try {
      const result = await requestGeolocationPermission();
      if (result === "granted") {
        // The permission is granted; this is the one time setup needs the position
        // itself, so the street moment has a place to stand her in. A failed read is not
        // a failure of consent: the location screens still say what they said, and the
        // street is skipped rather than drawn at a place she is not.
        setFixedLocation(await readCurrentPositionFix());
      }
      setLocationResult(result === "granted" ? "GRANTED" : "DENIED");
    } finally {
      setSaving(false);
    }
  }

  function continueAfterLocation() {
    setStep(fixedLocation === null ? "PIN" : "STREET");
  }

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCompletePin(pin)) return;
    if (isWeakPin(pin)) {
      setPin("");
      setPinError(copy.errPinWeak);
      return;
    }
    setSaving(true);
    try {
      await repository.savePin(pin);
      setStep("TOUR");
    } finally {
      setSaving(false);
    }
  }

  async function finishTour() {
    setSaving(true);
    try {
      await repository.saveOnboarded();
      onCompleted();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-screen">
      {worldVisible && fixedLocation !== null ? (
        // Mounted once for the whole back half, the way Corner keeps its map behind the
        // steps once the city is chosen: the street she is being set up over stays hers
        // from the moment it appears. It is the surface only on its own beat; behind the
        // sheets it is a backdrop, so its zone names stop taking taps there.
        <div
          className="onboarding-screen__world"
          data-interactive={step === "STREET"}
        >
          <WalkView
            character={DEFAULT_CHARACTER}
            copy={copy}
            headingAllowed={false}
            hourBand={hourBandAtEpochMs(browserClock.nowEpochMs())}
            location={fixedLocation}
            locationStatus="CURRENT"
            mapZones={mapZones}
            onWorldSettled={setWorldOutcome}
            onZoneSelected={setSelectedZoneId}
            selectedZoneId={selectedZoneId}
            sessionState="IDLE"
          />
        </div>
      ) : null}

      {step === "PROMISES" ? (
        <section className="onboarding-screen__beat onboarding-screen__promises">
          <div className="onboarding-screen__brand-lockup">
            {/* Local SVG brand mark stays CSS-token-sized; Next image optimisation adds no value. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/assets/icons/saaya-icon-v2-small.svg" />
            <p className="onboarding-screen__app-name">{copy.appName}</p>
          </div>
          <div aria-live="polite" className="onboarding-screen__promise">
            {onQuestion ? (
              <>
                <h1>{copy.onbPromiseReadyTitle}</h1>
                <p>{copy.onbPromiseReadyBody}</p>
              </>
            ) : (
              <>
                <h1>{promise.title}</h1>
                <p>{promise.body}</p>
              </>
            )}
          </div>
          {reducedMotion ? (
            <ul className="onboarding-screen__promise-stack">
              {promises.map((frame) => (
                <li key={frame.title}>{frame.title}</li>
              ))}
            </ul>
          ) : null}
          <p className="onboarding-screen__beta-note">{copy.onbBetaVizag}</p>
          {onQuestion ? (
            <SaayaButton
              onClick={() => setStep("FAVOURITE")}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaContinue}
            </SaayaButton>
          ) : null}
        </section>
      ) : null}

      {step === "FAVOURITE" ? (
        <section className="onboarding-screen__beat">
          <form onSubmit={(event) => void saveFavourite(event)}>
            <div className="onboarding-screen__user-name">
              <label htmlFor="user-name">{copy.onbNameLabel}</label>
              <input
                aria-describedby="user-name-hint"
                aria-label={copy.onbNameLabel}
                autoCapitalize="words"
                autoComplete="name"
                id="user-name"
                name="user-name"
                onChange={(event) => setUserName(event.currentTarget.value)}
                type="text"
                value={userName}
              />
              <p id="user-name-hint">{copy.onbNameHint}</p>
            </div>
            <OnboardingHeading
              body={copy.onbContactBody}
              title={copy.onbContactTitle}
            />
            <div className="onboarding-screen__inputs">
              <label htmlFor="favourite-name">
                {copy.onbFavouriteNameLabel}
              </label>
              <input
                autoCapitalize="words"
                autoComplete="name"
                id="favourite-name"
                name="favourite-name"
                onChange={(event) => setName(event.currentTarget.value)}
                required
                type="text"
                value={name}
              />
              <label htmlFor="favourite-phone">
                {copy.onbFavouritePhoneLabel}
              </label>
              <div className="onboarding-screen__phone-input">
                <span id="favourite-phone-prefix">
                  {ONBOARDING_PHONE_COUNTRY_CODE}
                </span>
                <input
                  aria-describedby="favourite-phone-prefix"
                  aria-invalid={phone !== "" && !isValidIndianMobileNumber(phone)}
                  autoComplete="tel-national"
                  id="favourite-phone"
                  inputMode="numeric"
                  maxLength={ONBOARDING_PHONE_DIGITS}
                  name="favourite-phone"
                  onChange={(event) => setPhone(event.currentTarget.value)}
                  required
                  type="tel"
                  value={phone}
                />
              </div>
            </div>
            <DisclosureBanner
              content={copy.onbContactPrivacy}
              kind="prototype-limitation"
            />
            <SaayaButton
              disabled={!hasFavouriteInput(name, phone)}
              loading={saving}
              type="submit"
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaContinue}
            </SaayaButton>
          </form>
        </section>
      ) : null}

      {step === "LOCATION" ? (
        <section className="onboarding-screen__beat">
          {locationResult === "RATIONALE" ? (
            <div className="onboarding-screen__beat-block">
              <OnboardingHeading
                body={copy.onbLocationBody}
                title={copy.onbLocationTitle}
              />
              <SaayaButton
                loading={saving}
                onClick={() => void askForLocation()}
                variant="primary"
                workingLabel={copy.stateWorking}
              >
                {copy.ctaContinue}
              </SaayaButton>
            </div>
          ) : null}

          {locationResult === "GRANTED" ? (
            <div className="onboarding-screen__beat-block">
              <OnboardingHeading
                body={copy.onbLocationPartial}
                title={copy.onbLocationTitle}
              />
              <SaayaButton
                onClick={continueAfterLocation}
                variant="primary"
                workingLabel={copy.stateWorking}
              >
                {copy.ctaContinue}
              </SaayaButton>
            </div>
          ) : null}

          {locationResult === "DENIED" ? (
            <div className="onboarding-screen__beat-block">
              <OnboardingHeading
                body={copy.locHelpBody}
                title={copy.locHelpTitle}
              />
              <p className="onboarding-screen__note">{copy.locHelpNote}</p>
              <div className="onboarding-screen__actions">
                <SaayaButton
                  loading={saving}
                  onClick={() => void askForLocation()}
                  variant="ghost"
                  workingLabel={copy.stateWorking}
                >
                  {copy.ctaRetry}
                </SaayaButton>
                <SaayaButton
                  onClick={continueAfterLocation}
                  variant="primary"
                  workingLabel={copy.stateWorking}
                >
                  {copy.ctaContinue}
                </SaayaButton>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === "STREET" ? (
        <section className="onboarding-screen__street">
          <div className="onboarding-screen__street-strip">
            <h1>{copy.onbStreetCaption}</h1>
            <p>{copy.onbBetaVizag}</p>
          </div>
          <div className="onboarding-screen__street-actions">
            <SaayaButton
              onClick={() => setStep("PIN")}
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaContinue}
            </SaayaButton>
          </div>
        </section>
      ) : null}

      {streetLoading ? (
        <div className="onboarding-screen__loading" role="status">
          <div className="onboarding-screen__brand-lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/assets/icons/saaya-icon-v2-small.svg" />
            <p className="onboarding-screen__app-name">{copy.appName}</p>
          </div>
          <p className="onboarding-screen__loading-line">{copy.walkLoading}</p>
          <p aria-hidden="true" className="onboarding-screen__dots">
            <span />
            <span />
            <span />
          </p>
        </div>
      ) : null}

      {step === "PIN" ? (
        <form
          className="onboarding-screen__sheet"
          onSubmit={(event) => void finishOnboarding(event)}
        >
          <OnboardingHeading body={copy.onbPinBody} title={copy.onbPinTitle} />
          <div className="onboarding-screen__pin-inputs">
            <PinEntryBox
              ariaLabel={copy.onbPinTitle}
              onChange={(value) => {
                setPin(value);
                setPinError(null);
              }}
              state={pinError === null ? "default" : "error"}
              value={pin}
            />
          </div>
          {pinError === null ? null : (
            <p className="onboarding-screen__error" role="alert">
              {pinError}
            </p>
          )}
          <SaayaButton
            disabled={!isCompletePin(pin)}
            loading={saving}
            type="submit"
            variant="primary"
            workingLabel={copy.stateWorking}
          >
            {copy.ctaFinish}
          </SaayaButton>
        </form>
      ) : null}

      {step === "TOUR" ? (
        <section className="onboarding-screen__sheet onboarding-screen__tour">
          <p aria-hidden="true" className="onboarding-screen__dots">
            {tourCards.map((tourCard, index) => (
              <span data-current={index === tourFrame || undefined} key={tourCard.title} />
            ))}
          </p>
          <OnboardingHeading body={card.body} title={card.title} />
          <SaayaButton
            onClick={() => {
              if (tourFrame >= lastTourCard) {
                setStep("CELEBRATE");
                return;
              }
              setTourFrame(tourFrame + 1);
            }}
            variant="primary"
            workingLabel={copy.stateWorking}
          >
            {copy.ctaContinue}
          </SaayaButton>
        </section>
      ) : null}

      {step === "CELEBRATE" ? (
        <section className="onboarding-screen__sheet onboarding-screen__celebrate">
          <OnboardingHeading
            body={copy.onbCelebrateBody}
            title={copy.onbCelebrateTitle}
          />
          <SaayaButton
            loading={saving}
            onClick={() => void finishTour()}
            variant="primary"
            workingLabel={copy.stateWorking}
          >
            {copy.ctaOpenDemo}
          </SaayaButton>
        </section>
      ) : null}

      {selectedZone === null ? null : (
        <ZoneDetailSheet
          copy={copy}
          currentPoint={fixedLocation}
          detail={selectedZone}
          hourBand={hourBandAtEpochMs(browserClock.nowEpochMs())}
          onDismiss={() => setSelectedZoneId(null)}
          policeStations={policeStations}
        />
      )}

      <style jsx>{`
        .onboarding-screen {
          /* Onboarding has no action dock. The walk view's legend chip reads the
             clearance the dock declares on Home, because it is the same chip and the same
             statement, so onboarding declares it from its own bottom row - the Continue
             pill, or the sheet that stands where the dock does. */
          --home-action-dock-height: calc(
            var(--minimum-touch-target) + var(--space-8)
          );
          --home-action-dock-clearance: calc(
            env(safe-area-inset-bottom) + var(--home-action-dock-height) +
              var(--space-20)
          );

          position: relative;
          display: block;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: onboarding fills the visible phone viewport. */
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .onboarding-screen__world {
          position: absolute;
          inset: 0;
        }

        /* The world is the surface on its own beat and a backdrop behind the sheets. As a
           backdrop it takes no taps: the zone names behind a PIN sheet are not controls
           she can reach by accident while typing. */
        .onboarding-screen__world[data-interactive="false"] {
          pointer-events: none;
        }

        /* One idea per screen, anchored low the way the old card was, so the content that
           grows (a form, a longer body) grows upward and scrolls when it must. */
        .onboarding-screen__beat {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
          padding: calc(env(safe-area-inset-top) + var(--space-24))
            var(--screen-padding)
            calc(env(safe-area-inset-bottom) + var(--space-24));
          overflow-y: auto;
        }

        .onboarding-screen__beat > :first-child {
          margin-block-start: auto;
        }

        .onboarding-screen__beat-block,
        .onboarding-screen__beat form {
          display: grid;
          gap: var(--space-24);
        }

        .onboarding-screen__brand-lockup {
          display: inline-flex;
          align-items: center;
          gap: var(--space-12);
        }

        .onboarding-screen__brand-lockup img {
          inline-size: var(--minimum-touch-target);
          block-size: var(--minimum-touch-target);
        }

        .onboarding-screen__app-name {
          margin: 0;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        /* The block keeps the tallest promise's height whether the words are one line or
           two, so the button and the note under it never move while the splash rotates. */
        .onboarding-screen__promise {
          display: grid;
          gap: var(--space-12);
          min-block-size: calc(
            2 * var(--type-display-line-height) + var(--space-12) +
              var(--type-body-line-height)
          );
        }

        .onboarding-screen__promise h1,
        .onboarding-screen__promise p,
        .onboarding-screen__promise-stack li {
          margin: 0;
        }

        .onboarding-screen__promise h1 {
          font-size: var(--type-display-size);
          line-height: var(--type-display-line-height);
        }

        .onboarding-screen__promise p {
          color: var(--color-text-secondary);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .onboarding-screen__promise-stack {
          display: grid;
          gap: var(--space-8);
          margin: 0;
          padding: 0;
          color: var(--color-text-secondary);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
          list-style: none;
        }

        .onboarding-screen__beta-note,
        .onboarding-screen__note {
          margin: 0;
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .onboarding-screen__inputs,
        .onboarding-screen__pin-inputs,
        .onboarding-screen__actions,
        .onboarding-screen__user-name {
          display: grid;
          gap: var(--space-12);
        }

        .onboarding-screen__inputs label {
          color: var(--color-text-secondary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .onboarding-screen__user-name label,
        .onboarding-screen__user-name p {
          margin: 0;
        }

        .onboarding-screen__user-name label {
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .onboarding-screen__user-name p {
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .onboarding-screen__user-name input,
        .onboarding-screen__inputs > input,
        .onboarding-screen__phone-input {
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          border-radius: var(--radius-control);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font: inherit;
        }

        .onboarding-screen__phone-input {
          display: grid;
          grid-template-columns: max-content 1fr;
          align-items: center;
          gap: var(--space-12);
        }

        .onboarding-screen__phone-input input {
          border: none;
          outline: none;
          background: transparent;
          color: var(--color-text-primary);
          font: inherit;
        }

        .onboarding-screen__error {
          margin: 0;
          color: var(--color-danger);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        /* The street is a full moment: a reading at the top, the way the world reads, and
           the one button at the dock's own height, so the legend chip rides above it by
           the same margin it rides above the dock on Home. */
        .onboarding-screen__street {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: var(--space-24);
          padding: calc(env(safe-area-inset-top) + var(--space-12))
            var(--screen-padding)
            calc(env(safe-area-inset-bottom) + var(--space-20));
          pointer-events: none;
        }

        /* Both of the street's own controls name themselves here rather than being reached
           through a child selector: styled-jsx scopes a "> *" rule to elements declared in
           this file, and SaayaButton does not carry this file's class onto its root, so a
           blanket child rule silently left the one button in the beat untappable - the
           walk view's canvas took the tap instead. The wrapper exists for the same
           reason, and to stand in the grid's last row. */
        .onboarding-screen__street-strip,
        .onboarding-screen__street-actions {
          pointer-events: auto;
        }

        .onboarding-screen__street-actions {
          grid-row: 3;
          display: grid;
        }

        .onboarding-screen__street-strip {
          display: grid;
          gap: var(--space-4);
          padding: var(--space-12);
          border-radius: var(--radius-small);
          background: rgb(from var(--color-card-fill) r g b / 0.92);
        }

        .onboarding-screen__street-strip h1,
        .onboarding-screen__street-strip p {
          margin: 0;
        }

        .onboarding-screen__street-strip h1 {
          font-size: var(--type-headline-size);
          line-height: var(--type-headline-line-height);
        }

        .onboarding-screen__street-strip p {
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        /* The map's own tone while the streets land, so the world arrives into a sky that
           was already on screen, and the brand mark stands in it the way Corner's does. */
        .onboarding-screen__loading {
          position: absolute;
          inset: 0;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: var(--space-24);
          padding: var(--screen-padding);
          background: ${COLOR_WALK_SKY};
          color: var(--color-text-primary);
          text-align: center;
        }

        .onboarding-screen__loading-line {
          margin: 0;
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .onboarding-screen__dots {
          display: flex;
          gap: var(--space-8);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .onboarding-screen__dots span {
          inline-size: var(--space-8);
          block-size: var(--space-8);
          border-radius: 50%;
          background: currentColor;
          opacity: 0.3;
        }

        .onboarding-screen__dots span[data-current] {
          opacity: 1;
        }

        .onboarding-screen__loading .onboarding-screen__dots span {
          animation: onboarding-dot var(--motion-1000) var(--motion-standard)
            infinite;
        }

        .onboarding-screen__loading .onboarding-screen__dots span:nth-child(2) {
          animation-delay: var(--motion-300);
        }

        .onboarding-screen__loading .onboarding-screen__dots span:nth-child(3) {
          animation-delay: var(--motion-320);
        }

        @keyframes onboarding-dot {
          0%,
          100% {
            opacity: 0.3;
          }

          50% {
            opacity: 1;
          }
        }

        /* The sheet: the same card the zone detail rises in, on its own bottom edge, with
           the world it rises over still visible. */
        .onboarding-screen__sheet {
          position: absolute;
          inset-inline: 0;
          inset-block-end: 0;
          display: grid;
          gap: var(--space-24);
          max-block-size: var(--sheet-expanded-height);
          padding: var(--screen-padding);
          padding-block-end: calc(
            var(--screen-padding) + env(safe-area-inset-bottom)
          );
          border-radius: var(--radius-card) var(--radius-card) 0 0;
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          overflow-y: auto;
          animation: onboarding-sheet var(--motion-320) var(--motion-spring);
        }

        @keyframes onboarding-sheet {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function OnboardingHeading({ body, title }: Readonly<{ body: string; title: string }>) {
  return (
    <header className="onboarding-heading">
      <h1>{title}</h1>
      <p>{body}</p>
      <style jsx>{`
        .onboarding-heading {
          display: grid;
          gap: var(--space-12);
        }

        .onboarding-heading h1,
        .onboarding-heading p {
          margin: 0;
        }

        .onboarding-heading h1 {
          font-size: var(--type-display-size);
          line-height: var(--type-display-line-height);
        }

        /* Follows whatever it is standing on: the violet of the beats behind it or the
           card fill of a sheet, at the same step back in both. */
        .onboarding-heading p {
          color: var(--color-text-secondary);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }
      `}</style>
    </header>
  );
}
