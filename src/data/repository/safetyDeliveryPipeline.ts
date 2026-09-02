import {
  createSosIncidentDraft,
  createSosStatusPatch,
  createSusEventPayload,
  createSusOutcomePatch,
  type FamilyMessageDelivery,
  type RecordRiskTier,
  type RecordSource,
  type SosLocation,
  type SosNearestStation,
  type SosTimelineType,
} from "../../domain/anonymiser/anonymiser";
import type { Command, HourBand, PersistedSession } from "../../domain/model/session";
import type { Zone } from "../../domain/model/zone";
import type { DeliveryTraceRepository } from "./deliveryTraceRepository";
import type { QueueFlushService } from "./queueFlushService";
import type { QueueRepository } from "./queueRepository";

export interface DeliveryClock {
  dateLocalAt(epochMs: number): string;
  hourLocalAt(epochMs: number): number;
  timelineTimeAt(epochMs: number): string;
}

export interface SafetyDeliveryContext {
  readonly appVersion: string;
  /** Count only; favourites' names and numbers never leave this device. */
  readonly favouritesConfigured: number;
  /** Truthful local handoff state, never a claim of message delivery. */
  readonly familyMessageDelivery: FamilyMessageDelivery;
  readonly currentLocation: SosLocation | null;
  readonly nearestStation: SosNearestStation | null;
  readonly nowEpochMs: number;
  readonly session: PersistedSession;
  readonly source: RecordSource;
  readonly zone: Zone | null;
}

export interface DeliveryEffectResult {
  readonly sosEnqueued: boolean;
  readonly susEnqueued: boolean;
}

/**
 * Builds only the two authorized outbound payloads, writes them durably before
 * a session records the command as handled, and keeps every identifier out of
 * the SUS payload by construction. Firebase authentication happens later,
 * inside the queue writer, so first-use offline SOS never loses its draft.
 */
export class SafetyDeliveryPipeline {
  constructor(
    private readonly queue: QueueRepository,
    private readonly trace: DeliveryTraceRepository,
    private readonly flushService: QueueFlushService,
    private readonly clock: DeliveryClock,
    private readonly createId: () => string,
  ) {}

  async apply(
    command: Command,
    context: SafetyDeliveryContext,
  ): Promise<DeliveryEffectResult> {
    switch (command.kind) {
      case "WriteSusEvent":
        return {
          sosEnqueued: false,
          susEnqueued: await this.enqueueSus(context),
        };
      case "PatchSusOutcome": {
        await this.enqueueSusOutcomePatch(command.outcome, context);
        return { sosEnqueued: false, susEnqueued: false };
      }
      case "WriteSosIncident": {
        this.assertSosCanStart(context);
        if (context.currentLocation === null) {
          return { sosEnqueued: false, susEnqueued: false };
        }
        await this.recordTrace(command, context);
        return {
          sosEnqueued: await this.enqueueSos(command.trigger, context),
          susEnqueued: false,
        };
      }
      case "PatchSosStatus": {
        const sosStatusPatched = await this.enqueueSosStatusPatch(context);
        if (sosStatusPatched) await this.recordTrace(command, context);
        return { sosEnqueued: false, susEnqueued: false };
      }
      default:
        await this.recordTrace(command, context);
        return { sosEnqueued: false, susEnqueued: false };
    }
  }

  async recordsForSession(sessionId: string) {
    const records = await this.queue.getAll();
    return records.filter((record) => record.localSessionId === sessionId);
  }

  private async enqueueSus(context: SafetyDeliveryContext): Promise<boolean> {
    if (context.session.state !== "FAMILY_ESCALATED") {
      throw new Error("A civic record may be created only at FAMILY_ESCALATED");
    }
    // fact: boundary.civicSignal.arm_mode. MANUAL sessions have no verified
    // zone/hour evidence, so their family window stays local.
    if (context.session.armMode !== "AUTO_ZONE") return false;
    const timing = civicTiming(context.session);
    if (context.session.zoneId === null || context.zone === null) {
      throw new Error("FAMILY_ESCALATED requires the active zone for its civic record");
    }
    if (context.zone.stationId !== context.session.zoneId) {
      throw new Error("Civic record zone does not match the active session zone");
    }

    const id = this.createId();
    const result = await this.queue.enqueueIfAbsent({
      attempts: 0,
      createdAtEpochMs: context.nowEpochMs,
      dedupeKey: `sus:create:${context.session.sessionId}`,
      documentId: id,
      localSessionId: context.session.sessionId,
      nextAttemptEpochMs: context.nowEpochMs,
      operationId: id,
      payload: createSusEventPayload({
        appVersion: context.appVersion,
        armMode: context.session.armMode,
        dateLocal: this.clock.dateLocalAt(timing.epochMs),
        hourBand: timing.hourBand,
        hourLocal: this.clock.hourLocalAt(timing.epochMs),
        riskTier: riskTierForRecord(context.zone),
        source: context.source,
        zoneId: context.zone.stationId,
      }),
      status: "PENDING",
      type: "SUS_CREATE",
    });
    this.flush(context.nowEpochMs);
    return result.record.type === "SUS_CREATE";
  }

  private async enqueueSusOutcomePatch(
    outcome: Extract<Command, { kind: "PatchSusOutcome" }>["outcome"],
    context: SafetyDeliveryContext,
  ): Promise<void> {
    const create = await this.queue.getBySessionAndType(
      context.session.sessionId,
      "SUS_CREATE",
    );
    if (create?.type !== "SUS_CREATE") return;

    const id = this.createId();
    await this.queue.enqueueIfAbsent({
      attempts: 0,
      createdAtEpochMs: context.nowEpochMs,
      dedupeKey: `sus:outcome:${context.session.sessionId}`,
      dependsOnOperationId: create.operationId,
      documentId: create.documentId,
      localSessionId: context.session.sessionId,
      nextAttemptEpochMs: context.nowEpochMs,
      operationId: id,
      payload: createSusOutcomePatch(outcome),
      status: "PENDING",
      type: "SUS_OUTCOME_PATCH",
    });
    this.flush(context.nowEpochMs);
  }

  private async enqueueSos(
    trigger: Extract<Command, { kind: "WriteSosIncident" }>["trigger"],
    context: SafetyDeliveryContext,
  ): Promise<boolean> {
    this.assertSosCanStart(context);
    if (context.currentLocation === null) return false;

    const id = this.createId();
    const trace = await this.trace.load(context.session.sessionId);
    const result = await this.queue.enqueueIfAbsent({
      attempts: 0,
      createdAtEpochMs: context.nowEpochMs,
      dedupeKey: `sos:create:${context.session.sessionId}`,
      documentId: id,
      localSessionId: context.session.sessionId,
      nextAttemptEpochMs: context.nowEpochMs,
      operationId: id,
      payload: createSosIncidentDraft({
        appVersion: context.appVersion,
        familyMessageDelivery: context.familyMessageDelivery,
        favouritesConfigured: context.favouritesConfigured,
        hourLocal: this.clock.hourLocalAt(context.nowEpochMs),
        location: context.currentLocation,
        nearestStation: context.nearestStation,
        riskTier: context.zone === null ? null : riskTierForRecord(context.zone),
        source: context.source,
        timeline: trace.map((entry) => ({
          at: this.clock.timelineTimeAt(entry.atEpochMs),
          type: entry.type,
        })),
        trigger,
        triggeredAtEpochMs: context.nowEpochMs,
        zoneId: context.session.zoneId,
        zoneName: context.zone?.stationName ?? null,
      }),
      status: "PENDING",
      type: "SOS_CREATE",
    });
    // This closes the engine/runtime timing race: a Help tap immediately after
    // family escalation still patches the civic record once its create exists.
    await this.enqueueSusOutcomePatch("ESCALATED_TO_SOS", context);
    this.flush(context.nowEpochMs);
    return result.record.type === "SOS_CREATE";
  }

  private async enqueueSosStatusPatch(
    context: SafetyDeliveryContext,
  ): Promise<boolean> {
    const create = await this.queue.getBySessionAndType(
      context.session.sessionId,
      "SOS_CREATE",
    );
    if (create?.type !== "SOS_CREATE") return false;

    const id = this.createId();
    await this.queue.enqueueIfAbsent({
      attempts: 0,
      createdAtEpochMs: context.nowEpochMs,
      dedupeKey: `sos:status:${context.session.sessionId}`,
      dependsOnOperationId: create.operationId,
      documentId: create.documentId,
      localSessionId: context.session.sessionId,
      nextAttemptEpochMs: context.nowEpochMs,
      operationId: id,
      payload: createSosStatusPatch(context.nowEpochMs),
      status: "PENDING",
      type: "SOS_STATUS_PATCH",
    });
    this.flush(context.nowEpochMs);
    return true;
  }

  private async recordTrace(
    command: Command,
    context: SafetyDeliveryContext,
  ): Promise<void> {
    for (const type of traceTypeForCommand(command)) {
      await this.trace.append(context.session.sessionId, {
        atEpochMs: context.nowEpochMs,
        type,
      });
    }
  }

  private assertSosCanStart(context: SafetyDeliveryContext): void {
    if (context.session.state !== "SOS_ACTIVE") {
      throw new Error("A detailed incident may be created only at SOS_ACTIVE");
    }
  }

  private flush(nowEpochMs: number): void {
    // A transport failure is recorded on the queue item by QueueFlushService;
    // it must never interrupt local timers, the SOS surface, or persistence.
    void this.flushService.flush(nowEpochMs).catch(() => undefined);
  }
}

function civicTiming(session: PersistedSession): {
  readonly epochMs: number;
  readonly hourBand: HourBand;
} {
  if (session.armedHourBand === null) {
    throw new Error("An AUTO_ZONE civic record requires its persisted armedHourBand");
  }
  return { epochMs: session.armedAtEpochMs, hourBand: session.armedHourBand };
}

function riskTierForRecord(zone: Zone): RecordRiskTier {
  return zone.riskTier.toLowerCase() as RecordRiskTier;
}

function traceTypeForCommand(command: Command): readonly SosTimelineType[] {
  if (command.kind === "ShowArmBanner") return ["ARMED"];
  if (command.kind === "ShowCheckIn" && command.step === 1) {
    return ["CHECKIN_1_SHOWN"];
  }
  if (command.kind === "ShowCheckIn" && command.step === 2) {
    return ["CHECKIN_1_MISSED", "CHECKIN_2_SHOWN"];
  }
  if (command.kind === "ShowFamilyScreen") {
    return ["CHECKIN_2_MISSED", "FAMILY_MESSAGE_SHOWN"];
  }
  if (command.kind === "WriteSosIncident") return ["SOS_TRIGGERED"];
  if (command.kind === "PatchSosStatus") return ["SOS_STOPPED"];
  return [];
}
