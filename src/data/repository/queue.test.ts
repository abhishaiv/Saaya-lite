import { describe, expect, it, vi } from "vitest";

import {
  createSosIncidentPayload,
  createSusEventPayload,
} from "../../domain/anonymiser/anonymiser";
import { QueueFlushService } from "./queueFlushService";
import { FakeQueueRepository } from "./queueRepository";

describe("queue and offline flush service - BUSINESS_RULES section 11", () => {
  const NOW = 1000000; // GROUNDED-EXEMPT: base epoch ms for test.

  const sampleSus = createSusEventPayload({
    zoneId: "dwaraka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_DEEP",
    hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
    dateLocal: "2026-08-22", // GROUNDED-EXEMPT: fixture date.
    armMode: "AUTO_ZONE",
  });

  const sampleSos = createSosIncidentPayload({
    uid: "test-uid", // GROUNDED-EXEMPT: fixture uid.
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

  it("enqueues SUS and SOS items and drains SOS_INCIDENT first", async () => {
    const repository = new FakeQueueRepository();
    const sendSusEvent = vi.fn().mockResolvedValue("sus-doc-1");
    const sendSosIncident = vi.fn().mockResolvedValue("sos-doc-1");

    const flushService = new QueueFlushService(repository, {
      sendSusEvent,
      sendSosIncident,
    });

    // Enqueue SUS first, then SOS
    await repository.enqueue({
      type: "SUS_EVENT",
      payload: sampleSus,
      status: "PENDING",
      attempts: 0,
      nextAttemptEpochMs: NOW,
      createdAtEpochMs: NOW,
    });

    await repository.enqueue({
      type: "SOS_INCIDENT",
      payload: sampleSos,
      status: "PENDING",
      attempts: 0,
      nextAttemptEpochMs: NOW,
      createdAtEpochMs: NOW + 10, // GROUNDED-EXEMPT: 10 ms later.
    });

    const result = await flushService.flush(NOW);
    expect(result.sentCount).toBe(2); // GROUNDED-EXEMPT: two sent items.

    // Assert SOS handler was called first
    expect(sendSosIncident).toHaveBeenCalledTimes(1);
    expect(sendSusEvent).toHaveBeenCalledTimes(1);

    const all = await repository.getAll();
    expect(all.every((r) => r.status === "SENT")).toBe(true);
  });

  it("applies backoff intervals on send failure and marks FAILED_PERMANENT after 20 attempts", async () => {
    const repository = new FakeQueueRepository();
    const sendSusEvent = vi.fn().mockRejectedValue(new Error("Network offline"));
    const sendSosIncident = vi.fn().mockResolvedValue("sos-doc-ok");

    const flushService = new QueueFlushService(repository, {
      sendSusEvent,
      sendSosIncident,
    });

    const id = await repository.enqueue({
      type: "SUS_EVENT",
      payload: sampleSus,
      status: "PENDING",
      attempts: 0,
      nextAttemptEpochMs: NOW,
      createdAtEpochMs: NOW,
    });

    // Attempt 1 fails -> next attempt in 5s (5000ms)
    await flushService.flush(NOW);
    let record = await repository.getById(id);
    expect(record?.attempts).toBe(1);
    expect(record?.status).toBe("PENDING");
    expect(record?.nextAttemptEpochMs).toBe(NOW + 5000); // GROUNDED-EXEMPT: 5000 ms.

    // Fast forward to attempt 19 -> fails -> 20 attempts -> FAILED_PERMANENT
    for (let i = 1; i < 20; i++) { // GROUNDED-EXEMPT: simulate 19 additional failure cycles.
      const currentNext = record?.nextAttemptEpochMs ?? NOW;
      await flushService.flush(currentNext);
      record = await repository.getById(id);
    }

    expect(record?.attempts).toBe(20);
    expect(record?.status).toBe("FAILED_PERMANENT");

    const perms = await flushService.getPermanentFailures();
    expect(perms.length).toBe(1);
  });
});
