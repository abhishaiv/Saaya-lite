"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { DemoPinStore } from "../../../platform/demoPinStore";
import { PinEntryBox } from "../../components/PinEntryBox";
import { SaayaButton } from "../../components/SaayaButton";
import type { M4Copy } from "../../copy/strings";
import { isCompletePin, isWeakPin } from "./onboardingRules";

type DemoSetupMode = "LOADING" | "CREATE" | "VERIFY";

export interface DemoSetupProps {
  readonly copy: M4Copy;
  readonly onCompleted: () => void;
}

/**
 * The self-contained demo entry. It does not request a contact, location, or
 * onboarding state; its PIN record is separate from the real safety PIN.
 */
export function DemoSetup({ copy, onCompleted }: DemoSetupProps) {
  const storeRef = useRef<DemoPinStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = new DemoPinStore();
  }
  const store = storeRef.current;
  const [mode, setMode] = useState<DemoSetupMode>("LOADING");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store.hasPin().then((hasPin) => {
      if (!cancelled) setMode(hasPin ? "VERIFY" : "CREATE");
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCompletePin(pin) || saving || mode === "LOADING") return;
    if (mode === "CREATE" && isWeakPin(pin)) {
      setPin("");
      setError(copy.errPinWeak);
      return;
    }

    setSaving(true);
    try {
      const accepted =
        mode === "CREATE"
          ? await store.savePin(pin)
          : await store.verifyPin(pin);
      if (accepted) {
        onCompleted();
        return;
      }
      setPin("");
      setError(
        mode === "CREATE" ? copy.demoSetupStorageError : copy.demoSetupWrongPin,
      );
    } catch {
      setPin("");
      setError(
        mode === "CREATE" ? copy.demoSetupStorageError : copy.demoSetupWrongPin,
      );
    } finally {
      setSaving(false);
    }
  }

  if (mode === "LOADING") return null;

  return (
    <main className="demo-setup">
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <h1>{copy.demoSetupTitle}</h1>
          <p>{copy.demoSetupBody}</p>
        </header>
        <PinEntryBox
          ariaLabel={copy.demoSetupTitle}
          onChange={(nextPin) => {
            setPin(nextPin);
            setError(null);
          }}
          state={error === null ? "default" : "error"}
          value={pin}
        />
        {error === null ? null : <p role="alert">{error}</p>}
        <SaayaButton
          disabled={!isCompletePin(pin)}
          loading={saving}
          type="submit"
          variant="primary"
          workingLabel={copy.stateWorking}
        >
          {copy.ctaStartDemo}
        </SaayaButton>
      </form>

      <style jsx>{`
        .demo-setup {
          display: grid;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: the standalone demo setup fills the phone viewport. */
          align-items: end;
          padding: var(--screen-padding);
          background: var(--color-background);
          color: var(--color-text-primary);
        }

        .demo-setup form,
        .demo-setup header {
          display: grid;
          gap: var(--space-24);
        }

        .demo-setup form {
          justify-items: start;
          padding-block-end: calc(var(--space-24) + env(safe-area-inset-bottom));
        }

        .demo-setup h1,
        .demo-setup p {
          margin: 0;
        }

        .demo-setup header p {
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
        }

        .demo-setup > form > p {
          color: var(--color-danger);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </main>
  );
}
