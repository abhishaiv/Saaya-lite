import { describe, expect, it } from "vitest";

import {
  calculateNextRetryEpochMs,
  MAX_QUEUE_ATTEMPTS,
  sortQueueByPriority,
  type QueuePriorityComparable,
} from "./backoffPolicy";

describe("backoffPolicy - BUSINESS_RULES section 11", () => {
  const BASE_NOW = 1000000; // GROUNDED-EXEMPT: arbitrary base epoch ms for unit test.

  it("calculates exact backoff schedule (5 s, 15 s, 60 s, 300 s, 900 s)", () => {
    // Attempt 1 fails -> retry 1 in 5s (5000ms)
    expect(calculateNextRetryEpochMs(1, BASE_NOW)).toBe(BASE_NOW + 5000); // GROUNDED-EXEMPT: 5000 ms.
    // Attempt 2 fails -> retry 2 in 15s (15000ms)
    expect(calculateNextRetryEpochMs(2, BASE_NOW)).toBe(BASE_NOW + 15000); // GROUNDED-EXEMPT: 15000 ms.
    // Attempt 3 fails -> retry 3 in 60s (60000ms)
    expect(calculateNextRetryEpochMs(3, BASE_NOW)).toBe(BASE_NOW + 60000); // GROUNDED-EXEMPT: 60000 ms.
    // Attempt 4 fails -> retry 4 in 300s (300000ms)
    expect(calculateNextRetryEpochMs(4, BASE_NOW)).toBe(BASE_NOW + 300000); // GROUNDED-EXEMPT: 300000 ms.
    // Attempt 5 fails -> retry 5 in 900s (900000ms)
    expect(calculateNextRetryEpochMs(5, BASE_NOW)).toBe(BASE_NOW + 900000); // GROUNDED-EXEMPT: 900000 ms.
    // Attempt 10..19 -> stays capped at 900s (900000ms)
    expect(calculateNextRetryEpochMs(10, BASE_NOW)).toBe(BASE_NOW + 900000); // GROUNDED-EXEMPT: 900000 ms.
    expect(calculateNextRetryEpochMs(19, BASE_NOW)).toBe(BASE_NOW + 900000); // GROUNDED-EXEMPT: 900000 ms.
  });

  it("returns null after 20 attempts marking FAILED_PERMANENT", () => {
    expect(calculateNextRetryEpochMs(MAX_QUEUE_ATTEMPTS, BASE_NOW)).toBeNull();
    expect(calculateNextRetryEpochMs(21, BASE_NOW)).toBeNull(); // GROUNDED-EXEMPT: over-max test count.
  });

  it("ensures SOS_INCIDENT jumps ahead of any SUS_EVENT", () => {
    const items: QueuePriorityComparable[] = [
      { type: "SUS_EVENT", createdAtEpochMs: 100, id: 1 }, // GROUNDED-EXEMPT: fixture time.
      { type: "SUS_EVENT", createdAtEpochMs: 200, id: 2 }, // GROUNDED-EXEMPT: fixture time.
      { type: "SOS_INCIDENT", createdAtEpochMs: 300, id: 3 }, // GROUNDED-EXEMPT: fixture time.
      { type: "SUS_EVENT", createdAtEpochMs: 400, id: 4 }, // GROUNDED-EXEMPT: fixture time.
    ];

    const sorted = sortQueueByPriority(items);

    expect(sorted[0].type).toBe("SOS_INCIDENT");
    expect(sorted[0].id).toBe(3); // GROUNDED-EXEMPT: fixture id.
    expect(sorted[1].id).toBe(1); // GROUNDED-EXEMPT: fixture id.
    expect(sorted[2].id).toBe(2); // GROUNDED-EXEMPT: fixture id.
    expect(sorted[3].id).toBe(4); // GROUNDED-EXEMPT: fixture id.
  });
});
