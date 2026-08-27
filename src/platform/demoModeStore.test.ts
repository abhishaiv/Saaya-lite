import { describe, expect, it } from "vitest";

import type { DemoModeStorage } from "./demoModeStore";
import {
  clearDemoArmedSession,
  isDemoArmedSession,
  loadDemoSpeedEnabled,
  markDemoArmedSession,
  saveDemoSpeedEnabled,
} from "./demoModeStore";

function memoryStorage(): DemoModeStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("demo mode storage", () => {
  it("keeps the visible demo label active across session recovery", () => {
    const storage = memoryStorage();
    saveDemoSpeedEnabled(true, storage);
    expect(loadDemoSpeedEnabled(storage)).toBe(true);

    saveDemoSpeedEnabled(false, storage);
    expect(loadDemoSpeedEnabled(storage)).toBe(false);
  });

  it("keeps demo identity session-scoped when the speed toggle changes", () => {
    const storage = memoryStorage();
    const demoSessionId = "demo-session";

    markDemoArmedSession(demoSessionId, storage);
    saveDemoSpeedEnabled(false, storage);

    expect(isDemoArmedSession(demoSessionId, storage)).toBe(true);
    expect(isDemoArmedSession("different-session", storage)).toBe(false);

    clearDemoArmedSession(demoSessionId, storage);
    expect(isDemoArmedSession(demoSessionId, storage)).toBe(false);
  });

  it("degrades to in-memory mode when browser storage is unavailable", () => {
    const denied: DemoModeStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(loadDemoSpeedEnabled(denied)).toBe(false);
    expect(() => saveDemoSpeedEnabled(true, denied)).not.toThrow();
    expect(isDemoArmedSession("demo-session", denied)).toBe(false);
    expect(() => markDemoArmedSession("demo-session", denied)).not.toThrow();
    expect(() => clearDemoArmedSession("demo-session", denied)).not.toThrow();
  });
});
