import { describe, expect, it } from "vitest";

import { BrowserPinHasher, PIN_HASH_ALGORITHM } from "./pinHash";

const ACCEPTED_PIN = "4062"; // fact: pin.accepted.4062
const REJECTED_PIN = "1234"; // fact: pin.rejected.1234

describe("browser PIN hashing", () => {
  it("stores a salted browser hash without retaining the plaintext PIN", async () => {
    const hasher = new BrowserPinHasher();

    const stored = await hasher.create(ACCEPTED_PIN);

    expect(stored.algorithm).toBe(PIN_HASH_ALGORITHM);
    expect(JSON.stringify(stored)).not.toContain(ACCEPTED_PIN);
    expect(await hasher.verify(ACCEPTED_PIN, stored)).toBe(true);
    expect(await hasher.verify(REJECTED_PIN, stored)).toBe(false);
  });
});
