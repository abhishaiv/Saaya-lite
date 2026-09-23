"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { MapZone } from "../../../data/repository/zoneRepository";
import type { LabelRect } from "../../../domain/labels/labelPlacement";
import type { HeatmapHotspot } from "../../../domain/model/heatmapHotspot";
import type { SessionState } from "../../../domain/model/session";
import type { LiveLocationFix } from "../../../platform/locationWatch";
import {
  mountLeafletMap,
  type LeafletMapController,
  type MapPlacePin,
  type TileAvailability,
} from "../../../platform/leafletMap";
import {
  projectMapHotspots,
  STATIC_MAP_VIEW_BOX,
} from "./mapProjection";

export interface HomeMapCopy {
  readonly ariaMap: string;
  readonly ariaZone: (areaName: string, tier: string) => string;
  readonly attribution: string;
  readonly offline: string;
}

export interface HomeMapProps {
  readonly copy: HomeMapCopy;
  /**
   * Held back while a surface that carries the same licence is over the map - the place
   * sheet's footer says it verbatim - so the licence reads once, not twice.
   */
  readonly hideAttribution?: boolean;
  readonly hotspots: readonly HeatmapHotspot[];
  readonly location: LiveLocationFix | null;
  readonly mapZones: readonly MapZone[];
  readonly onController: (controller: LeafletMapController | null) => void;
  readonly onPlaceSelected: (placeId: string) => void;
  readonly onTileAvailability: (status: TileAvailability) => void;
  readonly onZoneSelected: (zoneId: string | null) => void;
  /** The place pills to stand, already filtered to the active category. */
  readonly pins: readonly MapPlacePin[];
  /** The ceiling on pills at once, from the product's own pin budget fact. */
  readonly pinBudget: number;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
  readonly tileAvailability: TileAvailability;
}

const ZONE_STROKE_PX = 1.5; // fact: map.zone.stroke
const ZONE_SELECTED_STROKE_PX = 3; // fact: map.zone.stroke.sel
const ZONE_SELECTED_OPACITY_RAISE = 0.1; // fact: alpha.map.zone.selected.raise
const ZONE_GLOW_STROKE_PX = 6; // fact: map.zone.glow
const ZONE_GLOW_OPACITY = 0.15; // fact: alpha.map.zone.glow
const OPACITY_MAXIMUM = 1; // GROUNDED-EXEMPT: SVG opacity ceiling.

export function HomeMap({
  copy,
  hideAttribution = false,
  hotspots,
  location,
  mapZones,
  onController,
  onPlaceSelected,
  onTileAvailability,
  onZoneSelected,
  pins,
  pinBudget,
  selectedZoneId,
  sessionState,
  tileAvailability,
}: HomeMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LeafletMapController | null>(null);
  const viewRef = useRef({ location, selectedZoneId, sessionState });
  viewRef.current = { location, selectedZoneId, sessionState };
  // Held in refs, not read from props inside the mount effect: a callback that changes
  // identity must never tear the map down and build it again. This is not hypothetical -
  // the zone-selected handler is re-created on every rung of the ladder, so arming SUS
  // rebuilt the whole map, and every place pill on it went with the old one.
  const handlersRef = useRef({ onController, onTileAvailability, onZoneSelected });
  handlersRef.current = { onController, onTileAvailability, onZoneSelected };
  // The same reason, for the pins: what the mount hands over is whatever the last render
  // chose, because the places effect has already run by the time the mount resolves.
  const pinsRef = useRef({ budget: pinBudget, pins });
  pinsRef.current = { budget: pinBudget, pins };
  const pinTapRef = useRef(onPlaceSelected);
  pinTapRef.current = onPlaceSelected;
  const [leafletReady, setLeafletReady] = useState(false);
  const projectedHotspots = useMemo(
    () => projectMapHotspots(mapZones, hotspots),
    [hotspots, mapZones],
  );

  /**
   * The chrome over the map, as boxes no place pill may be placed under.
   *
   * Measured rather than derived: the search pill, the category bar, the nav, the two rails,
   * the action dock and the attribution carry their own words, and the attribution carries
   * the licence - "© OpenStreetMap contributors" under a pill is a licence not shown. They
   * are measured when they can change, not on every settle, because a `getBoundingClientRect`
   * inside the map's own draw is a layout flush the pan does not need. The rectangles come
   * back in the map container's own pixels, which is what the placement pass works in.
   */
  const chromeRects = useCallback((): readonly LabelRect[] => {
    const host = hostRef.current;
    const screen = host?.closest(".home-screen") ?? null;
    if (host === null || screen === null) return [];
    const base = host.getBoundingClientRect();
    const rows: readonly string[] = [
      ".home-chrome__search",
      ".home-chrome__categories",
      ".home-chrome__nav",
      ".home-screen__top-rail",
      ".home-screen__controls",
      ".home-session-action-dock",
      ".home-map__attribution",
    ];
    const rects: LabelRect[] = [];
    for (const row of rows) {
      const node = screen.querySelector(row);
      if (node === null) continue;
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      rects.push({
        bottomPx: box.bottom - base.top,
        leftPx: box.left - base.left,
        rightPx: box.right - base.left,
        topPx: box.top - base.top,
      });
    }
    return rects;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let disposed = false;

    void mountLeafletMap(
      host,
      mapZones,
      hotspots,
      {
        ariaZone: copy.ariaZone,
        onReady() {
          if (!disposed) setLeafletReady(true);
        },
        onPlaceSelected: (placeId) => pinTapRef.current(placeId),
        onTileAvailability: (status) => handlersRef.current.onTileAvailability(status),
        onZoneSelected: (zoneId) => handlersRef.current.onZoneSelected(zoneId),
      },
      () => disposed,
    ).then((controller) => {
      if (controller === null) return;
      if (disposed) {
        controller.destroy();
        return;
      }
      controllerRef.current = controller;
      handlersRef.current.onController(controller);
      controller.update(viewRef.current);
      // The places effect has already run by now, so this is where the first set of pills
      // comes from - and where a rebuilt map gets them back, since it starts with none.
      controller.setPlaces(
        pinsRef.current.pins,
        pinsRef.current.budget,
        chromeRects(),
      );
    });

    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      handlersRef.current.onController(null);
    };
  }, [chromeRects, copy.ariaZone, hotspots, mapZones]);

  useEffect(() => {
    controllerRef.current?.update({ location, selectedZoneId, sessionState });
  }, [location, selectedZoneId, sessionState]);

  useEffect(() => {
    // A no-op on mount: the map took the first set as part of the mount handshake.
    controllerRef.current?.setPlaces(pins, pinBudget, chromeRects());
  }, [chromeRects, pins, pinBudget]);

  useEffect(() => {
    // A turn of the phone moves the chrome and re-cuts the frame; the pills are placed
    // against both, so they are placed again.
    const onResize = (): void => {
      const current = pinsRef.current;
      controllerRef.current?.setPlaces(current.pins, current.budget, chromeRects());
    };
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, [chromeRects]);

  function selectStaticZone(event: MouseEvent<SVGCircleElement>, id: string) {
    event.stopPropagation();
    onZoneSelected(id);
  }

  function selectStaticZoneFromKeyboard(
    event: KeyboardEvent<SVGCircleElement>,
    id: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onZoneSelected(id);
  }

  return (
    <section aria-label={copy.ariaMap} className="home-map">
      <div className="home-map__canvas">
        <div aria-label={copy.ariaMap} className="home-map__leaflet" ref={hostRef} role="application" />

        <svg
          aria-hidden={leafletReady}
          aria-label={copy.ariaMap}
          className="home-map__fallback"
          data-map-layer="bundled-hotspots"
          data-ready={leafletReady ? "false" : "true"}
          onClick={() => onZoneSelected(null)}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={STATIC_MAP_VIEW_BOX}
        >
          {projectedHotspots.map((hotspot) => {
            const selected = hotspot.zoneId === selectedZoneId;
            return (
              <g key={hotspot.id}>
                {selected ? (
                  <circle
                    cx={hotspot.x}
                    cy={hotspot.y}
                    fill="none"
                    pointerEvents="none"
                    r={hotspot.radius}
                    stroke={hotspot.colorHex}
                    strokeOpacity={ZONE_GLOW_OPACITY}
                    strokeWidth={ZONE_GLOW_STROKE_PX}
                  />
                ) : null}
                <circle
                  aria-label={copy.ariaZone(hotspot.areaName, hotspot.riskLevel)}
                  cx={hotspot.x}
                  cy={hotspot.y}
                  data-hotspot-id={hotspot.id}
                  data-hotspot-treatment={selected ? "selected" : "base"}
                  data-zone-id={hotspot.zoneId}
                  fill={hotspot.colorHex}
                  fillOpacity={
                    selected
                      ? Math.min(
                          OPACITY_MAXIMUM,
                          hotspot.fillOpacity + ZONE_SELECTED_OPACITY_RAISE,
                        )
                      : hotspot.fillOpacity
                  }
                  onClick={(event) => selectStaticZone(event, hotspot.zoneId)}
                  onKeyDown={(event) =>
                    selectStaticZoneFromKeyboard(event, hotspot.zoneId)
                  }
                  r={hotspot.radius}
                  role="button"
                  stroke={hotspot.colorHex}
                  strokeWidth={
                    selected ? ZONE_SELECTED_STROKE_PX : ZONE_STROKE_PX
                  }
                  tabIndex={leafletReady ? -1 : 0}
                />
              </g>
            );
          })}
        </svg>

        {tileAvailability === "offline" ? (
          <p className="home-map__offline" role="status">{copy.offline}</p>
        ) : null}
      </div>

      {hideAttribution ? null : (
        <small className="home-map__attribution">{copy.attribution}</small>
      )}

      <style jsx>{`
        .home-map {
          position: absolute;
          inset: 0;
        }

        .home-map__canvas {
          position: absolute;
          z-index: 0; /* GROUNDED-EXEMPT: local base stacking context contains Leaflet's internal pane indices below Home UI. */
          inset: 0;
          overflow: hidden;
          background: var(--color-background);
          isolation: isolate;
        }

        .home-map__leaflet,
        .home-map__fallback {
          position: absolute;
          inset: 0;
          inline-size: 100%; /* GROUNDED-EXEMPT: structural full-bleed map width. */
          block-size: 100%; /* GROUNDED-EXEMPT: structural full-bleed map height. */
        }

        .home-map__fallback {
          z-index: 1;
          padding: var(--space-20);
          background: var(--color-background);
          transition: none;
        }

        .home-map__fallback[data-ready="false"] {
          visibility: hidden;
        }

        .home-map__fallback circle[role="button"] {
          cursor: pointer;
          transition:
            stroke-width var(--motion-150) var(--motion-standard),
            fill-opacity var(--motion-150) var(--motion-standard);
        }

        .home-map__fallback circle[role="button"]:focus-visible {
          outline: none;
          filter: drop-shadow(0 0 var(--space-4) var(--color-brand-light));
        }

        .home-map__offline {
          position: absolute;
          z-index: 3;
          inset-inline-start: var(--screen-padding);
          inset-block-end: calc(
            var(--home-action-dock-clearance) + var(--space-8)
          );
          margin: 0;
          padding: var(--space-8) var(--space-12);
          border-radius: var(--radius-small);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        /* The flat map's ground is the light OSM raster, where the theme's tertiary text -
           white at 40% - is a licence not shown. It reads on its own chip instead, the way
           the map library's own attribution control does, so the licence is legible over
           any tile under it. The walk view's own line over dark ground keeps the theme's
           colour. */
        .home-map__attribution {
          position: fixed;
          z-index: 10; /* GROUNDED-EXEMPT: licence attribution remains above every Home sheet state. */
          inset-inline-start: var(--screen-padding);
          inset-block-end: calc(
            var(--home-action-dock-clearance) + var(--space-4)
          );
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-small);
          /* alpha.floating, the alpha every floating control over the map is painted at;
             this chip is the white one, because the licence has to read on any tile. */
          background: rgb(from var(--color-text-primary) r g b / 0.92);
          color: rgb(from var(--color-background) r g b / 0.75);
          font-size: calc(10 / 16 * 1rem); /* type.map.attribution / type.rem.base */
          line-height: var(--type-label-line-height);
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
