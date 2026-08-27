"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import { BrowserPinHasher } from "../../../platform/pinHash";
import { M4_COPY } from "../../copy/strings";
import { HomeScreen, type HomeScreenProps } from "../home/HomeScreen";
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

  useEffect(() => {
    let cancelled = false;
    void repository.loadOnboarded().then((onboarded) => {
      if (!cancelled) setRoute(onboarded ? "HOME" : "ONBOARDING");
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  if (route === "LOADING") return null;
  if (route === "ONBOARDING") {
    return (
      <OnboardingScreen
        copy={M4_COPY[props.locale]}
        onCompleted={() => setRoute("HOME")}
        repository={repository}
      />
    );
  }
  return <HomeScreen {...props} />;
}
