"use client";

import { FormEvent, useState } from "react";

import type { OnboardingRepository } from "../../../data/repository/onboardingRepository";
import { requestGeolocationPermission } from "../../../platform/geolocationPermission";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { PinEntryBox } from "../../components/PinEntryBox";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";
import {
  hasFavouriteInput,
  isCompletePin,
  isWeakPin,
} from "./onboardingRules";

type OnboardingStep = "FAVOURITE" | "LOCATION" | "PIN";
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
  const [step, setStep] = useState<OnboardingStep>("FAVOURITE");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [locationResult, setLocationResult] =
    useState<LocationResult>("RATIONALE");
  const [pin, setPin] = useState("");
  const [confirmedPin, setConfirmedPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveFavourite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasFavouriteInput(name, phone)) return;
    setSaving(true);
    try {
      await repository.saveUserName(userName.trim() || null);
      await repository.savePrimaryFavourite({
        name: name.trim(),
        phone: phone.trim(),
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
    if (!isCompletePin(pin) || !isCompletePin(confirmedPin)) return;
    if (isWeakPin(pin)) {
      setPinError(copy.errPinWeak);
      return;
    }
    if (pin !== confirmedPin) {
      setPinError(copy.errPinMismatch);
      return;
    }
    setSaving(true);
    try {
      await repository.savePin(pin);
      await repository.saveOnboarded();
      onCompleted();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-screen">
      <section aria-live="polite" className="onboarding-screen__card">
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
              <input
                aria-label={copy.onbContactTitle}
                autoCapitalize="words"
                autoComplete="name"
                name="favourite-name"
                onChange={(event) => setName(event.currentTarget.value)}
                type="text"
                value={name}
              />
              <input
                aria-label={copy.onbContactBody}
                autoComplete="tel"
                inputMode="numeric"
                name="favourite-phone"
                onChange={(event) => setPhone(event.currentTarget.value)}
                type="tel"
                value={phone}
              />
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
              <PinEntryBox
                ariaLabel={copy.onbPinBody}
                onChange={(value) => {
                  setConfirmedPin(value);
                  setPinError(null);
                }}
                state={pinError === null ? "default" : "error"}
                value={confirmedPin}
              />
            </div>
            {pinError === null ? null : (
              <p className="onboarding-screen__error" role="alert">
                {pinError}
              </p>
            )}
            <SaayaButton
              disabled={!isCompletePin(pin) || !isCompletePin(confirmedPin)}
              loading={saving}
              type="submit"
              variant="primary"
              workingLabel={copy.stateWorking}
            >
              {copy.ctaFinish}
            </SaayaButton>
          </form>
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
        .onboarding-screen__inputs input {
          min-block-size: var(--minimum-touch-target);
          padding: 0 var(--space-14);
          border: var(--border-hairline) solid var(--color-surface-elevated);
          border-radius: var(--radius-control);
          background: var(--color-surface);
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
