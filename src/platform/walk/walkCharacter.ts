/**
 * The character: parts loaded from glTF and assembled into one figure.
 *
 * `MAP_SPEC.md`: "Blender-authored parts, assembled at runtime ... swap the part, keep
 * the rig." Nothing is skinned per combination and there are no morph targets.
 *
 * **Every part carries its own copy of the full 65-joint rig.** That is what the
 * exporter produced, and it is why assembly is a plain add rather than a merge: the
 * parts are already in the same rest pose, in the same coordinate space, at the same
 * origin, so a hair part sits on the head with no offset applied. Verified by reading
 * the shipped files: `hair_long` spans y 1.501 to 1.777, which is the head, and
 * `top_hoodie` spans y 0.922 to 1.46, which is the torso.
 *
 * Because each part owns its rig, **each part gets its own `AnimationMixer`, all
 * driven with the same delta.** One mixer rooted at the assembled group would bind
 * every track to whichever part's bone was found first and animate only that part.
 * The clips name their targets, and the rigs all answer to the same names.
 */

import {
  AnimationMixer,
  Box3,
  Group,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type AnimationAction,
  type AnimationClip,
  type Material,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  axisIdForPart,
  CHARACTER_CLIP_IDLE,
  CHARACTER_CLIP_WALK,
  isBodyCoveringPart,
  partFileUrl,
  partsForSelection,
  type CharacterSelection,
} from "./characterParts";
import {
  GARMENT_BOTTOM_COLOR,
  GARMENT_TOP_COLOR,
  WALK_CHARACTER_HEIGHT_M,
} from "./walkFacts";

/** What the scene holds once a character is assembled. */
export interface CharacterRig {
  /** Add this to the scene. Already scaled to the product's character height. */
  readonly root: Group;
  /** The measured height after scaling, in metres. */
  readonly heightM: number;
  /** Cross-fade to the walk cycle. */
  walk(fadeSec: number): void;
  /** Cross-fade to the idle. */
  idle(fadeSec: number): void;
  /** Advance every part's mixer by the same delta, so the rigs stay in step. */
  update(deltaSec: number): void;
  /**
   * How fast the cycle plays, as a multiple of the ground speed it was authored for.
   *
   * The clip is drawn for `walk.speed`, so 1 is her walking at that speed. Anything else
   * is her legs keeping up with the ground rather than skating over it.
   */
  setWalkRate(rate: number): void;
  dispose(): void;
}

/**
 * She faces this way in her own local space.
 *
 * The parts are exported from Blender, where the figure faces -Y; the glTF exporter's
 * Y-up conversion maps that to +Z. Held as one constant because it is the single
 * thing to change if the model is ever re-exported facing elsewhere: getting it wrong
 * shows up as a character walking backwards, which is easy to spot and easy to fix.
 */
const CHARACTER_FACING_RADIANS = 0;

/**
 * How far a garment is lifted off the skin, in metres.
 *
 * Sized from measurement and corrected on the frame. The parts that need no help - the
 * hair and the accessories - carry 11 mm to 39 mm of clearance from `body_base` and
 * render cleanly; the garments carry none, their median vertex sitting exactly 0.0000 m
 * from the nearest body vertex, so they draw at the skin's own depth and lose the depth
 * test fragment by fragment. Held at 0 mm that is not subtle: a no-HUD capture at the
 * founder's origin renders her in the body's baked underwear, with the garments
 * surviving only as violet fringes along their edges.
 *
 * 14 mm is the shipped value, and it was re-measured at the founder's origin on
 * 2026-09-23 instead of inherited: across four idle phases and four walk phases the seat
 * and legs carry no baked-underwear pixel at all - 0 in the scan window on every one of
 * the eight captures, against 553 in the same window at 0 mm. The lift is along each
 * vertex's own normal, so this is a stand-off, not an inflation.
 *
 * What 14 mm does not fix, and 22 mm does not either: the pale scalloped band across her
 * hips. That band is the jeans' own modelled waistband, and it is the same at 14, 22 and
 * 35 mm - which is how it was shown to be the garment rather than a stand-off artefact.
 * Raising the standoff to chase it only holds the garments further off the body.
 * GROUNDED-EXEMPT: a depth separation between two surfaces, not a product value - the
 * same kind of constant as `LAYER_HEIGHT_STEP_M`, which separates the coplanar ground
 * layers, and for the same reason.
 */
const GARMENT_STANDOFF_M = 0.014; // GROUNDED-EXEMPT: depth separation between the skin and what she wears, not a product value.

/**
 * Move every vertex of a part outward along its own normal.
 *
 * The parts are skinned, and skinning transforms whatever position the geometry
 * holds, so lifting the bind-pose vertices lifts the drawn figure with it. Normals
 * are unit length in these files, so `metres` is the stand-off exactly.
 */
export function liftOffSkin(part: Object3D, metres: number): void {
  part.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute("position");
    const normal = object.geometry.getAttribute("normal");
    if (position === undefined || normal === undefined) return;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      position.setXYZ(
        vertex,
        position.getX(vertex) + normal.getX(vertex) * metres,
        position.getY(vertex) + normal.getY(vertex) * metres,
        position.getZ(vertex) + normal.getZ(vertex) * metres,
      );
    }
    position.needsUpdate = true;
    // The bounds moved with the vertices, and the renderer culls against them.
    object.geometry.computeBoundingSphere();
  });
}

/**
 * What each garment axis is painted with. Fact: color.brand, color.brandDark.
 *
 * Exported because the invariant that matters is testable and would otherwise be
 * invisible: every axis that clothes the body has a colour here, and nothing is painted
 * that is not a garment. A new garment axis with no entry here ships grey and reads as
 * skin again, and no frame would say which of the two had happened.
 */
export const GARMENT_COLOR_BY_AXIS: Readonly<Record<string, string>> = {
  top: GARMENT_TOP_COLOR,
  bottom: GARMENT_BOTTOM_COLOR,
};

/**
 * Paint a garment in the product's violet.
 *
 * Written through to the material rather than to a clone, and that is safe for a reason
 * worth stating: a part file carries exactly one mesh and one material, and no two part
 * ids share a file, so the instance written to here is this part's own and no other part
 * can be repainted by it. Both garment materials ship `baseColorTexture: none`, so this
 * colour is the drawn colour rather than a tint multiplied over an atlas - which is why
 * a colour change is enough to stop a garment reading as skin.
 */
export function applyGarmentColour(part: Object3D, hex: string): void {
  part.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.color.set(hex);
    }
  });
}

/** Raised when `anims.glb` is missing a clip the view requires. */
export class MissingClipError extends Error {}

/** Raised when the assembled parts have no measurable height. */
export class EmptyCharacterError extends Error {}

export async function loadCharacter(
  selection: CharacterSelection,
  loader: GLTFLoader,
): Promise<CharacterRig> {
  const animationFile = await loader.loadAsync(partFileUrl("anims"));
  const clipByName = new Map<string, AnimationClip>(
    animationFile.animations.map((clip) => [clip.name, clip]),
  );
  const walkClip = clipByName.get(CHARACTER_CLIP_WALK);
  const idleClip = clipByName.get(CHARACTER_CLIP_IDLE);
  // A clip that is absent is a build error, not something to fall back from:
  // silently idling a character whose walk cycle failed to load is exactly the
  // failure this throws instead of.
  if (walkClip === undefined) {
    throw new MissingClipError(`anims.glb has no ${CHARACTER_CLIP_WALK} clip`);
  }
  if (idleClip === undefined) {
    throw new MissingClipError(`anims.glb has no ${CHARACTER_CLIP_IDLE} clip`);
  }

  const root = new Group();
  root.name = "character";

  const partIds = partsForSelection(selection);
  const partFiles = await Promise.all(
    partIds.map(async (partId) => ({
      partId,
      file: await loader.loadAsync(partFileUrl(partId)),
    })),
  );

  const mixers: AnimationMixer[] = [];
  const walkActions: AnimationAction[] = [];
  const idleActions: AnimationAction[] = [];

  for (const { partId, file } of partFiles) {
    const scene = file.scene;
    scene.name = `part:${partId}`;
    // What she wears is a copy of the skin's own surface, so it is drawn at the same
    // depth as the skin and loses the depth test fragment by fragment. Lifting it is
    // what turns the speckles back into a garment.
    if (isBodyCoveringPart(partId)) liftOffSkin(scene, GARMENT_STANDOFF_M);
    // And it ships grey, which over the body's nude base texture reads as skin, so the
    // garment axes are painted rather than left as the pack authored them.
    const axisId = axisIdForPart(partId);
    const garmentColor = axisId === null ? undefined : GARMENT_COLOR_BY_AXIS[axisId];
    if (garmentColor !== undefined) applyGarmentColour(scene, garmentColor);
    root.add(scene);

    const mixer = new AnimationMixer(scene);
    const walkAction = mixer.clipAction(walkClip);
    const idleAction = mixer.clipAction(idleClip);
    walkAction.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
    idleAction.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
    // Both run from the start; only the idle carries weight. Fading is a weight
    // change on an already-playing action, so a switch never has to start anything
    // mid-frame and the two cycles stay in phase with each other.
    walkAction.play();
    walkAction.setEffectiveWeight(0);
    idleAction.play();
    idleAction.setEffectiveWeight(1);
    walkActions.push(walkAction);
    idleActions.push(idleAction);
    mixers.push(mixer);
  }

  if (mixers.length === 0) {
    throw new EmptyCharacterError("A character needs at least one part");
  }

  // Scale from the figure actually measured to the height the product states, rather
  // than from a number baked in here. A part swap that changes the silhouette then
  // cannot silently change how tall she stands next to a building.
  const bounds = new Box3().setFromObject(root);
  const measuredHeight = bounds.max.y - bounds.min.y;
  if (!(measuredHeight > 0)) {
    throw new EmptyCharacterError("Assembled character has no height");
  }
  const scale = WALK_CHARACTER_HEIGHT_M / measuredHeight;
  root.scale.setScalar(scale);

  // Stand her on the ground. The parts are modelled around the origin, so after
  // scaling the lowest vertex must be lifted to y=0 rather than left at whatever
  // offset the source mesh happened to carry.
  root.position.y -= bounds.min.y * scale;

  root.rotation.y = CHARACTER_FACING_RADIANS;

  let walking = false;

  function setWalking(next: boolean, fadeSec: number): void {
    if (walking === next) return;
    walking = next;
    const rising = next ? walkActions : idleActions;
    const falling = next ? idleActions : walkActions;
    for (const action of falling) action.fadeOut(fadeSec);
    for (const action of rising) {
      // `reset` clears any fade still in flight; `fadeIn` then ramps this action's
      // weight from 0 to 1 over the same interval the other one ramps down, so the
      // two always sum to roughly one and she never pops between poses.
      action.reset();
      action.fadeIn(fadeSec);
      action.play();
    }
  }

  return {
    root,
    heightM: WALK_CHARACTER_HEIGHT_M,
    walk(fadeSec: number) {
      setWalking(true, fadeSec);
    },
    idle(fadeSec: number) {
      setWalking(false, fadeSec);
    },
    update(deltaSec: number) {
      for (const mixer of mixers) mixer.update(deltaSec);
    },
    setWalkRate(rate: number) {
      for (const mixer of mixers) mixer.timeScale = rate;
    },
    dispose() {
      for (const mixer of mixers) {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      }
      root.traverse((object) => {
        // SkinnedMesh extends Mesh, so this covers the rigged parts too.
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const material: Material | Material[] = object.material;
        if (Array.isArray(material)) {
          for (const entry of material) entry.dispose();
        } else {
          material.dispose();
        }
      });
      root.clear();
    },
  };
}
