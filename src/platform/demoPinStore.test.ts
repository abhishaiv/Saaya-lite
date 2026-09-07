import { describe, expect, it } from "vitest";

import {
  PIN_HASH_ALGORITHM,
  type PinHasher,
} from "./pinHash";
import {
  DemoPinStore,
  type DemoPinStorage,
} from "./demoPinStore";

const DEMO_PIN = "4062"; // fact: pin.accepted.4062
const OTHER_PIN = "1234"; // fact: pin.rejected.1234

function memoryStorage(): DemoPinStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    values,
  };
}

function fakeHasher(): PinHasher {
  return {
    create: async (pin) => ({
      algorithm: PIN_HASH_ALGORITHM,
      hashBase64: pin === DEMO_PIN ? "demo-hash" : "other-hash",
      saltBase64: "synthetic-salt",
    }),
    verify: async (pin, stored) =>
      stored.hashBase64 === (pin === DEMO_PIN ? "demo-hash" : "other-hash"),
  };
}

describe("demo PIN store", () => {
  it("stores an independently hashed local record and verifies only that PIN", async () => {
    const storage = memoryStorage();
    const store = new DemoPinStore(fakeHasher(), storage);

    expect(await store.savePin(DEMO_PIN)).toBe(true);
    expect([...storage.values.values()].join(" ")).not.toContain(DEMO_PIN);
    expect(await store.hasPin()).toBe(true);
    expect(await store.verifyPin(DEMO_PIN)).toBe(true);
    expect(await store.verifyPin(OTHER_PIN)).toBe(false);
  });

  it("fails closed for missing, malformed, or unavailable local storage", async () => {
    const store = new DemoPinStore(fakeHasher(), memoryStorage());
    expect(await store.verifyPin(DEMO_PIN)).toBe(false);
    expect(await store.hasPin()).toBe(false);

    const malformed = memoryStorage();
    malformed.setItem("saaya-lite.demo-pin", "not-json");
    expect(await new DemoPinStore(fakeHasher(), malformed).verifyPin(DEMO_PIN)).toBe(false);

    expect(await new DemoPinStore(fakeHasher(), null).savePin(DEMO_PIN)).toBe(false);
  });
});
