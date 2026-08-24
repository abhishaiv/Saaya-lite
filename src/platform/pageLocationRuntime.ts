import type { Rules } from "../domain/model/session";
import type { Zone } from "../domain/model/zone";
import { LocationArmingRuntime, type RuntimeSessionBridge } from "./armingRuntime";
import { browserClock, browserScheduler, type Clock, type Scheduler } from "./clock";
import {
  BrowserLocationWatch,
  browserGeolocation,
  type GeolocationLike,
  type LiveLocationFix,
  type LocationStatus,
  type WatchInterruption,
} from "./locationWatch";

export interface PageLocationCallbacks {
  onStatus(status: LocationStatus): void;
  onLiveFix(fix: LiveLocationFix): void;
  onInterrupted(reason: WatchInterruption): void;
}

export class PageLocationRuntime {
  private readonly arming: LocationArmingRuntime;
  private readonly watch: BrowserLocationWatch;

  constructor(
    zones: readonly Zone[],
    rules: Rules,
    session: RuntimeSessionBridge,
    callbacks: PageLocationCallbacks,
    geolocation: GeolocationLike = browserGeolocation(),
    private readonly clock: Clock = browserClock,
    scheduler: Scheduler = browserScheduler,
  ) {
    this.arming = new LocationArmingRuntime(zones, rules, session, {
      onSamplingChanged: (sampling) => this.watch.setSampling(sampling),
      onLiveFix: callbacks.onLiveFix,
    });
    this.watch = new BrowserLocationWatch(
      geolocation,
      {
        onFix: (fix) => this.arming.acceptLiveFix(fix),
        onStatus: callbacks.onStatus,
        onInterrupted: (reason) => {
          this.arming.interruptWatch(reason, this.clock.nowEpochMs());
          callbacks.onInterrupted(reason);
        },
      },
      clock,
      scheduler,
    );
  }

  startAfterConsent(): void {
    this.arming.start();
    this.watch.startAfterConsent();
  }

  resumePreviouslyConsented(): void {
    this.arming.synchronizeSessionState();
    this.watch.resumePreviouslyConsented();
  }

  pauseForHiddenPage(): void {
    this.watch.pauseForHiddenPage();
  }

  stop(): void {
    this.watch.stop();
  }

  synchronizeSessionState(): void {
    this.arming.synchronizeSessionState();
  }
}
