import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConsoleScreen } from "./ConsoleScreen";
import {
  computeConsoleStats,
  filterConsoleRecords,
  type ConsoleRecordItem,
} from "./consoleStore";

describe("Console logic and stats - CONSOLE_SPEC.md", () => {
  const NOW = 1000000000; // GROUNDED-EXEMPT: base epoch ms for unit test.

  const testRecords: ConsoleRecordItem[] = [
    {
      kind: "SUS",
      record: {
        id: "sus-1",
        zoneId: "dwaraka_police_station",
        riskTier: "high",
        hourBand: "NIGHT_DEEP",
        hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
        dateLocal: "2026-08-28", // GROUNDED-EXEMPT: fixture date string.
        createdAt: null,
        createdAtEpochMs: NOW - 10000, // GROUNDED-EXEMPT: 10s ago.
        outcome: "PENDING",
        armMode: "AUTO_ZONE",
        source: "APP",
        appVersion: "1.0.0",
      },
    },
    {
      kind: "SUS",
      record: {
        id: "sus-2",
        zoneId: "dwaraka_police_station",
        riskTier: "high",
        hourBand: "NIGHT_DEEP",
        hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
        dateLocal: "2026-08-28", // GROUNDED-EXEMPT: fixture date string.
        createdAt: null,
        createdAtEpochMs: NOW - 20000, // GROUNDED-EXEMPT: 20s ago.
        outcome: "CANCELLED_BY_USER",
        armMode: "AUTO_ZONE",
        source: "APP",
        appVersion: "1.0.0",
      },
    },
    {
      kind: "SOS",
      record: {
        id: "sos-1",
        uid: "anon-test-uid",
        triggeredAt: null,
        triggeredAtEpochMs: NOW - 5000, // GROUNDED-EXEMPT: 5s ago.
        trigger: "LADDER_LAPSE",
        location: { lat: 17.7242, lon: 83.3024, accuracyM: 12.4 }, // GROUNDED-EXEMPT: fixture coordinate.
        zoneId: "dwaraka_police_station",
        zoneName: "Dwaraka Police Station",
        riskTier: "high",
        hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
        nearestStation: { id: "PS-004", name: "Dwaraka PS", phone: "0891-2565100", distanceM: 298 }, // GROUNDED-EXEMPT: fixture distance.
        timeline: [
          { at: "04:05:12", type: "ARMED" }, // GROUNDED-EXEMPT: fixture time.
          { at: "04:14:42", type: "SOS_TRIGGERED" }, // GROUNDED-EXEMPT: fixture time.
        ],
        contactsNotified: 1, // GROUNDED-EXEMPT: fixture count.
        status: "ACTIVE",
        stoppedAt: null,
        source: "APP",
        appVersion: "1.0.0",
      },
    },
  ];

  it("computes stats including repeat zones and false-positive rate", () => {
    const stats = computeConsoleStats(testRecords, "24h", NOW);

    expect(stats.susCount).toBe(2); // GROUNDED-EXEMPT: two SUS records in window.
    expect(stats.sosCount).toBe(1); // GROUNDED-EXEMPT: one SOS record in window.
    expect(stats.zonesFlaggedCount).toBe(1); // GROUNDED-EXEMPT: one distinct zone.
    expect(stats.repeatZonesCount).toBe(1); // GROUNDED-EXEMPT: dwaraka has 2 SUS events.
    expect(stats.cancelledCount).toBe(1); // GROUNDED-EXEMPT: one cancelled SUS event.
    expect(stats.falsePositiveRate).toBe(0.5); // GROUNDED-EXEMPT: 1/2 = 50% FPR.
  });

  it("filters records by type and hides cancelled events when toggle is true", () => {
    // Hide cancelled = true
    const { filtered, hiddenCancelledCount } = filterConsoleRecords(
      testRecords,
      "24h",
      "ALL",
      true,
      NOW,
    );

    expect(filtered.length).toBe(2); // GROUNDED-EXEMPT: 1 active SUS + 1 SOS.
    expect(hiddenCancelledCount).toBe(1); // GROUNDED-EXEMPT: 1 hidden cancelled.

    // Filter SOS only
    const sosOnly = filterConsoleRecords(testRecords, "24h", "SOS", false, NOW);
    expect(sosOnly.filtered.length).toBe(1); // GROUNDED-EXEMPT: 1 SOS.
    expect(sosOnly.filtered[0].kind).toBe("SOS");
  });

  it("renders ConsoleScreen markup with prototype disclaimer, stats, and records", () => {
    const html = renderToStaticMarkup(
      <ConsoleScreen initialRecords={testRecords} currentTimeEpochMs={NOW} />,
    );

    // Header & disclaimers
    expect(html).toContain("SAAYA LITE — STATE VIEW");
    expect(html).toContain("PROTOTYPE");
    expect(html).toContain("Not connected to AP Police, Shakthi, T-Safe, 112 or ERSS");
    expect(html).toContain("Watch a journey happen");

    // Stats
    expect(html).toContain("False-positive rate");
    expect(html).toContain("50%"); // GROUNDED-EXEMPT: 50% FPR.

    // Records
    expect(html).toContain("dwaraka_police_station");
    expect(html).toContain("No coordinate • No session ID");
    expect(html).toContain("17.7242"); // GROUNDED-EXEMPT: coordinate in rendered output.
    expect(html).toContain("83.3024"); // GROUNDED-EXEMPT: coordinate in rendered output.
    expect(html).toContain("Dwaraka PS");
  });
});
