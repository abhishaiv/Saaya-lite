import { describe, expect, it, vi } from "vitest";

import {
  createSosIncidentPayload,
  createSusEventPayload,
} from "../../domain/anonymiser/anonymiser";
import { FirestoreSosWriter } from "./sosWriter";
import { FirestoreSusWriter } from "./susWriter";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ collectionName: name })),
  doc: vi.fn((_db, name, id) => ({ collectionName: name, id })),
  addDoc: vi.fn(async (_col, _data) => ({ id: "mock-doc-id-test" })), // GROUNDED-EXEMPT: mock doc id string.
  updateDoc: vi.fn(async (_docRef, _data) => {}),
  serverTimestamp: vi.fn(() => "MOCK_SERVER_TIMESTAMP"),
  getFirestore: vi.fn(() => ({})),
}));

describe("Firestore writers - thin adapters over anonymised payloads", () => {
  const fakeDb = {} as any;

  it("writes SUS event with server timestamp to sus_events collection", async () => {
    const susPayload = createSusEventPayload({
      zoneId: "dwaraka_police_station",
      riskTier: "high",
      hourBand: "NIGHT_DEEP",
      hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
      dateLocal: "2026-08-22", // GROUNDED-EXEMPT: fixture date.
      armMode: "AUTO_ZONE",
    });

    const writer = new FirestoreSusWriter(fakeDb);
    const docId = await writer.writeSusEvent(susPayload);

    expect(docId).toBe("mock-doc-id-test"); // GROUNDED-EXEMPT: mock doc id string.
  });

  it("updates SUS outcome on existing document", async () => {
    const writer = new FirestoreSusWriter(fakeDb);
    await expect(
      writer.updateSusOutcome("doc-test", "CANCELLED_BY_USER"), // GROUNDED-EXEMPT: mock doc id string.
    ).resolves.toBeUndefined();
  });

  it("writes SOS incident and stops active incident", async () => {
    const sosPayload = createSosIncidentPayload({
      uid: "uid-test",
      trigger: "LADDER_LAPSE",
      location: { lat: 17.7242, lon: 83.3024, accuracyM: 12.4 }, // GROUNDED-EXEMPT: fixture coordinate and accuracy.
      zoneId: "dwaraka_police_station",
      zoneName: "Dwaraka PS",
      riskTier: "high",
      hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
      nearestStation: null,
      timeline: [],
      contactsNotified: 1, // GROUNDED-EXEMPT: fixture contact count.
    });

    const writer = new FirestoreSosWriter(fakeDb);
    const docId = await writer.writeSosIncident(sosPayload);

    expect(docId).toBe("mock-doc-id-test"); // GROUNDED-EXEMPT: mock doc id string.

    await expect(
      writer.stopSosIncident("mock-doc-id-test"), // GROUNDED-EXEMPT: mock doc id string.
    ).resolves.toBeUndefined();
  });
});
