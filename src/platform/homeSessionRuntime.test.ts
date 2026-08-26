import { describe, expect, it } from "vitest";

import { FakeSessionRepository } from "../data/repository/sessionRepository";
import { DEFAULT_RULES } from "../domain/engine/rules";
import type { Command } from "../domain/model/session";
import { HomeEngineBridge } from "../ui/screens/home/homeEngineBridge";
import type { Clock, Scheduler } from "./clock";
import {
  HomeSessionRuntime,
  type HomeLocationSessionLifecycle,
  type HomeWakeLockLifecycle,
} from "./homeSessionRuntime";

class FakeClock implements Clock {
  now = 0;

  nowEpochMs(): number {
    return this.now;
  }
}

class FakeScheduler implements Scheduler {
  callback: (() => void) | null = null;
  delayMs: number | null = null;

  schedule(callback: () => void, delayMs: number): symbol {
    this.callback = callback;
    this.delayMs = delayMs;
    return Symbol("deadline");
  }

  cancel(): void {
    this.callback = null;
    this.delayMs = null;
  }

  fire(): void {
    const callback = this.callback;
    this.callback = null;
    callback?.();
  }
}

class FakeLocation implements HomeLocationSessionLifecycle {
  started = 0;
  stopped = 0;
  synchronized = 0;

  startAfterConsent(): void {
    this.started += 1;
  }

  stop(): void {
    this.stopped += 1;
  }

  synchronizeSessionState(): void {
    this.synchronized += 1;
  }
}

class FakeWakeLock implements HomeWakeLockLifecycle {
  readonly armed: boolean[] = [];

  async setArmed(armed: boolean): Promise<void> {
    this.armed.push(armed);
  }
}

function harness() {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler();
  const sessions = new FakeSessionRepository();
  const location = new FakeLocation();
  const wakeLock = new FakeWakeLock();
  const commands: Command[] = [];
  const errors: unknown[] = [];
  let runtime: HomeSessionRuntime | null = null;
  const bridge = new HomeEngineBridge(
    DEFAULT_RULES,
    () => "NIGHT_DEEP",
    {
      onCommands(batch, view) {
        runtime?.handle(batch, view.state);
      },
      onView: () => undefined,
    },
    () => "local-session",
  );
  runtime = new HomeSessionRuntime(
    bridge,
    sessions,
    [],
    location,
    wakeLock,
    {
      onCommand: (command) => commands.push(command),
      onError: (error) => errors.push(error),
    },
    clock,
    scheduler,
  );
  return {
    bridge,
    clock,
    commands,
    errors,
    location,
    runtime,
    scheduler,
    sessions,
    wakeLock,
  };
}

describe("M4 browser session command runtime", () => {
  it("persists an absolute deadline and advances the pure engine when it expires", async () => {
    const setup = harness();

    setup.bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: setup.clock.now, zone: null },
    );
    await setup.runtime.waitForIdle();

    expect(setup.sessions.current).toMatchObject({
      state: "SHADOW",
      armMode: "MANUAL",
      armedHourBand: null,
    });
    expect(setup.sessions.current?.deadlineEpochMs).not.toBeNull();
    expect(setup.location.started).toBe(1);
    expect(setup.wakeLock.armed).toContain(true);

    const deadlineEpochMs = setup.sessions.current?.deadlineEpochMs;
    if (deadlineEpochMs === null || deadlineEpochMs === undefined) {
      throw new Error("Manual arm did not persist its deadline");
    }
    setup.clock.now = deadlineEpochMs;
    setup.scheduler.fire();
    await setup.runtime.waitForIdle();

    expect(setup.bridge.snapshot().state).toBe("CHECKIN_1");
    expect(setup.commands).toContainEqual(
      expect.objectContaining({ kind: "ShowCheckIn", step: 1 }),
    );
    expect(setup.errors).toEqual([]);
  });

  it("cleans up a manual disarm without any backend or family effect", async () => {
    const setup = harness();
    setup.bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: setup.clock.now, zone: null },
    );
    await setup.runtime.waitForIdle();

    setup.bridge.dispatch(
      { kind: "ManualDisarm" },
      { nowEpochMs: setup.clock.now, zone: null },
    );
    await setup.runtime.waitForIdle();

    expect(setup.bridge.snapshot().state).toBe("IDLE");
    expect(setup.sessions.current).toBeNull();
    expect(setup.location.stopped).toBe(1);
    expect(setup.wakeLock.armed.at(-1)).toBe(false);
    expect(
      setup.commands.some((command) =>
        ["WriteSusEvent", "WriteSosIncident", "NotifyFamily"].includes(
          command.kind,
        ),
      ),
    ).toBe(false);
  });
});
