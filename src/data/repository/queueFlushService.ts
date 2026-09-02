import type {
  SosIncidentDraft,
  SosStatusPatch,
  SusEventPayload,
  SusOutcomePatch,
} from "../../domain/anonymiser/anonymiser";
import { calculateNextRetryEpochMs } from "../../domain/queue/backoffPolicy";
import type { QueuedRecord, QueueRepository } from "./queueRepository";

export interface QueueFlushHandlers {
  readonly patchSosStatus: (
    documentId: string,
    payload: SosStatusPatch,
  ) => Promise<void>;
  readonly patchSusOutcome: (
    documentId: string,
    payload: SusOutcomePatch,
  ) => Promise<void>;
  readonly writeSosIncident: (
    documentId: string,
    payload: SosIncidentDraft,
  ) => Promise<void>;
  readonly writeSusEvent: (
    documentId: string,
    payload: SusEventPayload,
  ) => Promise<void>;
}

export interface QueueFlushResult {
  readonly failedCount: number;
  readonly permanentFailureCount: number;
  readonly sentCount: number;
}

/** Single-flight flushing prevents two lifecycle events from racing one queue item. */
export class QueueFlushService {
  private inFlight: Promise<QueueFlushResult> | null = null;

  constructor(
    private readonly repository: QueueRepository,
    private readonly handlers: QueueFlushHandlers,
  ) {}

  flush(nowEpochMs: number): Promise<QueueFlushResult> {
    if (this.inFlight !== null) return this.inFlight;
    this.inFlight = this.flushOnce(nowEpochMs).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async flushOnce(nowEpochMs: number): Promise<QueueFlushResult> {
    let failedCount = 0;
    let permanentFailureCount = 0;
    let sentCount = 0;

    // Fetch after every pass so a patch becomes eligible immediately after its
    // stable-id create succeeds, while a failed dependency remains blocked.
    for (;;) {
      const pending = await this.repository.getPending(nowEpochMs);
      if (pending.length === 0) break;

      let sentInPass = 0;
      for (const record of pending) {
        if (record.id === undefined) continue;
        await this.repository.markSending(record.id, nowEpochMs);
        try {
          await this.send(record);
          await this.repository.markSent(record.id);
          sentCount++;
          sentInPass++;
        } catch (error: unknown) {
          failedCount++;
          const attempts = record.attempts + 1;
          const nextAttemptEpochMs = calculateNextRetryEpochMs(attempts, nowEpochMs);
          const message = error instanceof Error ? error.message : String(error);
          await this.repository.markFailed(
            record.id,
            attempts,
            nextAttemptEpochMs,
            message,
          );
          if (nextAttemptEpochMs === null) permanentFailureCount++;
        }
      }
      if (sentInPass === 0) break;
    }

    return { failedCount, permanentFailureCount, sentCount };
  }

  private async send(record: QueuedRecord): Promise<void> {
    switch (record.type) {
      case "SUS_CREATE":
        return this.handlers.writeSusEvent(record.documentId, record.payload);
      case "SOS_CREATE":
        return this.handlers.writeSosIncident(record.documentId, record.payload);
      case "SUS_OUTCOME_PATCH":
        return this.handlers.patchSusOutcome(record.documentId, record.payload);
      case "SOS_STATUS_PATCH":
        return this.handlers.patchSosStatus(record.documentId, record.payload);
    }
  }
}
