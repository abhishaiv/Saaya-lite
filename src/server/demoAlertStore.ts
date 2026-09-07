export type StoredAlertStatus = "sending" | "accepted" | "failed" | "unknown";
export type Reservation = "reserved" | "duplicate" | "capped";

interface RedisResponse {
  readonly error?: unknown;
  readonly result?: unknown;
}

const NAMESPACE = "saaya:demo-alert:v1";
const BUDGET_KEY = `${NAMESPACE}:send-budget`;
const MAX_SENDS = 50; // fact: alert.sends.cap — durable global namespace budget.
const REDIS_TIMEOUT_MS = 3_000; // GROUNDED-EXEMPT: bound a private durability dependency wait.

// A pipeline may interleave; MULTI/EXEC is atomic but cannot branch on GET.
// This Redis EVAL performs the conditional reservation atomically, creating an
// operation reservation and increments the globally durable send budget.
const RESERVE_OPERATION = [
  "local existing = redis.call('GET', KEYS[1])",
  "if existing then return 0 end",
  "local used = tonumber(redis.call('GET', KEYS[2]) or '0')",
  "if used >= tonumber(ARGV[1]) then return -1 end",
  "redis.call('SET', KEYS[1], 'sending')",
  "redis.call('INCR', KEYS[2])",
  "return 1",
].join("\n");

/** Minimal server-only Upstash REST adapter; no SDK or dependency is needed. */
export class DemoAlertStore {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async reserve(operationId: string): Promise<Reservation> {
    const result = await this.command([
      "EVAL",
      RESERVE_OPERATION,
      "2",
      operationKey(operationId),
      BUDGET_KEY,
      String(MAX_SENDS),
    ]);
    if (result === 1 || result === "1") return "reserved";
    if (result === 0 || result === "0") return "duplicate";
    if (result === -1 || result === "-1") return "capped";
    throw new Error("Unexpected durable alert reservation response");
  }

  async status(operationId: string): Promise<StoredAlertStatus | null> {
    const result = await this.command(["GET", operationKey(operationId)]);
    return isStoredAlertStatus(result) ? result : null;
  }

  async record(operationId: string, status: StoredAlertStatus): Promise<void> {
    const result = await this.command(["SET", operationKey(operationId), status]);
    if (result !== "OK") throw new Error("Could not persist alert outcome");
  }

  private async command(command: readonly string[]): Promise<unknown> {
    const response = await this.fetchImpl(this.endpoint, {
      body: JSON.stringify(command),
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Durable alert store rejected the request");
    const payload = (await response.json()) as RedisResponse;
    if (typeof payload !== "object" || payload === null || "error" in payload) {
      throw new Error("Durable alert store returned an error");
    }
    return payload.result;
  }
}

function operationKey(operationId: string): string {
  return `${NAMESPACE}:operation:${operationId}`;
}

function isStoredAlertStatus(value: unknown): value is StoredAlertStatus {
  return value === "sending" || value === "accepted" || value === "failed" || value === "unknown";
}
