"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import { BrowserPinHasher } from "../../../platform/pinHash";
import { M4_COPY, type SaayaLocale } from "../../copy/strings";
import { HomeScreen, type HomeScreenProps } from "../home/HomeScreen";
import { resolveAppLocale, saveAppLocale } from "./localePreference";
import { OnboardingScreen } from "./OnboardingScreen";

type GateRoute = "LOADING" | "ONBOARDING" | "HOME";

/** S1: no flash while the local onboarded flag chooses its first route. */
export function AppGate(props: HomeScreenProps) {
  const repositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  if (repositoryRef.current === null) {
    repositoryRef.current = new IndexedDbOnboardingRepository(new BrowserPinHasher());
  }
  const repository = repositoryRef.current;
  const [route, setRoute] = useState<GateRoute>("LOADING");
  const [locale, setLocale] = useState<SaayaLocale>(props.locale);
  const [openDemoOnFirstHome, setOpenDemoOnFirstHome] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      repository.loadOnboarded(),
      resolveAppLocale(repository, props.locale),
    ]).then(([onboarded, resolvedLocale]) => {
      if (cancelled) return;
      setLocale(resolvedLocale);
      setRoute(onboarded ? "HOME" : "ONBOARDING");
    });
    return () => {
      cancelled = true;
    };
  }, [repository, props.locale]);

  function changeLocale(nextLocale: SaayaLocale) {
    void saveAppLocale(repository, nextLocale).then(() => setLocale(nextLocale));
  }

  if (route === "LOADING") return null;
  if (route === "ONBOARDING") {
    return (
      <OnboardingScreen
        copy={M4_COPY[locale]}
        onCompleted={() => {
          setOpenDemoOnFirstHome(true);
          setRoute("HOME");
        }}
        repository={repository}
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
