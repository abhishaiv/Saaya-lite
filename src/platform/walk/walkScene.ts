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
  CircleGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
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
  COLOR_BRAND,
  COLOR_WALK_GROUND,
  COLOR_WALK_HAZE,
  COLOR_WALK_SKY,
  COLOR_WHITE,
  FRAME_BUDGET_MS,
  TARGET_FPS,
  WALK_CAMERA_DIST_M,
  WALK_CAMERA_FOV_DEG,
  WALK_CAMERA_LOOK_AT_M,
  WALK_CAMERA_PITCH_DEG,
  WALK_CHARACTER_HEIGHT_M,
  WALK_SPEED_MPS,
} from "./walkFacts";
import { layerHeight } from "./walkGeometry";
import { createSkyLayer } from "./walkSky";
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
 * The character's light rig.
 *
 * Nothing else in the scene is lit — every scenery material is `MeshBasicMaterial` — so
 * these values change nothing but her, and no frozen colour can be shaded by them. The
 * two colours the rig uses are the product's own `color.white` and `color.background`;
 * the levels are rendering values the spec does not speak to.
 */
const SKY_LIGHT_INTENSITY = 1.6; // GROUNDED-EXEMPT: a lighting level, not a product value.
const KEY_LIGHT_INTENSITY = 2.2; // GROUNDED-EXEMPT: a lighting level, not a product value.
/** The key light's height above her, as a multiple of the camera's own back-off distance. */
const KEY_LIGHT_HEIGHT_FACTOR = 1.2; // GROUNDED-EXEMPT: a lighting position, not a product value.
/** The key light's sideways offset, as the same multiple, so one number moves the rig. */
const KEY_LIGHT_SIDE_FACTOR = 0.4; // GROUNDED-EXEMPT: a lighting position, not a product value.

/**
 * The disc drawn on the ground at her feet.
 *
 * Its radius is a quarter of `walk.character.height` — her own stated size, divided, so
 * no new length is stated. The rest are rendering values.
 */
const CHARACTER_MARK_RADIUS_M = WALK_CHARACTER_HEIGHT_M / 4;
const CHARACTER_MARK_SEGMENTS = 32; // GROUNDED-EXEMPT: a circle's tessellation, a rendering cost.
const CHARACTER_MARK_OPACITY = 0.28; // GROUNDED-EXEMPT: a rendering alpha, not a product value.

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
 * Where the distance haze starts and where it has fully taken over, in metres from the camera.
 *
 * A rendering range, not a product value: `MAP_SPEC.md` states that the scenery fades into
 * `color.walk.haze` with distance, not how far away that begins. The near end is set well past
 * the street she is on, so nothing she could walk into is hazed; the far end is well inside the
 * ground plane's own width, so the plane's edge is never visible as an edge.
 *
 * Amended 2026-09-22. The far end was 800, and an A/B against 300 was read as showing no
 * difference; that reading was taken where the ground under the probe carries a zone fill, and a
 * zone fill is deliberately unfogged, so the probe was measuring the tint rather than the fog.
 * Re-measured on bare ground, the fog is what holds the far end of the seam.
 *
 * The value is now taken from the reference rather than chosen. Row-by-row in its walk frames the
 * dark seam is a full-width uniform band running from row 0.1656 to row 0.1812 of the frame -
 * 1.56% of it - with the sky flat above and the scenery brightening below. Our band's top edge is
 * not a free number: it is the ground plane's own far edge, at row 0.1672, because the plane's
 * size is the residency window and nothing else. So the far end is solved to give the band the
 * reference's own thickness, 1.56% of the frame from 0.1672, which puts our release row at 0.1828
 * and measures 410 m from the eye. At 800 the band measured 0.48% of the frame, a third of the
 * reference's; at 510 it measured 1.13%.
 */
const FOG_NEAR_M = 45; // GROUNDED-EXEMPT: a rendering range, not a product value.
const FOG_FAR_M = 200; // GROUNDED-EXEMPT: a rendering range, not a product value.

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

/**
 * The floor stops at `RESIDENT_RING - 1`, not at her own tile.
 *
 * The rungs above are the spec's order untouched: draw distance drops first, then tile
 * detail, then ambient motion. What changed is only where the dropping stops. Her own
 * tile alone renders the ground plane, whatever roads happen to cross that one square
 * kilometre, and nothing else - no green, no buildings, no seam network - which reads as
 * an empty world rather than as a cheaper one. Ring 1 is nine tiles, so the neighbourhood
 * she is standing in is still there to look at, and `detail: false` has already taken the
 * buildings off all nine.
 *
 * `MAP_SPEC.md`'s Performance section fixes the order and, as of the same amendment that
 * put this floor in, names it: draw distance first and still the largest saving, with the
 * drop stopping at `RESIDENT_RING - 1`.
 */
const QUALITY_LADDER: readonly QualityStep[] = [
  { ring: RESIDENT_RING, detail: true, ambient: true },
  { ring: RESIDENT_RING - 1, detail: true, ambient: true },
  { ring: RESIDENT_RING - 1, detail: false, ambient: true },
  { ring: RESIDENT_RING - 1, detail: false, ambient: false },
];

/**
 * How many consecutive frames a rung change waits for.
 *
 * One over-budget frame is not a slow device. It is a tile decoding on the render thread,
 * a collection, or the first frames of a load - and the step that crosses the detail
 * boundary removes every resident tile to stop paying for them, so a single stall used to
 * cost the whole world and then take a frame per tile to rebuild it. Eight frames is a
 * quarter of a second of sustained frames over `perf.frame`, which a stall does not
 * produce and a device that cannot keep up does.
 *
 * The same run gates the climb back up, so a device hovering around the two thresholds
 * cannot cross the detail boundary in either direction every few frames and rebuild the
 * world each time.
 *
 * `perf.frame` and `perf.fps` fix the two thresholds; how long the ladder watches before
 * it acts on them is a rendering responsiveness the spec does not speak to.
 */
const LADDER_DWELL_FRAMES = 8; // GROUNDED-EXEMPT: a rendering responsiveness, not a product value.

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
  // The sky. Above the horizon line there is no geometry at all, so the clear colour is what
  // the sky *is*: `color.walk.sky`, the dark half of a frame whose ground is 1.8x brighter.
  // Amended 2026-09-22 by founder ruling, from `color.background`, which was also the ground
  // plane's colour and left the view with no horizon to read.
  renderer.setClearColor(COLOR_WALK_SKY);

  const scene = new Scene();
  // The horizon band. In the reference frames the brightest large area is the haze where the
  // ground meets the sky, so scenery fades into `color.walk.haze` with distance. Materials
  // that carry risk information opt out with `fog: false` - the zone layer in `walkZones.ts`
  // and the road band in `walkTiles.ts` - because a hazed risk band would be the risk
  // information degrading with distance, which `MAP_SPEC.md` forbids.
  scene.fog = new Fog(COLOR_WALK_HAZE, FOG_NEAR_M, FOG_FAR_M);

  const camera = new PerspectiveCamera(
    WALK_CAMERA_FOV_DEG,
    1,
    NEAR_M,
    PLACEHOLDER_FAR_M,
  );

  // `MAP_SPEC.md`: "A tile that has not arrived is not a hole in the world. The ground plane
  // renders in `color.walk.ground` underneath." It follows her, so the edge of the window is
  // never visible, and it is one quad, so having more of it costs nothing.
  //
  // The colour is the land, not the sky. Amended 2026-09-22: from a camera 7.0 m up the far
  // plane of the world *is* the ground, so a missing tile has to read as ground that has not
  // been detailed yet rather than as sky showing through a hole. This plane is also the
  // largest surface in the frame and the one every zone tint and road is read against, which
  // is why it is the view's brightest plane.
  const ground = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: COLOR_WALK_GROUND }),
  );
  ground.rotation.x = -QUARTER_TURN;
  ground.name = "ground";
  scene.add(ground);

  // The sky's glints. Above the horizon there is no geometry at all, so this is the only
  // thing in the frame's top strip besides the clear colour.
  const sky = createSkyLayer();
  scene.add(sky.points);

  // --- the character's light rig.
  //
  // She is the one object in this view that is not flat colour. Her parts are glTF
  // `pbrMetallicRoughness`, which three loads as `MeshStandardMaterial`, and a standard
  // material with no light in the scene renders black: every capture of her was a
  // silhouette against the tiles. `MAP_SPEC.md` says she "scales against [the buildings]
  // correctly", which a black shape does not.
  //
  // The rig therefore exists for her alone. It cannot tint a tile, a road band or a zone,
  // because none of those read a light; and it is the reason those materials stay
  // `MeshBasicMaterial` rather than becoming lit surfaces with a sun nobody chose.
  //
  // Its lower colour is `color.walk.ground`: the bounce that reaches the underside of
  // anything standing on the ground is the ground's own colour, so she is lit by the world
  // the amendment gave her rather than by the app's `background`.
  const skyLight = new HemisphereLight(
    COLOR_WHITE,
    COLOR_WALK_GROUND,
    SKY_LIGHT_INTENSITY,
  );
  skyLight.name = "character-sky-light";
  scene.add(skyLight);

  const keyLight = new DirectionalLight(COLOR_WHITE, KEY_LIGHT_INTENSITY);
  keyLight.name = "character-key-light";
  // The target has to be in the scene for three to update its matrix; both are moved
  // onto her every frame in `step`.
  scene.add(keyLight, keyLight.target);

  const characterLayer = new Group();
  characterLayer.name = "character-layer";
  scene.add(characterLayer);

  // The mark she stands on.
  //
  // A translucent disc in the product's own `color.brand`, which is what the reference
  // draws under its avatar. A contact shadow is the other candidate and the weaker one:
  // the ground here is a lit plane but a zone tint or a risk band can be under her feet,
  // and a shadow on either of those says "this part of the ground is dark" rather than
  // "she is standing here". The disc keeps its own colour over all of them.
  const characterMark = new Mesh(
    new CircleGeometry(1, CHARACTER_MARK_SEGMENTS),
    new MeshBasicMaterial({
      color: COLOR_BRAND,
      transparent: true,
      opacity: CHARACTER_MARK_OPACITY,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  characterMark.rotation.x = -QUARTER_TURN;
  characterMark.scale.setScalar(CHARACTER_MARK_RADIUS_M);
  characterMark.name = "character-mark";
  scene.add(characterMark);

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
  // The two runs the guard is watching. A frame counts towards at most one of them.
  let overBudgetRun = 0;
  let underBudgetRun = 0;

  /** Where she is drawn, and where she is heading. */
  let current: GroundPoint | null = null;
  let target: GroundPoint | null = null;
  let facingRadians = 0;

  /**
   * The last view handed to `update`, kept so the world's own arrival can be applied to it.
   *
   * The world loads in the background and `update` can arrive before it does, because
   * `mountWalkScene` resolves as soon as the renderer exists. Before this existed, that
   * first fix was read against a `null` `meta`, dropped, and the scene then waited for a
   * fix that only came if she moved. A still phone drew the background and nothing else:
   * the ground plane is the background colour, so it read as a black rectangle with one
   * risk band across it. Recorded in progress.md.
   */
  let lastView: WalkSceneView | null = null;

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
  // `WalkScreenLabel` is readonly for consumers. The producer reuses its objects instead of
  // allocating one per anchor per frame, so it holds the same shape, mutable.
  const labels: Array<{
    stationId: string;
    xPx: number;
    yPx: number;
    onScreen: boolean;
  }> = [];
  // The canvas box, read on resize and reused. A layout read inside the frame callback is
  // the one thing in the label path that can cost a reflow, and the box only changes on
  // resize.
  let viewWidthPx = 0;
  let viewHeightPx = 0;

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

  /**
   * Put a fix on the ground plane.
   *
   * Called both when a view arrives and when the world that arrived after it turns out to
   * have been the thing missing. `current` is only ever seeded, never reset: the ease in
   * `step` is what moves her from where she is drawn to where she now is, so a fix that
   * lands mid-walk is a target rather than a jump.
   */
  function applyLocation(view: WalkSceneView): void {
    if (meta === null || view.location === null) return;
    const projected = toGround(
      view.location.latitude,
      view.location.longitude,
      meta,
    );
    target = projected;
    if (current === null) current = projected;
  }

  function applyResize(): void {
    const widthPx = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    if (widthPx === 0 || heightPx === 0) return;
    viewWidthPx = widthPx;
    viewHeightPx = heightPx;
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
      // The world is late, not early: whatever fix she gave while it loaded is the fix
      // that applies now. Without this the scene sits at the origin until she moves.
      if (lastView !== null) applyLocation(lastView);
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
   *
   * What the two thresholds do not say is how long the ladder watches before acting, and
   * a single frame is too short a look: `LADDER_DWELL_FRAMES` is the run either direction
   * has to reach first, and a frame between the thresholds belongs to neither run.
   */
  function applyFrameBudget(frameMs: number): void {
    overBudgetRun = frameMs > FRAME_BUDGET_MS ? overBudgetRun + 1 : 0;
    underBudgetRun = frameMs < TARGET_FRAME_MS ? underBudgetRun + 1 : 0;
    if (overBudgetRun >= LADDER_DWELL_FRAMES) {
      overBudgetScore += 1;
      overBudgetRun = 0;
    } else if (underBudgetRun >= LADDER_DWELL_FRAMES) {
      overBudgetScore -= 1;
      underBudgetRun = 0;
    }
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
    // How far she actually covered this step, which is what her legs answer to.
    let travelledM = 0;
    if (reducedMotion) {
      // `MOTION_SPEC.md`: under reduced motion she "snaps to the fix instead".
      moving = current.x !== target.x || current.z !== target.z;
      travelledM = Math.hypot(target.x - current.x, target.z - current.z);
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
        const stepped = {
          x: current.x + remainingX * alpha,
          z: current.z + remainingZ * alpha,
        };
        travelledM = Math.hypot(stepped.x - current.x, stepped.z - current.z);
        current = stepped;
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
      // Her legs answer to the ground she covered, so the cycle slows as an ease finishes
      // and hurries when a fix lands long, instead of skating at one rate through both. The
      // idle keeps the rate it was authored at, so a pause is not a freeze. Capped at twice
      // `walk.speed` so a fix that lands far away does not spin her.
      rig.setWalkRate(
        moving && deltaSec > 0
          ? Math.min(travelledM / deltaSec / WALK_SPEED_MPS, 2)
          : 1,
      );
      // Her limb animation is the view's only ambient motion, so it is what the last
      // ladder step and the reduced-motion rule both stop.
      if (ambientAllowed) rig.update(deltaSec);
    }

    camera.position.set(current.x, cameraUpM, current.z - cameraBackM);
    // The sky travels with the camera, because it is meant to be at no distance at all.
    sky.points.position.copy(camera.position);
    // The aim point is `walk.camera.look_at` above her feet, which is above her head. Aiming
    // at the character centres her and drops the ground she is walking on out of the frame;
    // the reference aims well above its avatar for the same reason. See `MAP_SPEC.md`, "The
    // camera, and the frame it composes".
    camera.lookAt(current.x, groundY + WALK_CAMERA_LOOK_AT_M, current.z);

    // The key light rides over the camera's shoulder, so the side of her the camera sees
    // is the lit side wherever she walks and whichever way she is facing. Both ends move
    // with her, so its direction is fixed and nothing in the world is lit.
    keyLight.position.set(
      current.x + cameraBackM * KEY_LIGHT_SIDE_FACTOR,
      cameraBackM * KEY_LIGHT_HEIGHT_FACTOR,
      current.z - cameraBackM,
    );
    keyLight.target.position.set(current.x, groundY, current.z);

    characterMark.position.set(current.x, layerHeight("characterMark"), current.z);

    const planeM = planeTilesAcross() * meta.tileM;
    ground.position.set(current.x, 0, current.z);
    ground.scale.set(planeM, planeM, 1);
  }

  function projectLabels(): void {
    if (zones === null) {
      labels.length = 0;
      return;
    }
    let count = 0;
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
      let label = labels[count];
      if (label === undefined) {
        label = { stationId: anchor.stationId, xPx: 0, yPx: 0, onScreen: false };
        labels[count] = label;
      }
      label.stationId = anchor.stationId;
      // Normalised device coordinates run -1..1 with y up; screen pixels run 0..size
      // with y down.
      label.xPx = ((labelVector.x + 1) / NDC_SPAN) * viewWidthPx;
      label.yPx = ((1 - labelVector.y) / NDC_SPAN) * viewHeightPx;
      label.onScreen = onScreen;
      count += 1;
    }
    labels.length = count;
  }

  function shouldLoop(): boolean {
    return !paused && !reducedMotion && !destroyed;
  }

  function frame(timestampMs: number): void {
    rafId = 0;
    if (destroyed) return;
    // The guard reads the true frame time, because a frame that missed the ceiling is
    // exactly what it exists to see. The ease reads the same delta capped at the ceiling,
    // so a tab returning from the background cannot report seconds and lurch her.
    const frameMs = lastTimestampMs === 0 ? 0 : timestampMs - lastTimestampMs;
    const elapsedMs = Math.min(frameMs, FRAME_BUDGET_MS);
    lastTimestampMs = timestampMs;

    if (!paused) {
      applyFrameBudget(frameMs);
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
      // Kept before the `meta` check below, which is the whole point: this view is the
      // one the world's arrival has to apply itself to.
      lastView = next;
      if (meta === null) {
        if (!paused) ensureFrame();
        return;
      }
      applyLocation(next);
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
      characterMark.geometry.dispose();
      (characterMark.material as MeshBasicMaterial).dispose();
      sky.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}
