"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import { IndexedDbSessionRepository } from "../../../data/db/indexedDbSessionRepository";
import { BrowserPinHasher } from "../../../platform/pinHash";
import { M4_COPY, type SaayaLocale } from "../../copy/strings";
import { HomeScreen, type HomeScreenProps } from "../home/HomeScreen";
import { DemoSetup } from "./DemoSetup";
import { resolveAppLocale, saveAppLocale } from "./localePreference";
import { OnboardingScreen } from "./OnboardingScreen";

type GateRoute = "LOADING" | "ONBOARDING" | "DEMO_SETUP" | "HOME";

/** S1: no flash while the local onboarded flag chooses its first route. */
export function AppGate(props: HomeScreenProps) {
  const repositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  const sessionRepositoryRef = useRef<IndexedDbSessionRepository | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = new IndexedDbOnboardingRepository(new BrowserPinHasher());
  }
  if (sessionRepositoryRef.current === null) {
    sessionRepositoryRef.current = new IndexedDbSessionRepository();
  }
  const repository = repositoryRef.current;
  const sessionRepository = sessionRepositoryRef.current;
  const [route, setRoute] = useState<GateRoute>("LOADING");
  const [locale, setLocale] = useState<SaayaLocale>(props.locale);
  const [openDemoOnFirstHome, setOpenDemoOnFirstHome] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      repository.loadOnboarded(),
      sessionRepository.loadCurrent(),
      resolveAppLocale(repository, props.locale),
    ]).then(([onboarded, currentSession, resolvedLocale]) => {
      if (cancelled) return;
      setLocale(resolvedLocale);
      // Recovery always wins: the demo entry cannot conceal an active ladder
      // or SOS, even when a visitor opens the dedicated demo URL.
      setRoute(
        currentSession !== null
          ? "HOME"
          : props.forceDemoEntry
            ? "DEMO_SETUP"
            : onboarded
              ? "HOME"
              : "ONBOARDING",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [repository, sessionRepository, props.forceDemoEntry, props.locale]);

  function changeLocale(nextLocale: SaayaLocale) {
    void saveAppLocale(repository, nextLocale).then(() => setLocale(nextLocale));
  }

  if (route === "LOADING") return null;
  if (route === "ONBOARDING") {
    return (
      <>
        <OnboardingScreen
          copy={M4_COPY[locale]}
          onCompleted={() => {
            setOpenDemoOnFirstHome(true);
            setRoute("HOME");
          }}
          repository={repository}
        />
        <a
          aria-label={M4_COPY[locale].cdDemoPanel}
          className="app-gate__demo-link"
          href="/?demo=1"
        >
          {M4_COPY[locale].ctaStartDemo}
        </a>
        <style jsx>{`
          .app-gate__demo-link {
            position: fixed;
            inset-inline: var(--screen-padding);
            inset-block-end: env(safe-area-inset-bottom);
            color: var(--color-text-secondary);
            font-size: var(--type-caption-size);
            line-height: var(--type-caption-line-height);
            text-align: center;
          }
        `}</style>
      </>
    );
  }
  if (route === "DEMO_SETUP") {
    return (
      <DemoSetup
        copy={M4_COPY[locale]}
        onCompleted={() => {
          setOpenDemoOnFirstHome(true);
          setRoute("HOME");
        }}
      />
    );
  }
  return (
    <HomeScreen
      {...props}
      locale={locale}
      onLocaleChange={changeLocale}
      openDemoOnMount={openDemoOnFirstHome}
    />
  );
}
