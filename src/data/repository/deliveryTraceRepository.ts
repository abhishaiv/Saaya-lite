import type { SosTimelineType } from "../../domain/anonymiser/anonymiser";

export interface DeliveryTraceEntry {
  readonly atEpochMs: number;
  readonly type: SosTimelineType;
}

export interface DeliveryTraceRepository {
  append(sessionId: string, entry: DeliveryTraceEntry): Promise<void>;
  clear(sessionId: string): Promise<void>;
  load(sessionId: string): Promise<readonly DeliveryTraceEntry[]>;
}

export class FakeDeliveryTraceRepository implements DeliveryTraceRepository {
  private readonly entries = new Map<string, DeliveryTraceEntry[]>();

  async append(sessionId: string, entry: DeliveryTraceEntry): Promise<void> {
    this.entries.set(sessionId, [...(this.entries.get(sessionId) ?? []), entry]);
  }

  async clear(sessionId: string): Promise<void> {
    this.entries.delete(sessionId);
  }

  async load(sessionId: string): Promise<readonly DeliveryTraceEntry[]> {
    return this.entries.get(sessionId) ?? [];
  }
}
