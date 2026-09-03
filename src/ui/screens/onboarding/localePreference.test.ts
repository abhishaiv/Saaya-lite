import { describe, expect, it } from "vitest";

import { FakeOnboardingRepository } from "../../../data/repository/onboardingRepository";
import {
  PIN_HASH_ALGORITHM,
  type PinHasher,
} from "../../../platform/pinHash";
import { DEFAULT_RULES } from "../../../domain/engine/rules";
import { HomeEngineBridge } from "../home/homeEngineBridge";
import { resolveAppLocale, saveAppLocale } from "./localePreference";

const pinHasher: PinHasher = {
  async create() {
    return {
      algorithm: PIN_HASH_ALGORITHM,
      hashBase64: "hash",
      saltBase64: "salt",
    };
  },
  async verify() {
    return false;
  },
};

describe("locale preference", () => {
  it("uses the persisted language before the URL language and preserves URL fallback", async () => {
    const repository = new FakeOnboardingRepository(pinHasher);

    expect(await resolveAppLocale(repository, "te")).toBe("te");
    await saveAppLocale(repository, "en");
    expect(await resolveAppLocale(repository, "te")).toBe("en");
  });

  it("changes only presentation preference during a live session", async () => {
    const repository = new FakeOnboardingRepository(pinHasher);
    const bridge = new HomeEngineBridge(
      DEFAULT_RULES,
      () => "DAY",
      { onCommands: () => undefined, onView: () => undefined },
      () => "session",
    );
    bridge.dispatch(
      { kind: "ManualArm" },
      { nowEpochMs: Number.MAX_SAFE_INTEGER, zone: null },
    );
    bridge.setDeadlineEpochMs(Number.MAX_SAFE_INTEGER);
    const sessionBefore = bridge.persistedSession();

    await saveAppLocale(repository, "te");

    expect(await resolveAppLocale(repository, "en")).toBe("te");
    expect(bridge.persistedSession()).toEqual(sessionBefore);
    expect(bridge.view().state).toBe("SHADOW");
  });
});
