"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { MapZone } from "../../../data/repository/zoneRepository";
import type { SessionState } from "../../../domain/model/session";
import type { LiveLocationFix } from "../../../platform/locationWatch";
import {
  mountLeafletMap,
  type LeafletMapController,
  type TileAvailability,
} from "../../../platform/leafletMap";
import {
  projectMapZones,
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
  readonly location: LiveLocationFix | null;
  readonly mapZones: readonly MapZone[];
  readonly onController: (controller: LeafletMapController | null) => void;
  readonly onTileAvailability: (status: TileAvailability) => void;
  readonly onZoneSelected: (zoneId: string | null) => void;
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
  location,
  mapZones,
  onController,
  onTileAvailability,
  onZoneSelected,
  selectedZoneId,
  sessionState,
  tileAvailability,
}: HomeMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LeafletMapController | null>(null);
  const viewRef = useRef({ location, selectedZoneId, sessionState });
  viewRef.current = { location, selectedZoneId, sessionState };
  const [leafletReady, setLeafletReady] = useState(false);
  const projectedZones = useMemo(() => projectMapZones(mapZones), [mapZones]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let disposed = false;

    void mountLeafletMap(
      host,
      mapZones,
      {
        ariaZone: copy.ariaZone,
        onReady() {
          if (!disposed) setLeafletReady(true);
        },
        onTileAvailability,
        onZoneSelected,
      },
      () => disposed,
    ).then((controller) => {
      if (controller === null) return;
      if (disposed) {
        controller.destroy();
        return;
      }
      controllerRef.current = controller;
      onController(controller);
      controller.update(viewRef.current);
    });

    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      onController(null);
    };
  }, [copy.ariaZone, mapZones, onController, onTileAvailability, onZoneSelected]);

  useEffect(() => {
    controllerRef.current?.update({ location, selectedZoneId, sessionState });
  }, [location, selectedZoneId, sessionState]);

  function selectStaticZone(event: MouseEvent<SVGPathElement>, id: string) {
    event.stopPropagation();
    onZoneSelected(id);
  }

  function selectStaticZoneFromKeyboard(
    event: KeyboardEvent<SVGPathElement>,
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
          data-map-layer="bundled-zones"
          data-ready={leafletReady ? "false" : "true"}
          onClick={() => onZoneSelected(null)}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={STATIC_MAP_VIEW_BOX}
        >
          {projectedZones.map((zone) => {
            const selected = zone.id === selectedZoneId;
            return (
              <g key={zone.id}>
                {selected ? (
                  <path
                    d={zone.path}
                    fill="none"
                    pointerEvents="none"
                    stroke={zone.colorHex}
                    strokeOpacity={ZONE_GLOW_OPACITY}
                    strokeWidth={ZONE_GLOW_STROKE_PX}
                  />
                ) : null}
                <path
                  aria-label={copy.ariaZone(zone.areaName, zone.riskLevel)}
                  d={zone.path}
                  data-zone-id={zone.id}
                  data-zone-treatment={selected ? "selected" : "outline"}
                  fill={zone.colorHex}
                  fillOpacity={
                    selected
                      ? Math.min(
                          OPACITY_MAXIMUM,
                          zone.fillOpacity + ZONE_SELECTED_OPACITY_RAISE,
                        )
                      : 0
                  }
                  onClick={(event) => selectStaticZone(event, zone.id)}
                  onKeyDown={(event) =>
                    selectStaticZoneFromKeyboard(event, zone.id)
                  }
                  role="button"
                  stroke={zone.colorHex}
                  strokeWidth={
                    selected ? ZONE_SELECTED_STROKE_PX : ZONE_STROKE_PX
                  }
                  tabIndex={leafletReady ? -1 : 0}
                />
                {zone.riskTier === "HIGH" ? (
                  <text
                    className="home-map__fallback-label"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={zone.labelX}
                    y={zone.labelY}
                  >
                    {zone.areaName}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {tileAvailability === "offline" ? (
          <p className="home-map__offline" role="status">{copy.offline}</p>
        ) : null}
      </div>

      <small className="home-map__attribution">{copy.attribution}</small>

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

        .home-map__fallback path[role="button"] {
          cursor: pointer;
          transition:
            stroke-width var(--motion-150) var(--motion-standard),
            fill-opacity var(--motion-150) var(--motion-standard);
        }

        .home-map__fallback path[role="button"]:focus-visible {
          outline: none;
          filter: drop-shadow(0 0 var(--space-4) var(--color-brand-light));
        }

        .home-map__fallback-label {
          fill: rgb(from var(--color-text-primary) r g b / 0.8);
          font-family: var(--font-family);
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--type-label-tracking);
          line-height: var(--type-label-line-height);
        }

        .home-map__offline {
          position: absolute;
          z-index: 3;
          inset-inline-start: var(--screen-padding);
          inset-block-end: calc(var(--sheet-peek-height) + var(--space-32));
          margin: 0;
          padding: var(--space-8) var(--space-12);
          border-radius: var(--radius-small);
          background: var(--color-card-fill);
          color: var(--color-text-on-card);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .home-map__attribution {
          position: fixed;
          z-index: 10; /* GROUNDED-EXEMPT: licence attribution remains above every Home sheet state. */
          inset-inline-start: var(--screen-padding);
          inset-block-end: calc(env(safe-area-inset-bottom) + var(--space-4));
          color: var(--color-text-tertiary);
          font-size: calc(10 / 16 * 1rem); /* type.map.attribution / type.rem.base */
          line-height: var(--type-label-line-height);
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
