import { describe, expect, it } from "vitest";

import {
  createSosIncidentPayload,
  createStoppedSosPatch,
  createSusEventPayload,
  createSusOutcomePatch,
  SAAYA_APP_VERSION,
  type AnonymiserSosInput,
  type AnonymiserSusInput,
} from "./anonymiser";

describe("anonymiser - the trust boundary", () => {
  const sampleSusInput: AnonymiserSusInput = {
    zoneId: "dwaraka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_DEEP",
    hourLocal: 4, // GROUNDED-EXEMPT: fixture test hour.
    dateLocal: "2026-08-22", // GROUNDED-EXEMPT: fixture test date.
    armMode: "AUTO_ZONE",
    source: "APP",
  };

  it("asserts forbidden keys are ABSENT from a SUS event payload", () => {
    const susEvent = createSusEventPayload(sampleSusInput);
    const keys = Object.keys(susEvent);

    expect(keys).not.toContain("latitude");
    expect(keys).not.toContain("longitude");
    expect(keys).not.toContain("lat");
    expect(keys).not.toContain("lon");
    expect(keys).not.toContain("sessionId");
    expect(keys).not.toContain("uid");
    expect(keys).not.toContain("deviceId");
    expect(keys).not.toContain("name");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("contact");
    expect(keys).not.toContain("contacts");

    // Exact expected key set per DATA_MODEL.md
    expect(keys.sort()).toEqual(
      [
        "appVersion",
        "armMode",
        "createdAt",
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

  it("ensures SUS carries no fine time (only integer hour and YYYY-MM-DD date)", () => {
    const susEvent = createSusEventPayload(sampleSusInput);
    expect(Number.isInteger(susEvent.hourLocal)).toBe(true);
    expect(susEvent.hourLocal).toBe(4); // GROUNDED-EXEMPT: fixture test hour.
    expect(susEvent.dateLocal).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(susEvent.appVersion).toBe(SAAYA_APP_VERSION);
  });

  it("guarantees two SUS events from the same session contain nothing linking them", () => {
    const susEvent1 = createSusEventPayload(sampleSusInput);
    const susEvent2 = createSusEventPayload({
      ...sampleSusInput,
      hourLocal: 5, // GROUNDED-EXEMPT: fixture test hour.
    });

    expect(susEvent1).not.toHaveProperty("sessionId");
    expect(susEvent2).not.toHaveProperty("sessionId");
    expect(susEvent1).not.toHaveProperty("uid");
    expect(susEvent2).not.toHaveProperty("uid");

    // All fields are purely categorical/zonal
    expect(susEvent1.zoneId).toBe(susEvent2.zoneId);
  });

  it("throws if an input contains forbidden keys", () => {
    const maliciousInput = {
      ...sampleSusInput,
      latitude: 17.7242, // GROUNDED-EXEMPT: coordinate fixture for negative test.
      sessionId: "session-test", // GROUNDED-EXEMPT: session identifier fixture for negative test.
    } as unknown as AnonymiserSusInput;

    expect(() => createSusEventPayload(maliciousInput)).toThrow(
      /Trust boundary violation/,
    );
  });

  it("creates valid SOS incident payload with precise location, timeline, and count only", () => {
    const sampleSosInput: AnonymiserSosInput = {
      uid: "anon-uid-test", // GROUNDED-EXEMPT: uid fixture for test.
      trigger: "LADDER_LAPSE",
      location: {
        lat: 17.7242, // GROUNDED-EXEMPT: Vizag test coordinate.
        lon: 83.3024, // GROUNDED-EXEMPT: Vizag test coordinate.
        accuracyM: 12.4, // GROUNDED-EXEMPT: test accuracy in meters.
      },
      zoneId: "dwaraka_police_station",
      zoneName: "Dwaraka Police Station",
      riskTier: "high",
      hourLocal: 4, // GROUNDED-EXEMPT: test hour.
      nearestStation: {
        id: "PS-004", // GROUNDED-EXEMPT: station id fixture.
        name: "Dwaraka PS",
        phone: "0891-2565100", // GROUNDED-EXEMPT: phone fixture.
        distanceM: 298, // GROUNDED-EXEMPT: test distance in meters.
      },
      timeline: [
        { at: "04:05:12", type: "ARMED", detail: "auto, zone entry" }, // GROUNDED-EXEMPT: timeline time format fixture.
        { at: "04:10:12", type: "CHECKIN_1_SHOWN" }, // GROUNDED-EXEMPT: timeline time format fixture.
        { at: "04:11:42", type: "CHECKIN_1_MISSED" }, // GROUNDED-EXEMPT: timeline time format fixture.
        { at: "04:12:42", type: "CHECKIN_2_MISSED" }, // GROUNDED-EXEMPT: timeline time format fixture.
        { at: "04:13:42", type: "FAMILY_NOTIFIED" }, // GROUNDED-EXEMPT: timeline time format fixture.
        { at: "04:14:42", type: "SOS_TRIGGERED" }, // GROUNDED-EXEMPT: timeline time format fixture.
      ],
      contactsNotified: 1, // GROUNDED-EXEMPT: test contact count.
    };

    const sosIncident = createSosIncidentPayload(sampleSosInput);

    expect(sosIncident.uid).toBe("anon-uid-test"); // GROUNDED-EXEMPT: test assertion.
    expect(sosIncident.status).toBe("ACTIVE");
    expect(sosIncident.stoppedAt).toBeNull();
    expect(sosIncident.contactsNotified).toBe(1);
    expect(sosIncident.location.lat).toBe(17.7242); // GROUNDED-EXEMPT: test coordinate.
    expect(sosIncident.timeline.length).toBe(6); // GROUNDED-EXEMPT: test timeline length.
    expect(sosIncident.appVersion).toBe(SAAYA_APP_VERSION);

    // Assert no raw contact details exist in payload
    expect(sosIncident).not.toHaveProperty("contacts");
    expect(sosIncident).not.toHaveProperty("contactName");
    expect(sosIncident).not.toHaveProperty("contactPhone");
  });

  it("creates correct stopped SOS patch and SUS outcome patch", () => {
    const stopPatch = createStoppedSosPatch("TIMESTAMP_MOCK");
    expect(stopPatch).toEqual({
      status: "STOPPED",
      stoppedAt: "TIMESTAMP_MOCK",
    });

    const outcomePatch = createSusOutcomePatch("CANCELLED_BY_USER");
    expect(outcomePatch).toEqual({
      outcome: "CANCELLED_BY_USER",
    });
  });
});
