"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapZone } from "../../../data/repository/zoneRepository";
import { displayRisk, displayRiskLabel } from "../../../domain/engine/rules";
import type { HourBand, SessionState } from "../../../domain/model/session";
import { DeviceHeadingWatch } from "../../../platform/deviceHeading";
import type { LiveLocationFix, LocationStatus } from "../../../platform/locationWatch";
import type { CharacterSelection } from "../../../platform/walk/characterParts";
import {
  COLOR_WALK_GROUND,
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
  COLOR_ZONE_MODERATE,
  WALK_LEGEND_WIDTH_PX,
} from "../../../platform/walk/walkFacts";
import type {
  WalkSceneController,
  WalkScreenLabel,
} from "../../../platform/walk/walkScene";
import { SectionHeader } from "../../components/SectionHeader";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import { localizedRiskBand } from "../../copy/riskBandLabel";
import { formatCopy, type M4Copy } from "../../copy/strings";
import {
  type LabelAnchor,
  type LabelBounds,
  type LabelBoxSize,
  placeLabels,
} from "./labelPlacement";

export interface WalkViewProps {
  readonly character: CharacterSelection;
  readonly copy: M4Copy;
  /**
   * Whether the device's compass may be read, which is the answer to the permission ask
   * taken on the tap that opened this view. `false` is not a failure: the view then draws
   * the recorded camera, which is the frame the composition facts were solved for.
   */
  readonly headingAllowed: boolean;
  readonly hourBand: HourBand;
  readonly location: LiveLocationFix | null;
  readonly locationStatus: LocationStatus;
  readonly mapZones: readonly MapZone[];
  readonly onZoneSelected: (stationId: string) => void;
  /**
   * Whether the world became drawable or gave up, reported once. Optional: the home
   * screen's view says so in its own status line, and onboarding holds a loading moment
   * on this instead, because its loading moment is a full screen of its own.
   */
  readonly onWorldSettled?: (outcome: "ready" | "failed") => void;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
}

/**
 * The ramp the bands are cut from, low to high.
 *
 * The low end is the ground colour rather than a fourth band, because that is what the
 * world does with it: `bandColorForRisk` returns nothing below the low threshold, so a
 * quiet area is drawn unshaded. The legend says "fewer records" at that end, which is the
 * same statement.
 *
 * It is `color.walk.ground` and not the flat map's `color.tile.land`. The walk view draws
 * its own land, and a legend whose low swatch is a colour that appears nowhere in the view
 * is a legend describing a different picture. Amended 2026-09-22 with the palette.
 */
const LEGEND_STOPS: readonly string[] = [
  COLOR_WALK_GROUND,
  COLOR_ZONE_MODERATE,
  COLOR_ZONE_ELEVATED,
  COLOR_ZONE_HIGH,
];

/** How far inside the frame a zone name is kept. `--screen-padding`, read as a number. */
const LABEL_FRAME_INSET_PX = 20; // GROUNDED-EXEMPT: structural frame inset, the pixel value of --screen-padding.

/** The gap between two zone names that had to be stacked. `--space-4`, read as a number. */
const LABEL_GAP_PX = 4; // GROUNDED-EXEMPT: structural label gap, the pixel value of --space-4.

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
  headingAllowed,
  hourBand,
  location,
  locationStatus,
  mapZones,
  onZoneSelected,
  onWorldSettled,
  selectedZoneId,
  sessionState,
}: WalkViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<WalkSceneController | null>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [labelIds, setLabelIds] = useState<readonly string[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The legend renders whole and can be folded to its ramp. Founder instruction,
  // 2026-09-23: the card was covering the map she came to look at, so it is a chip now.
  // It still opens with its derivation sentence showing, because FEATURES.md Amendment 1
  // clause 1 requires the view to *state* that per-road risk comes from zone data rather
  // than imply it, and a sentence behind a tap states it only on request. The fold is the
  // answer to the space complaint; hiding the statement by default is not. Recorded in
  // SCREENS.md S14 and MAP_SPEC.md.
  const [legendOpen, setLegendOpen] = useState(true);

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
  // The mount effect runs exactly once, so it reads the callback through a ref for the
  // same reason it reads the character through one.
  const settledRef = useRef(onWorldSettled);
  settledRef.current = onWorldSettled;

  /**
   * Each label's own box, measured once.
   *
   * `offsetWidth` costs a layout flush, and this runs inside the scene's frame callback - so
   * measuring every name every frame would charge her phone a reflow per name per frame for
   * a number that only changes when the text does, which is never. The first sighting of a
   * node measures it; after that the size is read back.
   */
  const labelSizes = useRef(new Map<string, LabelBoxSize>());
  // The canvas box, kept rather than read. `clientWidth` inside the scene's frame callback
  // is a layout read, and it returns the same number on every frame that is not a resize.
  const boundsRef = useRef<LabelBounds | null>(null);
  // The transform last written to each node, so a frame that moved nothing writes nothing.
  const lastTransforms = useRef(new Map<HTMLButtonElement, string>());

  const handleLabels = useCallback((labels: readonly WalkScreenLabel[]) => {
    const frame = canvasRef.current;
    let bounds = boundsRef.current;
    if (bounds === null) {
      const widthPx = frame?.clientWidth ?? 0;
      const heightPx = frame?.clientHeight ?? 0;
      bounds = { heightPx, insetPx: LABEL_FRAME_INSET_PX, widthPx };
      // A zero box means the canvas has not been laid out yet, so it is not worth keeping.
      if (widthPx !== 0 && heightPx !== 0) boundsRef.current = bounds;
    }

    const anchors: LabelAnchor[] = [];
    const sizes: LabelBoxSize[] = [];
    const nodes: HTMLButtonElement[] = [];
    for (const label of labels) {
      const node = labelRefs.current.get(label.stationId);
      if (node === undefined || node === null) continue;
      if (!label.onScreen) {
        node.hidden = true;
        continue;
      }
      node.hidden = false;
      let size = labelSizes.current.get(label.stationId);
      if (size === undefined || size.widthPx === 0 || size.heightPx === 0) {
        // Visible before it is measured, or the box comes back zero.
        size = { heightPx: node.offsetHeight, widthPx: node.offsetWidth };
        labelSizes.current.set(label.stationId, size);
      }
      anchors.push({ xPx: label.xPx, yPx: label.yPx });
      sizes.push(size);
      nodes.push(node);
    }

    const placed = placeLabels(anchors, sizes, bounds, LABEL_GAP_PX);
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const spot = placed[index];
      if (node === undefined || spot === undefined) continue;
      // The second translate centres the label on the spot, so placement works in centres
      // and never has to know how wide the words turned out to be.
      const transform = `translate3d(${spot.xPx}px, ${spot.yPx}px, 0) translate(-50%, -50%)`;
      if (lastTransforms.current.get(node) === transform) continue;
      lastTransforms.current.set(node, transform);
      node.style.transform = transform;
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
            if (cancelled) return;
            setFailed(true);
            settledRef.current?.("failed");
          },
          onLabels: handleLabels,
          onWorldReady: () => {
            if (cancelled) return;
            setReady(true);
            settledRef.current?.("ready");
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
        if (cancelled) return;
        setFailed(true);
        settledRef.current?.("failed");
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
    if (!headingAllowed) return undefined;
    // Her heading goes straight to the scene instead of through React state. A compass
    // fires at the sensor's own rate - sixty-odd readings a second on a good phone - and
    // re-rendering the sheet around the canvas at that rate is the one cost this view
    // exists to avoid, which is why the zone labels are written to the DOM directly too.
    // The scene eases each reading over the product's own 400 ms.
    const watch = new DeviceHeadingWatch((reading) => {
      controllerRef.current?.setHeading(reading.degrees);
    });
    watch.start();
    return () => watch.stop();
  }, [headingAllowed]);

  useEffect(() => {
    const onResize = () => {
      boundsRef.current = null;
      controllerRef.current?.resize();
    };
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

      {status === null ? null : (
        <p className="walk-view__status" role="status">
          {status}
        </p>
      )}

      {denied ? (
        <p className="walk-view__notice" role="status">
          {copy.walkLocDenied}
        </p>
      ) : null}

      <WalkLegend
        copy={copy}
        onToggle={() => setLegendOpen((open) => !open)}
        open={legendOpen}
      />

      <style jsx>{`
        .walk-view {
          /* The right edge of the frame belongs to the home screen's own rail - the
             settings button at the top, the control stack at the bottom - which is a fixed
             48 px column at --screen-padding, and stays put whichever view is showing. This
             view owns the whole frame, so its own chrome has to stop short of that column
             or the rail lands on top of it. Measured before this: the legend's last line ran
             under the control stack and "Change your character" was cut to "Change your
             cha". One clearance, held by this view's top row; the legend is anchored to the
             left edge now, so it is the only row that needs it. */
          --walk-view-rail: calc(var(--minimum-touch-target) + var(--space-8));

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

        /* The brand lockup holds the top-left corner in every view, so this reading sits
           below it rather than beside it, and clears the notch the way the lockup does. */
        .walk-view__status {
          position: absolute;
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12) +
              var(--minimum-touch-target) + var(--space-8)
          );
          inset-inline: var(--screen-padding) calc(var(--screen-padding) + var(--walk-view-rail));
          margin: 0;
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
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

      `}</style>
    </div>
  );
}

export type WalkLegendProps = Readonly<{
  readonly copy: M4Copy;
  readonly onToggle: () => void;
  readonly open: boolean;
}>;

/**
 * The street-shading reading: the ramp and both of its ends always, the derivation on a tap.
 *
 * A separate component so both of its states can be rendered and checked directly - the
 * test suite runs in node with no DOM, so a chip whose second state only exists after a
 * click is a state nothing can assert.
 */
export function WalkLegend({ copy, onToggle, open }: WalkLegendProps) {
  return (
    <section className="walk-view__legend" data-expanded={open || undefined}>
      <button
        aria-expanded={open}
        className="walk-view__legend-summary"
        onClick={onToggle}
        type="button"
      >
        <SectionHeader className="walk-view__legend-title" level={2}>
          {copy.walkLegendTitle}
        </SectionHeader>
        <span aria-hidden="true" className="walk-view__legend-chevron">
          <MaterialSymbol decorative fill="utility" name="chevron_right" size={16} />
        </span>
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
      </button>
      {open ? (
        <p className="walk-view__legend-note">{copy.walkRiskNote}</p>
      ) : null}

      <style jsx>{`
        /* Clears the action dock rather than sitting under it. --home-action-dock-clearance
         * is the space the dock occupies, declared on .home-screen and inherited here, so
         * the card clears it by the same margin the right-edge control stack does and the
         * two line up. The capture's own numbers are in MAP_SPEC.md.
         *
         * Compacted 2026-09-23 on founder instruction ("taking up all the space"): the card
         * is now a chip in the bottom-left corner. It renders whole - title, ramp, both ends
         * and the derivation sentence - and folds to the ramp on a tap, so the streets can be
         * cleared without the statement ever being hidden by default. SCREENS.md S14 carries
         * the amendment, and the width is walk.legend.width rather than a literal. */
        .walk-view__legend {
          position: absolute;
          inset-block-end: var(--home-action-dock-clearance);
          inset-inline-start: var(--screen-padding);
          inline-size: ${WALK_LEGEND_WIDTH_PX}px;
          padding: var(--space-12);
          border-radius: var(--radius-control);
          background: rgb(from var(--color-card-fill) r g b / 0.92);
          color: var(--color-text-on-card);
        }

        /* The whole chip is the control: one tap folds the sentence away, one brings it
           back. The ramp and both ends never move. */
        .walk-view__legend-summary {
          display: grid;
          inline-size: 100%;
          padding: 0;
          border: 0;
          appearance: none;
          background: none;
          color: inherit;
          font: inherit;
          grid-template-columns: minmax(0, 1fr) auto;
          row-gap: var(--space-4);
          text-align: start;
        }

        .walk-view__legend-chevron {
          display: inline-flex;
          align-items: center;
          color: var(--color-text-secondary);
        }

        .walk-view__legend[data-expanded] .walk-view__legend-chevron {
          transform: rotate(90deg);
        }

        /* C11 supplies its own padding for a full-width section label; inside this chip it
           is the heading of a control, so that padding comes back off. */
        .walk-view__legend :global(.walk-view__legend-title) {
          padding-block: 0;
          margin: 0;
          color: var(--color-text-on-card);
        }

        .walk-view__ramp {
          display: flex;
          block-size: 8px;
          overflow: hidden;
          border-radius: var(--radius-small);
          grid-column: 1 / -1;
        }

        .walk-view__ramp-stop {
          flex: 1;
        }

        .walk-view__legend-ends {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          grid-column: 1 / -1;
          line-height: var(--type-caption-line-height);
        }

        .walk-view__legend-note {
          margin: var(--space-8) 0 0;
          color: var(--color-text-secondary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }
      `}</style>
    </section>
  );
}
