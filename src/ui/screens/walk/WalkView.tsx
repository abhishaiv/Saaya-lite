"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapZone } from "../../../data/repository/zoneRepository";
import { displayRisk, displayRiskLabel } from "../../../domain/engine/rules";
import type { HourBand, SessionState } from "../../../domain/model/session";
import { DeviceHeadingWatch } from "../../../platform/deviceHeading";
import type { LiveLocationFix, LocationStatus } from "../../../platform/locationWatch";
import type { CharacterSelection } from "../../../platform/walk/characterParts";
import {
  roadSignalRamp,
  roadSignalVariant,
  WALK_LEGEND_WIDTH_PX,
} from "../../../platform/walk/walkFacts";
import type {
  WalkSceneController,
  WalkScreenLabel,
  WalkScreenPin,
} from "../../../platform/walk/walkScene";
import {
  loadPlaces,
  PLACE_CATEGORIES,
  PLACES_ASSET_URL,
  type Place,
  type PlaceCategory,
  type Places,
} from "../../../platform/walk/walkPlaces";
import { SectionHeader } from "../../components/SectionHeader";
import { MaterialSymbol } from "../../icons/MaterialSymbol";
import { localizedRiskBand } from "../../copy/riskBandLabel";
import { formatCopy, type M4Copy, type SaayaLocale } from "../../copy/strings";
import {
  type LabelAnchor,
  type LabelBounds,
  type LabelBoxSize,
  type LabelRect,
  placeLabels,
} from "../../../domain/labels/labelPlacement";
import {
  HomeChrome,
  pinLabel,
  ZERO_CATEGORY_COUNTS,
} from "../home/HomeChrome";
import { PlaceSheet } from "../home/PlaceSheet";

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
  readonly locale?: SaayaLocale;
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
  /**
   * The home screen's place layer: the search pill, the category bar, the nav and the
   * pins. Absent on the onboarding mount, whose view carries no chrome at all - the
   * chrome is opt-in, never inherited.
   */
  readonly showPlaces?: boolean;
}

/**
 * The ramp the bands are cut from, low to high.
 *
 * Amended 2026-09-23 by the violet ruling. The clause this replaced - the ramp was the
 * ground plus "the flat map's tier colours" - is superseded: the ramp retires from roads,
 * and the three stops above the ground are now the signal at a third, two thirds and the
 * whole of its strength, cut by `walkFacts.roadSignalRamp` from the same values the map
 * draws with. What was ever true of the ramp is kept: it is the picture the shading is
 * made of, and its low end is the ground colour rather than a fourth band, because
 * `bandColorForRisk` returns nothing below the low threshold and a quiet area is drawn
 * unshaded - the legend says "fewer records" at that end, which is the same statement.
 * It is `color.walk.ground` and not the flat map's `color.tile.land`: the walk view draws
 * its own land, and a legend whose low swatch is a colour that appears nowhere in the view
 * is a legend describing a different picture.
 *
 * The variant is the one the world is being drawn in (`?roads=a|b` on the preview), so
 * the chip and the map cannot show different readings.
 */
const LEGEND_STOPS: readonly string[] = roadSignalRamp(roadSignalVariant());

/** How far inside the frame a zone name is kept. `--screen-padding`, read as a number. */
const LABEL_FRAME_INSET_PX = 20; // GROUNDED-EXEMPT: structural frame inset, the pixel value of --screen-padding.

/** The gap between two zone names that had to be stacked. `--space-4`, read as a number. */
const LABEL_GAP_PX = 4; // GROUNDED-EXEMPT: structural label gap, the pixel value of --space-4.

/**
 * A place pill's node key. Pills and zone names share the one ref map and the one size
 * map, and the prefix is what keeps a place id from ever colliding with a station id.
 */
function pinKey(placeId: string): string {
  return `place:${placeId}`;
}

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
  locale = "en",
  location,
  locationStatus,
  mapZones,
  onZoneSelected,
  onWorldSettled,
  selectedZoneId,
  sessionState,
  showPlaces = false,
}: WalkViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<WalkSceneController | null>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [labelIds, setLabelIds] = useState<readonly string[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // --- the place layer. The bake's file is fetched once per chrome mount; a failure
  // leaves her with no pins, no bar and no invented copy for them - the nav and the
  // search pill still stand, and the map still works.
  const [places, setPlaces] = useState<Places | null>(null);
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);
  const [sheetPlace, setSheetPlace] = useState<Place | null>(null);
  const [pinIds, setPinIds] = useState<readonly string[]>([]);
  // The legend opens folded to its ramp. Founder instruction, 2026-09-23, second pass:
  // "make the street shading bar collapsible or something, because it is taking too much
  // space". The note that stood here read "It still opens with its derivation sentence
  // showing ... hiding the statement by default is not" and is superseded - the fold was
  // already there, but it shipped open, and an open card is 154px of street she cannot
  // see. FEATURES.md Amendment 1 clause 1 still binds and is unchanged: the view states
  // that per-road risk comes from zone data, one tap away on the control that owns the
  // ramp, its expanded state announced through aria-expanded. Recorded in SCREENS.md S14
  // and MAP_SPEC.md.
  const [legendOpen, setLegendOpen] = useState(false);

  const zoneByStation = useMemo(() => {
    const byStation = new Map<string, MapZone>();
    for (const zone of mapZones) {
      byStation.set(zone.zone.stationId, zone);
    }
    return byStation;
  }, [mapZones]);

  /** Every place the pins and the sheet read, keyed by the id the scene reports. */
  const placesById = useMemo(() => {
    const byId = new Map<string, Place>();
    for (const place of places?.places ?? []) byId.set(place.id, place);
    return byId;
  }, [places]);

  /**
   * The rows handed to the scene: the bake's own seven categories only.
   *
   * The bake maps OSM tags onto that vocabulary and the counts the bar reads come from
   * the same file, so a row outside it is a row the product has no name for. Dropping it
   * here is the honest reading of "a category with zero places never renders": a pin
   * whose category the bar cannot name is a pin nothing can filter to.
   */
  const pinPlaces = useMemo(() => {
    if (places === null) return [];
    const vocabulary: readonly string[] = PLACE_CATEGORIES;
    return places.places.filter((place) => vocabulary.includes(place.cat));
  }, [places]);

  /** The carded areas as outlines, for the sheet's area row. */
  const areaOutlines = useMemo(
    () =>
      mapZones.map((zone) => ({
        areaName: zone.areaName,
        polygon: zone.zone.polygon,
      })),
    [mapZones],
  );

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
  // The same reason again: the mount effect reads both once, at mount.
  const showPlacesRef = useRef(showPlaces);
  showPlacesRef.current = showPlaces;
  const pinsRef = useRef({ category: activeCategory, places: pinPlaces });
  pinsRef.current = { category: activeCategory, places: pinPlaces };

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
  // Keyed by overlay key rather than by element, because the nearest-N set churns: a pill
  // that leaves the frame unmounts, and its entry has to be able to leave with it.
  const lastTransforms = useRef(new Map<string, string>());
  /** A node that unmounts takes every trace of itself out of the three maps. */
  const forgetOverlay = useCallback((key: string) => {
    labelRefs.current.delete(key);
    labelSizes.current.delete(key);
    lastTransforms.current.delete(key);
  }, []);
  // Both overlay sets as the last frame reported them. The scene hands over arrays it
  // owns and reuses, so each is copied on arrival and read from here, never retained.
  const labelSnapshot = useRef<readonly WalkScreenLabel[]>([]);
  const pinSnapshot = useRef<readonly WalkScreenPin[]>([]);

  /**
   * The chrome's own boxes over the frame, which no name may be placed on.
   *
   * Measured rather than derived: the search pill, the category bar, the nav, the legend
   * and the status line are five rows whose heights come from tokens and whose widths come
   * from their own words, and the placement pass only needs the boxes. Measuring inside the
   * frame callback would be a reflow per frame, which is the cost this view exists to
   * avoid, so they are measured when they can change - a resize, the legend opening, the
   * places arriving - and read from here on every pass.
   */
  const chromeRects = useRef<readonly LabelRect[]>([]);
  const measureChrome = useCallback(() => {
    const frame = canvasRef.current?.parentElement ?? null;
    if (frame === null) return;
    const base = frame.getBoundingClientRect();
    // Measured from the screen, not from the frame: the safety dock and the two rails are
    // Home's own and stand outside this view, and a pill under the dock is a pill over SOS.
    // Their boxes come back in the frame's pixels, which is what the pass works in.
    const screen = frame.closest(".home-screen") ?? frame;
    const rows: readonly string[] = [
      ".home-chrome__search",
      ".home-chrome__categories",
      ".home-chrome__nav",
      ".walk-view__legend",
      ".walk-view__status",
      ".home-session-action-dock",
      ".home-screen__top-rail",
      ".home-screen__controls",
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
    chromeRects.current = rects;
  }, []);

  useEffect(() => {
    measureChrome();
    const onResize = (): void => measureChrome();
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, [measureChrome, legendOpen, showPlaces, places]);

  /**
   * Place both kinds of overlay in one pass.
   *
   * Zone names and place pills share one collision solver, so a pill can never land under
   * a name - the two are placed as one list, zone names first, and the solver keeps them
   * apart. It runs when either set arrives, reading the other's last report, because the
   * scene reports them in the same frame but as two calls.
   *
   * Everything here is written straight to the DOM: a pill moves every frame she walks,
   * and re-rendering around it sixty times a second is not a cost this view charges.
   */
  const placeOverlays = useCallback(() => {
    const frame = canvasRef.current;
    let bounds = boundsRef.current;
    if (bounds === null) {
      const widthPx = frame?.clientWidth ?? 0;
      const heightPx = frame?.clientHeight ?? 0;
      bounds = { heightPx, insetPx: LABEL_FRAME_INSET_PX, widthPx };
      // A zero box means the canvas has not been laid out yet, so it is not worth keeping.
      if (widthPx !== 0 && heightPx !== 0) boundsRef.current = bounds;
    }

    const keys: string[] = [];
    const anchors: LabelAnchor[] = [];
    const sizes: LabelBoxSize[] = [];
    const nodes: HTMLButtonElement[] = [];
    const collect = (
      key: string,
      onScreen: boolean,
      xPx: number,
      yPx: number,
    ): void => {
      const node = labelRefs.current.get(key);
      if (node === undefined || node === null) return;
      if (!onScreen) {
        node.hidden = true;
        return;
      }
      node.hidden = false;
      let size = labelSizes.current.get(key);
      if (size === undefined || size.widthPx === 0 || size.heightPx === 0) {
        // Visible before it is measured, or the box comes back zero.
        size = { heightPx: node.offsetHeight, widthPx: node.offsetWidth };
        labelSizes.current.set(key, size);
      }
      keys.push(key);
      anchors.push({ xPx, yPx });
      sizes.push(size);
      nodes.push(node);
    };

    for (const label of labelSnapshot.current) {
      collect(label.stationId, label.onScreen, label.xPx, label.yPx);
    }
    for (const pin of pinSnapshot.current) {
      collect(pinKey(pin.placeId), pin.onScreen, pin.xPx, pin.yPx);
    }

    const placed = placeLabels(
      anchors,
      sizes,
      bounds,
      LABEL_GAP_PX,
      chromeRects.current,
    );
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const key = keys[index];
      const spot = placed[index];
      if (node === undefined || key === undefined || spot === undefined) continue;
      // The second translate centres the label on the spot, so placement works in centres
      // and never has to know how wide the words turned out to be.
      const transform = `translate3d(${spot.xPx}px, ${spot.yPx}px, 0) translate(-50%, -50%)`;
      if (lastTransforms.current.get(key) === transform) continue;
      lastTransforms.current.set(key, transform);
      node.style.transform = transform;
    }
  }, []);

  const handleLabels = useCallback(
    (labels: readonly WalkScreenLabel[]) => {
      labelSnapshot.current = labels.slice();
      placeOverlays();
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
    },
    [placeOverlays],
  );

  const handlePins = useCallback(
    (pins: readonly WalkScreenPin[]) => {
      pinSnapshot.current = pins.slice();
      placeOverlays();
      // The nearest-N set changes as she walks, far slower than the frame: this reports an
      // update when the dozen changes and bails out on every frame between those.
      setPinIds((previous) => {
        if (
          previous.length === pins.length &&
          previous.every((id, index) => id === pins[index]?.placeId)
        ) {
          return previous;
        }
        return pins.map((pin) => pin.placeId);
      });
    },
    [placeOverlays],
  );

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
          // The place layer's frame report is only subscribed when the chrome is on.
          // The onboarding mount has no pins, so it pays for no pin projection at all.
          ...(showPlacesRef.current ? { onPins: handlePins } : {}),
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
        // Same again for the pins: the places effect has already run by now, so the
        // first set the scene holds is the one read here.
        const pins = pinsRef.current;
        controller.setPins(pins.places, pins.category);
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
  }, [handleLabels, handlePins]);

  useEffect(() => {
    controllerRef.current?.update({ location, selectedZoneId, sessionState });
  }, [location, selectedZoneId, sessionState]);

  useEffect(() => {
    if (!showPlaces) return undefined;
    let cancelled = false;
    // The bake's own file, fetched once. A failure here is not a failure of the view:
    // she keeps the street, the nav and the search pill, and simply gets no pins and no
    // category bar. Nothing stands in for the missing places, because nothing could.
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
  }, [showPlaces]);

  useEffect(() => {
    // A no-op on mount: the scene took the first set as part of the mount handshake.
    controllerRef.current?.setPins(pinPlaces, activeCategory);
  }, [pinPlaces, activeCategory]);

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
    <div className="walk-view" data-chrome={showPlaces ? "true" : undefined}>
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
                if (node === null) forgetOverlay(stationId);
              }}
              type="button"
            >
              {zone.areaName}
            </button>
          );
        })}
        {pinIds.map((placeId) => {
          const place = placesById.get(placeId);
          if (place === undefined) return null;
          const key = pinKey(placeId);
          return (
            <button
              className="walk-view__pin"
              key={key}
              onClick={() => setSheetPlace(place)}
              ref={(node) => {
                labelRefs.current.set(key, node);
                // The nearest-N set churns as she walks, and each pill that leaves
                // unmounts: its measurements leave with it, so the maps hold the pills
                // on screen and nothing else. The next pill to arrive measures itself.
                if (node === null) {
                  forgetOverlay(key);
                } else {
                  // React commits a pill between frames, and the placement pass runs in
                  // the frame after: hidden until then, so it cannot paint a frame at the
                  // container's own corner before it has a place in the world.
                  node.hidden = true;
                }
              }}
              type="button"
            >
              <span aria-hidden="true" className="walk-view__pin-dot" />
              <span className="walk-view__pin-name">{pinLabel(place, copy)}</span>
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

      {showPlaces ? (
        <HomeChrome
          activeCategory={activeCategory}
          categoryCounts={places?.categoryCounts ?? ZERO_CATEGORY_COUNTS}
          copy={copy}
          onCategoryChange={setActiveCategory}
        />
      ) : null}

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

      <style jsx>{`
        .walk-view {
          /* The right edge of the frame belongs to the home screen's own rail - the
             settings button at the top, the control stack at the bottom - which is a fixed
             48 px column at --screen-padding, and stays put whichever view is showing. This
             view owns the whole frame, so its own chrome has to stop short of that column
             or the rail lands on top of it. Measured before this: the legend's last line ran
             under the control stack and "Change your character" was cut to "Change your
             cha". One clearance, held by this view's top row; the legend is anchored to the
             left edge now, so it is the only row that needs it.

             * Amended 2026-09-23: the number is --home-rail now, declared by the home screen
             that owns both rails, because the flat map's chrome stops short of the same
             column. The declaration that stood here read
             "--walk-view-rail: calc(var(--minimum-touch-target) + var(--space-8))" and is
             superseded - same value, one owner. */

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

        /* A place pill: the small white pill the map language calls for, its violet dot
           the accent that says shopfront. The width cap matches the zone pills' own, so
           the two kinds of pill over the street read as one family. One line, capped at
           that width: a shopfront with a long name truncates here and says its whole name
           in the sheet it opens, rather than growing into a taller box that covers the
           street it names. */
        .walk-view__pin {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 0;
          display: inline-flex;
          align-items: center;
          gap: var(--space-4);
          margin: 0;
          max-inline-size: 140px;
          white-space: nowrap;
          padding: var(--space-4) var(--space-8);
          border: 0;
          border-radius: var(--radius-small);
          appearance: none;
          background: var(--color-text-primary);
          color: var(--color-background);
          font-family: inherit;
          font-size: var(--type-caption-size);
          font-weight: var(--weight-semibold);
          line-height: var(--type-caption-line-height);
          pointer-events: auto;
          animation: none;
          transition: none;
        }

        /* The pill paints small - it is a mark over the street, not a button in a row -
           so the finger gets the product's own target as an expansion rather than by
           growing the mark. DESIGN_SYSTEM.md: "Minimum touch target 48 x 48 px, no
           exceptions", and the interface's own chips read the same rule: pad the touch
           target, do not grow the visual. The percentage is the pill's own painted box,
           because a positioned element's percentages resolve against its own padding box. */
        .walk-view__pin::after {
          content: "";
          position: absolute;
          inset-block: calc((var(--minimum-touch-target) - 100%) / -2);
          inset-inline: calc(var(--space-8) * -1);
        }

        /* A pill the pass has put off screen is marked hidden, and this is what takes it
           out of the frame: the rule above declares its own display, which outranks the
           user agent's hidden rule, so without this it would paint at the corner. */
        .walk-view__pin[hidden] {
          display: none;
        }

        /* The name is its own box so the cap above truncates it: a flex child will not go
           under its own content width without min-inline-size. */
        .walk-view__pin-name {
          min-inline-size: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .walk-view__pin-dot {
          flex: none;
          inline-size: var(--space-4);
          block-size: var(--space-4);
          border-radius: var(--radius-small);
          background: var(--color-brand);
        }

        /* Amended 2026-09-23: the search pill holds the top-left corner now, in both
           views, so this reading sits below the pill rather than below the brand lockup
           that stood there until the founder removed it ("Remove the Saaya logo from the
           top"), and clears the notch the same way. */
        .walk-view__status {
          position: absolute;
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12) +
              var(--minimum-touch-target) + var(--space-8)
          );
          inset-inline: var(--screen-padding) calc(var(--screen-padding) + var(--home-rail));
          margin: 0;
          color: var(--color-text-tertiary);
          font-size: var(--type-caption-size);
          line-height: var(--type-caption-line-height);
        }

        /* With the place layer on, the search pill holds the band this reading used to sit
           in - the pill is read before the status, and the two may not overlap - so the
           reading moves one band down, with the same gap the lockup gives it above. */
        .walk-view[data-chrome="true"] .walk-view__status {
          inset-block-start: calc(
            env(safe-area-inset-top) + var(--space-12) +
              var(--minimum-touch-target) + var(--space-8) +
              var(--minimum-touch-target) + var(--space-8)
          );
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
         * is a chip in the bottom-left corner. It lands folded - title, ramp and both ends -
         * and one tap on it opens the derivation sentence. Second founder pass the same day
         * ("make the street shading bar collapsible or something, because it is taking too
         * much space") is what moved the default from open to folded. SCREENS.md S14 carries
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
