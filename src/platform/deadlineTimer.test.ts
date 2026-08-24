import { describe, expect, it } from "vitest";

import { FakeSessionRepository } from "../data/repository/sessionRepository";
import { CHECK_IN_2_SEC } from "../domain/engine/rules";
import type { PersistedSession, TimerId } from "../domain/model/session";
import { secondsToEpochMs } from "./clock";
import { AbsoluteDeadlineTimer } from "./deadlineTimer";

class FakeClock {
  now = 0;

  nowEpochMs(): number {
    return this.now;
  }
}

class FakeScheduler {
  callback: (() => void) | null = null;
  delayMs: number | null = null;

  schedule(callback: () => void, delayMs: number): symbol {
    this.callback = callback;
    this.delayMs = delayMs;
    return Symbol("timer");
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

function persistedSession(): PersistedSession {
  return {
    sessionId: "synthetic-session",
    state: "CHECKIN_1",
    armMode: "MANUAL",
    zoneId: null,
    armedAtEpochMs: 0,
    armedHourBand: null,
    deadlineEpochMs: null,
    susEventWritten: false,
  };
}

describe("absolute deadline timer", () => {
  it("persists an absolute deadline before scheduling a visible-tab hint", async () => {
    const repository = new FakeSessionRepository();
    const clock = new FakeClock();
    const scheduler = new FakeScheduler();
    const fired: TimerId[] = [];
    const timer = new AbsoluteDeadlineTimer(
      repository,
      (timerId) => fired.push(timerId),
      clock,
      scheduler,
    );

    const persisted = await timer.schedule(
      persistedSession(),
      "CD1",
      CHECK_IN_2_SEC,
    );
    const expectedDeadline = secondsToEpochMs(CHECK_IN_2_SEC);
    expect(persisted.deadlineEpochMs).toBe(expectedDeadline);
    expect(repository.current?.deadlineEpochMs).toBe(expectedDeadline);
    expect(scheduler.delayMs).toBe(expectedDeadline);

    clock.now = expectedDeadline;
    scheduler.fire();
    expect(fired).toEqual(["CD1"]);
  });

  it("does not trust an early timeout hint", async () => {
    const repository = new FakeSessionRepository();
    const clock = new FakeClock();
    const scheduler = new FakeScheduler();
    const fired: TimerId[] = [];
    const timer = new AbsoluteDeadlineTimer(
      repository,
      (timerId) => fired.push(timerId),
      clock,
      scheduler,
    );
    await timer.schedule(persistedSession(), "CD1", CHECK_IN_2_SEC);

    scheduler.fire();
    expect(fired).toEqual([]);
    expect(scheduler.delayMs).toBe(secondsToEpochMs(CHECK_IN_2_SEC));
  });
});
