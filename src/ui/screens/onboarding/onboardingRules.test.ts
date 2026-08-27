import { describe, expect, it } from "vitest";

import {
  hasFavouriteInput,
  isCompletePin,
  isWeakPin,
} from "./onboardingRules";

describe("minimal onboarding rules", () => {
  it("requires one local favourite before continuing", () => {
    expect(hasFavouriteInput("Meera", "demo-phone")).toBe(true);
    expect(hasFavouriteInput("", "demo-phone")).toBe(false);
    expect(hasFavouriteInput("Meera", "")).toBe(false);
  });

  it("requires and rejects the frozen PIN forms", () => {
    expect(isCompletePin("4062")).toBe(true); // fact: pin.accepted.4062
    expect(isCompletePin("4062".slice(0, -1))).toBe(false); // fact: pin.accepted.4062
    expect(isWeakPin("1234")).toBe(true); // fact: pin.rejected.1234
    expect(isWeakPin("1111")).toBe(true); // fact: pin.rejected.1111
    expect(isWeakPin("4062")).toBe(false); // fact: pin.accepted.4062
  });
});
