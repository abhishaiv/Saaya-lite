import { normalizeDegrees } from "./walk/walkHeading";

/**
 * The device's own compass, for the walk view's heading.
 *
 * This is a sensor reader, not a position source: nothing here reaches the dwell
 * evaluator, the ladder or any record. It moves the camera and nothing else.
 *
 * Two shapes of reading are accepted, because the two platforms disagree about the same
 * question:
 *
 * - **`webkitCompassHeading`.** iOS, and it is already a true-north heading in degrees
 *   clockwise, which is the thing this view wants. It is referenced to the top edge of the
 *   device; the walk view is portrait, so that is the top of the screen.
 * - **`alpha` with `absolute`.** Android, where `alpha` is the rotation about the screen's
 *   own axis, counter-clockwise, zero when the device's top edge points north. A clockwise
 *   heading is therefore `360 - alpha`. A reading with `absolute` false is refused: the
 *   device is telling us it does not know where north is, and guessing would point the
 *   view somewhere arbitrary.
 *
 * Nothing is smoothed here. The scene eases the heading it is given over the product's own
 * 400 ms, exactly as it eases a fix, so a reading is one number and not a stream of them.
 */

const FULL_CIRCLE_DEG = 360; // GROUNDED-EXEMPT: a full circle in degrees, a unit conversion.

export type HeadingSource = "COMPASS" | "ABSOLUTE_ALPHA";

export interface HeadingReading {
  readonly degrees: number;
  readonly source: HeadingSource;
}

/** The parts of a `DeviceOrientationEvent` this view reads. */
export interface OrientationReading {
  /** False when the device cannot say where north is. */
  readonly absolute: boolean;
  readonly alpha: number | null;
  /** iOS only, and non-standard: a true-north heading rather than a rotation. */
  readonly webkitCompassHeading?: number | null;
}

/** The two event names a compass arrives on, either of which may be the one that fires. */
export interface OrientationEventSource {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export type HeadingPermission = "granted" | "denied" | "unsupported";

type PermissionRequesting = {
  requestPermission?: () => Promise<string>;
};

/** The events iOS and Android use. Both are listened for; a device fires one of them. */
const ORIENTATION_EVENT = "deviceorientation";
const ABSOLUTE_ORIENTATION_EVENT = "deviceorientationabsolute";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * A heading from one orientation reading, or `null` when the reading does not carry one.
 *
 * `screenAngleDeg` is `screen.orientation.angle`. A non-zero angle means the screen is
 * rotated out of portrait, and every reading is refused there rather than compensated for:
 * both platforms report their heading for the device's own top edge, which stops being the
 * way she is facing the moment the phone is turned on its side, and the sign of the
 * correction depends on a convention this view cannot verify without a device in hand. A
 * camera that holds still is worse than a camera that turns; a camera turned the wrong way
 * is worse than both. The walk view is portrait, so this is the case that does not arise.
 */
export function headingFromOrientation(
  reading: OrientationReading,
  screenAngleDeg: number,
): HeadingReading | null {
  if (screenAngleDeg !== 0) return null;
  if (isFiniteNumber(reading.webkitCompassHeading)) {
    return {
      degrees: normalizeDegrees(reading.webkitCompassHeading),
      source: "COMPASS",
    };
  }
  if (!reading.absolute || screenAngleDeg !== 0) return null;
  if (!isFiniteNumber(reading.alpha)) return null;
  return {
    degrees: normalizeDegrees(FULL_CIRCLE_DEG - reading.alpha),
    source: "ABSOLUTE_ALPHA",
  };
}

/**
 * Ask the device for permission to read its compass, from inside a user gesture.
 *
 * iOS 13 and later only answer this while a gesture is being handled - an ask from an
 * effect, a moment after the tap, is refused without ever prompting - which is why the
 * caller is the walk view's own toggle rather than this view's mount.
 *
 * "unsupported" is not a refusal. Android needs no permission, and the events there start
 * on their own, so a caller that only listened on "granted" would leave every Android phone
 * with a view that never turns.
 */
export async function requestHeadingAccess(): Promise<HeadingPermission> {
  const constructor = (
    globalThis as { DeviceOrientationEvent?: PermissionRequesting }
  ).DeviceOrientationEvent;
  const request = constructor?.requestPermission;
  if (typeof request !== "function") return "unsupported";
  try {
    return (await request.call(constructor)) === "granted"
      ? "granted"
      : "denied";
  } catch {
    return "denied";
  }
}

/** Where the screen angle comes from, injectable so a test needs no screen. */
export type ScreenAngleReader = () => number;

function browserScreenAngle(): number {
  const screenLike = globalThis as {
    screen?: { orientation?: { angle?: number } };
  };
  const angle = screenLike.screen?.orientation?.angle;
  return isFiniteNumber(angle) ? angle : 0;
}

/**
 * The live compass, as a subscription.
 *
 * The source is injected so the whole thing can be driven from a test with a plain fake
 * event target; in the browser it is `globalThis`. Readings that repeat the last delivered
 * heading are dropped, because a stationary phone at sixty hertz otherwise hands the scene
 * sixty identical numbers a second.
 */
export class DeviceHeadingWatch {
  private readonly lastDegrees: { value: number | null } = { value: null };
  private running = false;

  constructor(
    private readonly onReading: (reading: HeadingReading) => void,
    private readonly source: OrientationEventSource = globalThis,
    private readonly readScreenAngle: ScreenAngleReader = browserScreenAngle,
  ) {}

  private readonly handle = (event: Event): void => {
    const reading = headingFromOrientation(
      event as unknown as OrientationReading,
      this.readScreenAngle(),
    );
    if (reading === null || reading.degrees === this.lastDegrees.value) return;
    this.lastDegrees.value = reading.degrees;
    this.onReading(reading);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.source.addEventListener(ORIENTATION_EVENT, this.handle);
    this.source.addEventListener(ABSOLUTE_ORIENTATION_EVENT, this.handle);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.source.removeEventListener(ORIENTATION_EVENT, this.handle);
    this.source.removeEventListener(ABSOLUTE_ORIENTATION_EVENT, this.handle);
  }
}
