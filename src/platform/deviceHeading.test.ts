import { describe, expect, it } from "vitest";

import {
  DeviceHeadingWatch,
  headingFromOrientation,
  requestHeadingAccess,
  type HeadingReading,
  type OrientationEventSource,
  type OrientationReading,
} from "./deviceHeading";

const PORTRAIT = 0; // GROUNDED-EXEMPT: `screen.orientation.angle` in portrait.
const LANDSCAPE = 90; // GROUNDED-EXEMPT: `screen.orientation.angle` a quarter turn round.
const FIXTURE_HEADING_DEG = 42.5; // GROUNDED-EXEMPT: a test fixture, not a product value.
const FIXTURE_HEADING_WHOLE_DEG = 42; // GROUNDED-EXEMPT: a test fixture, not a product value.
const FIXTURE_ALPHA_WEST_DEG = 270; // GROUNDED-EXEMPT: a test fixture, not a product value.

class FakeOrientationSource implements OrientationEventSource {
  private readonly listeners = new Map<
    string,
    Set<(event: Event) => void>
  >();

  addEventListener(type: string, listener: (event: Event) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, reading: OrientationReading): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(reading as unknown as Event);
    }
  }

  listenerCount(): number {
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
}

describe("reading a heading off the device", () => {
  it("takes iOS's own compass heading over any rotation", () => {
    expect(
      headingFromOrientation(
        { absolute: true, alpha: 10, webkitCompassHeading: FIXTURE_HEADING_DEG },
        PORTRAIT,
      ),
    ).toEqual({ degrees: FIXTURE_HEADING_DEG, source: "COMPASS" });
  });

  it("turns Android's counter-clockwise rotation into a clockwise heading", () => {
    // `alpha` is counter-clockwise from north, so a clockwise heading is its complement.
    expect(
      headingFromOrientation({ absolute: true, alpha: 90 }, PORTRAIT),
    ).toEqual({ degrees: FIXTURE_ALPHA_WEST_DEG, source: "ABSOLUTE_ALPHA" });
    expect(
      headingFromOrientation(
        { absolute: true, alpha: FIXTURE_ALPHA_WEST_DEG },
        PORTRAIT,
      ),
    ).toEqual({ degrees: 90, source: "ABSOLUTE_ALPHA" });
  });

  it("refuses a reading the device says it cannot place north in", () => {
    // `absolute: false` is the device telling us it does not know where north is.
    expect(
      headingFromOrientation({ absolute: false, alpha: 90 }, PORTRAIT),
    ).toBeNull();
    expect(
      headingFromOrientation({ absolute: true, alpha: null }, PORTRAIT),
    ).toBeNull();
  });

  it("refuses every reading while the screen is rotated out of portrait", () => {
    // Both platforms report their heading for the device's top edge, which stops being the
    // way she is facing once the phone is on its side. Holding still beats turning wrong.
    expect(
      headingFromOrientation(
        {
          absolute: true,
          alpha: 90,
          webkitCompassHeading: FIXTURE_HEADING_WHOLE_DEG,
        },
        LANDSCAPE,
      ),
    ).toBeNull();
  });

  it("asks for permission, and knows the platform that has none", async () => {
    const withoutPermission = globalThis as {
      DeviceOrientationEvent?: unknown;
    };
    delete withoutPermission.DeviceOrientationEvent;
    expect(await requestHeadingAccess()).toBe("unsupported");

    withoutPermission.DeviceOrientationEvent = {
      requestPermission: async () => "granted",
    };
    expect(await requestHeadingAccess()).toBe("granted");

    withoutPermission.DeviceOrientationEvent = {
      requestPermission: async () => "denied",
    };
    expect(await requestHeadingAccess()).toBe("denied");

    withoutPermission.DeviceOrientationEvent = {
      requestPermission: async () => {
        throw new Error("not a gesture");
      },
    };
    expect(await requestHeadingAccess()).toBe("denied");
    delete withoutPermission.DeviceOrientationEvent;
  });
});

describe("the compass subscription", () => {
  it("hands over each new heading once, from either event name, and stops cleanly", () => {
    const source = new FakeOrientationSource();
    const readings: HeadingReading[] = [];
    const watch = new DeviceHeadingWatch(
      (reading) => readings.push(reading),
      source,
      () => PORTRAIT,
    );

    watch.start();
    expect(source.listenerCount()).toBe(2);

    source.emit("deviceorientationabsolute", { absolute: true, alpha: 90 });
    expect(readings).toEqual([
      { degrees: FIXTURE_ALPHA_WEST_DEG, source: "ABSOLUTE_ALPHA" },
    ]);

    // A stationary phone at the sensor's own rate repeats itself; the scene needs one
    // number, not sixty a second.
    source.emit("deviceorientationabsolute", { absolute: true, alpha: 90 });
    expect(readings).toHaveLength(1);

    // iOS fires the plain name instead.
    source.emit("deviceorientation", { absolute: true, alpha: 180 });
    expect(readings.at(-1)).toEqual({
      degrees: 180,
      source: "ABSOLUTE_ALPHA",
    });

    // Nothing that cannot place north reaches the scene at all.
    source.emit("deviceorientation", { absolute: false, alpha: 45 });
    expect(readings).toHaveLength(2);

    watch.stop();
    expect(source.listenerCount()).toBe(0);
    source.emit("deviceorientationabsolute", { absolute: true, alpha: 10 });
    expect(readings).toHaveLength(2);
  });
});
