import { describe, expect, it } from "vitest";

import {
  createSosIncidentPayload,
  createSosStatusPatch,
  createSusEventPayload,
  createSusOutcomePatch,
  type AnonymiserSusInput,
} from "./anonymiser";

const sampleSus: AnonymiserSusInput = {
  appVersion: "1.0.0", // GROUNDED-EXEMPT: deterministic test build label.
  armMode: "AUTO_ZONE",
  dateLocal: "2026-09-02", // GROUNDED-EXEMPT: ISO-date fixture.
  hourBand: "NIGHT_DEEP",
  hourLocal: 4, // fact: demo.arm.hour
  riskTier: "high",
  source: "APP",
  zoneId: "dwaraka_police_station",
};

describe("anonymiser trust boundary", () => {
  it("creates a coarse SUS event with no identifier, coordinate, or exact time", () => {
    const payload = createSusEventPayload(sampleSus);

    expect(payload).toEqual({ ...sampleSus, outcome: "PENDING" });
    expect(Object.keys(payload)).toEqual(
      [
        "appVersion",
        "armMode",
        "dateLocal",
        "hourBand",
        "hourLocal",
        "outcome",
        "riskTier",
        "source",
        "zoneId",
      ].sort(),
    );
  });

  it("rejects every personal or precise-location field before a SUS payload exists", () => {
    const malicious = {
      ...sampleSus,
      latitude: 17.7242, // GROUNDED-EXEMPT: hostile coordinate fixture.
      sessionId: "not-allowed",
      user_name: "not-allowed",
    } as unknown as AnonymiserSusInput;

    expect(() => createSusEventPayload(malicious)).toThrow(
      /SUS trust boundary violation/,
    );
  });

  it("rejects a MANUAL civic payload even when a caller bypasses TypeScript", () => {
    const manual = {
      ...sampleSus,
      armMode: "MANUAL",
    } as unknown as AnonymiserSusInput;

    expect(() => createSusEventPayload(manual)).toThrow(
      /civic records require AUTO_ZONE/,
    );
  });

  it("permits precise context only after SOS starts and never carries raw favourites", () => {
    const payload = createSosIncidentPayload({
      appVersion: sampleSus.appVersion,
      familyMessageDelivery: "DISPLAYED_ONLY",
      favouritesConfigured: 1, // GROUNDED-EXEMPT: one configured-favourite fixture count.
      hourLocal: sampleSus.hourLocal,
      location: {
        accuracyM: 12.4, // GROUNDED-EXEMPT: precise SOS fixture accuracy.
        lat: 17.7242, // GROUNDED-EXEMPT: precise SOS fixture latitude.
        lon: 83.3024, // GROUNDED-EXEMPT: precise SOS fixture longitude.
      },
      nearestStation: {
        distanceM: 298, // GROUNDED-EXEMPT: frozen illustrative station-distance fixture.
        id: "PS-004",
        name: "Dwaraka Police Station",
        phone: "0891-2565100", // GROUNDED-EXEMPT: fixed synthetic station-phone fixture.
      },
      riskTier: "high",
      source: "APP",
      timeline: [{ at: "04:05:12", type: "SOS_TRIGGERED" }],
      trigger: "LADDER_LAPSE",
      triggeredAtEpochMs: 1_788_304_800_000, // GROUNDED-EXEMPT: fixed test epoch.
      uid: "anonymous-user",
      zoneId: sampleSus.zoneId,
      zoneName: "Dwaraka Police Station",
    });

    expect(payload.status).toBe("ACTIVE");
    expect(payload).toMatchObject({
      familyMessageDelivery: "DISPLAYED_ONLY",
      favouritesConfigured: 1, // GROUNDED-EXEMPT: one configured-favourite fixture count.
    });
    expect(payload).not.toHaveProperty("contacts");
    expect(payload).not.toHaveProperty("contactsNotified");
    expect(payload).not.toHaveProperty("user_name");
    expect(payload.location.lat).toBe(17.7242); // GROUNDED-EXEMPT: assertion against the fixture.

    const { status: _status, ...sosInput } = payload;
    for (const localOnlyField of [
      "favouriteName",
      "favouritePhone",
      "message",
      "sessionId",
      "user_name",
    ]) {
      expect(() =>
        createSosIncidentPayload({
          ...sosInput,
          [localOnlyField]: "not-allowed",
        } as never),
      ).toThrow(new RegExp(localOnlyField));
    }

    const stale = { ...payload } as Record<string, unknown>;
    delete stale.status;
    stale.contactsNotified = 1; // GROUNDED-EXEMPT: stale schema-key rejection fixture.
    expect(() =>
      createSosIncidentPayload(stale as never),
    ).toThrow(/contactsNotified/);

    delete stale.contactsNotified;
    stale.familyMessageDelivery = "DELIVERED";
    expect(() =>
      createSosIncidentPayload(stale as never),
    ).toThrow(/familyMessageDelivery is not allowed/);

    stale.familyMessageDelivery = "HANDED_TO_DEVICE";
    expect(() =>
      createSosIncidentPayload(stale as never),
    ).toThrow(/familyMessageDelivery is not allowed/);
  });

  it("rejects unknown nested data before an SOS draft can reach a writer", () => {
    const hostileLocation = {
      accuracyM: 12.4, // GROUNDED-EXEMPT: hostile nested-location fixture.
      deviceId: "not-allowed",
      lat: 17.7242, // GROUNDED-EXEMPT: hostile nested-location fixture.
      lon: 83.3024, // GROUNDED-EXEMPT: hostile nested-location fixture.
    };

    expect(() =>
      createSosIncidentPayload({
        appVersion: sampleSus.appVersion,
        familyMessageDelivery: "DISPLAYED_ONLY",
        favouritesConfigured: 0, // GROUNDED-EXEMPT: no configured-favourite fixture.
        hourLocal: sampleSus.hourLocal,
        location: hostileLocation,
        nearestStation: null,
        riskTier: null,
        source: "APP",
        timeline: [
          {
            at: "04:05:12",
            type: "SOS_TRIGGERED",
            user_name: "not-allowed",
          },
        ] as unknown as [],
        trigger: "MANUAL_HELP_BUTTON",
        triggeredAtEpochMs: 1_788_304_800_000, // GROUNDED-EXEMPT: fixed test epoch.
        uid: "anonymous-user",
        zoneId: null,
        zoneName: null,
      }),
    ).toThrow(/SOS location trust boundary violation/);
  });

  it("creates only permitted terminal patches", () => {
    expect(createSusOutcomePatch("CANCELLED_BY_USER")).toEqual({
      outcome: "CANCELLED_BY_USER",
    });
    expect(createSosStatusPatch(1_788_304_800_000)).toEqual({ // GROUNDED-EXEMPT: fixed test epoch.
      status: "STOPPED",
      stoppedAtEpochMs: 1_788_304_800_000, // GROUNDED-EXEMPT: fixed test epoch.
    });
  });
});
