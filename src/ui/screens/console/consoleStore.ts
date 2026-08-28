import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Firestore,
} from "firebase/firestore";

import type {
  SosIncidentPayload,
  SusEventPayload,
} from "../../../domain/anonymiser/anonymiser";
import { getSaayaFirestore } from "../../../data/firebase/firebaseApp";

export type TimeWindow = "24h" | "7d" | "30d";
export type TypeFilter = "ALL" | "SUS" | "SOS";

export interface ConsoleSusRecord extends SusEventPayload {
  readonly id: string;
  readonly createdAtEpochMs: number;
}

export interface ConsoleSosRecord extends SosIncidentPayload {
  readonly id: string;
  readonly triggeredAtEpochMs: number;
}

export type ConsoleRecordItem =
  | { readonly kind: "SUS"; readonly record: ConsoleSusRecord }
  | { readonly kind: "SOS"; readonly record: ConsoleSosRecord };

export interface ConsoleStats {
  readonly susCount: number;
  readonly sosCount: number;
  readonly zonesFlaggedCount: number;
  readonly repeatZonesCount: number;
  readonly cancelledCount: number;
  readonly falsePositiveRate: number; // 0.0 .. 1.0
}

const HOURS_24_MS = 24 * 60 * 60 * 1000; // GROUNDED-EXEMPT: 24h window calculation (24*60*60*1000).
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000; // GROUNDED-EXEMPT: 7d window calculation (7*24*60*60*1000).
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000; // GROUNDED-EXEMPT: 30d window calculation (30*24*60*60*1000).

export function getWindowStartEpochMs(window: TimeWindow, nowEpochMs: number): number {
  switch (window) {
    case "24h":
      return nowEpochMs - HOURS_24_MS;
    case "7d":
      return nowEpochMs - DAYS_7_MS;
    case "30d":
      return nowEpochMs - DAYS_30_MS;
  }
}

export function filterConsoleRecords(
  records: readonly ConsoleRecordItem[],
  window: TimeWindow,
  typeFilter: TypeFilter,
  hideCancelled: boolean,
  nowEpochMs: number,
): { filtered: ConsoleRecordItem[]; hiddenCancelledCount: number } {
  const windowStart = getWindowStartEpochMs(window, nowEpochMs);
  let hiddenCancelledCount = 0;

  const filtered = records.filter((item) => {
    const itemTime =
      item.kind === "SUS"
        ? item.record.createdAtEpochMs
        : item.record.triggeredAtEpochMs;

    if (itemTime < windowStart) {
      return false;
    }

    if (typeFilter === "SUS" && item.kind !== "SUS") return false;
    if (typeFilter === "SOS" && item.kind !== "SOS") return false;

    if (item.kind === "SUS" && item.record.outcome === "CANCELLED_BY_USER") {
      if (hideCancelled) {
        hiddenCancelledCount++;
        return false;
      }
    }

    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => {
    const aTime =
      a.kind === "SUS" ? a.record.createdAtEpochMs : a.record.triggeredAtEpochMs;
    const bTime =
      b.kind === "SUS" ? b.record.createdAtEpochMs : b.record.triggeredAtEpochMs;
    return bTime - aTime;
  });

  return { filtered, hiddenCancelledCount };
}

export function computeConsoleStats(
  records: readonly ConsoleRecordItem[],
  window: TimeWindow,
  nowEpochMs: number,
): ConsoleStats {
  const windowStart = getWindowStartEpochMs(window, nowEpochMs);
  const susInWindow: ConsoleSusRecord[] = [];
  const sosInWindow: ConsoleSosRecord[] = [];

  for (const item of records) {
    if (item.kind === "SUS") {
      if (item.record.createdAtEpochMs >= windowStart) {
        susInWindow.push(item.record);
      }
    } else {
      if (item.record.triggeredAtEpochMs >= windowStart) {
        sosInWindow.push(item.record);
      }
    }
  }

  const zoneCounts = new Map<string, number>();
  let cancelledCount = 0;

  for (const sus of susInWindow) {
    zoneCounts.set(sus.zoneId, (zoneCounts.get(sus.zoneId) ?? 0) + 1); // GROUNDED-EXEMPT: tally increment.
    if (sus.outcome === "CANCELLED_BY_USER") {
      cancelledCount++;
    }
  }

  let repeatZonesCount = 0;
  for (const count of Array.from(zoneCounts.values())) {
    if (count >= 2) { // GROUNDED-EXEMPT: threshold for repeat zone (>=2).
      repeatZonesCount++;
    }
  }

  const susCount = susInWindow.length;
  const falsePositiveRate =
    susCount > 0 ? cancelledCount / susCount : 0.0;

  return {
    susCount,
    sosCount: sosInWindow.length,
    zonesFlaggedCount: zoneCounts.size,
    repeatZonesCount,
    cancelledCount,
    falsePositiveRate,
  };
}

export function subscribeToConsoleRecords(
  onUpdate: (records: ConsoleRecordItem[]) => void,
  customDb?: Firestore,
): () => void {
  try {
    const db = customDb ?? getSaayaFirestore();
    let currentSus: ConsoleSusRecord[] = [];
    let currentSos: ConsoleSosRecord[] = [];

    const notify = () => {
      const combined: ConsoleRecordItem[] = [
        ...currentSus.map((record) => ({ kind: "SUS" as const, record })),
        ...currentSos.map((record) => ({ kind: "SOS" as const, record })),
      ];
      onUpdate(combined);
    };

    const susQuery = query(collection(db, "sus_events"), orderBy("createdAt", "desc"));
    const sosQuery = query(collection(db, "sos_incidents"), orderBy("triggeredAt", "desc"));

    const unsubSus = onSnapshot(
      susQuery,
      (snapshot) => {
        currentSus = snapshot.docs.map((doc) => {
          const data = doc.data() as SusEventPayload & { createdAt?: { toMillis?: () => number } };
          const createdAtEpochMs =
            typeof data.createdAt?.toMillis === "function"
              ? data.createdAt.toMillis()
              : Date.now();
          return {
            ...data,
            id: doc.id,
            createdAtEpochMs,
          };
        });
        notify();
      },
      (err) => {
        console.warn("Firestore sus_events subscription notice:", err);
      },
    );

    const unsubSos = onSnapshot(
      sosQuery,
      (snapshot) => {
        currentSos = snapshot.docs.map((doc) => {
          const data = doc.data() as SosIncidentPayload & { triggeredAt?: { toMillis?: () => number } };
          const triggeredAtEpochMs =
            typeof data.triggeredAt?.toMillis === "function"
              ? data.triggeredAt.toMillis()
              : Date.now();
          return {
            ...data,
            id: doc.id,
            triggeredAtEpochMs,
          };
        });
        notify();
      },
      (err) => {
        console.warn("Firestore sos_incidents subscription notice:", err);
      },
    );

    return () => {
      unsubSus();
      unsubSos();
    };
  } catch (err) {
    console.warn("Failed to subscribe to Firestore console feed:", err);
    return () => {};
  }
}
