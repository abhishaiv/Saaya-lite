import { describe, expect, it } from "vitest";

import {
  hasFavouriteInput,
  isCompletePin,
  isValidIndianMobileNumber,
  isWeakPin,
  ONBOARDING_PHONE_COUNTRY_CODE,
  ONBOARDING_PHONE_DIGITS,
  toIndianE164,
} from "./onboardingRules";

describe("minimal onboarding rules", () => {
  it("requires one local favourite with a complete Indian mobile number", () => {
    const validPhone = ONBOARDING_PHONE_COUNTRY_CODE.replace("+", "")
      .repeat(ONBOARDING_PHONE_DIGITS)
      .substring(0, ONBOARDING_PHONE_DIGITS); // GROUNDED-EXEMPT: test string starts at index zero.
    const firstDigit = validPhone.charAt(0); // GROUNDED-EXEMPT: test string index.

    expect(ONBOARDING_PHONE_COUNTRY_CODE).toBe("+91"); // fact: onboarding.phone.country_code
    expect(validPhone).toHaveLength(ONBOARDING_PHONE_DIGITS); // fact: onboarding.phone.digits
    expect(isValidIndianMobileNumber(validPhone)).toBe(true);
    expect(isValidIndianMobileNumber(validPhone.slice(1))).toBe(false);
    expect(isValidIndianMobileNumber(`${validPhone}${firstDigit}`)).toBe(false);
    expect(
      isValidIndianMobileNumber(validPhone.replace(firstDigit, " ")),
    ).toBe(false);
    expect(toIndianE164(validPhone)).toBe(
      `${ONBOARDING_PHONE_COUNTRY_CODE}${validPhone}`,
    );
    expect(hasFavouriteInput("Meera", validPhone)).toBe(true);
    expect(hasFavouriteInput("", validPhone)).toBe(false);
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
