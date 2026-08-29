import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("onboarding PIN setup", () => {
  it("shows one four-digit secure PIN entry, not a confirmation row", () => {
    const source = readFileSync(
      new URL("./OnboardingScreen.tsx", import.meta.url),
      "utf8",
    );

    expect(source.match(/<PinEntryBox/g)).toHaveLength(1);
    expect(source).not.toContain("confirmedPin");
  });

  it("clears a rejected weak PIN so a new PIN can be entered immediately", () => {
    const source = readFileSync(
      new URL("./OnboardingScreen.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /if \(isWeakPin\(pin\)\) \{\s*setPin\(""\);\s*setPinError\(copy\.errPinWeak\);/,
    );
  });
});
