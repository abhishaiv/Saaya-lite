import { describe, expect, it } from "vitest";

import { bundledZoneData } from "../data/zone/zoneLoader";
import { FakeSessionRepository } from "../data/repository/sessionRepository";
import { onEvent } from "../domain/engine/sessionEngine";
import {
  CANCEL_WINDOW_SEC,
  CHECK_IN_2_SEC,
  DEFAULT_RULES,
} from "../domain/engine/rules";
import type {
  EngineContext,
  EngineResult,
  PersistedSession,
} from "../domain/model/session";
import { secondsToEpochMs } from "./clock";
import {
  TabLifecycleController,
  type LocationLifecycle,
  type SessionRecoveryBridge,
  type VisibilitySource,
  type WakeLockLifecycle,
} from "./tabLifecycle";

class FakeClock {
  now = 0;

  nowEpochMs(): number {
    return this.now;
  }
}

class FakeVisibility implements VisibilitySource {
  visibilityState: "visible" | "hidden" = "visible";
  private listener: (() => void) | null = null;

  addEventListener(_type: "visibilitychange", listener: () => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: "visibilitychange", listener: () => void): void {
    if (this.listener === listener) this.listener = null;
  }

  changeTo(state: "visible" | "hidden"): void {
    this.visibilityState = state;
    this.listener?.();
  }
}

class FakeLocation implements LocationLifecycle {
  resumed = 0;
  paused = 0;
  stopped = 0;

  resumePreviouslyConsented(): void {
    this.resumed += 1;
  }

  pauseForHiddenPage(): void {
    this.paused += 1;
  }

  stop(): void {
    this.stopped += 1;
  }
}

class FakeWakeLock implements WakeLockLifecycle {
  readonly armed: boolean[] = [];
  readonly visible: boolean[] = [];

  async setArmed(armed: boolean): Promise<void> {
    this.armed.push(armed);
  }

  async setVisible(visible: boolean): Promise<void> {
    this.visible.push(visible);
  }
}

class EngineRecoveryBridge implements SessionRecoveryBridge {
  result: EngineResult | null = null;

  async recover(
    persisted: PersistedSession,
    nowEpochMs: number,
  ): Promise<{ readonly state: EngineResult["state"] }> {
    const zone = bundledZoneData.zones.find(
      (candidate) => candidate.stationId === persisted.zoneId,
    );
    const context: EngineContext = {
      nowEpochMs,
      zone: zone ?? null,
      hourBand: "NIGHT_DEEP",
      armedHourBand: persisted.armedHourBand,
      rules: DEFAULT_RULES,
      armMode: persisted.armMode,
      armedAtEpochMs: persisted.armedAtEpochMs,
      deadlineEpochMs: persisted.deadlineEpochMs,
      cooldowns: {},
      hasFavourite: true,
      susEventWritten: persisted.susEventWritten,
    };
    this.result = onEvent(
      "IDLE",
      { kind: "AppKilledRestart", persisted },
      context,
    );
    return { state: this.result.state };
  }

  mayResumeLocation(): boolean {
    return true;
  }
}

function autoSession(
  state: PersistedSession["state"],
  deadlineEpochMs: number,
): PersistedSession {
  const zone = bundledZoneData.zones[0];
  if (zone === undefined) throw new Error("Frozen zone is missing");
  return {
    sessionId: "synthetic-session",
    state,
    armMode: "AUTO_ZONE",
    zoneId: zone.stationId,
    armedAtEpochMs: 0,
    armedHourBand: "NIGHT_DEEP",
    deadlineEpochMs,
    susEventWritten: state === "FAMILY_ESCALATED",
  };
}

describe("tab recovery", () => {
  it("recomputes a CHECKIN_2 countdown from its absolute deadline", async () => {
    const clock = new FakeClock();
    const visibility = new FakeVisibility();
    const sessions = new FakeSessionRepository();
    const recovery = new EngineRecoveryBridge();
    const location = new FakeLocation();
    const wakeLock = new FakeWakeLock();
    const deadlineEpochMs = secondsToEpochMs(CHECK_IN_2_SEC);
    sessions.current = autoSession("CHECKIN_2", deadlineEpochMs);
    sessions.heartbeat = { ownerId: "stopped-page", lastSeenEpochMs: clock.now };
    let pageStoppedWarnings = 0;
    const controller = new TabLifecycleController(
      visibility,
      sessions,
      recovery,
      location,
      wakeLock,
      "page",
      {
        onPageStopped: () => {
          pageStoppedWarnings += 1;
        },
        onRecoveryError: (error) => {
          throw error;
        },
      },
      clock,
    );
    await controller.start();

    clock.now = deadlineEpochMs / 2; // GROUNDED-EXEMPT: test advances halfway through the frozen deadline.
    visibility.changeTo("hidden");
    await controller.waitForIdle();
    visibility.changeTo("visible");
    await controller.waitForIdle();

    expect(recovery.result?.state).toBe("CHECKIN_2");
    expect(recovery.result?.commands).toContainEqual({
      kind: "ShowCheckIn",
      step: 2,
      countdownSec: CHECK_IN_2_SEC / 2, // GROUNDED-EXEMPT: remaining half of the frozen countdown.
      urgency: "URGENT",
    });
    expect(location.paused).toBe(1);
    expect(location.resumed).toBe(2);
    expect(wakeLock.visible).toEqual([false, true]);
    expect(pageStoppedWarnings).toBe(1);
  });

  it("advances an overdue family window to sticky SOS without a false nothing-sent warning", async () => {
    const clock = new FakeClock();
    const visibility = new FakeVisibility();
    const sessions = new FakeSessionRepository();
    const recovery = new EngineRecoveryBridge();
    const location = new FakeLocation();
    const wakeLock = new FakeWakeLock();
    const deadlineEpochMs = secondsToEpochMs(CANCEL_WINDOW_SEC);
    sessions.current = autoSession("FAMILY_ESCALATED", deadlineEpochMs);
    sessions.heartbeat = { ownerId: "page", lastSeenEpochMs: 0 };
    clock.now = deadlineEpochMs;
    let pageStoppedWarnings = 0;
    const controller = new TabLifecycleController(
      visibility,
      sessions,
      recovery,
      location,
      wakeLock,
      "page",
      {
        onPageStopped: () => {
          pageStoppedWarnings += 1;
        },
        onRecoveryError: (error) => {
          throw error;
        },
      },
      clock,
    );

    await controller.start();

    expect(recovery.result?.state).toBe("SOS_ACTIVE");
    expect(recovery.result?.commands).toContainEqual({ kind: "ShowSos" });
    expect(pageStoppedWarnings).toBe(0);
    expect(wakeLock.armed.at(-1)).toBe(true);
  });
});
