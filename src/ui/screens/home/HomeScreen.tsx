"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DemoZone,
  MapZone,
  ZoneDetail,
} from "../../../data/repository/zoneRepository";
import { IndexedDbSessionRepository } from "../../../data/db/indexedDbSessionRepository";
import {
  containingHotspotZones,
} from "../../../data/zone/containment";
import { selectHighestRiskZone } from "../../../domain/engine/armingEvaluator";
import {
  DEFAULT_RULES,
  DEMO_ARM_TIME,
  DEMO_RULES,
  MINUTES_PER_HOUR,
} from "../../../domain/engine/rules";
import type { Command, SessionState } from "../../../domain/model/session";
import type { HeatmapHotspot } from "../../../domain/model/heatmapHotspot";
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
  markDemoArmedSession,
  saveDemoMisses,
  loadDemoMisses,
} from "../../../platform/demoModeStore";
import type {
  FamilyAlertStatus,
} from "../../../platform/familyAlertChannel";
import { requestFamilyAlert } from "../../../platform/familyAlertChannel";
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
import { localizedStaticRiskLevel } from "../../copy/localizedRiskLevel";
import { formatCopy, M4_COPY, type SaayaLocale } from "../../copy/strings";
import { HomeEngineBridge, type HomeEngineView } from "./homeEngineBridge";
import { HomeMap } from "./HomeMap";
import { DemoPanel } from "./DemoPanel";
import { startDemoEventSequence } from "./demoControls";
import { AppSessionStatus } from "./AppSessionStatus";
import {
  HomeSessionSurface,
  type ArmAcknowledgement,
} from "./HomeSessionSurface";
import { ZoneDetailSheet } from "./ZoneDetailSheet";
import { AboutScreen } from "../settings/AboutScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { LocationHelpSheet } from "../location/LocationHelpSheet";
import { DemoSetup } from "../onboarding/DemoSetup";
import { DemoPinStore } from "../../../platform/demoPinStore";

export interface BuildVersion {
  readonly code: number;
  readonly name: string;
}

export interface HomeScreenProps {
  readonly buildVersion: BuildVersion;
  readonly demoZones: readonly DemoZone[];
  readonly founderContact: string | null;
  readonly forceDemoEntry?: boolean;
  readonly heatmapHotspots: readonly HeatmapHotspot[];
  readonly locale: SaayaLocale;
  readonly mapZones: readonly MapZone[];
  readonly openDemoOnMount?: boolean;
  readonly policeStations: readonly PoliceStation[];
  readonly zoneDetails: readonly ZoneDetail[];
  readonly onLocaleChange?: (locale: SaayaLocale) => void;
}

export function HomeScreen({
  buildVersion,
  demoZones,
  founderContact,
  heatmapHotspots,
  locale,
  mapZones,
  onLocaleChange,
  openDemoOnMount = false,
  policeStations,
  zoneDetails,
}: HomeScreenProps) {
  const copy = M4_COPY[locale];
  const copyRef = useRef(copy);
  const localeRef = useRef(locale);
  copyRef.current = copy;
  localeRef.current = locale;
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
  const [demoSetupOpen, setDemoSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  const [demoSessionActive, setDemoSessionActive] = useState(false);
  const [familyAlertStatus, setFamilyAlertStatus] =
    useState<FamilyAlertStatus | null>(null);
  const [okAcknowledgement, setOkAcknowledgement] =
    useState<ArmAcknowledgement | null>(null);
  const [demoStopAcknowledgement, setDemoStopAcknowledgement] =
    useState<ArmAcknowledgement | null>(null);
  const demoArmInFlightRef = useRef(false);
  const sessionRecoveredRef = useRef(false);
  const demoSessionRef = useRef(false);
  const demoMissesRef = useRef(0);
  const [demoMissedCheckins, setDemoMissedCheckins] = useState(0);
  const familyAlertAbortRef = useRef<AbortController | null>(null);
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
  const alertPerformerRef = useRef<
    (
      command: { kind: "RequestFamilyAlert" } | { kind: "CancelFamilyAlert" },
      sessionId: string | null,
    ) => void
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
      () => {
        const id = createLocalSessionId();
        if (demoArmInFlightRef.current) markDemoArmedSession(id);
        return id;
      },
    );
  }

  const zones = useMemo(() => mapZones.map(({ zone }) => zone), [mapZones]);
  // The first-miss alert performer: server-mediated, carrying only the
  // session-stable operation id and locale. Its failure is reported as a
  // truthful status and must never delay or suppress the ladder.
  alertPerformerRef.current = (command, sessionId) => {
    if (command.kind === "CancelFamilyAlert") {
      familyAlertAbortRef.current?.abort();
      familyAlertAbortRef.current = null;
      // I'm OK invalidates the pending request; a provider-accepted message
      // already sent cannot be recalled, so only the in-flight state clears.
      setFamilyAlertStatus((current) => (current === "sending" ? "unknown" : current));
      return;
    }
    if (sessionId === null || !demoSessionRef.current) {
      setFamilyAlertStatus("notready");
      return;
    }
    const operationId = engineRef.current?.familyAlertOperationId();
    if (operationId === null || operationId === undefined) return;
    familyAlertAbortRef.current?.abort();
    const controller = new AbortController();
    familyAlertAbortRef.current = controller;
    setFamilyAlertStatus("sending");
    void requestFamilyAlert(
      {
        demo: true,
        locale: localeRef.current,
        operationId,
      },
      controller.signal,
    ).then((outcome) => {
      if (familyAlertAbortRef.current !== controller) return;
      familyAlertAbortRef.current = null;
      setFamilyAlertStatus(outcome);
    });
  };
  const selectedZone = useMemo(
    () =>
      selectedZoneId === null
        ? null
        : zoneDetails.find(({ id }) => id === selectedZoneId) ?? null,
    [selectedZoneId, zoneDetails],
  );
  const currentZone = useMemo(
    () =>
      location === null
        ? null
        : selectHighestRiskZone(containingHotspotZones(heatmapHotspots, location)),
    [heatmapHotspots, location],
  );
  const activeZoneDetail = useMemo(
    () =>
      engineView.activeZoneId === null
        ? null
        : zoneDetails.find(({ id }) => id === engineView.activeZoneId) ?? null,
    [engineView.activeZoneId, zoneDetails],
  );
  // The demo's synthetic entry zone: the first HIGH-risk row of the frozen
  // data, armed at the frozen demo hour. No picker or permission precedes Start.
  const demoZoneDetail = useMemo(
    () => zoneDetails.find(({ zone }) => zone.riskTier === RiskTier.HIGH) ?? null,
    [zoneDetails],
  );
  const activeLadder = (demoSessionActive ? DEMO_RULES : DEFAULT_RULES).ladder;
  const checkInWindowSec =
    engineView.state === "CHECKIN_1"
      ? activeLadder.window1Sec
      : engineView.state === "CHECKIN_2"
        ? activeLadder.window2Sec
        : activeLadder.window3Sec;
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
    const sessions = new IndexedDbSessionRepository();
    const wakeLock = new WakeLockController(browserWakeLockApi());
    const runtime = new PageLocationRuntime(
      heatmapHotspots,
      DEFAULT_RULES,
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
            const currentCopy = copyRef.current;
            setArmAcknowledgement({
              body: formatCopy(
                currentCopy.homeArmBannerBody,
                detail.label,
                formatSessionArmTime(
                  armedAtEpochMs,
                  localeRef.current,
                  demoArmedSession,
                ),
              ),
              title: currentCopy.homeArmBannerTitle,
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
          setDemoSessionActive(false);
          demoSessionRef.current = false;
          engine.setRules(DEFAULT_RULES);
          runtime.setRules(DEFAULT_RULES);
        familyAlertAbortRef.current?.abort();
        familyAlertAbortRef.current = null;
        setFamilyAlertStatus(null);
      }
      // The labelled Start Demo simulates the already-proven zone entry. Starting
      // a real watch here would immediately revoke that simulated AUTO_ZONE session
      // on a browser where location was deliberately denied during onboarding.
      // Timers and every subsequent engine transition still run through the same
      // runtime; only this physical watch start is omitted for the mock entry.
      const runtimeCommands =
        demoSessionRef.current || demoArmInFlightRef.current
          ? commands.filter((command) => command.kind !== "StartLocationWatch")
          : commands;
      if (demoSessionRef.current) {
        const automaticSos = commands.some((command) =>
          command.kind === "WriteSosIncident" && command.trigger === "LADDER_LAPSE");
        if (automaticSos) demoMissesRef.current = 3;
        else if (view.state === "CHECKIN_3") demoMissesRef.current = 2;
        else if (view.state === "CHECKIN_2") demoMissesRef.current = 1;
        setDemoMissedCheckins(demoMissesRef.current);
        const id = engine.persistedSession()?.sessionId;
        if (id !== undefined) saveDemoMisses(id, demoMissesRef.current);
      }
      sessionRuntime.handle(runtimeCommands, view.state);
      if (view.state === "RESOLVED") {
        const sessionId = engine.persistedSession()?.sessionId;
        if (sessionId !== undefined) {
          void sessionRuntime.waitForIdle().then(async () => {
            // Keep the marker if clearing persistence failed; an SOS recovery
            // must never fall back to the normal PIN/profile after a crash.
            if ((await sessions.loadCurrent())?.sessionId !== sessionId) clearDemoArmedSession(sessionId);
          }).catch(() => setPageStoppedWarning(true));
        }
      }
      for (const command of commands) {
        if (
          command.kind === "RequestFamilyAlert" ||
          command.kind === "CancelFamilyAlert"
        ) {
          alertPerformerRef.current(
            command,
            engine.persistedSession()?.sessionId ?? null,
          );
        }
      }
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
          demoSessionRef.current = recoveredDemoSession;
          demoMissesRef.current = loadDemoMisses(persisted.sessionId);
          setDemoMissedCheckins(demoMissesRef.current);
          // A recovered demo session must keep its accelerated profile; its
          // persisted deadlines were set on demo timings.
          engine.setRules(recoveredDemoSession ? DEMO_RULES : DEFAULT_RULES);
          runtime.setRules(recoveredDemoSession ? DEMO_RULES : DEFAULT_RULES);
          const zone =
            zones.find((candidate) => candidate.stationId === persisted.zoneId) ??
            null;
          if (persisted.armMode === "AUTO_ZONE" && persisted.zoneId !== null) {
            const detail = zoneDetails.find(({ id }) => id === persisted.zoneId);
            if (detail !== undefined) {
              const currentCopy = copyRef.current;
              setArmAcknowledgement({
                body: formatCopy(
                  currentCopy.homeArmBannerBody,
                  detail.label,
                  formatSessionArmTime(
                    persisted.armedAtEpochMs,
                    localeRef.current,
                    recoveredDemoSession,
                  ),
                ),
                title: currentCopy.homeArmBannerTitle,
              });
              setArmBannerVisible(false);
            }
          }
          return engine.recover(persisted, {
            nowEpochMs: recoveredAtEpochMs,
            zone,
          });
        },
        mayResumeLocation: () => !demoSessionRef.current,
      },
      runtime,
      wakeLock,
      createPageOwnerId(),
      {
        onPageStopped() {
          setPageStoppedWarning(true);
        },
        onRecoveryError() {
          sessionRecoveredRef.current = false;
          setPageStoppedWarning(true);
        },
        onRecoveryStarted() {
          sessionRecoveredRef.current = false;
        },
        onRecoveryCompleted() {
          if (!disposed) sessionRecoveredRef.current = true;
        },
      },
    );
    void lifecycle.start().then(async () => {
      const permission = await readGeolocationPermissionState();
      if (disposed) return;
      if (permission === "granted" && sessionRecoveredRef.current && !demoSessionRef.current) runtime.startAfterConsent();
      if (permission === "denied") setLocationStatus("PERMISSION_DENIED");
    }).catch(() => {
      if (!disposed) {
        sessionRecoveredRef.current = false;
        setPageStoppedWarning(true);
      }
    });

    return () => {
      disposed = true;
      sessionRecoveredRef.current = false;
      commandListenerRef.current = () => undefined;
      familyAlertAbortRef.current?.abort();
      familyAlertAbortRef.current = null;
      sessionRuntime.dispose();
      void lifecycle.stop();
      locationRuntimeRef.current = null;
    };
  }, [heatmapHotspots, zoneDetails, zones]);

  useEffect(() => {
    if (engineView.state !== "IDLE") return;
    setArmAcknowledgement(null);
    setArmBannerVisible(false);
  }, [engineView.state]);

  useEffect(() => {
    if (!hasForegroundSafetySurface(engineView.state)) return;
    setAboutOpen(false);
    setDemoPanelOpen(false);
    setLocationHelpOpen(false);
    setSelectedZoneId(null);
    setSettingsOpen(false);
  }, [engineView.state]);

  useEffect(() => {
    // The quiet OK acknowledgement belongs to SHADOW only; the next check-in
    // or SOS replaces it, and a fresh arm clears the demo stop note.
    if (engineView.state !== "SHADOW") setOkAcknowledgement(null);
    if (engineView.state !== "IDLE") setDemoStopAcknowledgement(null);
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
  const handleZoneSelected = useCallback(
    (zoneId: string | null) => {
      if (hasForegroundSafetySurface(engineView.state)) {
        setSelectedZoneId(null);
        return;
      }

      setSelectedZoneId(zoneId);
    },
    [engineView.state],
  );

  useEffect(() => {
    if (hasForegroundSafetySurface(engineView.state)) {
      setSelectedZoneId(null);
    }
  }, [engineView.state]);
  const handleManualArm = useCallback(() => {
    if (!sessionRecoveredRef.current) return;
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
    demoMissesRef.current = 0;
    engineRef.current?.dispatch(
      { kind: "OkTapped" },
      { nowEpochMs, zone: activeZone },
    );
    // I'm OK resets the ladder; the quiet acknowledgement states the exact
    // wait until the next scheduled check-in on the active timing profile.
    const okResetSec = activeLadder.okResetSec;
    const duration =
      okResetSec >= MINUTES_PER_HOUR
        ? formatCopy(copy.durationMinutes, Math.round(okResetSec / MINUTES_PER_HOUR))
        : formatCopy(copy.durationSeconds, okResetSec);
    setOkAcknowledgement({
      body: formatCopy(copy.okThanksBody, duration),
      title: copy.okThanksTitle,
    });
  }, [activeLadder.okResetSec, copy, currentZone, engineView.activeZoneId, zones]);
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
    const stoppedDemo = demoSessionActive;
    engineRef.current?.dispatch(
      { kind: "PinAccepted" },
      { nowEpochMs, zone: activeZone },
    );
    // The correct PIN is the only exit from SOS; a stopped demo says so on the
    // quiet screen instead of implying anything reached a police system.
    if (stoppedDemo) {
      setDemoStopAcknowledgement({
        body: copy.policeDemoRowStopped,
        title: copy.policeDemoStatusStopped,
      });
    }
  }, [copy, currentZone, demoSessionActive, engineView.activeZoneId, zones]);
  const handleLocationHelpOpen = useCallback(() => {
    setSelectedZoneId(null);
    setDemoPanelOpen(false);
    setLocationHelpOpen(true);
  }, []);
  const handleLocationRetry = useCallback(() => {
    locationRuntimeRef.current?.startAfterConsent();
  }, []);
  const handleStartDemo = useCallback(async () => {
    const engine = engineRef.current;
    if (engine === null || !sessionRecoveredRef.current) return;
    const hasDemoPin = await new DemoPinStore().hasPin();
    if (!sessionRecoveredRef.current) return;
    if (!hasDemoPin) {
      if (engine.view().state !== "IDLE") return;
      setDemoSetupOpen(true);
      return;
    }
    const state = engine.view().state;
    if (state !== "IDLE" && state !== "RESOLVED") return;
    if (demoZoneDetail === null) return;
    // Discard a previous demo's cooldown, never an active real session.
    engine.resetForDemo();
    setPageStoppedWarning(false);
    setOkAcknowledgement(null);
    setDemoStopAcknowledgement(null);
    setFamilyAlertStatus(null);
    // The demo runs the shared engine on the accelerated profile; nothing
    // about its transitions or PIN path differs from a live session.
    engine.setRules(DEMO_RULES);
    locationRuntimeRef.current?.setRules(DEMO_RULES);
    locationRuntimeRef.current?.stop();
    demoSessionRef.current = true;
    demoMissesRef.current = 0;
    setDemoMissedCheckins(0);
    demoArmInFlightRef.current = true;
    try {
      for (const event of startDemoEventSequence(demoZoneDetail.zone.stationId)) {
        engine.dispatch(event, {
          hourBand: DEMO_ARM_TIME.hourBand,
          nowEpochMs: browserClock.nowEpochMs(),
          zone: demoZoneDetail.zone,
        });
      }
    } catch {
      demoSessionRef.current = false;
      engine.setRules(DEFAULT_RULES);
      locationRuntimeRef.current?.setRules(DEFAULT_RULES);
      setPageStoppedWarning(true);
      return;
    } finally {
      demoArmInFlightRef.current = false;
    }
    const persisted = engine.persistedSession();
    if (persisted !== null) {
      markDemoArmedSession(persisted.sessionId);
      setDemoSessionActive(true);
    }
    // Hand the map back so check-in 1 is the immediate, single foreground card.
    setDemoPanelOpen(false);
  }, [demoZoneDetail]);
  const handleDemoReset = useCallback(() => {
    if (!demoSessionRef.current || !engineRef.current?.resetForDemo()) return;
    setSelectedZoneId(null);
    setArmAcknowledgement(null);
    setArmBannerVisible(false);
    setPageStoppedWarning(false);
    setOkAcknowledgement(null);
    setDemoStopAcknowledgement(null);
    familyAlertAbortRef.current?.abort();
    familyAlertAbortRef.current = null;
    setFamilyAlertStatus(null);
  }, []);

  const mapCopy = useMemo(
    () => ({
      ariaMap: copy.cdMap,
      ariaZone: (areaName: string, riskLevel: string) =>
        formatCopy(
          copy.cdZone,
          areaName,
          localizedStaticRiskLevel(copy, riskLevel),
        ),
      attribution: copy.aboutAttribMap,
      offline: copy.mapOffline,
    }),
    [copy],
  );
  const appSessionStatus = (
    engineView.state === "SOS_ACTIVE" ? null : <AppSessionStatus
      copy={copy}
      showIdle={false}
      view={engineView}
    />
  );

  if (demoSetupOpen && engineView.state === "IDLE") {
    return <DemoSetup copy={copy} onCompleted={() => {
      setDemoSetupOpen(false);
      setDemoPanelOpen(true);
    }} />;
  }

  if (aboutOpen && engineView.state !== "SOS_ACTIVE") {
    return (
      <>
        {appSessionStatus}
        <AboutScreen
          copy={copy}
          founderContact={founderContact}
          mockedClaims={[copy.familyMockDisclosure]}
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
          locale={locale}
          onBack={() => setSettingsOpen(false)}
          onOpenAbout={() => setAboutOpen(true)}
          onOpenDemo={() => {
            setSettingsOpen(false);
            setDemoPanelOpen(true);
          }}
          onLocaleChange={onLocaleChange ?? (() => undefined)}
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
        hotspots={heatmapHotspots}
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
        checkInWindowSec={checkInWindowSec}
        copy={copy}
        demoModeActive={demoSessionActive}
        demoMissedCheckins={demoMissedCheckins}
        demoStopAcknowledgement={demoStopAcknowledgement}
        currentPoint={location}
        engineView={engineView}
        familyAlertStatus={familyAlertStatus}
        locale={locale}
        locationStatus={locationStatus}
        okAcknowledgement={okAcknowledgement}
        onArmBannerHidden={() => setArmBannerVisible(false)}
        onCheckInOk={handleCheckInOk}
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
          onClose={() => setDemoPanelOpen(false)}
          onStartDemo={handleStartDemo}
          onReset={handleDemoReset}
          sessionState={engineView.state}
          isDemoSession={demoSessionActive}
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

function hasForegroundSafetySurface(state: SessionState): boolean {
  return (
    state === "CHECKIN_1" ||
    state === "CHECKIN_2" ||
    state === "CHECKIN_3" ||
    state === "SOS_ACTIVE"
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
