"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createSosIncidentPayload,
  createSusEventPayload,
} from "../../../domain/anonymiser/anonymiser";
import { ensureAnonymousAuth } from "../../../data/firebase/firebaseApp";
import { FirestoreSosWriter } from "../../../data/firebase/sosWriter";
import { FirestoreSusWriter } from "../../../data/firebase/susWriter";
import { ConsoleFilters } from "./ConsoleFilters";
import { ConsoleHeader } from "./ConsoleHeader";
import { ConsoleRecordList } from "./ConsoleRecordList";
import { ConsoleStatStrip } from "./ConsoleStatStrip";
import {
  computeConsoleStats,
  filterConsoleRecords,
  subscribeToConsoleRecords,
  type ConsoleRecordItem,
  type TimeWindow,
  type TypeFilter,
} from "./consoleStore";

export interface ConsoleScreenProps {
  readonly initialRecords?: readonly ConsoleRecordItem[];
  readonly currentTimeEpochMs?: number;
}

const DEFAULT_INITIAL_RECORDS: ConsoleRecordItem[] = [
  {
    kind: "SUS",
    record: {
      id: "initial-sus-1",
      zoneId: "dwaraka_police_station",
      riskTier: "high",
      hourBand: "NIGHT_DEEP",
      hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
      dateLocal: "2026-08-28", // GROUNDED-EXEMPT: fixture date string.
      createdAt: null,
      createdAtEpochMs: Date.now() - 3600000, // GROUNDED-EXEMPT: 1h ago.
      outcome: "PENDING",
      armMode: "AUTO_ZONE",
      source: "CONSOLE_DEMO",
      appVersion: "1.0.0",
    },
  },
  {
    kind: "SUS",
    record: {
      id: "initial-sus-2",
      zoneId: "mvp_colony_police_station",
      riskTier: "moderate",
      hourBand: "NIGHT_LATE",
      hourLocal: 1, // GROUNDED-EXEMPT: fixture hour.
      dateLocal: "2026-08-28", // GROUNDED-EXEMPT: fixture date string.
      createdAt: null,
      createdAtEpochMs: Date.now() - 7200000, // GROUNDED-EXEMPT: 2h ago.
      outcome: "CANCELLED_BY_USER",
      armMode: "AUTO_ZONE",
      source: "CONSOLE_DEMO",
      appVersion: "1.0.0",
    },
  },
];

export function ConsoleScreen({
  initialRecords,
  currentTimeEpochMs,
}: ConsoleScreenProps) {
  const [records, setRecords] = useState<ConsoleRecordItem[]>(
    initialRecords ? [...initialRecords] : DEFAULT_INITIAL_RECORDS,
  );
  const [window, setWindow] = useState<TimeWindow>("24h");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [hideCancelled, setHideCancelled] = useState(true);
  const [isRunningJourney, setIsRunningJourney] = useState(false);
  const [currentNarration, setCurrentNarration] = useState<string | null>(null);
  const [autoExpandedSosId, setAutoExpandedSosId] = useState<string | null>(null);
  const [nowEpochMs, setNowEpochMs] = useState(
    () => currentTimeEpochMs ?? Date.now(),
  );

  // Subscribe to live Firestore feed
  useEffect(() => {
    const unsubscribe = subscribeToConsoleRecords((liveRecords) => {
      if (liveRecords.length > 0) {
        setRecords(liveRecords);
      }
    });
    return () => unsubscribe();
  }, []);

  // Update clock tick every minute for window filters
  useEffect(() => {
    if (currentTimeEpochMs !== undefined) return;
    const timer = setInterval(() => {
      setNowEpochMs(Date.now());
    }, 60000); // GROUNDED-EXEMPT: 1-minute window refresh interval.
    return () => clearInterval(timer);
  }, [currentTimeEpochMs]);

  const stats = useMemo(
    () => computeConsoleStats(records, window, nowEpochMs),
    [records, window, nowEpochMs],
  );

  const { filtered, hiddenCancelledCount } = useMemo(
    () => filterConsoleRecords(records, window, typeFilter, hideCancelled, nowEpochMs),
    [records, window, typeFilter, hideCancelled, nowEpochMs],
  );

  const handleTriggerJourney = async () => {
    setIsRunningJourney(true);
    setAutoExpandedSosId(null);

    const susWriter = new FirestoreSusWriter();
    const sosWriter = new FirestoreSosWriter();

    try {
      // Ensure anonymous auth
      await ensureAnonymousAuth().catch((e) => console.warn("Anon auth notice in demo:", e));

      // Step 1: 0s
      setCurrentNarration(
        "04:05. She gets into an auto in Dwaraka Nagar. High-risk area, deep night. Saaya arms itself. She pressed nothing.",
      );
      await new Promise((r) => setTimeout(r, 4000)); // GROUNDED-EXEMPT: scripted narration pause 4s.

      // Step 2: +4s
      setCurrentNarration(
        "04:10. Saaya checks in. It tells her why it checked now. She does not answer.",
      );
      await new Promise((r) => setTimeout(r, 6000)); // GROUNDED-EXEMPT: scripted narration pause 6s.

      // Step 3: +10s
      setCurrentNarration(
        "04:12. It asks again, louder. Still nothing. Until this moment the state has seen nothing about her at all.",
      );
      await new Promise((r) => setTimeout(r, 4000)); // GROUNDED-EXEMPT: scripted narration pause 4s.

      // Step 4: +14s -> Write SUS event
      setCurrentNarration(
        "04:13. Her favourite is told. And this is the first thing a station receives: an area, an hour, a date. No coordinate. No name. Nothing linking it to any other trip you have taken.",
      );
      const susPayload = createSusEventPayload({
        zoneId: "dwaraka_police_station",
        riskTier: "high",
        hourBand: "NIGHT_DEEP",
        hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
        dateLocal: new Date().toISOString().slice(0, 10), // GROUNDED-EXEMPT: YYYY-MM-DD date slice.
        armMode: "AUTO_ZONE",
        source: "CONSOLE_DEMO",
      });

      let writtenSusId = `local-demo-sus-${Date.now()}`;
      try {
        writtenSusId = await susWriter.writeSusEvent(susPayload);
      } catch (err) {
        console.warn("Firestore live write fallback in demo:", err);
      }

      // Add to local state if not subscribed
      setRecords((prev) => [
        {
          kind: "SUS",
          record: {
            ...susPayload,
            id: writtenSusId,
            createdAtEpochMs: Date.now(),
          },
        },
        ...prev,
      ]);

      await new Promise((r) => setTimeout(r, 8000)); // GROUNDED-EXEMPT: scripted narration pause 8s.

      // Step 5: +22s
      setCurrentNarration("She has 60 seconds to cancel. She does not.");
      await new Promise((r) => setTimeout(r, 6000)); // GROUNDED-EXEMPT: scripted narration pause 6s.

      // Step 6: +28s -> Write SOS incident
      setCurrentNarration(
        "04:14. SOS. Now, and only now, her precise location and the last few minutes cross. Open the timeline below: a control room gets a sequence, not a dot.",
      );
      const sosPayload = createSosIncidentPayload({
        uid: "anon-demo-live-session",
        trigger: "LADDER_LAPSE",
        location: {
          lat: 17.7242, // GROUNDED-EXEMPT: Vizag centroid demo coordinate.
          lon: 83.3024, // GROUNDED-EXEMPT: Vizag centroid demo coordinate.
          accuracyM: 12.4, // GROUNDED-EXEMPT: accuracy demo in meters.
        },
        zoneId: "dwaraka_police_station",
        zoneName: "Dwaraka Police Station",
        riskTier: "high",
        hourLocal: 4, // GROUNDED-EXEMPT: fixture hour.
        nearestStation: {
          id: "PS-004", // GROUNDED-EXEMPT: station ID fixture.
          name: "Dwaraka PS",
          phone: "0891-2565100", // GROUNDED-EXEMPT: station phone fixture.
          distanceM: 298, // GROUNDED-EXEMPT: distance in meters.
        },
        timeline: [
          { at: "04:05:12", type: "ARMED", detail: "auto, zone entry" }, // GROUNDED-EXEMPT: timeline time.
          { at: "04:10:12", type: "CHECKIN_1_SHOWN" }, // GROUNDED-EXEMPT: timeline time.
          { at: "04:11:42", type: "CHECKIN_1_MISSED" }, // GROUNDED-EXEMPT: timeline time.
          { at: "04:12:42", type: "CHECKIN_2_MISSED" }, // GROUNDED-EXEMPT: timeline time.
          { at: "04:13:42", type: "FAMILY_NOTIFIED" }, // GROUNDED-EXEMPT: timeline time.
          { at: "04:14:42", type: "SOS_TRIGGERED" }, // GROUNDED-EXEMPT: timeline time.
        ],
        contactsNotified: 1, // GROUNDED-EXEMPT: contact count fixture.
      });

      let writtenSosId = `local-demo-sos-${Date.now()}`;
      try {
        writtenSosId = await sosWriter.writeSosIncident(sosPayload);
      } catch (err) {
        console.warn("Firestore live write fallback in demo:", err);
      }

      setRecords((prev) => [
        {
          kind: "SOS",
          record: {
            ...sosPayload,
            id: writtenSosId,
            triggeredAtEpochMs: Date.now(),
          },
        },
        ...prev,
      ]);

      // Auto-expand the newly created SOS timeline
      setAutoExpandedSosId(writtenSosId);

      await new Promise((r) => setTimeout(r, 4000)); // GROUNDED-EXEMPT: finale pause 4s.
      setCurrentNarration(
        "That was synthetic. The same thing happens from the app, and the video shows it from her side.",
      );
    } finally {
      setIsRunningJourney(false);
    }
  };

  return (
    <main className="console-screen">
      <ConsoleHeader
        onTriggerJourney={handleTriggerJourney}
        isRunningJourney={isRunningJourney}
        currentNarration={currentNarration}
      />

      <ConsoleStatStrip stats={stats} />

      <ConsoleFilters
        window={window}
        typeFilter={typeFilter}
        hideCancelled={hideCancelled}
        hiddenCancelledCount={hiddenCancelledCount}
        onWindowChange={setWindow}
        onTypeFilterChange={setTypeFilter}
        onHideCancelledChange={setHideCancelled}
      />

      <ConsoleRecordList
        records={filtered}
        autoExpandedSosId={autoExpandedSosId}
      />

      <style jsx>{`
        .console-screen {
          min-block-size: 100dvh; /* GROUNDED-EXEMPT: full-screen console layout. */
          background: var(--color-background);
          color: var(--color-text-primary);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
      `}</style>
    </main>
  );
}
