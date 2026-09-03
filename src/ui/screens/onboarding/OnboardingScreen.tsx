"use client";

import { FormEvent, useState } from "react";

import type { OnboardingRepository } from "../../../data/repository/onboardingRepository";
import { requestGeolocationPermission } from "../../../platform/geolocationPermission";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { PinEntryBox } from "../../components/PinEntryBox";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";
import {
  canContinueFromFavouriteStep,
  isCompletePin,
  isValidIndianMobileNumber,
  isWeakPin,
  ONBOARDING_PHONE_COUNTRY_CODE,
  ONBOARDING_PHONE_DIGITS,
  toIndianE164,
} from "./onboardingRules";

type OnboardingStep = "WELCOME" | "FAVOURITE" | "LOCATION" | "PIN" | "TOUR";
type LocationResult = "RATIONALE" | "GRANTED" | "DENIED";

export interface OnboardingScreenProps {
  readonly copy: M4Copy;
  readonly onCompleted: () => void;
  readonly repository: OnboardingRepository;
}

/** M1 step 1: the smallest functional calm-day setup flow. */
export function OnboardingScreen({
  copy,
  onCompleted,
  repository,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>("WELCOME");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [locationResult, setLocationResult] =
    useState<LocationResult>("RATIONALE");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveFavourite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinueFromFavouriteStep({
      favouriteName: name,
      phone,
      userName,
    })) return;
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
      setLocationResult(result === "granted" ? "GRANTED" : "DENIED");
    } finally {
      setSaving(false);
    }
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
      <section aria-live="polite" className="onboarding-screen__card">
        {step === "WELCOME" ? (
          <section className="onboarding-screen__welcome">
            <div className="onboarding-screen__brand-lockup">
              {/* Local SVG brand mark stays CSS-token-sized; Next image optimisation adds no value. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src="/assets/icons/saaya-icon-v2-small.svg" />
              <p className="onboarding-screen__app-name">{copy.appName}</p>
            </div>
            <OnboardingHeading
              body={copy.onbWelcomeBody}
              title={copy.onbWelcomeTitle}
            />
            <p className="onboarding-screen__beta-note">
              {copy.onbBetaVizag}
            </p>
            <ContinueToFavourite
              copy={copy}
              onClick={() => setStep("FAVOURITE")}
            />
          </section>
        ) : null}

        {step === "FAVOURITE" ? (
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
              disabled={!canContinueFromFavouriteStep({
                favouriteName: name,
                phone,
                userName,
              })}
              loading={saving}
              type="submit"
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaContinue}
            </SaayaButton>
          </form>
        ) : null}

        {step === "LOCATION" ? (
          <section>
            {locationResult === "RATIONALE" ? (
              <>
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
              </>
            ) : null}

            {locationResult === "GRANTED" ? (
              <>
                <OnboardingHeading
                  body={copy.onbLocationPartial}
                  title={copy.onbLocationTitle}
                />
                <ContinueToPin copy={copy} onClick={() => setStep("PIN")} />
              </>
            ) : null}

            {locationResult === "DENIED" ? (
              <>
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
                  <ContinueToPin copy={copy} onClick={() => setStep("PIN")} />
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {step === "PIN" ? (
          <form onSubmit={(event) => void finishOnboarding(event)}>
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
          <section className="onboarding-screen__tour">
            <OnboardingHeading
              body={copy.onbTourBody}
              title={copy.onbTourTitle}
            />
            <ol>
              <li>{copy.onbTourShadow}</li>
              <li>{copy.onbTourCheckins}</li>
              <li>{copy.onbTourSos}</li>
            </ol>
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
      </section>

      <style jsx>{`
        .onboarding-screen {
          display: grid;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: onboarding fills the visible phone viewport. */
          align-items: end;
          padding: var(--screen-padding);
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .onboarding-screen__card,
        .onboarding-screen form,
        .onboarding-screen section {
          display: grid;
          gap: var(--space-24);
        }

        .onboarding-screen__card {
          padding-block-end: calc(var(--space-24) + env(safe-area-inset-bottom));
        }

        .onboarding-screen__inputs,
        .onboarding-screen__pin-inputs,
        .onboarding-screen__actions,
        .onboarding-screen__user-name {
          display: grid;
          gap: var(--space-12);
        }

        .onboarding-screen__app-name,
        .onboarding-screen__inputs label {
          margin: 0;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
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

        .onboarding-screen__beta-note {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .onboarding-screen__tour ol {
          display: grid;
          gap: var(--space-12);
          margin: 0;
          padding-inline-start: var(--space-20);
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
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
          color: var(--color-text-secondary);
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

        .onboarding-screen__note,
        .onboarding-screen__error {
          margin: 0;
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .onboarding-screen__note {
          color: var(--color-text-secondary);
        }

        .onboarding-screen__error {
          color: var(--color-danger);
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
          font-size: var(--type-title-size);
          line-height: var(--type-title-line-height);
        }

        .onboarding-heading p {
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }
      `}</style>
    </header>
  );
}

function ContinueToPin({ copy, onClick }: Readonly<{ copy: M4Copy; onClick: () => void }>) {
  return (
    <SaayaButton onClick={onClick} variant="primary" workingLabel={copy.stateWorking}>
      {copy.ctaContinue}
    </SaayaButton>
  );
}

function ContinueToFavourite({
  copy,
  onClick,
}: Readonly<{ copy: M4Copy; onClick: () => void }>) {
  return (
    <SaayaButton onClick={onClick} variant="primary" workingLabel={copy.stateWorking}>
      {copy.ctaContinue}
    </SaayaButton>
  );
}
