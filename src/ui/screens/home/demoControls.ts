import type { SessionEvent } from "../../../domain/model/session";

/**
 * The Start Demo sequence (founder decision 2026-09-06): a simulated entry
 * into the demo's synthetic HIGH zone at the frozen demo hour arms a real
 * AUTO_ZONE session on the shared engine, then the check-in timer fires
 * immediately so check-in 1 opens at Start (fact: demo.start.checkin1.sec).
 * Every later transition, countdown, alert intent and PIN resolution runs
 * through the same shared path as a live session; there is no separate fake
 * sequence.
 */
export function startDemoEventSequence(zoneId: string): readonly SessionEvent[] {
  return [
    { kind: "ZoneEntered", zoneId },
    { kind: "CheckInTimerFired" },
  ];
}