import { describe, expect, it } from "vitest";

import { DEMO_ARM_HOUR } from "../domain/engine/rules";
import {
  formatIndiaFamilyDay,
  formatIndiaFamilyTime,
  formatIndiaUiTime,
  formatIndiaUiTimeOfDay,
  formatSessionArmTime,
} from "./indiaTime";

describe("India wall-clock formatting", () => {
  it("formats every UI clock as 24-hour HH:mm", () => {
    expect(formatIndiaUiTimeOfDay(DEMO_ARM_HOUR, "en")).toBe("04:00");
    expect(formatIndiaUiTimeOfDay(DEMO_ARM_HOUR, "te")).toBe("04:00");
    expect(formatSessionArmTime(Date.now(), "en", true)).toBe("04:00");
    expect(formatIndiaUiTime(0, "en")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("uses the active locale for visible family-message time and day values", () => {
    expect(formatIndiaFamilyTime(0, "en")).toContain("AM");
    expect(formatIndiaFamilyDay(0, "te")).not.toBe(formatIndiaFamilyDay(0, "en"));
  });
});
