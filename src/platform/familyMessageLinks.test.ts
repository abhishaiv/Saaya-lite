import { describe, expect, it } from "vitest";

import { createFamilyMessageLinks } from "./familyMessageLinks";

const MESSAGE = "Meera's note:\nతెలుగు text with spaces";
const PHONE = "+919876543210"; // GROUNDED-EXEMPT: synthetic test favourite number.

describe("family message device links", () => {
  it("uses only device-owned SMS and WhatsApp schemes with the exact message body", () => {
    const links = createFamilyMessageLinks(PHONE, MESSAGE);

    expect(links).not.toBeNull();
    if (links === null) throw new Error("Expected valid E.164-like phone links");

    expect(links.sms.startsWith("sms:%2B919876543210?body=")).toBe(true); // GROUNDED-EXEMPT: encoded synthetic test favourite number.
    expect(
      links.whatsapp.startsWith("whatsapp://send?phone=919876543210&text="), // GROUNDED-EXEMPT: encoded synthetic test favourite number.
    ).toBe(true);
    expect(new URL(links.sms).protocol).toBe("sms:");
    expect(new URL(links.whatsapp).protocol).toBe("whatsapp:");
    expect(decodeURIComponent(new URL(links.sms).pathname)).toBe(PHONE);
    expect(new URL(links.whatsapp).searchParams.get("phone")).toBe(
      PHONE.slice(1),
    );
    expect(new URL(links.sms).searchParams.get("body")).toBe(MESSAGE);
    expect(new URL(links.whatsapp).searchParams.get("text")).toBe(MESSAGE);
  });

  it("does not build a URI for an empty or malformed favourite phone", () => {
    expect(createFamilyMessageLinks("", MESSAGE)).toBeNull();
    expect(createFamilyMessageLinks("919876543210", MESSAGE)).toBeNull(); // GROUNDED-EXEMPT: malformed synthetic test number.
    expect(createFamilyMessageLinks("+91", MESSAGE)).toBeNull();
    expect(createFamilyMessageLinks("+91987654321", MESSAGE)).toBeNull(); // GROUNDED-EXEMPT: malformed synthetic test number.
    expect(createFamilyMessageLinks("+9198765432100", MESSAGE)).toBeNull(); // GROUNDED-EXEMPT: malformed synthetic test number.
  });
});
