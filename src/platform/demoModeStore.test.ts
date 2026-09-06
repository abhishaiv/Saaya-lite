import { describe, expect, it } from "vitest";

import type { DemoModeStorage } from "./demoModeStore";
import {
  clearDemoArmedSession,
  isDemoArmedSession,
  markDemoArmedSession,
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
  it("marks a session as demo-armed and keeps the mark session-scoped", () => {
    const storage = memoryStorage();
    const demoSessionId = "demo-session";

    markDemoArmedSession(demoSessionId, storage);

    expect(isDemoArmedSession(demoSessionId, storage)).toBe(true);
    expect(isDemoArmedSession("different-session", storage)).toBe(false);
    expect(isDemoArmedSession(demoSessionId, memoryStorage())).toBe(false);
  });

  it("clears the demo mark without touching other sessions", () => {
    const storage = memoryStorage();
    const demoSessionId = "demo-session";

    markDemoArmedSession(demoSessionId, storage);
    markDemoArmedSession("other-demo-session", storage);
    clearDemoArmedSession(demoSessionId, storage);

    expect(isDemoArmedSession(demoSessionId, storage)).toBe(false);
    expect(isDemoArmedSession("other-demo-session", storage)).toBe(true);

    clearDemoArmedSession("never-marked-session", storage);
    expect(isDemoArmedSession("never-marked-session", storage)).toBe(false);
  });

  it("survives browser storage denial without breaking the demo", () => {
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

    expect(() => markDemoArmedSession("demo-session", denied)).not.toThrow();
    expect(isDemoArmedSession("demo-session", denied)).toBe(false);
    expect(() => clearDemoArmedSession("demo-session", denied)).not.toThrow();
  });
});