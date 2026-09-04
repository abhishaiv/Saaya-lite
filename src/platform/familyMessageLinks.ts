export interface FamilyMessageLinks {
  readonly sms: string;
  readonly whatsapp: string;
}

/**
 * Builds only device-owned handoffs. The body is supplied by the one rendered
 * family-message template so a deep link cannot drift from the visible message.
 */
export function createFamilyMessageLinks(
  favouritePhone: string,
  message: string,
): FamilyMessageLinks | null {
  if (!hasValidFamilyMessageRecipient(favouritePhone)) return null;

  const encodedSmsRecipient = encodeURIComponent(favouritePhone);
  const encodedWhatsappRecipient = encodeURIComponent(favouritePhone.slice(1));
  const encodedMessage = encodeURIComponent(message);
  return {
    sms: `sms:${encodedSmsRecipient}?body=${encodedMessage}`,
    whatsapp: `whatsapp://send?phone=${encodedWhatsappRecipient}&text=${encodedMessage}`,
  };
}

/** Validates the exact locally stored favourite-phone contract without creating a URI. */
export function hasValidFamilyMessageRecipient(value: string): boolean {
  // fact: onboarding.phone.country_code, onboarding.phone.digits
  return /^\+91\d{10}$/.test(value);
}
