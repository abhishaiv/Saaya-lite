export const QUEUE_BACKOFF_STEPS_S = [5, 15, 60, 300, 900] as const; // facts: queue.backoff.0, queue.backoff.1, queue.backoff.2, queue.backoff.3, queue.backoff.4
export const MAX_QUEUE_ATTEMPTS = 20; // fact: queue.max_attempts

const MILLISECONDS_PER_SECOND = 1_000; // GROUNDED-EXEMPT: SI unit conversion.

export type QueueItemType =
  | "SUS_CREATE"
  | "SUS_OUTCOME_PATCH"
  | "SOS_CREATE"
  | "SOS_STATUS_PATCH";

export interface QueuePriorityComparable {
  readonly createdAtEpochMs: number;
  readonly id?: number;
  readonly type: QueueItemType;
}

export function calculateNextRetryEpochMs(
  attemptCount: number,
  nowEpochMs: number,
): number | null {
  if (attemptCount >= MAX_QUEUE_ATTEMPTS) return null;

  const stepIndex = Math.min(
    Math.max(0, attemptCount - 1), // GROUNDED-EXEMPT: retry count is one-based, array index is zero-based.
    QUEUE_BACKOFF_STEPS_S.length - 1, // GROUNDED-EXEMPT: final backoff step repeats after the schedule ends.
  );
  return nowEpochMs + QUEUE_BACKOFF_STEPS_S[stepIndex] * MILLISECONDS_PER_SECOND;
}

/**
 * SOS operations move ahead of civic operations, except dependency resolution
 * is enforced separately by the queue repository.
 */
export function compareQueuePriority<T extends QueuePriorityComparable>(
  left: T,
  right: T,
): number {
  const priority = queuePriority(left.type) - queuePriority(right.type);
  if (priority !== 0) return priority;
  if (left.createdAtEpochMs !== right.createdAtEpochMs) {
    return left.createdAtEpochMs - right.createdAtEpochMs;
  }
  return (left.id ?? 0) - (right.id ?? 0);
}

export function sortQueueByPriority<T extends QueuePriorityComparable>(
  items: readonly T[],
): T[] {
  return [...items].sort(compareQueuePriority);
}

function queuePriority(type: QueueItemType): number {
  switch (type) {
    case "SOS_CREATE":
      return 0; // GROUNDED-EXEMPT: relative priority enum, not a product value.
    case "SOS_STATUS_PATCH":
      return 1; // GROUNDED-EXEMPT: relative priority enum, not a product value.
    case "SUS_CREATE":
      return 2; // GROUNDED-EXEMPT: relative priority enum, not a product value.
    case "SUS_OUTCOME_PATCH":
      return 3; // GROUNDED-EXEMPT: relative priority enum, not a product value.
  }
}
