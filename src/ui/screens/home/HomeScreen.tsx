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
} from "../../../domain/engine/rules";
import type { Command, SessionState } from "../../../domain/model/session";
import type { HeatmapHotspot } from "../../../domain/model/heatmapHotspot";
import { RiskTier } from "../../../domain/model/zone";
import type { PoliceStation } from "../../../domain/model/policeStation";
import { browserClock } from "../../../platform/clock";
import { requestHeadingAccess } from "../../../platform/deviceHeading";
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
import type {
  LeafletMapController,
  MapPlacePin,
  TileAvailability,
} from "../../../platform/leafletMap";
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
import {
  MapControlButton,
  MapControlButtonStack,
} from "../../components/MapControlButton";
import { formatCopy, M4_COPY, type SaayaLocale } from "../../copy/strings";
import { CharacterIcon } from "../../icons/CharacterIcon";
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
import type { CharacterSelection } from "../../../platform/walk/characterParts";
import {
  browserCharacterStorage,
  characterOrDefault,
  loadCharacterSelection,
  needsCharacter,
  saveCharacter,
  type CharacterLoad,
} from "../../../platform/walk/characterStore";
import { CharacterCustomiser } from "../walk/CharacterCustomiser";
import { WalkView } from "../walk/WalkView";
import {
  HomeChrome,
  pinLabel,
  ZERO_CATEGORY_COUNTS,
} from "./HomeChrome";
import { PlaceSheet } from "./PlaceSheet";
import {
  loadPlaces,
  PLACE_CATEGORIES,
  PLACES_ASSET_URL,
  type Place,
  type PlaceCategory,
  type Places,
} from "../../../platform/walk/walkPlaces";
import { PLACE_PIN_BUDGET } from "../../../platform/walk/walkFacts";

export interface BuildVersion {
  readonly code: number;
  readonly name: string;
}

/**
 * Which of the two views is on screen.
 *
 * `MAP_SPEC.md`: the walk view is "a second view, not a second product", and the flat map
 * is what she gets by default. The choice is deliberately not persisted: a view is not a
 * preference she set, and coming back to a map she did not ask for is worse than coming
 * back to the one the product opens with.
 */
type ViewMode = "FLAT" | "WALK";

export interface HomeScreenProps {
  readonly buildVersion: BuildVersion;
  readonly demoZones: readonly DemoZone[];
  readonly founderContact: string | null;
  readonly heatmapHotspots: readonly HeatmapHotspot[];
  readonly locale: SaayaLocale;
  readonly mapZones: readonly MapZone[];
  /**
   * Launches the onboarding flow over the session she is already in, from its Settings
   * row. Absent on a mount that has no gate above it to own that flow.
   */
  readonly onReplayOnboarding?: () => void;
  readonly openDemoOnMount?: boolean;
  readonly policeStations: readonly PoliceStation[];
  /**
   * True while the replay flow covers this session. The watch stops for the flow, which
   * mounts its own onboarding walk view, and resumes when she returns - consent is on
   * record, so nothing is asked again and nothing about the ladder changes.
   */
  readonly suspendedForReplay?: boolean;
  readonly zoneDetails: readonly ZoneDetail[];
}

export function HomeScreen({
  buildVersion,
  demoZones,
  founderContact,
  heatmapHotspots,
  locale,
  mapZones,
  onReplayOnboarding,
  openDemoOnMount = false,
  policeStations,
  suspendedForReplay = false,
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
  const [viewMode, setViewMode] = useState<ViewMode>("FLAT");
  // Corner's layout belongs to this view. Founder ruling, 2026-09-23: "These are the
  // reference screens I have provided. This is for normal view not the 3D view." The
  // bake's places, the category she has filtered the pins to, and the place whose sheet
  // is open are the flat map's own state; the walk view keeps its own copy of the same
  // three, because its pills are drawn in the scene rather than as DOM.
  const [places, setPlaces] = useState<Places | null>(null);
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);
  const [sheetPlace, setSheetPlace] = useState<Place | null>(null);
  // The compass answer, taken on the tap that opens the walk view. False until then, which
  // is the recorded camera: a phone with no compass draws the frame the facts were solved
  // for rather than a frame that claims a heading it never had.
  const [headingAllowed, setHeadingAllowed] = useState(false);
  const [characterLoad, setCharacterLoad] = useState<CharacterLoad>({
    kind: "absent",
  });
  const [customiserOpen, setCustomiserOpen] = useState(false);
  const [customiserFirstRun, setCustomiserFirstRun] = useState(false);
  const [announcement, setAnnouncement] = useState("");
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

  const placesById = useMemo(() => {
    const byId = new Map<string, Place>();
    for (const place of places?.places ?? []) byId.set(place.id, place);
    return byId;
  }, [places]);

  /**
   * The pills the flat map stands: the bake's own seven categories only.
   *
   * The bake maps OSM tags onto that vocabulary and the category bar's counts come from
   * the same file, so a row outside it is a row the product has no name for - a pin
   * nothing can filter to. The category she picked narrows the set here rather than in
   * the map, so the map's own pass only has to rank them. Which of them actually stand is
   * the map's decision, under the product's own pin budget: the nearest N inside the
   * frame, as she pans.
   */
  const flatPins = useMemo<readonly MapPlacePin[]>(() => {
    if (places === null) return [];
    const vocabulary: readonly string[] = PLACE_CATEGORIES;
    return places.places
      .filter(
        (place) =>
          vocabulary.includes(place.cat) &&
          (activeCategory === null || place.cat === activeCategory),
      )
      .map((place) => ({
        id: place.id,
        lat: place.lat,
        lon: place.lon,
        name: pinLabel(place, copy),
      }));
  }, [activeCategory, copy, places]);

  /** The carded areas as outlines, for the sheet's area row. */
  const areaOutlines = useMemo(
    () =>
      mapZones.map((zone) => ({
        areaName: zone.areaName,
        polygon: zone.zone.polygon,
      })),
    [mapZones],
  );

  const handlePlaceSelected = useCallback(
    (placeId: string) => {
      const place = placesById.get(placeId);
      if (place !== undefined) setSheetPlace(place);
    },
    [placesById],
  );

  useEffect(() => {
    if (viewMode !== "FLAT") return undefined;
    let cancelled = false;
    // The bake's own file, fetched for the flat map's pins and category bar. A failure
    // here is not a failure of the view: she keeps the map, the nav and the search pill,
    // and gets no pins and no category bar. Nothing stands in for the missing places,
    // because nothing could. The walk view loads the same file for itself, so switching
    // views at worst fetches it twice, the second time from the browser's own cache.
    void loadPlaces(PLACES_ASSET_URL)
      .then((loaded) => {
        if (!cancelled) setPlaces(loaded);
      })
      .catch(() => {
        // Silence is the honest report: the chrome renders exactly what it has.
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode]);

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
      heatmapHotspots,
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
  }, [copy, heatmapHotspots, locale, zoneDetails, zones]);

  useEffect(() => {
    // The walk view is the one screen whose whole subject is her position, and it is
    // entered by an explicit tap - she cannot be looking at it from her pocket. While it
    // is showing, the watch feeds the map every fix it is already receiving and asks for
    // precise ones; the recorded sampling cadence is untouched, so nothing about
    // containment or the ladder changes. Founder finding, 2026-09-23.
    locationRuntimeRef.current?.setWalkViewVisible(viewMode === "WALK");
  }, [viewMode]);

  useEffect(() => {
    if (!suspendedForReplay) return undefined;
    // The replay flow mounts its own onboarding over this session, and that mount has a
    // walk view reading her position for itself. Two readers of one watch is a question
    // this runtime does not have to answer, so this session's watch stops while the flow
    // covers it and resumes on her return. Consent is already on record: nothing is asked
    // again, and the ladder this session is in the middle of is untouched - the Settings
    // row that starts a replay is only offered from a quiet engine.
    locationRuntimeRef.current?.stop();
    return () => {
      locationRuntimeRef.current?.resumePreviouslyConsented();
    };
  }, [suspendedForReplay]);

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

  // She is asked to make a character on the first switch to the walk view, and only if
  // there is no character to load. Both of those come out of one load result, so the
  // question cannot be asked twice, and a stored character that no longer resolves is
  // treated as a reason to ask rather than as a character to draw.
  useEffect(() => {
    const storage = browserCharacterStorage();
    if (storage === null) return;
    let cancelled = false;
    void loadCharacterSelection(storage).then((load) => {
      if (!cancelled) setCharacterLoad(load);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const character = useMemo(
    () => characterOrDefault(characterLoad),
    [characterLoad],
  );

  const handleViewToggle = useCallback(() => {
    const next: ViewMode = viewMode === "FLAT" ? "WALK" : "FLAT";
    setViewMode(next);
    setAnnouncement(next === "WALK" ? copy.annViewWalk : copy.annViewFlat);
    if (next === "WALK") {
      // Asked here, inside the tap that opens the view, because iOS only answers this
      // while a gesture is being handled - an ask from an effect, a moment later, never
      // prompts at all. "unsupported" is not a refusal: Android reads its compass with no
      // permission, so a view that only listened on "granted" would never turn there.
      // Founder finding, 2026-09-23: the view did not turn with him.
      void requestHeadingAccess().then((permission) => {
        setHeadingAllowed(permission !== "denied");
      });
    }
    if (next === "WALK" && needsCharacter(characterLoad)) {
      setCustomiserFirstRun(true);
      setCustomiserOpen(true);
    }
  }, [characterLoad, copy, viewMode]);

  const handleCharacterSave = useCallback(
    (selection: CharacterSelection) => {
      setCharacterLoad({ kind: "loaded", selection });
      setCustomiserOpen(false);
      setCustomiserFirstRun(false);
      setAnnouncement(copy.annCustSaved);
      const storage = browserCharacterStorage();
      if (storage === null) return;
      void saveCharacter(storage, selection).catch(() => {
        // The same reading as `saveDemoSpeedEnabled`: a refusal to persist must not take
        // the choice she just made away from her in this session. It does mean the
        // character will not survive a reload, which progress.md records.
      });
    },
    [copy],
  );

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
          // Replay is offered only from a quiet engine: a live rung of the ladder is the
          // one thing on this screen that may never be interrupted by a screen change.
          onReplay={
            onReplayOnboarding !== undefined &&
            (engineView.state === "IDLE" || engineView.state === "RESOLVED")
              ? () => {
                  setSettingsOpen(false);
                  onReplayOnboarding();
                }
              : null
          }
        />
      </>
    );
  }

  return (
    <>
      {appSessionStatus}
      <main className="home-screen" data-location-status={locationStatus} data-session-state={engineView.state} data-view-mode={viewMode}>
      {viewMode === "WALK" ? (
        <WalkView
          character={character}
          copy={copy}
          headingAllowed={headingAllowed}
          hourBand={hourBandAtEpochMs(browserClock.nowEpochMs())}
          locale={locale}
          location={location}
          locationStatus={locationStatus}
          mapZones={mapZones}
          onZoneSelected={handleZoneSelected}
          selectedZoneId={selectedZoneId}
          sessionState={engineView.state}
          showPlaces
        />
      ) : (
        <>
          <HomeMap
            copy={mapCopy}
            hideAttribution={sheetPlace !== null}
            location={location}
            hotspots={heatmapHotspots}
            mapZones={mapZones}
            onController={handleMapController}
            onPlaceSelected={handlePlaceSelected}
            onTileAvailability={handleTileAvailability}
            onZoneSelected={handleZoneSelected}
            pinBudget={PLACE_PIN_BUDGET}
            pins={flatPins}
            selectedZoneId={selectedZoneId}
            sessionState={engineView.state}
            tileAvailability={tileAvailability}
          />

          <HomeChrome
            activeCategory={activeCategory}
            categoryCounts={places?.categoryCounts ?? ZERO_CATEGORY_COUNTS}
            copy={copy}
            onCategoryChange={setActiveCategory}
          />

          {sheetPlace === null || places === null ? null : (
            <PlaceSheet
              areas={areaOutlines}
              attribution={places.attribution}
              copy={copy}
              currentPoint={
                location === null
                  ? null
                  : { latitude: location.latitude, longitude: location.longitude }
              }
              locale={locale}
              onDismiss={() => setSheetPlace(null)}
              place={sheetPlace}
            />
          )}
        </>
      )}

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

      <div className="home-screen__top-rail">
        <MapControlButtonStack>
          {viewMode === "WALK" ? (
            // Founder instruction, 2026-09-23: the way into the customiser is a mark on the
            // right, not a wordy chip across the top. It is the walk view's control - the
            // flat map has no character in it - so it appears and disappears with the view
            // she is already toggling.
            <MapControlButton
              label={copy.walkEditCharacter}
              mark={<CharacterIcon />}
              onClick={() => {
                setCustomiserFirstRun(false);
                setCustomiserOpen(true);
              }}
            />
          ) : null}
          <MapControlButton
            icon="settings"
            label={copy.cdSettings}
            onClick={() => {
              setSelectedZoneId(null);
              setDemoPanelOpen(false);
              setSettingsOpen(true);
            }}
          />
        </MapControlButtonStack>
      </div>

      <div className="home-screen__controls">
        <MapControlButtonStack>
          {/* `MAP_SPEC.md`: the toggle sits above recentre, and it is a control rather
              than a mode switch with its own screen. Its glyph is the view she would
              arrive at, which is also what the announcement says. */}
          <MapControlButton
            icon={viewMode === "WALK" ? "map" : "3d_rotation"}
            label={copy.viewToggle}
            onClick={handleViewToggle}
          />
          {/* Only in the flat map. Recentre exists because the 2D map can be panned off
              her; the walk camera is pinned to her position and always has been, so the
              same button here would be a control that does nothing. */}
          {viewMode === "FLAT" ? (
            <MapControlButton
              icon="my_location"
              label={copy.cdRecentre}
              onClick={() => mapControllerRef.current?.recenter()}
            />
          ) : null}
        </MapControlButtonStack>
      </div>

      <p aria-live="polite" className="home-screen__announcement" role="status">
        {announcement}
      </p>

      {customiserOpen ? (
        <CharacterCustomiser
          copy={copy}
          firstRun={customiserFirstRun}
          initial={character}
          onCancel={() => {
            setCustomiserOpen(false);
            setCustomiserFirstRun(false);
          }}
          onSave={handleCharacterSave}
        />
      ) : null}

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
          /* The dock's tallest control is the SOS mark, which stands one step over the
             touch target so the one action that must never be missed is the one the eye
             lands on. The clearance the map's own chrome keeps is declared from that
             height, so the legend chip clears the dock by the same margin either way. */
          --home-action-dock-height: calc(var(--minimum-touch-target) + var(--space-8));

          /* The right edge of the frame: a fixed column of touch targets at
             --screen-padding, the settings mark at the top and the control stack at the
             bottom. Both views carry it and both views' own top row stops short of it.
             * Amended 2026-09-23: it is the home screen's column rather than the walk
             view's, because the flat map's chrome needs the same number now - it was
             declared on .walk-view, whose claim to it was only that the walk view got
             there first. */
          --home-rail: calc(var(--minimum-touch-target) + var(--space-8));

          /* HomeChrome owns the bottom of the frame in both view modes now: the nav pill
             on the bottom edge, then the category bar stacked one row above it. Everything
             the home screen floats in that band - the control stack, the action dock, the
             compact notice - rises above the whole stack rather than crossing it. The
             arithmetic mirrors HomeChrome's own rows in the same tokens: the nav's offset,
             its height, the gap above it, then one category pill. */
          --home-nav-stack: calc(
            var(--space-12) + var(--minimum-touch-target) + var(--space-8) +
              var(--space-8) + var(--space-12) +
              (var(--space-8) * 2 + var(--type-label-line-height))
          );
          --home-action-dock-clearance: calc(
            env(safe-area-inset-bottom) + var(--home-action-dock-height) +
              var(--space-20) + var(--home-nav-stack)
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

        .home-screen__announcement {
          position: absolute;
          inline-size: 1px;
          block-size: 1px;
          margin: -1px;
          padding: 0;
          overflow: hidden;
          border: 0;
          clip-path: inset(50%);
          white-space: nowrap;
        }

        .home-screen__top-rail {
          position: fixed;
          z-index: 4;
          inset-block-start: calc(env(safe-area-inset-top) + var(--space-12));
          inset-inline-end: var(--screen-padding);
        }

        /* The top-left brand lockup stood here. Founder instruction, 2026-09-23: "Remove
           the Saaya logo from the top." The rule that stood here carried the earlier note
           "the supplied compact v2 mark is the production brand asset and it is the whole
           lockup" - superseded: the mark is no longer the top of the frame in either view.
           The asset and the name still stand where they are the subject (About, onboarding);
           the map's own top row is Corner's now, and Corner's map carries no logo. */

      `}</style>
      </main>
    </>
  );
}

function hasForegroundSafetySurface(state: SessionState): boolean {
  return (
    state === "CHECKIN_1" ||
    state === "CHECKIN_2" ||
    state === "FAMILY_ESCALATED" ||
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
