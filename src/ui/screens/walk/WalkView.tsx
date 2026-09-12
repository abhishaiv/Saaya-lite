"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapZone } from "../../../data/repository/zoneRepository";
import { displayRisk, displayRiskLabel } from "../../../domain/engine/rules";
import type { HourBand, SessionState } from "../../../domain/model/session";
import type { LiveLocationFix, LocationStatus } from "../../../platform/locationWatch";
import type { CharacterSelection } from "../../../platform/walk/characterParts";
import {
  COLOR_TILE_LAND,
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
  COLOR_ZONE_MODERATE,
} from "../../../platform/walk/walkFacts";
import type {
  WalkSceneController,
  WalkScreenLabel,
} from "../../../platform/walk/walkScene";
import { SectionHeader } from "../../components/SectionHeader";
import { localizedRiskBand } from "../../copy/riskBandLabel";
import { formatCopy, type M4Copy } from "../../copy/strings";

export interface WalkViewProps {
  readonly character: CharacterSelection;
  readonly copy: M4Copy;
  readonly hourBand: HourBand;
  readonly location: LiveLocationFix | null;
  readonly locationStatus: LocationStatus;
  readonly mapZones: readonly MapZone[];
  readonly onEditCharacter: () => void;
  readonly onZoneSelected: (stationId: string) => void;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
}

/**
 * The ramp the bands are cut from, low to high.
 *
 * The low end is the land colour rather than a fourth band, because that is what the
 * world does with it: `bandColorForRisk` returns nothing below the low threshold, so a
 * quiet area is drawn unshaded. The legend says "fewer records" at that end, which is the
 * same statement.
 */
const LEGEND_STOPS: readonly string[] = [
  COLOR_TILE_LAND,
  COLOR_ZONE_MODERATE,
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
];

/**
 * The walk view: a canvas, the zone labels drawn over it, and the reading she needs to
 * trust what she is looking at.
 *
 * Everything geometric lives in `src/platform/walk/`, and this file reaches it by name at
 * runtime rather than at the top of the module. That is what keeps `three` out of the
 * initial bundle, and `MAP_SPEC.md` is explicit that it must not be imported from
 * `src/ui/` at all.
 *
 * The scene owns the frame loop; this owns the DOM around it. Labels are the one place
 * the two meet, and they meet through direct style writes rather than React state,
 * because a zone label moves every frame she walks and re-rendering the sheet beside it
 * sixty times a second is not a cost this view gets to charge a cheap phone.
 */
export function WalkView({
  character,
  copy,
  hourBand,
  location,
  locationStatus,
  mapZones,
  onEditCharacter,
  onZoneSelected,
  selectedZoneId,
  sessionState,
}: WalkViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<WalkSceneController | null>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [labelIds, setLabelIds] = useState<readonly string[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const zoneByStation = useMemo(() => {
    const byStation = new Map<string, MapZone>();
    for (const zone of mapZones) {
      byStation.set(zone.zone.stationId, zone);
    }
    return byStation;
  }, [mapZones]);

  /**
   * What the mount effect reads.
   *
   * Assigned during render on purpose. The effect below must run exactly once, because
   * mounting the scene a second time would fetch and decode the world again, so these
   * cannot be its dependencies, and a separate sync effect would run after it and leave
   * the first frame with nothing to draw.
   */
  const latest = useRef({ character, location, selectedZoneId, sessionState });
  latest.current = { character, location, selectedZoneId, sessionState };
  const zonesRef = useRef(mapZones);
  zonesRef.current = mapZones;

  const handleLabels = useCallback((labels: readonly WalkScreenLabel[]) => {
    for (const label of labels) {
      const node = labelRefs.current.get(label.stationId);
      if (node === undefined || node === null) continue;
      if (!label.onScreen) {
        node.hidden = true;
        continue;
      }
      node.hidden = false;
      // The second translate centres the label on its anchor, so the scene reports one
      // point and this does not have to know how wide the words turned out to be.
      node.style.transform = `translate3d(${label.xPx}px, ${label.yPx}px, 0) translate(-50%, -50%)`;
    }
    // The set of zones does not change while she walks, so this settles on the first
    // frame and reports no update again. Returning the previous array is React's bail-out.
    setLabelIds((previous) => {
      if (
        previous.length === labels.length &&
        previous.every((id, index) => id === labels[index]?.stationId)
      ) {
        return previous;
      }
      return labels.map((label) => label.stationId);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    let cancelled = false;
    let controller: WalkSceneController | null = null;

    void (async () => {
      try {
        const { mountWalkScene } = await import("../../../platform/walk/walkScene");
        if (cancelled) return;
        const view = latest.current;
        controller = await mountWalkScene(canvas, zonesRef.current, view.character, {
          onError: () => {
            if (!cancelled) setFailed(true);
          },
          onLabels: handleLabels,
          onWorldReady: () => {
            if (!cancelled) setReady(true);
          },
        });
        if (cancelled) {
          controller.destroy();
          controller = null;
          return;
        }
        controllerRef.current = controller;
        // The first state goes in here rather than from the effect below, which has
        // already run by the time this resolves.
        const current = latest.current;
        controller.update({
          location: current.location,
          selectedZoneId: current.selectedZoneId,
          sessionState: current.sessionState,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current = null;
      controller?.destroy();
    };
  }, [handleLabels]);

  useEffect(() => {
    controllerRef.current?.update({ location, selectedZoneId, sessionState });
  }, [location, selectedZoneId, sessionState]);

  useEffect(() => {
    // A no-op on mount: the scene took this character as an argument. It matters on the
    // return from the customiser, where it swaps the rig and leaves the world alone.
    controllerRef.current?.setCharacter(character);
  }, [character]);

  useEffect(() => {
    const onResize = () => controllerRef.current?.resize();
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, []);

  const denied =
    locationStatus === "PERMISSION_DENIED" ||
    locationStatus === "POSITION_UNAVAILABLE";
  const status = failed ? copy.walkOffline : ready ? null : copy.walkLoading;

  return (
    <div className="walk-view">
      <canvas aria-hidden="true" className="walk-view__canvas" ref={canvasRef} />

      <div className="walk-view__labels">
        {labelIds.map((stationId) => {
          const zone = zoneByStation.get(stationId);
          if (zone === undefined) return null;
          return (
            <button
              aria-label={formatCopy(
                copy.cdZone,
                zone.areaName,
                localizedRiskBand(
                  copy,
                  displayRiskLabel(displayRisk(zone.zone.riskScore, hourBand)),
                ),
              )}
              className="walk-view__label"
              key={stationId}
              onClick={() => onZoneSelected(stationId)}
              ref={(node) => {
                labelRefs.current.set(stationId, node);
              }}
              type="button"
            >
              {zone.areaName}
            </button>
          );
        })}
      </div>

      <div className="walk-view__top">
        {status === null ? null : (
          <p className="walk-view__status" role="status">
            {status}
          </p>
        )}
        <button className="walk-view__edit" onClick={onEditCharacter} type="button">
          {copy.walkEditCharacter}
        </button>
      </div>

      {denied ? (
        <p className="walk-view__notice" role="status">
          {copy.walkLocDenied}
        </p>
      ) : null}

      <section className="walk-view__legend">
        <SectionHeader className="walk-view__legend-title" level={2}>
          {copy.walkLegendTitle}
        </SectionHeader>
        <div aria-hidden="true" className="walk-view__ramp">
          {LEGEND_STOPS.map((hex) => (
            <span
              className="walk-view__ramp-stop"
              key={hex}
              style={{ background: hex }}
            />
          ))}
        </div>
        <div className="walk-view__legend-ends">
          <span>{copy.walkLegendLow}</span>
          <span>{copy.walkLegendHigh}</span>
        </div>
        <p className="walk-view__legend-note">{copy.walkRiskNote}</p>
      </section>

      <style jsx>{`
        .walk-view {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: var(--color-background);
          font-family: var(--font-family);
        }

        .walk-view__canvas {
          display: block;
          inline-size: 100%;
          block-size: 100%;
        }

        /* A positioning layer only: each label carries its own transform, written from
           the frame loop. Pointer events are off so a drag reaches the canvas through the
           gaps, and back on for the labels themselves. */
        .walk-view__labels {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .walk-view__label {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 0;
          margin: 0;
          max-inline-size: 140px;
          padding: var(--space-4) var(--space-8);
          border: 0;
          border-radius: var(--radius-small);
          appearance: none;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
          font-family: inherit;
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-caption-line-height);
          pointer-events: auto;
          animation: none;
          transition: none;
        }

        .walk-view__top {
          position: absolute;
          inset-block-start: var(--space-12);
          inset-inline: var(--screen-padding);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-8);
        }

        .walk-view__status {
          margin: 0;
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .walk-view__edit {
          display: inline-flex;
          align-items: center;
          min-block-size: var(--minimum-touch-target);
          margin-inline-start: auto;
          padding: var(--space-8) var(--space-12);
          border: 0;
          border-radius: var(--radius-control);
          appearance: none;
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
          font-family: inherit;
          font-size: var(--type-label-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-label-line-height);
          animation: none;
          transition: none;
        }

        .walk-view__notice {
          position: absolute;
          inset-block-start: 50%;
          inset-inline: var(--screen-padding);
          margin: 0;
          padding: var(--space-12);
          border-radius: var(--radius-small);
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
          font-size: var(--type-body-size);
          line-height: var(--type-body-line-height);
          text-align: center;
        }

        .walk-view__legend {
          position: absolute;
          inset-block-end: var(--space-20);
          inset-inline: var(--screen-padding);
          padding: var(--space-12);
          border-radius: var(--radius-small);
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
        }

        /* C11 supplies its own padding for a full-width section label; inside this card
           it is the second line of a heading block, so that padding comes back off. */
        .walk-view :global(.walk-view__legend-title) {
          padding-block: 0;
          margin-block-end: var(--space-8);
          color: var(--color-text-on-card);
        }

        .walk-view__ramp {
          display: flex;
          block-size: 8px;
          overflow: hidden;
          border-radius: var(--radius-small);
        }

        .walk-view__ramp-stop {
          flex: 1;
        }

        .walk-view__legend-ends {
          display: flex;
          justify-content: space-between;
          margin-block-start: var(--space-4);
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        .walk-view__legend-note {
          margin: var(--space-8) 0 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </div>
  );
}
