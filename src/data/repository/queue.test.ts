import { describe, expect, it, vi } from "vitest";

import {
  createSosIncidentDraft,
  createSusEventPayload,
} from "../../domain/anonymiser/anonymiser";
import { QueueFlushService, type QueueFlushHandlers } from "./queueFlushService";
import { FakeQueueRepository, type QueuedRecordInput } from "./queueRepository";

const NOW = 1_788_304_800_000; // GROUNDED-EXEMPT: deterministic queue-test epoch.

function handlers(): QueueFlushHandlers {
  return {
    patchSosStatus: vi.fn().mockResolvedValue(undefined),
    patchSusOutcome: vi.fn().mockResolvedValue(undefined),
    writeSosIncident: vi.fn().mockResolvedValue(undefined),
    writeSusEvent: vi.fn().mockResolvedValue(undefined),
  };
}

function susPayload() {
  return createSusEventPayload({
    appVersion: "1.0.0", // GROUNDED-EXEMPT: deterministic test build label.
    armMode: "AUTO_ZONE",
    dateLocal: "2026-09-02", // GROUNDED-EXEMPT: ISO-date fixture.
    hourBand: "NIGHT_DEEP",
    hourLocal: 4, // fact: demo.arm.hour
    riskTier: "high",
    source: "APP",
    zoneId: "dwaraka_police_station",
  });
}

function sosPayload() {
  return createSosIncidentDraft({
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
    triggeredAtEpochMs: NOW,
    zoneId: "dwaraka_police_station",
    zoneName: "Dwaraka Police Station",
  });
}

// @ts-expect-error A precise SOS draft can never be tagged as a civic create.
const impossibleSusRecord: QueuedRecordInput = {
  attempts: 0,
  createdAtEpochMs: NOW,
  dedupeKey: "invalid",
  documentId: "invalid",
  localSessionId: "invalid",
  nextAttemptEpochMs: NOW,
  operationId: "invalid",
  payload: sosPayload(),
  status: "PENDING" as const,
  type: "SUS_CREATE" as const,
};
void impossibleSusRecord;

describe("durable queue", () => {
  it("orders a create before the patch that depends on it", async () => {
    const repository = new FakeQueueRepository();
    const effects: string[] = [];
    const queue = new QueueFlushService(repository, {
      ...handlers(),
      patchSusOutcome: vi.fn(async () => {
        effects.push("patch");
      }),
      writeSusEvent: vi.fn(async () => {
        effects.push("create");
      }),
    });

    await repository.enqueue({
      attempts: 0,
      createdAtEpochMs: NOW,
      dedupeKey: "sus:create:session-create-before-patch",
      documentId: "sus-document",
      localSessionId: "session-create-before-patch",
      nextAttemptEpochMs: NOW,
      operationId: "sus-create",
      payload: susPayload(),
      status: "PENDING",
      type: "SUS_CREATE",
    });
    await repository.enqueue({
      attempts: 0,
      createdAtEpochMs: NOW,
      dedupeKey: "sus:outcome:session-create-before-patch",
      dependsOnOperationId: "sus-create",
      documentId: "sus-document",
      localSessionId: "session-create-before-patch",
      nextAttemptEpochMs: NOW,
      operationId: "sus-outcome",
      payload: { outcome: "ESCALATED_TO_SOS" },
      status: "PENDING",
      type: "SUS_OUTCOME_PATCH",
    });

    await queue.flush(NOW);
    expect(effects).toEqual(["create", "patch"]);
  });

  it("retries an ambiguous create using the exact same document id", async () => {
    const repository = new FakeQueueRepository();
    const writer = vi
      .fn<QueueFlushHandlers["writeSosIncident"]>()
      .mockRejectedValueOnce(new Error("ambiguous acknowledgement"))
      .mockResolvedValueOnce(undefined);
    const queue = new QueueFlushService(repository, {
      ...handlers(),
      writeSosIncident: writer,
    });

    const id = await repository.enqueue({
      attempts: 0,
      createdAtEpochMs: NOW,
      dedupeKey: "sos:create:session-ambiguous-retry",
      documentId: "stable-sos-document",
      localSessionId: "session-ambiguous-retry",
      nextAttemptEpochMs: NOW,
      operationId: "sos-create",
      payload: sosPayload(),
      status: "PENDING",
      type: "SOS_CREATE",
    });

    await queue.flush(NOW);
    const afterFailure = await repository.getById(id);
    await queue.flush(afterFailure?.nextAttemptEpochMs ?? NOW);

    expect(writer).toHaveBeenNthCalledWith(
      1,
      "stable-sos-document",
      expect.any(Object),
    );
    expect(writer).toHaveBeenNthCalledWith(
      2,
      "stable-sos-document",
      expect.any(Object),
    );
    expect((await repository.getById(id))?.status).toBe("SENT");
  });

  it("does not run one queued write twice when lifecycle flush triggers race", async () => {
    const repository = new FakeQueueRepository();
    const writeSusEvent = vi.fn(async () => undefined);
    const queue = new QueueFlushService(repository, {
      ...handlers(),
      writeSusEvent,
    });
    await repository.enqueue({
      attempts: 0,
      createdAtEpochMs: NOW,
      dedupeKey: "sus:create:session-single-flight",
      documentId: "sus-document",
      localSessionId: "session-single-flight",
      nextAttemptEpochMs: NOW,
      operationId: "sus-create",
      payload: susPayload(),
      status: "PENDING",
      type: "SUS_CREATE",
    });

    await Promise.all([queue.flush(NOW), queue.flush(NOW)]);
    expect(writeSusEvent).toHaveBeenCalledTimes(1);
  });

  it("uses one durable queue record when two command batches race the same effect", async () => {
    const repository = new FakeQueueRepository();
    const record = {
      attempts: 0,
      createdAtEpochMs: NOW,
      dedupeKey: "sus:create:session-dedupe",
      documentId: "sus-document",
      localSessionId: "session-dedupe",
      nextAttemptEpochMs: NOW,
      operationId: "sus-create",
      payload: susPayload(),
      status: "PENDING" as const,
      type: "SUS_CREATE" as const,
    };

    const [left, right] = await Promise.all([
      repository.enqueueIfAbsent(record),
      repository.enqueueIfAbsent(record),
    ]);

    expect([left.created, right.created].filter(Boolean)).toHaveLength(1);
    expect(await repository.getAll()).toHaveLength(1);
  });
});
