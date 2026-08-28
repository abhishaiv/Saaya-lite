import type {
  SosIncidentPayload,
  SusEventPayload,
} from "../../domain/anonymiser/anonymiser";
import { calculateNextRetryEpochMs } from "../../domain/queue/backoffPolicy";
import type {
  QueuedRecord,
  QueueRepository,
} from "./queueRepository";

export interface QueueFlushHandlers {
  readonly sendSusEvent: (payload: SusEventPayload) => Promise<string>;
  readonly sendSosIncident: (payload: SosIncidentPayload) => Promise<string>;
}

export class QueueFlushService {
  constructor(
    private readonly repository: QueueRepository,
    private readonly handlers: QueueFlushHandlers,
  ) {}

  /**
   * Flushes all pending queue items ready at nowEpochMs.
   * Priority: SOS_INCIDENT drained first before SUS_EVENT.
   * Returns count of successfully sent items.
   */
  async flush(nowEpochMs: number): Promise<{
    sentCount: number;
    failedCount: number;
    permanentFailureCount: number;
  }> {
    const pending = await this.repository.getPending(nowEpochMs);
    let sentCount = 0;
    let failedCount = 0;
    let permanentFailureCount = 0;

    for (const item of pending) {
      if (item.id === undefined) continue;

      await this.repository.markSending(item.id, nowEpochMs);

      try {
        let remoteId: string;
        if (item.type === "SOS_INCIDENT") {
          remoteId = await this.handlers.sendSosIncident(
            item.payload as SosIncidentPayload,
          );
        } else {
          remoteId = await this.handlers.sendSusEvent(
            item.payload as SusEventPayload,
          );
        }

        await this.repository.markSent(item.id, remoteId);
        sentCount++;
      } catch (err: unknown) {
        failedCount++;
        const nextAttempts = item.attempts + 1;
        const nextEpochMs = calculateNextRetryEpochMs(nextAttempts, nowEpochMs);
        const errorMessage =
          err instanceof Error ? err.message : String(err);

        await this.repository.markFailed(
          item.id,
          nextAttempts,
          nextEpochMs,
          errorMessage,
        );

        if (nextEpochMs === null) {
          permanentFailureCount++;
        }
      }
    }

    return { sentCount, failedCount, permanentFailureCount };
  }

  async getPermanentFailures(): Promise<QueuedRecord[]> {
    const all = await this.repository.getAll();
    return all.filter((item) => item.status === "FAILED_PERMANENT");
  }
}
