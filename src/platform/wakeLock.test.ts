import { describe, expect, it } from "vitest";

import {
  WakeLockController,
  type WakeLockApi,
  type WakeLockSentinelLike,
} from "./wakeLock";

class FakeSentinel implements WakeLockSentinelLike {
  released = false;
  private releaseListener: (() => void) | null = null;

  async release(): Promise<void> {
    this.released = true;
    this.releaseListener?.();
  }

  addEventListener(_type: "release", listener: () => void): void {
    this.releaseListener = listener;
  }
}

class FakeWakeLockApi implements WakeLockApi {
  readonly sentinels: FakeSentinel[] = [];

  async request(_type: "screen"): Promise<WakeLockSentinelLike> {
    const sentinel = new FakeSentinel();
    this.sentinels.push(sentinel);
    return sentinel;
  }
}

describe("screen wake lock", () => {
  it("holds only while armed and visible, then reacquires on return", async () => {
    const api = new FakeWakeLockApi();
    const controller = new WakeLockController(api);

    await controller.setArmed(true);
    expect(controller.isHeld()).toBe(true);
    expect(api.sentinels).toHaveLength(1);

    await controller.setVisible(false);
    expect(controller.isHeld()).toBe(false);
    expect(api.sentinels[0]?.released).toBe(true);

    await controller.setVisible(true);
    expect(controller.isHeld()).toBe(true);
    expect(api.sentinels).toHaveLength(2);

    await controller.setArmed(false);
    expect(controller.isHeld()).toBe(false);
  });

  it("ignores an unavailable or rejected Wake Lock API", async () => {
    const unsupported = new WakeLockController(null);
    await expect(unsupported.setArmed(true)).resolves.toBeUndefined();

    const rejected = new WakeLockController({
      request: async () => {
        throw new Error("browser refused");
      },
    });
    await expect(rejected.setArmed(true)).resolves.toBeUndefined();
    expect(rejected.isHeld()).toBe(false);
  });
});
