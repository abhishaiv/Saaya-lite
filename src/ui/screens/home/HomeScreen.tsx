"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  DemoZone,
  MapZone,
} from "../../../data/repository/zoneRepository";
import { DEFAULT_RULES } from "../../../domain/engine/rules";
import type { Command, SessionState } from "../../../domain/model/session";
import { browserClock } from "../../../platform/clock";
import { readGeolocationPermissionState } from "../../../platform/geolocationPermission";
import { hourBandAtEpochMs } from "../../../platform/hourBandClock";
import type { LeafletMapController, TileAvailability } from "../../../platform/leafletMap";
import type { LiveLocationFix, LocationStatus } from "../../../platform/locationWatch";
import { PageLocationRuntime } from "../../../platform/pageLocationRuntime";
import { MapControlButton, MapControlButtonStack } from "../../components/MapControlButton";
import { formatCopy, M4_COPY, type SaayaLocale } from "../../copy/strings";
import { HomeEngineBridge, type HomeEngineView } from "./homeEngineBridge";
import { HomeMap } from "./HomeMap";

export interface HomeScreenProps {
  readonly demoZones: readonly DemoZone[];
  readonly locale: SaayaLocale;
  readonly mapZones: readonly MapZone[];
}

export function HomeScreen({ demoZones, locale, mapZones }: HomeScreenProps) {
  const router = useRouter();
  const copy = M4_COPY[locale];
  const [location, setLocation] = useState<LiveLocationFix | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("SEARCHING");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [tileAvailability, setTileAvailability] =
    useState<TileAvailability>("loading");
  const [engineView, setEngineView] = useState<HomeEngineView>({
    activeZoneId: null,
    armMode: "MANUAL",
    outcome: null,
    state: "IDLE",
  });
  const mapControllerRef = useRef<LeafletMapController | null>(null);
  const locationRuntimeRef = useRef<PageLocationRuntime | null>(null);
  const commandListenerRef = useRef<(commands: readonly Command[]) => void>(() => undefined);
  const engineRef = useRef<HomeEngineBridge | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new HomeEngineBridge(
      DEFAULT_RULES,
      hourBandAtEpochMs,
      {
        onCommands(commands) {
          commandListenerRef.current(commands);
        },
        onView(view) {
          setEngineView(view);
        },
      },
    );
  }

  const zones = useMemo(() => mapZones.map(({ zone }) => zone), [mapZones]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine === null) return;
    const runtime = new PageLocationRuntime(
      zones,
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
        },
        onStatus(status) {
          setLocationStatus(status);
        },
      },
    );
    locationRuntimeRef.current = runtime;
    let disposed = false;
    void readGeolocationPermissionState().then((permission) => {
      if (disposed) return;
      if (permission === "granted") runtime.resumePreviouslyConsented();
      if (permission === "denied") setLocationStatus("PERMISSION_DENIED");
    });

    return () => {
      disposed = true;
      runtime.stop();
      locationRuntimeRef.current = null;
    };
  }, [zones]);

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

  const mapCopy = useMemo(
    () => ({
      ariaMap: copy.cdMap,
      ariaZone: (areaName: string, riskLevel: string) =>
        formatCopy(copy.cdZone, areaName, riskLevel),
      attribution: "© OpenStreetMap contributors © CARTO",
      offline: copy.mapOffline,
    }),
    [copy],
  );

  return (
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

      <div className="home-screen__controls">
        <MapControlButtonStack>
          <MapControlButton
            icon="my_location"
            label={copy.cdRecentre}
            onClick={() => mapControllerRef.current?.recenter()}
          />
          <MapControlButton
            icon="settings"
            label={copy.cdSettings}
            onClick={() => router.push(`/settings?lang=${locale}`)}
          />
        </MapControlButtonStack>
      </div>

      <output className="home-screen__asset-count" hidden>
        {mapZones.length}:{demoZones.length}
      </output>

      <style jsx>{`
        .home-screen {
          position: relative;
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: structural viewport fill. */
          overflow: hidden;
          background: var(--color-background);
        }

        .home-screen__controls {
          position: fixed;
          z-index: 4;
          inset-inline-end: var(--screen-padding);
          inset-block-end: calc(var(--sheet-peek-height) + var(--space-20));
        }
      `}</style>
    </main>
  );
}
