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
  const [openDemoOnFirstHome, setOpenDemoOnFirstHome] = useState(false);
  // The replay: the flow runs over the session she is in rather than instead of it, so
  // HomeScreen stays mounted underneath and keeps everything it holds - her character,
  // her position, the engine's own view of the ladder. What she saves in the flow is
  // saved idempotently by the flow itself, through the same repository the first run
  // used, which is the contract S11 names.
  const [replaying, setReplaying] = useState(false);

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
        mapZones={props.mapZones}
        onCompleted={() => {
          setOpenDemoOnFirstHome(true);
          setRoute("HOME");
        }}
        policeStations={props.policeStations}
        repository={repository}
        zoneDetails={props.zoneDetails}
      />
    );
  }
  return (
    <>
      <HomeScreen
        {...props}
        onReplayOnboarding={() => setReplaying(true)}
        openDemoOnMount={openDemoOnFirstHome}
        suspendedForReplay={replaying}
      />
      {replaying ? (
        // The flow covers the session it replays, in the app's own overlay band rather
        // than below the fold, because the home screen underneath is a full viewport
        // tall. Completing it returns her to the surface she came from - this is the
        // Settings screen, which the replay row closed on its way here - and it does not
        // touch the first-run demo flag, which belongs to the first run alone.
        <div className="app-gate__replay">
          <OnboardingScreen
            copy={M4_COPY[props.locale]}
            mapZones={props.mapZones}
            onCompleted={() => setReplaying(false)}
            policeStations={props.policeStations}
            repository={repository}
            zoneDetails={props.zoneDetails}
          />
          <style jsx>{`
            .app-gate__replay {
              position: fixed;
              /* GROUNDED-EXEMPT: the replay flow covers the session it replays, above
                 every layer the home screen raises. */
              z-index: 20;
              inset: 0;
              overflow-y: auto;
              background: var(--color-background);
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
