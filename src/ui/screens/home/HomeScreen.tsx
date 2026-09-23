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
import { IndexedDbOnboardingRepository } from "../../../data/db/indexedDbOnboardingRepository";
import { IndexedDbPersonalRepository } from "../../../data/db/indexedDbPersonalRepository";
import { BrowserPinHasher } from "../../../platform/pinHash";
import {
  EMPTY_PERSONAL_STATE,
  type PersonalState,
} from "../../../data/repository/personalRepository";
import {
  BROWSE_ROWS_MAX,
  placeRowFacts,
  SEARCH_CHIP_MAX,
} from "../../../platform/walk/placeBrowse";
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
  CATEGORY_LABEL_KEY,
  CategoryChips,
  HomeChrome,
  type HomeChromeNavTab,
  pinLabel,
} from "./HomeChrome";
import { FeedSurface } from "./FeedSurface";
import { ImportSheet } from "./ImportSheet";
import { PlaceSheet } from "./PlaceSheet";
import { ProfileSurface } from "./ProfileSurface";
import { SearchSurface } from "./SearchSurface";
import type { PlaceListRow } from "./PlaceList";
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
  // bake's places and the place whose sheet is open are the flat map's own state; the walk
  // view keeps its own copy of both, because its pills are drawn in the scene rather than
  // as DOM.
  const [places, setPlaces] = useState<Places | null>(null);
  const [sheetPlace, setSheetPlace] = useState<Place | null>(null);
  /**
   * Which tab of the dock is the page she is on. The four are the same list the nav draws,
   * and `map` is the map itself: a surface is never a fifth state, it is one of the four.
   *
   * It sits here rather than in the chrome because opening a surface closes the place
   * sheet and the demo panel, which are this screen's own state.
   */
  const [surface, setSurface] = useState<HomeChromeNavTab>("map");
  /** Her own lists, read once on mount and re-read after every write. */
  const [personal, setPersonal] = useState<PersonalState>(EMPTY_PERSONAL_STATE);
  const [importOpen, setImportOpen] = useState(false);
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
  // The personal store is opened lazily, on the first read, so a mount that never opens a
  // surface never touches IndexedDB at all.
  const personalRepositoryRef = useRef<IndexedDbPersonalRepository | null>(null);
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
   * The bake maps OSM tags onto that vocabulary and the feed's own chips read from the
   * same file, so a row outside it is a row the product has no name for - a pin nothing
   * can filter to. Which of them actually stand is the map's decision, under the product's
   * own pin budget: the nearest N inside the frame, as she pans.
   *
   * The category filter that used to narrow this set is gone from the map with the bar
   * that held it. Founder, on the shipped flat map (2026-09-23): "Too many things on
   * screen. Very counter-intuitive to use." The map keeps "Search + nav only"; filtering a
   * city by category is the feed's business now, where the board is.
   */
  const flatPins = useMemo<readonly MapPlacePin[]>(() => {
    if (places === null) return [];
    const vocabulary: readonly string[] = PLACE_CATEGORIES;
    return places.places
      .filter((place) => vocabulary.includes(place.cat))
      .map((place) => ({
        id: place.id,
        lat: place.lat,
        lon: place.lon,
        name: pinLabel(place, copy),
      }));
  }, [copy, places]);

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
      if (place === undefined) return;
      setSheetPlace(place);
      // The board steps aside for the place. A sheet is the map's own detail, so a card
      // tapped on the feed, in search or on her page brings the map back with that place
      // open on it; the nav's tab carries her back to the list she came from. This also
      // keeps the walk view honest, whose sheet is drawn inside its own frame.
      setSurface("map");
      setImportOpen(false);
    },
    [placesById],
  );

  const handlePlaceSheetDismiss = useCallback(() => setSheetPlace(null), []);

  /** The boards deal in the places themselves; this screen keys them by id. */
  const handleBoardPlaceSelected = useCallback(
    (place: Place) => handlePlaceSelected(place.id),
    [handlePlaceSelected],
  );

  const personalRepository = useCallback(() => {
    personalRepositoryRef.current ??= new IndexedDbPersonalRepository();
    return personalRepositoryRef.current;
  }, []);

  // Her name and her favourite are the onboarding's own record, read here the same way the
  // family message reads them: the profile states what she set up, and this screen does not
  // keep a second copy of either.
  const identityRepositoryRef = useRef<IndexedDbOnboardingRepository | null>(null);
  const [identity, setIdentity] = useState<{
    readonly favouriteName: string | null;
    readonly name: string | null;
  }>({ favouriteName: null, name: null });

  useEffect(() => {
    identityRepositoryRef.current ??= new IndexedDbOnboardingRepository(
      new BrowserPinHasher(),
    );
    const repository = identityRepositoryRef.current;
    let cancelled = false;
    void Promise.all([
      repository.loadUserName(),
      repository.loadPrimaryFavourite(),
    ])
      .then(([name, favourite]) => {
        if (!cancelled) {
          setIdentity({ favouriteName: favourite?.name ?? null, name });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const readPersonal = useCallback(async () => {
    setPersonal(await personalRepository().load());
  }, [personalRepository]);

  // Her first open, stamped once, then her lists. The stamp is what the profile's weeks
  // counter reads, so it is written even if nothing else on the page is ever touched. A
  // browser that refuses its own database is not an error state: everything else here
  // works without it and no surface invents what it cannot read.
  useEffect(() => {
    let cancelled = false;
    const repository = personalRepository();
    void repository
      .markFirstUse(browserClock.nowEpochMs())
      .then(() => repository.load())
      .then((state) => {
        if (!cancelled) setPersonal(state);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [personalRepository]);

  const handleSavePlace = useCallback(
    (placeId: string) => {
      void personalRepository()
        .savePlace(placeId, browserClock.nowEpochMs())
        .then(readPersonal)
        .catch(() => undefined);
    },
    [personalRepository, readPersonal],
  );

  const handleUnsavePlace = useCallback(
    (placeId: string) => {
      void personalRepository()
        .unsavePlace(placeId)
        .then(readPersonal)
        .catch(() => undefined);
    },
    [personalRepository, readPersonal],
  );

  const handleToggleTopSpot = useCallback(
    (placeId: string, starred: boolean) => {
      void personalRepository()
        .setTopSpot(placeId, starred)
        .then(readPersonal)
        .catch(() => undefined);
    },
    [personalRepository, readPersonal],
  );

  const categoryLabel = useCallback(
    (category: string) => {
      const key = CATEGORY_LABEL_KEY[category as PlaceCategory];
      return key === undefined ? category : copy[key];
    },
    [copy],
  );

  /**
   * One place as the board's own card. It is the same builder the feed and the search use
   * for themselves, called from here because the profile's rows come from her lists rather
   * than from a query - and a saved place whose id the bake no longer carries is dropped
   * rather than drawn from a stub, because the bake is the only thing that says where a
   * place is.
   */
  const personalRow = useCallback(
    (place: Place): PlaceListRow => ({
      facts: placeRowFacts(place, {
        areas: areaOutlines,
        currentPoint: location,
        locale,
        categoryLabel,
      }),
    }),
    [areaOutlines, categoryLabel, locale, location],
  );

  const topSpotRows = useMemo<readonly PlaceListRow[]>(
    () =>
      personal.topSpots
        .map((id) => placesById.get(id))
        .filter((place): place is Place => place !== undefined)
        .map(personalRow),
    [personal.topSpots, personalRow, placesById],
  );

  const savedRows = useMemo<readonly PlaceListRow[]>(
    () =>
      personal.savedPlaces
        .map(({ placeId }) => placesById.get(placeId))
        .filter((place): place is Place => place !== undefined)
        .map(personalRow),
    [personal.savedPlaces, personalRow, placesById],
  );

  const savedPlaceIds = useMemo(
    () => new Set(personal.savedPlaces.map(({ placeId }) => placeId)),
    [personal.savedPlaces],
  );

  const handleToggleSavePlace = useCallback(
    (placeId: string) => {
      if (savedPlaceIds.has(placeId)) {
        handleUnsavePlace(placeId);
        return;
      }
      handleSavePlace(placeId);
    },
    [handleSavePlace, handleUnsavePlace, savedPlaceIds],
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
    // The profile's check-in counter is one per accepted tap: `handleCheckInOk` is the
    // handler that means "she said she is fine", so the count is written here rather than
    // anywhere the ladder's state could be read twice.
    void personalRepository().recordCheckInAccepted().then(readPersonal).catch(() => undefined);
  }, [currentZone, engineView.activeZoneId, personalRepository, readPersonal, zones]);
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

  /**
   * The dock's own tap: one of the four pages, and the map is one of them.
   *
   * Opening a surface closes the two things that float over the map on their own - the
   * place sheet and the demo panel - because a surface is a page and a page is not a
   * layer. The ladder is untouched: no rung of it changes because a page was opened, and
   * the surfaces render above the map but below every safety control the home screen
   * keeps.
   */
  const handleTabChange = useCallback((tab: HomeChromeNavTab) => {
    setSurface(tab);
    setSheetPlace(null);
    setDemoPanelOpen(false);
  }, []);

  const handleSearchOpen = useCallback(() => {
    setSurface("search");
    setSheetPlace(null);
    setDemoPanelOpen(false);
  }, []);

  /**
   * The clock reading the profile opened with, for its weeks counter. Read when the
   * surface changes rather than on every render: the counter is a statement about the
   * moment she looked, and a value that ticks under her is not a statement.
   */
  const surfaceOpenedAtEpochMs = useMemo(
    () => browserClock.nowEpochMs(),
    [surface],
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
          onPlaceDismiss={handlePlaceSheetDismiss}
          onSearchOpen={handleSearchOpen}
          onTabChange={handleTabChange}
          onZoneSelected={handleZoneSelected}
          selectedPlaceId={sheetPlace?.id ?? null}
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
            activeTab={surface}
            copy={copy}
            onSearchOpen={handleSearchOpen}
            onTabChange={handleTabChange}
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
              onToggleSave={handleToggleSavePlace}
              place={sheetPlace}
              saved={savedPlaceIds.has(sheetPlace.id)}
            />
          )}
        </>
      )}

      {surface === "feed" ? (
        <FeedSurface
          areas={areaOutlines}
          copy={copy}
          currentPoint={location}
          locale={locale}
          onPlaceSelected={handleBoardPlaceSelected}
          picks={personal.picks}
          places={places}
          rowsMax={BROWSE_ROWS_MAX}
        />
      ) : null}

      {surface === "search" ? (
        <SearchSurface
          areas={areaOutlines}
          chipsMax={SEARCH_CHIP_MAX}
          copy={copy}
          currentPoint={location}
          locale={locale}
          onPlaceSelected={handleBoardPlaceSelected}
          places={places}
          rowsMax={BROWSE_ROWS_MAX}
        />
      ) : null}

      {surface === "profile" ? (
        <ProfileSurface
          copy={copy}
          favouriteName={identity.favouriteName}
          name={identity.name}
          nowEpochMs={surfaceOpenedAtEpochMs}
          onImportOpen={() => setImportOpen(true)}
          onPlaceSelected={handleBoardPlaceSelected}
          onRemoveSaved={handleUnsavePlace}
          onSettingsOpen={() => setSettingsOpen(true)}
          onToggleTopSpot={handleToggleTopSpot}
          personal={personal}
          savedRows={savedRows}
          topSpotRows={topSpotRows}
        />
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
        onPinAccepted={handlePinAccepted}
        pageStoppedWarning={pageStoppedWarning}
        policeStations={policeStations}
      />

      {/* The map's top row: the view's own two controls, beside the search pill the chrome
          draws.
          * Founder ruling, 2026-09-23, choosing between five rendered directions: "A -
          Light and quiet" - "the search pill, then two small circles: the walk view and the
          recentre". The settings gear that stood in this corner is gone with it: the ruling
          put the doc in the dock's Profile page, and the nav's own tab is the way to it
          now.

          The two slots hold the two controls the view actually has. On the flat map that is
          the walk view and the recentre; in the walk view it is the way back to the map and
          the character mark, because recentre exists only where the map can be panned off
          her and the walk camera is pinned to her position. */}
      <div className="home-screen__controls">
        <MapControlButtonStack axis="row">
          <MapControlButton
            icon={viewMode === "WALK" ? "map" : "3d_rotation"}
            label={copy.viewToggle}
            onClick={handleViewToggle}
            tone="light"
          />
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
              tone="light"
            />
          ) : (
            <MapControlButton
              icon="my_location"
              label={copy.cdRecentre}
              onClick={() => mapControllerRef.current?.recenter()}
              tone="light"
            />
          )}
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

      {importOpen ? (
        <ImportSheet
          areas={areaOutlines}
          copy={copy}
          currentPoint={location}
          locale={locale}
          onDismiss={() => setImportOpen(false)}
          onPlaceSelected={handleBoardPlaceSelected}
          places={places}
        />
      ) : null}

      <style jsx>{`
        .home-screen {
          /* The dock's tallest control is the SOS mark, which stands one step over the
             touch target so the one action that must never be missed is the one the eye
             lands on. The clearance the map's own chrome keeps is declared from that
             height, so the legend chip clears the dock by the same margin either way. */
          --home-action-dock-height: calc(var(--minimum-touch-target) + var(--space-8));

          /* The right edge of the frame's top row: the view's own two controls, side by
             side at --screen-padding, with the search pill stopping short of them.
             * Amended 2026-09-23: it is the home screen's column rather than the walk
             view's, because the flat map's chrome needs the same number now - it was
             declared on .walk-view, whose claim to it was only that the walk view got
             there first.
             * Amended again the same day, on the founder's ruling "A - Light and quiet":
             the column is two controls wide, not one. The settings mark that used to hold
             this corner alone is gone (the dock's Profile page is the way to the doc now),
             and the walk view and the recentre stand here together. The arithmetic is the
             control stack's own: two touch targets, the 12 px gap they are stacked with,
             and the 8 px the pill keeps clear of them. */
          --home-rail: calc(
            var(--minimum-touch-target) * 2 + var(--space-12) + var(--space-8)
          );

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
          /* What the map's own floating chrome - the legend, the attribution, the compact
             notice - rises above at the bottom of the frame.
             * Amended 2026-09-24, with the rail: the direct actions are marks on the right
             edge now, vertically centred, so they no longer share this band. The band is
             the chrome's alone, and the sum is the nav's own stack rather than the nav plus
             a mark that is not there. The name is kept because it is the same clearance
             every caller already reads - the walk view's legend, the flat map's, the
             notice's - and the shape of it has not changed, only its height. */
          --home-action-dock-clearance: calc(
            env(safe-area-inset-bottom) + var(--space-20) + var(--home-nav-stack)
          );

          position: relative;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural viewport fill. */
          overflow: hidden;
          background: var(--color-background);
          isolation: isolate;
        }

        /* The top row's own column, on the same line as the search pill the chrome draws.
           It was the bottom-right control column until the founder's ruling put these two
           beside the pill. */
        .home-screen__controls {
          position: fixed;
          z-index: 4;
          inset-block-start: calc(env(safe-area-inset-top) + var(--space-12));
          inset-inline-end: var(--screen-padding);
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

        /* The top-right rail stood here: the fixed column that carried the WALK-only
           character mark and the settings gear.
           * Founder ruling, 2026-09-23, choosing between five rendered directions: "A -
           Light and quiet" - the map keeps the
           search pill and the view's own two controls beside it, and "the doc" moves to the
           dock's Profile page. The character mark moved into that row with the toggle it
           belongs to; the gear is reached from Profile now. */

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
