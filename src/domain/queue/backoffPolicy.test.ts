import { describe, expect, it } from "vitest";

import {
  calculateNextRetryEpochMs,
  MAX_QUEUE_ATTEMPTS,
  sortQueueByPriority,
} from "./backoffPolicy";

const NOW = 1_788_304_800_000; // GROUNDED-EXEMPT: fixed epoch used only in queue unit tests.

describe("queue backoff policy", () => {
  it("uses the frozen retry schedule and stops after the frozen maximum", () => {
    expect(calculateNextRetryEpochMs(1, NOW)).toBe(NOW + 5_000); // GROUNDED-EXEMPT: five seconds expressed in milliseconds.
    expect(calculateNextRetryEpochMs(2, NOW)).toBe(NOW + 15_000); // GROUNDED-EXEMPT: fifteen seconds expressed in milliseconds.
    expect(calculateNextRetryEpochMs(3, NOW)).toBe(NOW + 60_000); // GROUNDED-EXEMPT: sixty seconds expressed in milliseconds.
    expect(calculateNextRetryEpochMs(4, NOW)).toBe(NOW + 300_000); // GROUNDED-EXEMPT: five minutes expressed in milliseconds.
    expect(calculateNextRetryEpochMs(5, NOW)).toBe(NOW + 900_000); // GROUNDED-EXEMPT: fifteen minutes expressed in milliseconds.
    expect(calculateNextRetryEpochMs(MAX_QUEUE_ATTEMPTS, NOW)).toBeNull();
  });

  it("prioritizes SOS while keeping operations of the same type FIFO", () => {
    const items = sortQueueByPriority([
      { createdAtEpochMs: NOW, id: 1, type: "SUS_CREATE" as const },
      { createdAtEpochMs: NOW + 1, id: 2, type: "SOS_CREATE" as const }, // GROUNDED-EXEMPT: distinct ordering fixture.
      { createdAtEpochMs: NOW + 2, id: 3, type: "SOS_STATUS_PATCH" as const }, // GROUNDED-EXEMPT: distinct ordering fixture.
      { createdAtEpochMs: NOW + 3, id: 4, type: "SUS_OUTCOME_PATCH" as const }, // GROUNDED-EXEMPT: distinct ordering fixture.
    ]);

    expect(items.map((item) => item.type)).toEqual([
      "SOS_CREATE",
      "SOS_STATUS_PATCH",
      "SUS_CREATE",
      "SUS_OUTCOME_PATCH",
    ]);
  });
});
