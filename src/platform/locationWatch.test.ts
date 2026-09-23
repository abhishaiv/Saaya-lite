import { describe, expect, it } from "vitest";

import {
  FIRST_FIX_SLOW_AFTER_SEC,
  IDLE_SAMPLING_SEC,
  LAST_KNOWN_CENTERING_MAX_AGE_MIN,
  MAX_CONTAINMENT_ACCURACY_M,
  PENDING_DWELL_SAMPLING_SEC,
} from "../domain/engine/rules";
import { bundledZoneData } from "../data/zone/zoneLoader";
import { minutesToEpochMs, secondsToEpochMs } from "./clock";
import {
  BrowserLocationWatch,
  lastKnownFixForMapCentering,
  readCurrentPositionFix,
  type GeolocationLike,
  type LiveLocationFix,
  type LocationStatus,
  type WatchInterruption,
} from "./locationWatch";

class FakeClock {
  now = 0;

  nowEpochMs(): number {
    return this.now;
  }
}

interface ScheduledTask {
  readonly callback: () => void;
  readonly dueEpochMs: number;
  cancelled: boolean;
}

class FakeScheduler {
  readonly tasks: ScheduledTask[] = [];

  constructor(private readonly clock: FakeClock) {}

  schedule(callback: () => void, delayMs: number): ScheduledTask {
    const task = {
      callback,
      dueEpochMs: this.clock.now + delayMs,
      cancelled: false,
    };
    this.tasks.push(task);
    return task;
  }

  cancel(handle: unknown): void {
    (handle as ScheduledTask).cancelled = true;
  }

  advanceTo(nowEpochMs: number): void {
    this.clock.now = nowEpochMs;
    for (const task of this.tasks) {
      if (!task.cancelled && task.dueEpochMs <= nowEpochMs) {
        task.cancelled = true;
        task.callback();
      }
    }
  }
}

class FakeGeolocation implements GeolocationLike {
  initialSuccess: PositionCallback | null = null;
  initialError: PositionErrorCallback | null = null;
  readonly oneShotOptions: (PositionOptions | undefined)[] = [];
  readonly watchOptions: PositionOptions[] = [];
  readonly cleared: number[] = [];
  private nextWatchId = 1; // GROUNDED-EXEMPT: opaque fake browser handle seed.
  private readonly watches = new Map<
    number,
    { success: PositionCallback; error: PositionErrorCallback | null }
  >();

  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ): void {
    this.initialSuccess = success;
    this.initialError = error ?? null;
    this.oneShotOptions.push(options);
  }

  watchPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options: PositionOptions = {},
  ): number {
    const id = this.nextWatchId;
    this.nextWatchId += 1;
    this.watches.set(id, { success, error: error ?? null });
    this.watchOptions.push(options);
    return id;
  }

  clearWatch(watchId: number): void {
    this.cleared.push(watchId);
    this.watches.delete(watchId);
  }

  emit(position: GeolocationPosition): void {
    for (const watch of this.watches.values()) watch.success(position);
  }

  fail(error: GeolocationPositionError): void {
    for (const watch of this.watches.values()) watch.error?.(error);
  }
}

function position(timestamp: number): GeolocationPosition {
  const coordinate = bundledZoneData.zones[0]?.centroid;
  if (coordinate === undefined) throw new Error("Frozen zone centroid is missing");
  return {
    timestamp,
    coords: {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracy: MAX_CONTAINMENT_ACCURACY_M,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    toJSON: () => ({}),
  };
}

function setup() {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const geolocation = new FakeGeolocation();
  const fixes: LiveLocationFix[] = [];
  const displayFixes: LiveLocationFix[] = [];
  const statuses: LocationStatus[] = [];
  const interruptions: WatchInterruption[] = [];
  const watch = new BrowserLocationWatch(
    geolocation,
    {
      onFix: (fix) => fixes.push(fix),
      onDisplayFix: (fix) => displayFixes.push(fix),
      onStatus: (status) => statuses.push(status),
      onInterrupted: (reason) => interruptions.push(reason),
    },
    clock,
    scheduler,
  );
  return {
    clock,
    scheduler,
    geolocation,
    fixes,
    displayFixes,
    statuses,
    interruptions,
    watch,
  };
}

describe("browser location watch", () => {
  it("does not manufacture consent when visibility recovery runs before a grant", () => {
    const harness = setup();

    harness.watch.resumePreviouslyConsented();

    expect(harness.geolocation.watchOptions).toEqual([]);
    expect(harness.statuses).toEqual([]);
  });

  it("starts only after consent and reports a slow first fix while continuing", () => {
    const harness = setup();
    expect(harness.geolocation.watchOptions).toEqual([]);

    harness.watch.startAfterConsent();
    expect(harness.geolocation.watchOptions).toEqual([
      { enableHighAccuracy: false },
    ]);
    expect(harness.statuses).toEqual(["SEARCHING"]);

    harness.scheduler.advanceTo(secondsToEpochMs(FIRST_FIX_SLOW_AFTER_SEC));
    expect(harness.statuses.at(-1)).toBe("SLOW");

    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.statuses.at(-1)).toBe("CURRENT");
    expect(harness.fixes).toHaveLength(1);
  });

  it("hands off continuously to the exact pending-dwell sampling policy", () => {
    const harness = setup();
    harness.watch.startAfterConsent();
    harness.geolocation.emit(position(harness.clock.now));

    harness.watch.setSampling({
      intervalSec: PENDING_DWELL_SAMPLING_SEC,
      enableHighAccuracy: true,
      forwardEveryFix: false,
    });

    expect(harness.geolocation.watchOptions.at(-1)).toEqual({
      enableHighAccuracy: true,
    });
    expect(harness.geolocation.cleared).toHaveLength(1);
    expect(harness.interruptions).toEqual([]);
  });

  it("hands the map every fix the cadence rejected, and evidence none of them", () => {
    // Founder finding, 2026-09-23: the map did not move when he moved. The browser was
    // delivering about one fix a second and this gate was dropping all but one every
    // thirty, so the picture was frozen at the evidence cadence. The fix goes to the map
    // and nowhere else.
    const harness = setup();
    harness.watch.startAfterConsent();
    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.fixes).toHaveLength(1);

    harness.watch.setSampling({
      intervalSec: IDLE_SAMPLING_SEC,
      enableHighAccuracy: false,
      forwardEveryFix: true,
    });
    // A display stream is not a sampling change: no watch is restarted for it.
    expect(harness.geolocation.cleared).toEqual([]);

    harness.clock.now = secondsToEpochMs(IDLE_SAMPLING_SEC) - 1;
    harness.geolocation.emit(position(harness.clock.now));
    // Too soon to be evidence, and still where she is.
    expect(harness.fixes).toHaveLength(1);
    expect(harness.displayFixes).toHaveLength(1);
    // It did not touch the status channel either, so nothing downstream can read it as a
    // fresh sample of her position.
    expect(harness.statuses).toEqual(["SEARCHING", "CURRENT"]);

    // With the stream off the map is back on the cadence, which is the recorded default.
    harness.watch.setSampling({
      intervalSec: IDLE_SAMPLING_SEC,
      enableHighAccuracy: false,
      forwardEveryFix: false,
    });
    harness.clock.now = secondsToEpochMs(IDLE_SAMPLING_SEC) - 1;
    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.displayFixes).toHaveLength(1);
    expect(harness.fixes).toHaveLength(1);
  });

  it("throttles delivered fixes to the current sampling interval", () => {
    const harness = setup();
    harness.watch.startAfterConsent();
    harness.geolocation.emit(position(harness.clock.now));

    harness.clock.now = secondsToEpochMs(IDLE_SAMPLING_SEC) - 1;
    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.fixes).toHaveLength(1);

    harness.clock.now = secondsToEpochMs(IDLE_SAMPLING_SEC);
    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.fixes).toHaveLength(2);
  });

  it("stops while hidden and resets dwell evidence through the interruption", () => {
    const harness = setup();
    harness.watch.startAfterConsent();
    harness.watch.pauseForHiddenPage();

    expect(harness.interruptions).toEqual(["PAGE_HIDDEN"]);
    const watchCount = harness.geolocation.watchOptions.length;
    harness.watch.resumePreviouslyConsented();
    expect(harness.geolocation.watchOptions).toHaveLength(watchCount + 1);
  });

  it("maps permission denial honestly and stops the watch", () => {
    const harness = setup();
    harness.watch.startAfterConsent();
    const permissionDeniedCode = 1; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const positionUnavailableCode = 2; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const timeoutCode = 3; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const error = {
      code: permissionDeniedCode,
      message: "denied",
      PERMISSION_DENIED: permissionDeniedCode,
      POSITION_UNAVAILABLE: positionUnavailableCode,
      TIMEOUT: timeoutCode,
    } as GeolocationPositionError;
    harness.geolocation.fail(error);

    expect(harness.interruptions).toEqual(["PERMISSION_DENIED"]);
    expect(harness.statuses.at(-1)).toBe("PERMISSION_DENIED");
  });

  it("re-requests after a remembered denial and can recover after permission changes", () => {
    const harness = setup();
    const permissionDeniedCode = 1; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const positionUnavailableCode = 2; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const timeoutCode = 3; // GROUNDED-EXEMPT: Web Geolocation API error enum.
    const denied = {
      code: permissionDeniedCode,
      message: "denied",
      PERMISSION_DENIED: permissionDeniedCode,
      POSITION_UNAVAILABLE: positionUnavailableCode,
      TIMEOUT: timeoutCode,
    } as GeolocationPositionError;

    harness.watch.startAfterConsent();
    harness.geolocation.fail(denied);
    const watchCountAfterDenial = harness.geolocation.watchOptions.length;

    harness.watch.startAfterConsent();
    expect(harness.statuses.at(-1)).toBe("SEARCHING");
    expect(harness.geolocation.watchOptions).toHaveLength(
      watchCountAfterDenial + 1,
    );

    harness.geolocation.emit(position(harness.clock.now));
    expect(harness.statuses.at(-1)).toBe("CURRENT");
    expect(harness.fixes).toHaveLength(1);
  });

  it("returns a recent stored fix for centring only, never as a live fix", () => {
    const nowEpochMs = minutesToEpochMs(LAST_KNOWN_CENTERING_MAX_AGE_MIN);
    const coordinate = bundledZoneData.zones[0]?.centroid;
    if (coordinate === undefined) throw new Error("Frozen zone centroid is missing");
    const stored = {
      ...coordinate,
      accuracyM: MAX_CONTAINMENT_ACCURACY_M,
      observedAtEpochMs: 0,
    };

    expect(lastKnownFixForMapCentering(stored, nowEpochMs)).toMatchObject({
      source: "LAST_KNOWN_CENTER_ONLY",
      ageEpochMs: nowEpochMs,
    });
    expect(
      lastKnownFixForMapCentering(stored, nowEpochMs + 1),
    ).toBeNull();
  });
});

describe("readCurrentPositionFix", () => {
  it("reads one live fix from the position the browser hands back", async () => {
    const coordinate = bundledZoneData.zones[0]?.centroid;
    if (coordinate === undefined) throw new Error("Frozen zone centroid is missing");
    const geolocation = new FakeGeolocation();
    const read = readCurrentPositionFix(geolocation);
    geolocation.initialSuccess?.(position(0));

    await expect(read).resolves.toEqual({
      source: "LIVE_WATCH",
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracyM: MAX_CONTAINMENT_ACCURACY_M,
      observedAtEpochMs: 0,
    });
  });

  it("gives the browser a deadline and accepts the fix the permission ask just took", () => {
    const geolocation = new FakeGeolocation();
    void readCurrentPositionFix(geolocation);

    expect(geolocation.oneShotOptions.at(-1)).toMatchObject({
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 10_000,
    });
  });

  it("resolves null on a failed read rather than holding setup on it", async () => {
    const geolocation = new FakeGeolocation();
    const read = readCurrentPositionFix(geolocation);
    geolocation.initialError?.({
      code: 2,
      message: "unavailable",
    } as GeolocationPositionError);

    await expect(read).resolves.toBeNull();
  });

  it("resolves null when geolocation throws instead of calling back", async () => {
    const throwing: GeolocationLike = {
      getCurrentPosition() {
        throw new Error("no geolocation");
      },
      watchPosition() {
        return 0; // GROUNDED-EXEMPT: opaque fake browser handle.
      },
      clearWatch() {},
    };

    await expect(readCurrentPositionFix(throwing)).resolves.toBeNull();
  });
});
