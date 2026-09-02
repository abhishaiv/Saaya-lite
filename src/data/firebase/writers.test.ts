import { describe, expect, it, vi } from "vitest";

import {
  createSosIncidentPayload,
  createSosStatusPatch,
  createSusEventPayload,
  createSusOutcomePatch,
} from "../../domain/anonymiser/anonymiser";
import { FirestoreSosWriter } from "./sosWriter";
import { FirestoreSusWriter } from "./susWriter";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((_database, name: string) => ({ name })),
  doc: vi.fn((_databaseOrCollection, nameOrId: string, documentId?: string) => ({
    documentId: documentId ?? nameOrId,
  })),
  setDoc: vi.fn(async () => undefined),
  updateDoc: vi.fn(async () => undefined),
}));

vi.mock("firebase/firestore", () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  getFirestore: vi.fn(),
  setDoc: firestoreMocks.setDoc,
  updateDoc: firestoreMocks.updateDoc,
}));

const database = {} as never;

describe("Firestore writers", () => {
  it("uses the supplied stable document id for a coarse SUS create and patch", async () => {
    const writer = new FirestoreSusWriter(database);
    const payload = createSusEventPayload({
      appVersion: "1.0.0", // GROUNDED-EXEMPT: deterministic test build label.
      armMode: "AUTO_ZONE",
      dateLocal: "2026-09-02", // GROUNDED-EXEMPT: ISO-date fixture.
      hourBand: "NIGHT_DEEP",
      hourLocal: 4, // fact: demo.arm.hour
      riskTier: "high",
      source: "APP",
      zoneId: "dwaraka_police_station",
    });

    await writer.writeSusEvent("stable-sus", payload);
    await writer.patchSusOutcome(
      "stable-sus",
      createSusOutcomePatch("CANCELLED_BY_USER"),
    );

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { documentId: "stable-sus" },
      payload,
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { documentId: "stable-sus" },
      { outcome: "CANCELLED_BY_USER" },
    );
  });

  it("uses the supplied stable document id for an SOS create and stop patch", async () => {
    const writer = new FirestoreSosWriter(database);
    const payload = createSosIncidentPayload({
      appVersion: "1.0.0", // GROUNDED-EXEMPT: deterministic test build label.
      familyMessageDelivery: "DISPLAYED_ONLY",
      favouritesConfigured: 1, // GROUNDED-EXEMPT: test-only configured-favourite count.
      hourLocal: 4, // fact: demo.arm.hour
      location: { accuracyM: 12.4, lat: 17.7242, lon: 83.3024 }, // GROUNDED-EXEMPT: precise SOS fixture.
      nearestStation: null,
      riskTier: "high",
      source: "APP",
      timeline: [],
      trigger: "LADDER_LAPSE",
      triggeredAtEpochMs: 1_788_304_800_000, // GROUNDED-EXEMPT: fixed test epoch.
      uid: "anonymous-user",
      zoneId: "dwaraka_police_station",
      zoneName: "Dwaraka Police Station",
    });

    await writer.writeSosIncident("stable-sos", payload);
    await writer.patchSosStatus(
      "stable-sos",
      createSosStatusPatch(1_788_304_800_000), // GROUNDED-EXEMPT: fixed test epoch.
    );

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { documentId: "stable-sos" },
      payload,
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { documentId: "stable-sos" },
      { status: "STOPPED", stoppedAtEpochMs: 1_788_304_800_000 }, // GROUNDED-EXEMPT: fixed test epoch.
    );
  });
});
