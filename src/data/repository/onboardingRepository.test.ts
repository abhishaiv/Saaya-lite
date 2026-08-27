import { describe, expect, it } from "vitest";

import {
  PIN_HASH_ALGORITHM,
  type PinHasher,
  type StoredPinHash,
} from "../../platform/pinHash";
import { FakeOnboardingRepository } from "./onboardingRepository";

const STORED: StoredPinHash = {
  algorithm: PIN_HASH_ALGORITHM,
  hashBase64: "hashed",
  saltBase64: "salted",
};

const fakeHasher: PinHasher = {
  async create() {
    return STORED;
  },
  async verify(pin) {
    return pin === "4062"; // fact: pin.accepted.4062
  },
};

describe("onboarding repository", () => {
  it("keeps the first favourite and PIN entirely local before marking onboarding complete", async () => {
    const repository = new FakeOnboardingRepository(fakeHasher);

    await repository.saveUserName("Meera");
    await repository.savePrimaryFavourite({ name: "Asha", phone: "demo-phone" });
    await repository.savePin("4062"); // fact: pin.accepted.4062
    await repository.saveOnboarded();

    expect(await repository.loadOnboarded()).toBe(true);
    expect(await repository.loadPrimaryFavourite()).toEqual({
      name: "Asha",
      phone: "demo-phone",
    });
    expect(await repository.loadUserName()).toBe("Meera");
    expect(await repository.verifyPin("4062")).toBe(true); // fact: pin.accepted.4062
  });
});
