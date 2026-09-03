export const PIN_LENGTH = 4; // fact: pin.length
const SEQUENTIAL_WEAK_PIN = "1234"; // fact: pin.rejected.1234

/** The phone field receives only the national number; the prefix is fixed in the UI. */
export const ONBOARDING_PHONE_COUNTRY_CODE = "+91"; // fact: onboarding.phone.country_code
export const ONBOARDING_PHONE_DIGITS = 10; // fact: onboarding.phone.digits

export function isValidIndianMobileNumber(phoneDigits: string): boolean {
  return (
    phoneDigits.length === ONBOARDING_PHONE_DIGITS && /^\d+$/.test(phoneDigits)
  );
}

export function toIndianE164(phoneDigits: string): string {
  return `${ONBOARDING_PHONE_COUNTRY_CODE}${phoneDigits}`;
}

export function hasFavouriteInput(name: string, phone: string): boolean {
  return name.trim().length > 0 && isValidIndianMobileNumber(phone);
}

/** Her name is optional; the real favourite remains required for the message preview. */
export function canContinueFromFavouriteStep(input: Readonly<{
  favouriteName: string;
  phone: string;
  userName: string;
}>): boolean {
  void input.userName;
  return hasFavouriteInput(input.favouriteName, input.phone);
}

export function isCompletePin(value: string): boolean {
  return value.length === PIN_LENGTH;
}

export function isWeakPin(pin: string): boolean {
  const [firstDigit] = pin;
  return (
    pin === SEQUENTIAL_WEAK_PIN ||
    (firstDigit !== undefined && [...pin].every((digit) => digit === firstDigit))
  );
}
