import {
  FIRST_FIX_SLOW_AFTER_SEC,
  IDLE_SAMPLING_SEC,
  LAST_KNOWN_CENTERING_MAX_AGE_MIN,
} from "../domain/engine/rules";
import type { LatLng } from "../domain/model/zone";
import {
  browserClock,
  browserScheduler,
  minutesToEpochMs,
  secondsToEpochMs,
  type Clock,
  type Scheduler,
} from "./clock";

export interface LiveLocationFix extends LatLng {
  readonly source: "LIVE_WATCH";
  readonly accuracyM: number;
  readonly observedAtEpochMs: number;
}

export interface StoredLocationFix extends LatLng {
  readonly accuracyM: number;
  readonly observedAtEpochMs: number;
}

export interface MapCenterOnlyFix extends LatLng {
  readonly source: "LAST_KNOWN_CENTER_ONLY";
  readonly ageEpochMs: number;
}

export interface LocationSampling {
  readonly intervalSec: number;
  readonly enableHighAccuracy: boolean;
}

export const IDLE_LOCATION_SAMPLING: LocationSampling = {
  intervalSec: IDLE_SAMPLING_SEC,
  enableHighAccuracy: false,
};

export type LocationStatus =
  | "SEARCHING"
  | "CURRENT"
  | "SLOW"
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE";

export type WatchInterruption =
  | "PAGE_HIDDEN"
  | "WATCH_ERROR"
  | "PERMISSION_DENIED"
  | "STOPPED";

export interface LocationWatchCallbacks {
  onFix(fix: LiveLocationFix): void;
  onStatus(status: LocationStatus): void;
  onInterrupted(reason: WatchInterruption): void;
}

export interface GeolocationLike {
  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ): void;
  watchPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ): number;
  clearWatch(watchId: number): void;
}

export class BrowserLocationWatch {
  private sampling: LocationSampling = IDLE_LOCATION_SAMPLING;
  private watchId: number | null = null;
  private consented = false;
  private paused = false;
  private firstFixReceived = false;
  private lastDeliveredEpochMs: number | null = null;
  private slowTimer: unknown = null;
  private permissionDenied = false;

  constructor(
    private readonly geolocation: GeolocationLike,
    private readonly callbacks: LocationWatchCallbacks,
    private readonly clock: Clock = browserClock,
    private readonly scheduler: Scheduler = browserScheduler,
  ) {}

  startAfterConsent(): void {
    if (this.consented && !this.paused && !this.permissionDenied) return;
    this.consented = true;
    this.paused = false;
    this.permissionDenied = false;
    this.firstFixReceived = false;
    this.lastDeliveredEpochMs = null;
    this.callbacks.onStatus("SEARCHING");
    this.scheduleSlowStatus();

    try {
      this.geolocation.getCurrentPosition(
        this.handlePosition,
        this.handleInitialPositionError,
        { enableHighAccuracy: false },
      );
    } catch (error) {
      this.handleSynchronousFailure(error);
    }
    if (!this.permissionDenied) this.replaceWatchSafely();
  }

  resumePreviouslyConsented(): void {
    if (!this.consented || this.permissionDenied) return;
    this.paused = false;
    this.callbacks.onStatus(this.firstFixReceived ? "CURRENT" : "SEARCHING");
    if (!this.firstFixReceived) this.scheduleSlowStatus();
    this.replaceWatchSafely();
  }

  pauseForHiddenPage(): void {
    if (this.paused) return;
    this.paused = true;
    this.lastDeliveredEpochMs = null;
    this.clearPositionWatch();
    this.clearSlowStatus();
    this.callbacks.onInterrupted("PAGE_HIDDEN");
  }

  stop(): void {
    const wasRunning = this.watchId !== null || this.consented;
    this.consented = false;
    this.paused = false;
    this.clearPositionWatch();
    this.clearSlowStatus();
    if (wasRunning) this.callbacks.onInterrupted("STOPPED");
  }

  setSampling(sampling: LocationSampling): void {
    const previousSampling = this.sampling;
    const changed =
      sampling.intervalSec !== this.sampling.intervalSec ||
      sampling.enableHighAccuracy !== this.sampling.enableHighAccuracy;
    this.sampling = sampling;
    if (!changed || !this.consented || this.paused || this.permissionDenied) {
      return;
    }

    // Start the replacement before clearing the old watch. This is a continuous
    // sampling handoff, not a dwell-evidence interruption.
    const previousWatchId = this.watchId;
    try {
      this.watchId = this.startPositionWatch();
      if (previousWatchId !== null) {
        this.geolocation.clearWatch(previousWatchId);
      }
    } catch (error) {
      this.sampling = previousSampling;
      this.watchId = previousWatchId;
      this.handleSynchronousFailure(error);
    }
  }

  private readonly handlePosition: PositionCallback = (position) => {
    if (this.paused || this.permissionDenied) return;
    const deliveredAtEpochMs = this.clock.nowEpochMs();
    const minimumGapEpochMs = secondsToEpochMs(this.sampling.intervalSec);
    if (
      this.lastDeliveredEpochMs !== null &&
      deliveredAtEpochMs - this.lastDeliveredEpochMs < minimumGapEpochMs
    ) {
      return;
    }

    this.firstFixReceived = true;
    this.lastDeliveredEpochMs = deliveredAtEpochMs;
    this.clearSlowStatus();
    this.callbacks.onStatus("CURRENT");
    this.callbacks.onFix({
      source: "LIVE_WATCH",
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyM: position.coords.accuracy,
      observedAtEpochMs: position.timestamp,
    });
  };

  private readonly handleInitialPositionError: PositionErrorCallback = (
    error,
  ) => {
    if (error.code === error.PERMISSION_DENIED) {
      this.handlePermissionDenied();
      return;
    }
    if (!this.firstFixReceived) {
      this.callbacks.onStatus("POSITION_UNAVAILABLE");
    }
  };

  private readonly handleWatchError: PositionErrorCallback = (error) => {
    if (error.code === error.PERMISSION_DENIED) {
      this.handlePermissionDenied();
      return;
    }
    this.lastDeliveredEpochMs = null;
    this.callbacks.onInterrupted("WATCH_ERROR");
    this.callbacks.onStatus("POSITION_UNAVAILABLE");
  };

  private handlePermissionDenied(): void {
    if (this.permissionDenied) return;
    this.permissionDenied = true;
    this.clearPositionWatch();
    this.clearSlowStatus();
    this.callbacks.onInterrupted("PERMISSION_DENIED");
    this.callbacks.onStatus("PERMISSION_DENIED");
  }

  private handleSynchronousFailure(error: unknown): void {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      this.handlePermissionDenied();
      return;
    }
    this.lastDeliveredEpochMs = null;
    this.callbacks.onInterrupted("WATCH_ERROR");
    this.callbacks.onStatus("POSITION_UNAVAILABLE");
  }

  private replaceWatchSafely(): void {
    const previousWatchId = this.watchId;
    try {
      this.watchId = this.startPositionWatch();
      if (previousWatchId !== null) {
        this.geolocation.clearWatch(previousWatchId);
      }
    } catch (error) {
      this.watchId = previousWatchId;
      this.handleSynchronousFailure(error);
    }
  }

  private startPositionWatch(): number {
    return this.geolocation.watchPosition(
      this.handlePosition,
      this.handleWatchError,
      { enableHighAccuracy: this.sampling.enableHighAccuracy },
    );
  }

  private clearPositionWatch(): void {
    if (this.watchId === null) return;
    this.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  private scheduleSlowStatus(): void {
    this.clearSlowStatus();
    this.slowTimer = this.scheduler.schedule(() => {
      this.slowTimer = null;
      if (!this.firstFixReceived && !this.paused && !this.permissionDenied) {
        this.callbacks.onStatus("SLOW");
      }
    }, secondsToEpochMs(FIRST_FIX_SLOW_AFTER_SEC));
  }

  private clearSlowStatus(): void {
    if (this.slowTimer === null) return;
    this.scheduler.cancel(this.slowTimer);
    this.slowTimer = null;
  }
}

export function lastKnownFixForMapCentering(
  fix: StoredLocationFix | null,
  nowEpochMs: number,
): MapCenterOnlyFix | null {
  if (fix === null) return null;
  const ageEpochMs = nowEpochMs - fix.observedAtEpochMs;
  const maximumAgeEpochMs = minutesToEpochMs(
    LAST_KNOWN_CENTERING_MAX_AGE_MIN,
  );
  if (ageEpochMs < 0 || ageEpochMs > maximumAgeEpochMs) return null;

  return {
    source: "LAST_KNOWN_CENTER_ONLY",
    latitude: fix.latitude,
    longitude: fix.longitude,
    ageEpochMs,
  };
}

export function browserGeolocation(): GeolocationLike {
  return navigator.geolocation;
}
