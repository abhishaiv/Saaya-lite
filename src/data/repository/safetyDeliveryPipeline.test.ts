import { describe, expect, it, vi } from "vitest";

import type { PersistedSession } from "../../domain/model/session";
import { RiskTier, type Zone } from "../../domain/model/zone";
import { FakeDeliveryTraceRepository } from "./deliveryTraceRepository";
import { FakeQueueRepository } from "./queueRepository";
import {
  SafetyDeliveryPipeline,
  type DeliveryClock,
  type SafetyDeliveryContext,
} from "./safetyDeliveryPipeline";

const NOW = 1_788_304_800_000; // GROUNDED-EXEMPT: deterministic delivery-pipeline epoch.

const ZONE: Zone = {
  areasCovered: "Dwaraka Nagar",
  centroid: { latitude: 17.7242, longitude: 83.3024 }, // GROUNDED-EXEMPT: fixture coordinates.
  colorHex: "#FF3B30",
  crimeBreakdown: {},
  district: "Visakhapatnam",
  geofenceRadiusM: 0, // GROUNDED-EXEMPT: legacy asset field is irrelevant to payload construction.
  opacity: 0,
  polygon: [],
  riskNotes: null,
  riskScore: 0,
  riskTier: RiskTier.HIGH,
  stationId: "dwaraka_police_station",
  stationName: "Dwaraka Police Station",
  totalCases: 0,
  touristSpots: null,
  womenSafetyCases: 0,
};

const AUTO_SESSION: PersistedSession = {
  armedAtEpochMs: NOW,
  armedHourBand: "NIGHT_DEEP",
  armMode: "AUTO_ZONE",
  deadlineEpochMs: null,
  sessionId: "auto-session",
  state: "FAMILY_ESCALATED",
  susEventWritten: false,
  zoneId: ZONE.stationId,
};

const MANUAL_SESSION: PersistedSession = {
  ...AUTO_SESSION,
  armedHourBand: null,
  armMode: "MANUAL",
  sessionId: "manual-session",
  state: "SOS_ACTIVE",
  zoneId: null,
};

const CLOCK: DeliveryClock = {
  dateLocalAt: () => "2026-09-02", // GROUNDED-EXEMPT: fixed local-date fixture.
  hourLocalAt: () => 4, // fact: demo.arm.hour
  timelineTimeAt: () => "04:00", // GROUNDED-EXEMPT: fixed timeline display fixture.
};

function createPipeline() {
  const queue = new FakeQueueRepository();
  const trace = new FakeDeliveryTraceRepository();
  const flush = { flush: vi.fn().mockResolvedValue(undefined) };
  const identifiers = ["sus-document", "sus-outcome", "sos-document", "sos-status"];
  const pipeline = new SafetyDeliveryPipeline(
    queue,
    trace,
    flush as never,
    CLOCK,
    () => identifiers.shift() ?? "unused-document",
  );
  return { flush, pipeline, queue, trace };
}

function context(
  session: PersistedSession,
  zone: Zone | null = ZONE,
): SafetyDeliveryContext {
  return {
    appVersion: "1.0.0", // GROUNDED-EXEMPT: deterministic test build label.
    familyMessageDelivery: "DISPLAYED_ONLY",
    favouritesConfigured: 1, // GROUNDED-EXEMPT: one configured-favourite fixture.
    currentLocation: {
      accuracyM: 12.4, // GROUNDED-EXEMPT: exact SOS location fixture.
      lat: 17.7242, // GROUNDED-EXEMPT: exact SOS location fixture.
      lon: 83.3024, // GROUNDED-EXEMPT: exact SOS location fixture.
    },
    nearestStation: null,
    nowEpochMs: NOW,
    session,
    source: "APP" as const,
    zone,
  };
}

describe("safety delivery pipeline", () => {
  it("creates the anonymous civic payload only at family escalation", async () => {
    const { pipeline, queue, trace } = createPipeline();
    const delivery = context(AUTO_SESSION);

    await pipeline.apply(
      { kind: "ShowArmBanner", band: "NIGHT_DEEP", zoneId: ZONE.stationId },
      delivery,
    );
    await pipeline.apply(
      { kind: "ShowCheckIn", countdownSec: 90, step: 1, urgency: "GENTLE" },
      delivery,
    );
    await pipeline.apply(
      { kind: "ShowCheckIn", countdownSec: 60, step: 2, urgency: "URGENT" },
      delivery,
    );
    await pipeline.apply({ kind: "ShowFamilyScreen" }, delivery);
    expect(await queue.getAll()).toEqual([]);

    const result = await pipeline.apply({ kind: "WriteSusEvent" }, delivery);
    const [record] = await queue.getAll();

    expect(result.susEnqueued).toBe(true);
    expect(record).toMatchObject({
      documentId: "sus-document",
      localSessionId: AUTO_SESSION.sessionId,
      type: "SUS_CREATE",
    });
    expect(record?.payload).toEqual({
      appVersion: "1.0.0",
      armMode: "AUTO_ZONE",
      dateLocal: "2026-09-02", // GROUNDED-EXEMPT: fixed local-date fixture.
      hourBand: "NIGHT_DEEP",
      hourLocal: 4,
      outcome: "PENDING",
      riskTier: "high",
      source: "APP",
      zoneId: ZONE.stationId,
    });
    expect(await trace.load(AUTO_SESSION.sessionId)).toEqual([
      { atEpochMs: NOW, type: "ARMED" },
      { atEpochMs: NOW, type: "CHECKIN_1_SHOWN" },
      { atEpochMs: NOW, type: "CHECKIN_1_MISSED" },
      { atEpochMs: NOW, type: "CHECKIN_2_SHOWN" },
      { atEpochMs: NOW, type: "CHECKIN_2_MISSED" },
      { atEpochMs: NOW, type: "FAMILY_MESSAGE_SHOWN" },
    ]);
  });

  it("keeps manual family escalation local without a civic record", async () => {
    const { pipeline, queue, trace } = createPipeline();
    const manualFamily: PersistedSession = {
      ...MANUAL_SESSION,
      state: "FAMILY_ESCALATED",
      zoneId: ZONE.stationId,
    };

    const delivery = context(manualFamily);
    await pipeline.apply({ kind: "ShowFamilyScreen" }, delivery);
    await expect(
      pipeline.apply({ kind: "WriteSusEvent" }, delivery),
    ).resolves.toEqual({ sosEnqueued: false, susEnqueued: false });

    expect(await queue.getAll()).toEqual([]);
    expect(await trace.load(manualFamily.sessionId)).toEqual([
      { atEpochMs: NOW, type: "CHECKIN_2_MISSED" },
      { atEpochMs: NOW, type: "FAMILY_MESSAGE_SHOWN" },
    ]);
  });

  it("rejects an outbound command whose session has not reached its authorized state", async () => {
    const { pipeline, queue, trace } = createPipeline();

    await expect(
      pipeline.apply(
        { kind: "WriteSusEvent" },
        context({ ...AUTO_SESSION, state: "SHADOW" }),
      ),
    ).rejects.toThrow("A civic record may be created only at FAMILY_ESCALATED");
    await expect(
      pipeline.apply(
        { kind: "WriteSosIncident", trigger: "MANUAL_HELP_BUTTON" },
        context({ ...AUTO_SESSION, state: "SHADOW" }),
      ),
    ).rejects.toThrow("A detailed incident may be created only at SOS_ACTIVE");

    expect(await queue.getAll()).toEqual([]);
    expect(await trace.load(AUTO_SESSION.sessionId)).toEqual([]);
  });

  it("builds SOS only after SOS and makes outcome patches depend on their creates", async () => {
    const { pipeline, queue } = createPipeline();
    const auto = context(AUTO_SESSION);

    await pipeline.apply({ kind: "WriteSusEvent" }, auto);
    await pipeline.apply(
      { kind: "PatchSusOutcome", outcome: "ESCALATED_TO_SOS" },
      auto,
    );
    await pipeline.apply(
      { kind: "WriteSosIncident", trigger: "LADDER_LAPSE" },
      context(MANUAL_SESSION, null),
    );

    const records = await queue.getAll();
    const susPatch = records.find(({ type }) => type === "SUS_OUTCOME_PATCH");
    const sos = records.find(({ type }) => type === "SOS_CREATE");

    expect(susPatch).toMatchObject({
      dependsOnOperationId: "sus-document",
      documentId: "sus-document",
      payload: { outcome: "ESCALATED_TO_SOS" },
    });
    expect(sos?.payload).toMatchObject({
      familyMessageDelivery: "DISPLAYED_ONLY",
      favouritesConfigured: 1, // GROUNDED-EXEMPT: one configured-favourite fixture.
      location: { accuracyM: 12.4, lat: 17.7242, lon: 83.3024 }, // GROUNDED-EXEMPT: exact SOS location fixture.
      status: "ACTIVE",
      trigger: "LADDER_LAPSE",
    });
    expect(sos?.payload).not.toHaveProperty("contacts");
    expect(sos?.payload).not.toHaveProperty("userName");
  });
});
