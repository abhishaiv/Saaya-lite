import { describe, expect, it } from "vitest";

import { FakeSessionRepository } from "../data/repository/sessionRepository";
import { DEFAULT_RULES, DEMO_RULES } from "../domain/engine/rules";
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

function harness(wakeLock = new FakeWakeLock()) {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler();
  const sessions = new FakeSessionRepository();
  const location = new FakeLocation();
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
  it("starts the demo deadline immediately even if Wake Lock never settles", async () => {
    const wake = new FakeWakeLock();
    wake.setArmed = () => new Promise(() => undefined);
    const setup = harness(wake);
    setup.bridge.setRules(DEMO_RULES);
    setup.bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    setup.bridge.dispatch({ kind: "CheckInTimerFired" }, { nowEpochMs: 0, zone: null });
    const deadline = DEMO_RULES.ladder.window1Sec * 1000;
    expect(setup.bridge.view().deadlineEpochMs).toBe(deadline);
    await setup.runtime.waitForIdle();
    expect(setup.sessions.current?.deadlineEpochMs).toBe(deadline);
    setup.clock.now = deadline;
    setup.scheduler.fire();
    await setup.runtime.waitForIdle();
    expect(setup.bridge.view().state).toBe("CHECKIN_2");
    expect(setup.bridge.view().deadlineEpochMs).toBe(deadline + DEMO_RULES.ladder.window2Sec * 1000);
  });

  it("an already queued stale callback cannot expire a fresh OK deadline", async () => {
    const setup = harness();
    setup.bridge.setRules(DEMO_RULES);
    setup.bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    setup.bridge.dispatch({ kind: "CheckInTimerFired" }, { nowEpochMs: 0, zone: null });
    const staleCallback = setup.scheduler.callback;
    setup.clock.now = DEMO_RULES.ladder.window1Sec * 1000;
    setup.bridge.dispatch({ kind: "OkTapped" }, { nowEpochMs: setup.clock.now, zone: null });
    staleCallback?.();
    await setup.runtime.waitForIdle();
    expect(setup.bridge.view().state).toBe("SHADOW");
    expect(setup.sessions.current?.deadlineEpochMs).toBe(setup.clock.now + DEMO_RULES.ladder.okResetSec * 1000);
  });

  it("catches up all elapsed demo windows once without restarting their clocks", async () => {
    const setup = harness();
    setup.bridge.setRules(DEMO_RULES);
    setup.bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    setup.bridge.dispatch({ kind: "CheckInTimerFired" }, { nowEpochMs: 0, zone: null });
    const saved = setup.bridge.persistedSession()!;
    const end = (DEMO_RULES.ladder.window1Sec + DEMO_RULES.ladder.window2Sec + DEMO_RULES.ladder.window3Sec) * 1000;
    setup.commands.length = 0;
    setup.bridge.recover(saved, { nowEpochMs: end, zone: null });
    await setup.runtime.waitForIdle();
    expect(setup.bridge.view().state).toBe("SOS_ACTIVE");
    expect(setup.commands.filter(({kind}) => kind === "RequestFamilyAlert")).toHaveLength(1);
    expect(setup.commands.filter(({kind}) => kind === "WriteSosIncident")).toHaveLength(1);
    expect(setup.commands.filter(({kind}) => kind === "ShowCheckIn")).toHaveLength(0);
    expect(setup.sessions.current?.deadlineEpochMs).toBeNull();
    setup.commands.length = 0;
    setup.bridge.recover(setup.sessions.current!, { nowEpochMs: end, zone: null });
    expect(setup.commands.filter(({kind}) => kind === "RequestFamilyAlert")).toHaveLength(0);
  });

  it("keeps first-miss identity stable on recovery and changes it after OK", async () => {
    const setup = harness();
    setup.bridge.setRules(DEMO_RULES);
    setup.bridge.dispatch({ kind: "ManualArm" }, { nowEpochMs: 0, zone: null });
    setup.bridge.dispatch({ kind: "CheckInTimerFired" }, { nowEpochMs: 0, zone: null });
    const saved = setup.bridge.persistedSession()!;
    setup.clock.now = saved.deadlineEpochMs!;
    setup.scheduler.fire();
    const first = setup.bridge.familyAlertOperationId();
    setup.bridge.recover(saved, { nowEpochMs: setup.clock.now, zone: null });
    expect(setup.bridge.familyAlertOperationId()).toBe(first);
    setup.bridge.dispatch({ kind: "OkTapped" }, { nowEpochMs: setup.clock.now, zone: null });
    setup.clock.now = setup.bridge.view().deadlineEpochMs!;
    setup.scheduler.fire();
    setup.clock.now = setup.bridge.view().deadlineEpochMs!;
    setup.scheduler.fire();
    expect(setup.bridge.familyAlertOperationId()).not.toBe(first);
    await setup.runtime.waitForIdle();
  });
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
