/**
 * Backoff schedule from BUSINESS_RULES.md section 11 (F22).
 * Attempts at 5 s, 15 s, 60 s, 300 s (5 min), 900 s (15 min).
 * After 20 attempts mark FAILED_PERMANENT.
 */
export const QUEUE_BACKOFF_STEPS_S = [5, 15, 60, 300, 900] as const;
export const MAX_QUEUE_ATTEMPTS = 20;

const MS_PER_SECOND = 1000;

export type QueueItemType = "SUS_EVENT" | "SOS_INCIDENT";

export interface QueuePriorityComparable {
  readonly type: QueueItemType;
  readonly createdAtEpochMs?: number;
  readonly id?: number;
}

/**
 * Calculates the next retry timestamp in epoch ms.
 * attemptCount is the number of attempts already made (1 for the first failure).
 * Returns null if attempts have reached MAX_QUEUE_ATTEMPTS (20), indicating FAILED_PERMANENT.
 */
export function calculateNextRetryEpochMs(
  attemptCount: number,
  nowEpochMs: number,
): number | null {
  if (attemptCount >= MAX_QUEUE_ATTEMPTS) {
    return null;
  }

  const stepIndex = Math.min(
    Math.max(0, attemptCount - 1), // GROUNDED-EXEMPT: 0-indexed step from attempt count (1..5).
    QUEUE_BACKOFF_STEPS_S.length - 1, // GROUNDED-EXEMPT: array bounds index calculation.
  );
  const intervalSeconds = QUEUE_BACKOFF_STEPS_S[stepIndex];
  const intervalMs = intervalSeconds * MS_PER_SECOND;

  return nowEpochMs + intervalMs;
}

/**
 * Prioritizes queue items:
 * SOS_INCIDENT always jumps the queue ahead of any SUS_EVENT.
 * Within the same item type, earlier createdAtEpochMs (or id) goes first.
 */
export function compareQueuePriority<T extends QueuePriorityComparable>(
  a: T,
  b: T,
): number {
  if (a.type !== b.type) {
    // SOS_INCIDENT has highest priority (-1 if a is SOS, 1 if b is SOS)
    if (a.type === "SOS_INCIDENT") return -1;
    if (b.type === "SOS_INCIDENT") return 1;
  }

  // Same type: FIFO order
  const aTime = a.createdAtEpochMs ?? a.id ?? 0;
  const bTime = b.createdAtEpochMs ?? b.id ?? 0;
  return aTime - bTime;
}

export function sortQueueByPriority<T extends QueuePriorityComparable>(
  items: readonly T[],
): T[] {
  return [...items].sort(compareQueuePriority);
}
