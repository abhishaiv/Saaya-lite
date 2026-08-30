"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DemoZone,
  MapZone,
  ZoneDetail,
} from "../../../data/repository/zoneRepository";
import { IndexedDbSessionRepository } from "../../../data/db/indexedDbSessionRepository";
import {
  containingZones,
  prepareContainmentZones,
} from "../../../data/zone/containment";
import { selectHighestRiskZone } from "../../../domain/engine/armingEvaluator";
import {
  DEFAULT_RULES,
  DEMO_ARM_TIME,
  DEMO_RULES,
} from "../../../domain/engine/rules";
import type { Command, SessionState } from "../../../domain/model/session";
import { RiskTier } from "../../../domain/model/zone";
import type { PoliceStation } from "../../../domain/model/policeStation";
import { browserClock } from "../../../platform/clock";
import { readGeolocationPermissionState } from "../../../platform/geolocationPermission";
import {
  createLocalSessionId,
  HomeSessionRuntime,
} from "../../../platform/homeSessionRuntime";
import { hourBandAtEpochMs } from "../../../platform/hourBandClock";
import { formatSessionArmTime } from "../../../platform/indiaTime";
import {
  clearDemoArmedSession,
  isDemoArmedSession,
  loadDemoSpeedEnabled,
  markDemoArmedSession,
  saveDemoSpeedEnabled,
} from "../../../platform/demoModeStore";
import type { LeafletMapController, TileAvailability } from "../../../platform/leafletMap";
import type { LiveLocationFix, LocationStatus } from "../../../platform/locationWatch";
import { PageLocationRuntime } from "../../../platform/pageLocationRuntime";
import {
  browserVisibilitySource,
  createPageOwnerId,
  TabLifecycleController,
} from "../../../platform/tabLifecycle";
import {
  browserWakeLockApi,
  WakeLockController,
} from "../../../platform/wakeLock";
import { MapControlButton } from "../../components/MapControlButton";
import { formatCopy, M4_COPY, type SaayaLocale } from "../../copy/strings";
import { HomeEngineBridge, type HomeEngineView } from "./homeEngineBridge";
import { HomeMap } from "./HomeMap";
import { DemoPanel } from "./DemoPanel";
import {
  eventsToFamilyEscalation,
  eventsToSos,
  nextMissedCheckInEvent,
  simulatedZoneEntryEvent,
} from "./demoControls";
import { AppSessionStatus } from "./AppSessionStatus";
import {
  HomeSessionSurface,
  type ArmAcknowledgement,
} from "./HomeSessionSurface";
import { ZoneDetailSheet } from "./ZoneDetailSheet";
import { AboutScreen } from "../settings/AboutScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { LocationHelpSheet } from "../location/LocationHelpSheet";

export interface BuildVersion {
  readonly code: number;
  readonly name: string;
}

export interface HomeScreenProps {
  readonly buildVersion: BuildVersion;
  readonly demoZones: readonly DemoZone[];
  readonly founderContact: string | null;
  readonly locale: SaayaLocale;
  readonly mapZones: readonly MapZone[];
  readonly openDemoOnMount?: boolean;
  readonly policeStations: readonly PoliceStation[];
  readonly zoneDetails: readonly ZoneDetail[];
}

export function HomeScreen({
  buildVersion,
  demoZones,
  founderContact,
  locale,
  mapZones,
  openDemoOnMount = false,
  policeStations,
  zoneDetails,
}: HomeScreenProps) {
  const copy = M4_COPY[locale];
  const [location, setLocation] = useState<LiveLocationFix | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("SEARCHING");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [tileAvailability, setTileAvailability] =
    useState<TileAvailability>("loading");
  const [armAcknowledgement, setArmAcknowledgement] =
    useState<ArmAcknowledgement | null>(null);
  const [armBannerVisible, setArmBannerVisible] = useState(false);
  const [pageStoppedWarning, setPageStoppedWarning] = useState(false);
  const [demoPanelOpen, setDemoPanelOpen] = useState(openDemoOnMount);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  const [demoSpeedEnabled, setDemoSpeedEnabled] = useState(false);
  const [demoSessionActive, setDemoSessionActive] = useState(false);
  const demoSpeedEnabledRef = useRef(false);
  const demoArmInFlightRef = useRef(false);
  const [engineView, setEngineView] = useState<HomeEngineView>({
    activeZoneId: null,
    armMode: "MANUAL",
    armedAtEpochMs: null,
    armedHourBand: null,
    deadlineEpochMs: null,
    outcome: null,
    state: "IDLE",
  });
  const mapControllerRef = useRef<LeafletMapController | null>(null);
  const locationRuntimeRef = useRef<PageLocationRuntime | null>(null);
  const commandListenerRef = useRef<
    (commands: readonly Command[], view: HomeEngineView) => void
  >(() => undefined);
  const engineRef = useRef<HomeEngineBridge | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new HomeEngineBridge(
      DEFAULT_RULES,
      hourBandAtEpochMs,
      {
        onCommands(commands, view) {
          commandListenerRef.current(commands, view);
        },
        onView(view) {
          setEngineView(view);
        },
      },
      createLocalSessionId,
    );
  }

  const zones = useMemo(() => mapZones.map(({ zone }) => zone), [mapZones]);
  const selectedZone = useMemo(
    () =>
      selectedZoneId === null
        ? null
        : zoneDetails.find(({ id }) => id === selectedZoneId) ?? null,
    [selectedZoneId, zoneDetails],
  );
  const preparedZones = useMemo(() => prepareContainmentZones(zones), [zones]);
  const currentZone = useMemo(
    () =>
      location === null
        ? null
        : selectHighestRiskZone(containingZones(preparedZones, location)),
    [location, preparedZones],
  );
  const activeZoneDetail = useMemo(
    () =>
      engineView.activeZoneId === null
        ? null
        : zoneDetails.find(({ id }) => id === engineView.activeZoneId) ?? null,
    [engineView.activeZoneId, zoneDetails],
  );
  const checkInReason = useMemo(() => {
    if (
      engineView.state !== "CHECKIN_1" ||
      engineView.activeZoneId === null ||
      engineView.armedAtEpochMs === null
    ) {
      return null;
    }
    const detail = zoneDetails.find(
      ({ id }) => id === engineView.activeZoneId,
    );
    if (detail === undefined) return null;
    return formatCopy(
      copy.checkin1Reason,
      detail.label,
      localizedRiskTier(copy, detail.zone.riskTier),
      formatSessionArmTime(
        engineView.armedAtEpochMs,
        locale,
        demoSessionActive,
      ),
    );
  }, [copy, demoSessionActive, engineView, locale, zoneDetails]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine === null) return;
    const persistedDemoMode = loadDemoSpeedEnabled();
    if (persistedDemoMode) {
      engine.setRules(DEMO_RULES);
      demoSpeedEnabledRef.current = true;
      setDemoSpeedEnabled(true);
    }
    const activeRules = persistedDemoMode ? DEMO_RULES : DEFAULT_RULES;
    const sessions = new IndexedDbSessionRepository();
    const wakeLock = new WakeLockController(browserWakeLockApi());
    const runtime = new PageLocationRuntime(
      zones,
      activeRules,
      engine,
      {
        onInterrupted(reason) {
          if (reason === "PERMISSION_DENIED") {
            setLocationStatus("PERMISSION_DENIED");
          }
        },
        onLiveFix(fix) {
          setLocation(fix);
          setLocationHelpOpen(false);
        },
        onStatus(status) {
          setLocationStatus(status);
        },
      },
    );
    const sessionRuntime = new HomeSessionRuntime(
      engine,
      sessions,
      zones,
      runtime,
      wakeLock,
      {
        onCommand(command) {
          if (command.kind === "ShowArmBanner") {
            const detail = zoneDetails.find(({ id }) => id === command.zoneId);
            if (detail === undefined) return;
            const armedAtEpochMs =
              engine.view().armedAtEpochMs ?? browserClock.nowEpochMs();
            const sessionId = engine.persistedSession()?.sessionId ?? null;
            const demoArmedSession =
              demoArmInFlightRef.current ||
              (sessionId !== null && isDemoArmedSession(sessionId));
            setArmAcknowledgement({
              body: formatCopy(
                copy.homeArmBannerBody,
                detail.label,
                formatSessionArmTime(
                  armedAtEpochMs,
                  locale,
                  demoArmedSession,
                ),
              ),
              title: copy.homeArmBannerTitle,
            });
            setArmBannerVisible(true);
          }
          if (command.kind === "ShowPermissionWarning") {
            setLocationStatus("PERMISSION_DENIED");
          }
        },
        onError() {
          setPageStoppedWarning(true);
        },
      },
    );
    commandListenerRef.current = (commands, view) => {
      if (view.state === "RESOLVED") {
        const sessionId = engine.persistedSession()?.sessionId;
        if (sessionId !== undefined) clearDemoArmedSession(sessionId);
        setDemoSessionActive(false);
      }
      // The labelled demo picker simulates the already-proven zone entry. Starting
      // a real watch here would immediately revoke that simulated AUTO_ZONE session
      // on a browser where location was deliberately denied during onboarding.
      // Timers and every subsequent engine transition still run through the same
      // runtime; only this physical watch start is omitted for the mock entry.
      const runtimeCommands =
        demoArmInFlightRef.current &&
        view.state === "SHADOW" &&
        view.armMode === "AUTO_ZONE"
          ? commands.filter((command) => command.kind !== "StartLocationWatch")
          : commands;
      sessionRuntime.handle(runtimeCommands, view.state);
    };
    locationRuntimeRef.current = runtime;
    let disposed = false;
    const lifecycle = new TabLifecycleController(
      browserVisibilitySource(),
      sessions,
      {
        async recover(persisted, recoveredAtEpochMs) {
          const recoveredDemoSession = isDemoArmedSession(
            persisted.sessionId,
          );
          setDemoSessionActive(recoveredDemoSession);
          const zone =
            zones.find((candidate) => candidate.stationId === persisted.zoneId) ??
            null;
          if (persisted.armMode === "AUTO_ZONE" && persisted.zoneId !== null) {
            const detail = zoneDetails.find(({ id }) => id === persisted.zoneId);
            if (detail !== undefined) {
              setArmAcknowledgement({
                body: formatCopy(
                  copy.homeArmBannerBody,
                  detail.label,
                  formatSessionArmTime(
                    persisted.armedAtEpochMs,
                    locale,
                    recoveredDemoSession,
                  ),
                ),
                title: copy.homeArmBannerTitle,
              });
              setArmBannerVisible(false);
            }
          }
          return engine.recover(persisted, {
            nowEpochMs: recoveredAtEpochMs,
            zone,
          });
        },
        mayResumeLocation: () => true,
      },
      runtime,
      wakeLock,
      createPageOwnerId(),
      {
        onPageStopped() {
          setPageStoppedWarning(true);
        },
        onRecoveryError() {
          setPageStoppedWarning(true);
        },
      },
    );
    void lifecycle.start().catch(() => {
      if (!disposed) setPageStoppedWarning(true);
    });
    void readGeolocationPermissionState().then((permission) => {
      if (disposed) return;
      if (permission === "granted") runtime.startAfterConsent();
      if (permission === "denied") setLocationStatus("PERMISSION_DENIED");
    });

    return () => {
      disposed = true;
      commandListenerRef.current = () => undefined;
      sessionRuntime.dispose();
      void lifecycle.stop();
      locationRuntimeRef.current = null;
    };
  }, [copy, locale, zoneDetails, zones]);

  useEffect(() => {
    if (engineView.state !== "IDLE") return;
    setArmAcknowledgement(null);
    setArmBannerVisible(false);
  }, [engineView.state]);

  useEffect(() => {
    if (engineView.state !== "SOS_ACTIVE") return;
    setAboutOpen(false);
    setDemoPanelOpen(false);
    setLocationHelpOpen(false);
    setSelectedZoneId(null);
    setSettingsOpen(false);
  }, [engineView.state]);

  useEffect(() => {
    if (
      !demoPanelOpen ||
      engineView.state === "IDLE" ||
      engineView.state === "SHADOW"
    ) {
      return;
    }

    // A timed rung is the one foreground surface. The demo controls must not
    // remain underneath it and obscure the map or compete with SOS.
    setDemoPanelOpen(false);
  }, [demoPanelOpen, engineView.state]);

  const handleMapController = useCallback(
    (controller: LeafletMapController | null) => {
      mapControllerRef.current = controller;
    },
    [],
  );
  const handleTileAvailability = useCallback((status: TileAvailability) => {
    setTileAvailability(status);
  }, []);
  const handleZoneSelected = useCallback((zoneId: string | null) => {
    setSelectedZoneId(zoneId);
  }, []);
  const handleManualArm = useCallback(() => {
    setPageStoppedWarning(false);
    engineRef.current?.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: browserClock.nowEpochMs(), zone: currentZone },
    );
  }, [currentZone]);
  const handleManualDisarm = useCallback(() => {
    const activeZone =
      zones.find(({ stationId }) => stationId === engineView.activeZoneId) ??
      currentZone;
    engineRef.current?.dispatch(
      { kind: "ManualDisarm" },
      { nowEpochMs: browserClock.nowEpochMs(), zone: activeZone },
    );
  }, [currentZone, engineView.activeZoneId, zones]);
  const handleCheckInOk = useCallback(() => {
    const nowEpochMs = browserClock.nowEpochMs();
    const activeZone =
      zones.find(({ stationId }) => stationId === engineView.activeZoneId) ??
      currentZone;
    engineRef.current?.dispatch(
      { kind: "OkTapped" },
      { nowEpochMs, zone: activeZone },
    );
  }, [currentZone, engineView.activeZoneId, zones]);
  const handleFamilyCancel = useCallback(() => {
    const nowEpochMs = browserClock.nowEpochMs();
    const activeZone =
      zones.find(({ stationId }) => stationId === engineView.activeZoneId) ??
      currentZone;
    engineRef.current?.dispatch(
      { kind: "CancelTapped" },
      { nowEpochMs, zone: activeZone },
    );
  }, [currentZone, engineView.activeZoneId, zones]);
  const handleHelpNow = useCallback(() => {
    const nowEpochMs = browserClock.nowEpochMs();
    const activeZone =
      zones.find(({ stationId }) => stationId === engineView.activeZoneId) ??
      currentZone;
    engineRef.current?.dispatch(
      { kind: "HelpNowTapped" },
      { nowEpochMs, zone: activeZone },
    );
  }, [currentZone, engineView.activeZoneId, zones]);
  const handlePinAccepted = useCallback(() => {
    const nowEpochMs = browserClock.nowEpochMs();
    const activeZone =
      zones.find(({ stationId }) => stationId === engineView.activeZoneId) ??
      currentZone;
    engineRef.current?.dispatch(
      { kind: "PinAccepted" },
      { nowEpochMs, zone: activeZone },
    );
  }, [currentZone, engineView.activeZoneId, zones]);
  const handleLocationHelpOpen = useCallback(() => {
    setSelectedZoneId(null);
    setDemoPanelOpen(false);
    setLocationHelpOpen(true);
  }, []);
  const handleLocationRetry = useCallback(() => {
    locationRuntimeRef.current?.startAfterConsent();
  }, []);
  const dispatchDemoEvents = useCallback(
    (events: readonly Parameters<HomeEngineBridge["dispatch"]>[0][]) => {
      const engine = engineRef.current;
      if (engine === null) return;
      for (const event of events) {
        const activeZone =
          zones.find(
            ({ stationId }) => stationId === engine.view().activeZoneId,
          ) ?? currentZone;
        engine.dispatch(event, {
          nowEpochMs: browserClock.nowEpochMs(),
          zone: activeZone,
        });
      }
      const persisted = engine.persistedSession();
      if (persisted !== null) {
        markDemoArmedSession(persisted.sessionId);
        setDemoSessionActive(true);
      }
    },
    [currentZone, zones],
  );
  const handleDemoSpeedChanged = useCallback((enabled: boolean) => {
    const rules = enabled ? DEMO_RULES : DEFAULT_RULES;
    engineRef.current?.setRules(rules);
    locationRuntimeRef.current?.setRules(rules);
    demoSpeedEnabledRef.current = enabled;
    saveDemoSpeedEnabled(enabled);
    setDemoSpeedEnabled(enabled);
  }, []);
  const handleDemoZoneSelected = useCallback(
    (zoneId: string) => {
      const detail = zoneDetails.find(({ id }) => id === zoneId);
      if (detail === undefined) return;
      const event = simulatedZoneEntryEvent(detail.zone);
      if (event === null) {
        setDemoPanelOpen(false);
        setSelectedZoneId(zoneId);
        return;
      }
      const engine = engineRef.current;
      if (engine === null) return;
      demoArmInFlightRef.current = true;
      try {
        engine.dispatch(event, {
          hourBand: DEMO_ARM_TIME.hourBand,
          nowEpochMs: browserClock.nowEpochMs(),
          zone: detail.zone,
        });
        // Hand the map back after a simulated entry rather than leaving the
        // picker beneath any live safety surface it may produce.
        setDemoPanelOpen(false);
        const persisted = engine.persistedSession();
        if (persisted !== null) {
          markDemoArmedSession(persisted.sessionId);
          setDemoSessionActive(true);
        }
      } finally {
        demoArmInFlightRef.current = false;
      }
    },
    [zoneDetails],
  );
  const handleDemoMissCheckIn = useCallback(() => {
    const engine = engineRef.current;
    if (engine === null) return;
    const event = nextMissedCheckInEvent(engine.view().state);
    if (event !== null) dispatchDemoEvents([event]);
  }, [dispatchDemoEvents]);
  const handleDemoJumpFamily = useCallback(() => {
    const state = engineRef.current?.view().state ?? "IDLE";
    dispatchDemoEvents(eventsToFamilyEscalation(state));
  }, [dispatchDemoEvents]);
  const handleDemoTriggerSos = useCallback(() => {
    const state = engineRef.current?.view().state ?? "IDLE";
    dispatchDemoEvents(eventsToSos(state));
  }, [dispatchDemoEvents]);
  const handleDemoReset = useCallback(() => {
    engineRef.current?.resetForDemo();
    setSelectedZoneId(null);
    setArmAcknowledgement(null);
    setArmBannerVisible(false);
    setPageStoppedWarning(false);
  }, []);

  const mapCopy = useMemo(
    () => ({
      ariaMap: copy.cdMap,
      ariaZone: (areaName: string, riskLevel: string) =>
        formatCopy(copy.cdZone, areaName, riskLevel),
      attribution: copy.aboutAttribMap,
      offline: copy.mapOffline,
    }),
    [copy],
  );
  const appSessionStatus = (
    <AppSessionStatus
      copy={copy}
      showIdle={false}
      view={engineView}
    />
  );

  if (aboutOpen && engineView.state !== "SOS_ACTIVE") {
    return (
      <>
        {appSessionStatus}
        <AboutScreen
          copy={copy}
          founderContact={founderContact}
          mockedClaims={[copy.aboutMockDelivery]}
          onBack={() => setAboutOpen(false)}
          realClaims={[
            copy.aboutRealMap,
            copy.aboutRealDetail,
            copy.aboutRealLadder,
            copy.aboutRealFamily,
            copy.aboutRealSos,
          ]}
          versionCode={buildVersion.code}
          versionName={buildVersion.name}
        />
      </>
    );
  }

  if (settingsOpen && engineView.state !== "SOS_ACTIVE") {
    return (
      <>
        {appSessionStatus}
        <SettingsScreen
          copy={copy}
          onBack={() => setSettingsOpen(false)}
          onOpenAbout={() => setAboutOpen(true)}
          onOpenDemo={() => {
            setSettingsOpen(false);
            setDemoPanelOpen(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      {appSessionStatus}
      <main className="home-screen" data-location-status={locationStatus} data-session-state={engineView.state}>
      <HomeMap
        copy={mapCopy}
        location={location}
        mapZones={mapZones}
        onController={handleMapController}
        onTileAvailability={handleTileAvailability}
        onZoneSelected={handleZoneSelected}
        selectedZoneId={selectedZoneId}
        sessionState={engineView.state}
        tileAvailability={tileAvailability}
      />

      {engineView.state === "IDLE" || engineView.state === "RESOLVED" ? (
        <div aria-label={copy.appName} className="home-screen__brand-lockup">
          {/* The supplied compact v2 mark is the production brand asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src="/assets/icons/saaya-icon-v2-small.svg" />
          <span>{copy.appName}</span>
        </div>
      ) : null}

      <HomeSessionSurface
        activeZoneDetail={activeZoneDetail}
        armAcknowledgement={armAcknowledgement}
        armBannerVisible={armBannerVisible}
        checkInReason={checkInReason}
        copy={copy}
        demoModeActive={demoSpeedEnabled || demoSessionActive}
        demoSpeedEnabled={demoSpeedEnabled}
        currentPoint={location}
        engineView={engineView}
        locationStatus={locationStatus}
        onArmBannerHidden={() => setArmBannerVisible(false)}
        onCheckInOk={handleCheckInOk}
        onFamilyCancel={handleFamilyCancel}
        onHelpNow={handleHelpNow}
        onLocationHelpOpen={handleLocationHelpOpen}
        onManualArm={handleManualArm}
        onManualDisarm={handleManualDisarm}
        onOpenDemo={() => setDemoPanelOpen(true)}
        onPinAccepted={handlePinAccepted}
        pageStoppedWarning={pageStoppedWarning}
        policeStations={policeStations}
      />

      <div className="home-screen__settings">
        <MapControlButton
          icon="settings"
          label={copy.cdSettings}
          onClick={() => {
            setSelectedZoneId(null);
            setDemoPanelOpen(false);
            setSettingsOpen(true);
          }}
        />
      </div>

      <div className="home-screen__controls">
        <MapControlButton
          icon="my_location"
          label={copy.cdRecentre}
          onClick={() => mapControllerRef.current?.recenter()}
        />
      </div>

      <output className="home-screen__asset-count" hidden>
        {mapZones.length}:{demoZones.length}
      </output>

      {selectedZone === null ? null : (
        <ZoneDetailSheet
          copy={copy}
          currentPoint={location}
          detail={selectedZone}
          hourBand={hourBandAtEpochMs(browserClock.nowEpochMs())}
          onDismiss={() => setSelectedZoneId(null)}
          policeStations={policeStations}
        />
      )}

      {demoPanelOpen ? (
        <DemoPanel
          copy={copy}
          demoSpeedEnabled={demoSpeedEnabled}
          demoZones={demoZones}
          onClose={() => setDemoPanelOpen(false)}
          onDemoSpeedChanged={handleDemoSpeedChanged}
          onJumpFamily={handleDemoJumpFamily}
          onMissCheckIn={handleDemoMissCheckIn}
          onReset={handleDemoReset}
          onTriggerSos={handleDemoTriggerSos}
          onZoneSelected={handleDemoZoneSelected}
          sessionState={engineView.state}
        />
      ) : null}

      {locationHelpOpen ? (
        <LocationHelpSheet
          copy={copy}
          onDismiss={() => setLocationHelpOpen(false)}
          onRetry={handleLocationRetry}
        />
      ) : null}

      <style jsx>{`
        .home-screen {
          --home-action-dock-clearance: calc(
            env(safe-area-inset-bottom) + var(--minimum-touch-target) +
              var(--space-24)
          );

          position: relative;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural viewport fill. */
          overflow: hidden;
          background: var(--color-background);
          isolation: isolate;
        }

        .home-screen__controls {
          position: fixed;
          z-index: 4;
          inset-inline-end: var(--screen-padding);
          inset-block-end: var(--home-action-dock-clearance);
        }

        .home-screen__settings {
          position: fixed;
          z-index: 4;
          inset-block-start: calc(env(safe-area-inset-top) + var(--space-12));
          inset-inline-end: var(--screen-padding);
        }

        .home-screen__brand-lockup {
          position: fixed;
          z-index: 4;
          inset-block-start: calc(env(safe-area-inset-top) + var(--space-12));
          inset-inline-start: var(--screen-padding);
          display: inline-flex;
          align-items: center;
          gap: var(--space-8);
          padding: var(--space-8) var(--space-12);
          border-radius: var(--radius-control);
          background: var(--color-card-fill);
          color: var(--color-text-primary);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .home-screen__brand-lockup img {
          inline-size: var(--space-30);
          block-size: var(--space-30);
        }

      `}</style>
      </main>
    </>
  );
}

function localizedRiskTier(
  copy: (typeof M4_COPY)[SaayaLocale],
  tier: RiskTier,
): string {
  switch (tier) {
    case RiskTier.HIGH:
      return copy.riskBandHigh;
    case RiskTier.ELEVATED:
      return copy.riskBandElevated;
    case RiskTier.MODERATE:
      return copy.riskBandModerate;
    case RiskTier.SAFE:
      return copy.riskBandLow;
  }
}
