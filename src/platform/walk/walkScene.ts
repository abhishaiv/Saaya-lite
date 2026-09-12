/**
 * The walk view's renderer, camera and loop.
 *
 * `MAP_SPEC.md`: the walk view is "a second view, not a second product", and this file
 * is where that could stop being true. It draws the same 19 zones, from the same
 * `mapZones` the flat map draws; it reads her position from the same `LiveLocationFix`;
 * and it holds no product state of its own. It owns a canvas, a camera, a resident tile
 * window and a character, and nothing else.
 *
 * `MOTION_SPEC.md` excepts exactly one thing from the product's "CSS transitions and
 * nothing else" rule, and it is this: a `requestAnimationFrame` loop that redraws the
 * 3D world. It is not a spring solver. Nothing here integrates physics, damps anything,
 * or uses an animation library; the only easing is a plain exponential lerp on the
 * frame clock.
 *
 * `three` is imported here and in this directory only. `MAP_SPEC.md`: "Do not import
 * `three` from `src/ui/`."
 */

import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { MapZone } from "../../data/repository/zoneRepository";
import type { SessionState } from "../../domain/model/session";
import type { LiveLocationFix } from "../locationWatch";
import { loadCharacter, type CharacterRig } from "./walkCharacter";
import type { CharacterSelection } from "./characterParts";
import {
  COLOR_BACKGROUND,
  FRAME_BUDGET_MS,
  TARGET_FPS,
  WALK_CAMERA_DIST_M,
  WALK_CAMERA_FOV_DEG,
  WALK_CAMERA_PITCH_DEG,
  WALK_CHARACTER_HEIGHT_M,
} from "./walkFacts";
import { layerHeight } from "./walkGeometry";
import {
  toGround,
  toTile,
  tileKeyOf,
  type GroundPoint,
  type TileId,
  type WorldMeta,
} from "./walkProjection";
import {
  buildTileMeshes,
  createTileMaterials,
  decodeTile,
  disposeGroup,
  disposeTileMaterials,
} from "./walkTiles";
import { buildZoneLayer, type ZoneLayer } from "./walkZones";
import { loadWalkWorld, WORLD_ASSET_URL, type WalkWorld } from "./walkWorld";

const MILLISECONDS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI unit conversion, not a product value.
const HALF = 2; // GROUNDED-EXEMPT: a divisor. Half of a stated value is still half of it.
const DEGREES_TO_RADIANS = Math.PI / 180; // GROUNDED-EXEMPT: unit conversion, not a product value.
const QUARTER_TURN = Math.PI / 2; // GROUNDED-EXEMPT: laying the ground plane flat, a quarter turn.
const FULL_TURN = Math.PI * 2; // GROUNDED-EXEMPT: wrapping a heading to the shorter arc.
const NDC_SPAN = 2; // GROUNDED-EXEMPT: normalising a coordinate into [0, 1] needs the span of both ends.

/**
 * The product's own frame rate, as a budget in milliseconds.
 *
 * Derived from `perf.fps` rather than written down, so the frame guard cannot disagree
 * with the fact it is enforcing.
 */
const TARGET_FRAME_MS = MILLISECONDS_PER_SECOND / TARGET_FPS;

/**
 * How long she takes to ease onto a new fix. Fact: `motion.400ms`.
 *
 * The same 400 ms the flat map uses for its own camera move, reused rather than
 * re-chosen: `MAP_SPEC.md` says GPS "arrives at intervals, so the character eases
 * between fixes", and `MOTION_SPEC.md` allows "a plain lerp on the clock, not a solver".
 */
const POSITION_EASE_MS = 400; // fact: motion.400ms
const POSITION_EASE_SEC = POSITION_EASE_MS / MILLISECONDS_PER_SECOND;

/**
 * Her tile plus this many rings around it. `MAP_SPEC.md`, Streaming: "her tile plus the
 * 2-tile ring around it". The ladder below drops this first.
 */
const RESIDENT_RING = 2; // GROUNDED-EXEMPT: the spec states the window in prose, not as a fact.

/** `MAP_SPEC.md`, Streaming: "never more than one tile decoded per frame". */
const TILES_PER_FRAME = 1; // GROUNDED-EXEMPT: the spec states the decode budget in prose, not as a fact.

const TILE_TIMEOUT_SEC = 4; // fact: map.tile.timeout

/**
 * How long a tile that has left the window may stay resident.
 *
 * `MAP_SPEC.md`: "Drop anything outside it, with a short grace period so a boundary walk
 * does not thrash." The spec does not state a length, so this reuses the flat map's own
 * tile timeout rather than inventing a second number for the same idea.
 */
const TILE_GRACE_MS = TILE_TIMEOUT_SEC * MILLISECONDS_PER_SECOND;

/**
 * A cap on the drawing buffer's scale. Uncapped, a 3x-DPR phone would shade nine times
 * the pixels for no legibility the 3D view can use.
 */
const MAX_PIXEL_RATIO = 2; // GROUNDED-EXEMPT: a rendering cost ceiling, not a product value.

/**
 * The near plane.
 *
 * Small, so that nothing she can walk past is clipped: the camera sits `walk.camera.dist`
 * away, and a tall building beside her comes close to it. The far plane is not a
 * constant — it is set from the ground plane's own size, so it always covers the window
 * and never more.
 */
const NEAR_M = 0.5; // GROUNDED-EXEMPT: a depth buffer range, not a product value.

/**
 * The far plane before the world's meta arrives, when nothing but the clear colour is
 * drawn. Replaced by `applyCamera` on the first frame that has a tile size to measure.
 */
const PLACEHOLDER_FAR_M = 1; // GROUNDED-EXEMPT: a placeholder for a value the world's meta supplies.

/**
 * The fixed degradation ladder. `MAP_SPEC.md`: "draw distance drops first, then tile
 * detail, then ambient motion. The risk bands and her position never degrade."
 *
 * The order is the ladder, top to bottom. Nothing here changes what a risk band or her
 * position looks like: `ring` and `detail` control scenery, and `buildTileMeshes` never
 * drops roads whatever `detail` says.
 *
 * The last step is honest about being a no-op on the world and real on her. No ambient
 * scenery motion was authored (no bob, no sway, no props), so the only ambient motion
 * the view has is her walk cycle, and `ambient: false` stops the mixers advancing. That
 * is the same lever `MOTION_SPEC.md` pulls for reduced motion.
 */
interface QualityStep {
  readonly ring: number;
  readonly detail: boolean;
  readonly ambient: boolean;
}

const QUALITY_LADDER: readonly QualityStep[] = [
  { ring: RESIDENT_RING, detail: true, ambient: true },
  { ring: RESIDENT_RING - 1, detail: true, ambient: true },
  { ring: RESIDENT_RING - 2, detail: true, ambient: true },
  { ring: RESIDENT_RING - 2, detail: false, ambient: true },
  { ring: RESIDENT_RING - 2, detail: false, ambient: false },
];

/** A zone label, positioned on the screen. */
export interface WalkScreenLabel {
  readonly stationId: string;
  readonly xPx: number;
  readonly yPx: number;
  /** False when the anchor is outside the frustum, so the label can be hidden. */
  readonly onScreen: boolean;
}

export interface WalkSceneView {
  readonly location: LiveLocationFix | null;
  readonly selectedZoneId: string | null;
  readonly sessionState: SessionState;
}

export interface WalkSceneCallbacks {
  /**
   * Called once per rendered frame with a **reused** array.
   *
   * Labels move every frame while she walks, so a fresh array per frame would allocate
   * and churn React state 60 times a second. The consumer must read this synchronously
   * and must not retain it.
   */
  onLabels(labels: readonly WalkScreenLabel[]): void;
  /** The world asset arrived; tiles, zones and the character are now present. */
  onWorldReady(): void;
  onError(error: unknown): void;
}

export interface WalkSceneController {
  update(view: WalkSceneView): void;
  /** Swap the character in place, keeping the world, the zones and the camera. */
  setCharacter(selection: CharacterSelection): void;
  resize(): void;
  destroy(): void;
}

/**
 * Is a rung of the escalation ladder live in a way that must stop the loop?
 *
 * `MAP_SPEC.md`: "While any rung of the ladder is live, the render loop is paused. Not a
 * dimmed world, not a slow-motion world, not a world still ticking behind a scrim."
 *
 * `SHADOW` is deliberately excluded, and that is a reading of the spec rather than a
 * departure from it. The ladder is `SHADOW -> CHECKIN_1 -> CHECKIN_2 ->
 * FAMILY_ESCALATED -> SOS_ACTIVE`; `SHADOW` is the armed-but-nothing-shown rung, with no
 * check-in surface and no emergency surface. `MOTION_SPEC.md` says of this view that
 * "her position still updates, because that is the point of the view". Pausing in
 * `SHADOW` would freeze her position while she walks through the zone that armed the
 * session, removing live safety information rather than protecting it, and the clause's
 * own stated purpose is that an *emergency surface* sits over a still frame. Every rung
 * that shows a surface is listed. Recorded in progress.md for a founder ruling.
 */
function isLadderLive(sessionState: SessionState): boolean {
  return (
    sessionState === "CHECKIN_1" ||
    sessionState === "CHECKIN_2" ||
    sessionState === "FAMILY_ESCALATED" ||
    sessionState === "SOS_ACTIVE"
  );
}

function qualityStep(level: number): QualityStep {
  const step = QUALITY_LADDER[Math.min(level, QUALITY_LADDER.length - 1)];
  if (step === undefined) {
    throw new Error("Quality ladder has no steps");
  }
  return step;
}

interface DesiredTile {
  readonly id: TileId;
  readonly key: string;
}

interface ResidentTile {
  readonly group: Group;
  /** When it left the window, or `null` while it is inside it. */
  droppedAtMs: number | null;
}

export async function mountWalkScene(
  canvas: HTMLCanvasElement,
  mapZones: readonly MapZone[],
  selection: CharacterSelection,
  callbacks: WalkSceneCallbacks,
): Promise<WalkSceneController> {
  const renderer = new WebGLRenderer({
    canvas,
    // The founder's direction is "as close as possible, maybe even better looking".
    // Antialiasing is the cheapest thing that buys that, and the ladder below is what
    // pays for it on a device that cannot afford it.
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(COLOR_BACKGROUND);

  const scene = new Scene();

  const camera = new PerspectiveCamera(
    WALK_CAMERA_FOV_DEG,
    1,
    NEAR_M,
    PLACEHOLDER_FAR_M,
  );

  // `MAP_SPEC.md`: "A tile that has not arrived is not a hole in the world. The ground
  // plane renders in the `background` colour underneath." It follows her, so the edge of
  // the window is never visible, and it is one quad, so having more of it costs nothing.
  const ground = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: COLOR_BACKGROUND }),
  );
  ground.rotation.x = -QUARTER_TURN;
  ground.name = "ground";
  scene.add(ground);

  const characterLayer = new Group();
  characterLayer.name = "character-layer";
  scene.add(characterLayer);

  let world: WalkWorld | null = null;
  let meta: WorldMeta | null = null;
  let zones: ZoneLayer | null = null;
  const materials = createTileMaterials();
  let rig: CharacterRig | null = null;

  const resident = new Map<string, ResidentTile>();
  let queue: readonly DesiredTile[] = [];
  let queueIndex = 0;
  let windowKey = "";

  let qualityLevel = 0;
  let overBudgetScore = 0;

  /** Where she is drawn, and where she is heading. */
  let current: GroundPoint | null = null;
  let target: GroundPoint | null = null;
  let facingRadians = 0;

  let selectedZoneId: string | null = null;
  let paused = false;
  let rafId = 0;
  let lastTimestampMs = 0;
  let destroyed = false;

  const motionQuery =
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  let reducedMotion = motionQuery?.matches ?? false;
  const onMotionPreferenceChanged = (): void => {
    reducedMotion = motionQuery?.matches ?? false;
    // The loop stops or restarts, so whatever is on the canvas now is what she keeps
    // until something changes.
    ensureFrame();
  };
  motionQuery?.addEventListener("change", onMotionPreferenceChanged);

  const labelVector = new Vector3();
  const labels: WalkScreenLabel[] = [];

  // The camera is a rigid offset from her: back by the horizontal component of the
  // stated distance, up by the vertical one, and angled down by the stated pitch. It
  // never eases, so there is nothing here for the reduced-motion rule to switch off, and
  // no way for camera motion to overlap a card entry.
  const pitchRadians = WALK_CAMERA_PITCH_DEG * DEGREES_TO_RADIANS;
  const cameraBackM = WALK_CAMERA_DIST_M * Math.cos(pitchRadians);
  const cameraUpM = WALK_CAMERA_DIST_M * Math.sin(pitchRadians);

  /** How many tiles across the ground plane spans, her tile centred. */
  function planeTilesAcross(): number {
    return HALF * RESIDENT_RING + 1;
  }

  /** Metres of ground per screen pixel at her distance, for the zone stroke widths. */
  function metresPerPixel(): number {
    const heightPx = canvas.clientHeight;
    if (heightPx === 0) return 0;
    const visibleHeightM =
      HALF *
      WALK_CAMERA_DIST_M *
      Math.tan((WALK_CAMERA_FOV_DEG * DEGREES_TO_RADIANS) / HALF);
    return visibleHeightM / heightPx;
  }

  function applyCamera(): void {
    if (meta === null) return;
    // The far plane is the ground plane's own width. The farthest corner of that plane
    // from the camera is inside its width for every ring setting, so this always covers
    // the world and never wastes depth precision on empty space beyond it.
    camera.far = planeTilesAcross() * meta.tileM;
    camera.updateProjectionMatrix();
  }

  function applyResize(): void {
    const widthPx = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    if (widthPx === 0 || heightPx === 0) return;
    // `false`: CSS owns the canvas box, and the screen gives it a full-bleed element.
    renderer.setSize(widthPx, heightPx, false);
    camera.aspect = widthPx / heightPx;
    applyCamera();
    const scale = metresPerPixel();
    if (scale > 0) zones?.setPixelScale(scale);
  }

  /** Bumped on every swap, so a slow load cannot land on top of a newer one. */
  let rigGeneration = 0;

  /**
   * Build the character and attach it, replacing whatever was there.
   *
   * Re-runnable on purpose. The customiser is a screen she leaves and comes back from, and
   * rebuilding the scene to change a jacket would refetch and re-decode the whole world
   * for it. The swap keeps the tiles, the zones and the camera exactly where they are.
   */
  async function mountRig(wanted: CharacterSelection): Promise<void> {
    const generation = (rigGeneration += 1);
    let built: CharacterRig;
    try {
      built = await loadCharacter(wanted, new GLTFLoader());
    } catch (error) {
      callbacks.onError(error);
      return;
    }
    // A newer swap started while this one loaded, or the scene is gone: drop it rather
    // than attach a character she has already replaced.
    if (destroyed || generation !== rigGeneration) {
      built.dispose();
      return;
    }
    if (rig !== null) {
      characterLayer.remove(rig.root);
      rig.dispose();
    }
    rig = built;
    characterLayer.add(rig.root);
    ensureFrame();
  }

  // --- the world arrives once, in the background. `MAP_SPEC.md`: "the walk view never
  // blocks on geometry". The canvas, the sheet, the ladder and the SOS button are all
  // live before this resolves; only the tiles, the zones and the character wait, because
  // the projection needs the bake's own `meta` and nothing may restate it.
  void loadWalkWorld(WORLD_ASSET_URL)
    .then(async (loaded) => {
      if (destroyed) return;
      world = loaded;
      meta = loaded.meta;
      applyCamera();
      zones = buildZoneLayer(mapZones, meta, metresPerPixel());
      scene.add(zones.group);
      zones.setSelected(selectedZoneId);
      await mountRig(selection);
      callbacks.onWorldReady();
      ensureFrame();
    })
    .catch((error: unknown) => {
      if (!destroyed) callbacks.onError(error);
    });

  /** The tiles the window wants, nearest first, clipped to the baked grid. */
  function desiredTiles(ring: number): readonly DesiredTile[] {
    if (meta === null || current === null) return [];
    const herTile = toTile(current, meta);
    const tiles: (DesiredTile & { readonly distance: number })[] = [];
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        const tx = herTile.tx + dx;
        const ty = herTile.ty + dy;
        if (tx < meta.minTx || tx > meta.maxTx) continue;
        if (ty < meta.minTy || ty > meta.maxTy) continue;
        tiles.push({
          id: { tx, ty },
          key: tileKeyOf(tx, ty),
          distance: dx * dx + dy * dy,
        });
      }
    }
    // Nearest first, so the tiles around her arrive before the corners of the window.
    tiles.sort((left, right) => left.distance - right.distance);
    return tiles.map((tile) => ({ id: tile.id, key: tile.key }));
  }

  function updateWindow(now: number): void {
    if (meta === null || current === null) return;
    const herTile = toTile(current, meta);
    const nextWindowKey = `${tileKeyOf(herTile.tx, herTile.ty)}:${qualityStep(qualityLevel).ring}`;
    if (nextWindowKey !== windowKey) {
      windowKey = nextWindowKey;
      const desired = desiredTiles(qualityStep(qualityLevel).ring);
      const wanted = new Set(desired.map((tile) => tile.key));
      for (const [key, entry] of resident) {
        if (wanted.has(key)) entry.droppedAtMs = null;
        else if (entry.droppedAtMs === null) entry.droppedAtMs = now;
      }
      queue = desired.filter((tile) => !resident.has(tile.key));
      queueIndex = 0;
    }

    // Free anything past its grace period, so a boundary walk does not thrash.
    for (const [key, entry] of resident) {
      if (entry.droppedAtMs === null) continue;
      if (now - entry.droppedAtMs <= TILE_GRACE_MS) continue;
      scene.remove(entry.group);
      disposeGroup(entry.group);
      resident.delete(key);
    }
  }

  /** Decode and build at most `TILES_PER_FRAME` tiles. */
  function pumpQueue(): void {
    if (world === null || meta === null) return;
    const step = qualityStep(qualityLevel);
    let built = 0;
    while (built < TILES_PER_FRAME && queueIndex < queue.length) {
      const tile = queue[queueIndex];
      queueIndex += 1;
      if (tile === undefined || resident.has(tile.key)) continue;
      // The world JSON keys tiles `"tx,ty"`. `WalkWorld.tileAt` owns that convention.
      const raw = world.tileAt(tile.id.tx, tile.id.ty);
      if (raw === null) continue;
      const group = buildTileMeshes(
        decodeTile(tile.id, raw, meta),
        materials,
        step.detail,
      );
      scene.add(group);
      resident.set(tile.key, { group, droppedAtMs: null });
      built += 1;
    }
  }

  /** Change the quality step, rebuilding what was built at the old one. */
  function applyQuality(nextLevel: number): void {
    const clamped = Math.max(0, Math.min(nextLevel, QUALITY_LADDER.length - 1));
    if (clamped === qualityLevel) return;
    const previous = qualityStep(qualityLevel);
    const next = qualityStep(clamped);
    qualityLevel = clamped;
    if (previous.detail !== next.detail) {
      // Tiles already in the scene were built with the old detail setting, so they are
      // dropped and re-queued rather than left at a cost the ladder just decided to stop
      // paying. The ground plane covers the gap: a tile that has not arrived is not a
      // hole.
      for (const [key, entry] of resident) {
        scene.remove(entry.group);
        disposeGroup(entry.group);
        resident.delete(key);
      }
      windowKey = "";
    }
  }

  /**
   * The frame guard.
   *
   * A pure integrator, so there is no invented threshold: a frame over `perf.frame` adds
   * one, a frame under `perf.fps`'s own frame time subtracts one, and the score, clamped
   * to the ladder's length, *is* the quality step. Both thresholds come from the two
   * facts, so the guard cannot drift from them, and the gap between them is the
   * hysteresis that stops a ladder step flapping.
   */
  function applyFrameBudget(frameMs: number): void {
    if (frameMs > FRAME_BUDGET_MS) overBudgetScore += 1;
    else if (frameMs < TARGET_FRAME_MS) overBudgetScore -= 1;
    overBudgetScore = Math.max(
      0,
      Math.min(overBudgetScore, QUALITY_LADDER.length - 1),
    );
    applyQuality(overBudgetScore);
  }

  function step(deltaSec: number, ambientAllowed: boolean): void {
    if (meta === null || current === null || target === null) return;

    // Walked in before she is, so nothing depends on `current` above.
    let moving = false;
    if (reducedMotion) {
      // `MOTION_SPEC.md`: under reduced motion she "snaps to the fix instead".
      moving = current.x !== target.x || current.z !== target.z;
      current = target;
    } else {
      const remainingX = target.x - current.x;
      const remainingZ = target.z - current.z;
      const remaining = Math.hypot(remainingX, remainingZ);
      if (remaining <= meta.q) {
        // Within one quantisation step of the fix is the fix: the world has no finer
        // resolution than `meta.q`, so easing past it would be easing toward noise.
        current = target;
      } else {
        moving = true;
        const alpha = 1 - Math.exp(-deltaSec / POSITION_EASE_SEC);
        current = {
          x: current.x + remainingX * alpha,
          z: current.z + remainingZ * alpha,
        };
        // She faces where she is going, turning along the shorter arc over the same
        // 400 ms her position eases, so a reversal is not an instant flip.
        const desiredFacing = Math.atan2(remainingX, remainingZ);
        let turn = desiredFacing - facingRadians;
        if (turn > Math.PI) turn -= FULL_TURN;
        if (turn < -Math.PI) turn += FULL_TURN;
        facingRadians += turn * alpha;
      }
    }

    const groundY = rig === null ? 0 : rig.root.position.y;
    if (rig !== null) {
      rig.root.position.set(current.x, groundY, current.z);
      rig.root.rotation.y = facingRadians;
      if (moving) rig.walk(POSITION_EASE_SEC);
      else rig.idle(POSITION_EASE_SEC);
      // Her limb animation is the view's only ambient motion, so it is what the last
      // ladder step and the reduced-motion rule both stop.
      if (ambientAllowed) rig.update(deltaSec);
    }

    camera.position.set(current.x, cameraUpM, current.z - cameraBackM);
    camera.lookAt(
      current.x,
      groundY + WALK_CHARACTER_HEIGHT_M / HALF,
      current.z,
    );

    const planeM = planeTilesAcross() * meta.tileM;
    ground.position.set(current.x, 0, current.z);
    ground.scale.set(planeM, planeM, 1);
  }

  function projectLabels(): void {
    labels.length = 0;
    if (zones === null) return;
    const widthPx = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    for (const anchor of zones.labelAnchors) {
      labelVector.set(anchor.x, layerHeight("zoneOutline"), anchor.z);
      labelVector.project(camera);
      const onScreen =
        labelVector.z <= 1 &&
        labelVector.z >= -1 &&
        labelVector.x >= -1 &&
        labelVector.x <= 1 &&
        labelVector.y >= -1 &&
        labelVector.y <= 1;
      labels.push({
        stationId: anchor.stationId,
        // Normalised device coordinates run -1..1 with y up; screen pixels run 0..size
        // with y down.
        xPx: ((labelVector.x + 1) / NDC_SPAN) * widthPx,
        yPx: ((1 - labelVector.y) / NDC_SPAN) * heightPx,
        onScreen,
      });
    }
  }

  function shouldLoop(): boolean {
    return !paused && !reducedMotion && !destroyed;
  }

  function frame(timestampMs: number): void {
    rafId = 0;
    if (destroyed) return;
    // A frame is never treated as longer than the stated ceiling, so a tab returning
    // from the background cannot report seconds and lurch the ease.
    const elapsedMs =
      lastTimestampMs === 0
        ? 0
        : Math.min(timestampMs - lastTimestampMs, FRAME_BUDGET_MS);
    lastTimestampMs = timestampMs;

    if (!paused) {
      applyFrameBudget(elapsedMs);
      const stepQuality = qualityStep(qualityLevel);
      step(elapsedMs / MILLISECONDS_PER_SECOND, stepQuality.ambient && !reducedMotion);
      if (meta !== null) {
        updateWindow(globalThis.performance.now());
        pumpQueue();
      }
    }

    renderer.render(scene, camera);
    projectLabels();
    callbacks.onLabels(labels);

    if (shouldLoop()) ensureFrame();
  }

  function ensureFrame(): void {
    if (destroyed || rafId !== 0) return;
    rafId = globalThis.requestAnimationFrame(frame);
  }

  applyResize();
  ensureFrame();

  return {
    update(next: WalkSceneView): void {
      const wasPaused = paused;
      paused = isLadderLive(next.sessionState);
      if (paused) {
        // `MAP_SPEC.md`: `SOS_ACTIVE` is "a static overlay on a still frame". Cancelling
        // the loop leaves the last drawn frame on the canvas, which is that still frame.
        if (rafId !== 0) {
          globalThis.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        lastTimestampMs = 0;
      }
      selectedZoneId = next.selectedZoneId;
      if (meta === null) {
        if (!paused) ensureFrame();
        return;
      }
      if (next.location !== null) {
        const projected = toGround(next.location.latitude, next.location.longitude, meta);
        target = projected;
        if (current === null) current = projected;
      }
      zones?.setSelected(selectedZoneId);
      // A frame is needed whether this resumed the loop or changed the selection;
      // `ensureFrame` is a no-op when the loop is already live.
      if (wasPaused && !paused) lastTimestampMs = 0;
      ensureFrame();
    },
    setCharacter(next: CharacterSelection): void {
      void mountRig(next);
    },
    resize(): void {
      applyResize();
      ensureFrame();
    },
    destroy(): void {
      destroyed = true;
      if (rafId !== 0) {
        globalThis.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      motionQuery?.removeEventListener("change", onMotionPreferenceChanged);
      for (const [, entry] of resident) {
        scene.remove(entry.group);
        disposeGroup(entry.group);
      }
      resident.clear();
      disposeTileMaterials(materials);
      zones?.dispose();
      rig?.dispose();
      ground.geometry.dispose();
      (ground.material as MeshBasicMaterial).dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}
