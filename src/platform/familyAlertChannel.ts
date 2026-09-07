import type { SaayaLocale } from "../ui/copy/strings";

export type FamilyAlertStatus =
  | "sending"
  | "accepted"
  | "failed"
  | "unknown"
  | "notready";

/** The settled outcome of one alert request; "sending" is the in-flight UI state. */
export type FamilyAlertOutcome = Exclude<FamilyAlertStatus, "sending">;

export interface FamilyAlertRequest {
  /** Stable per-episode idempotency key; the server deduplicates on it. */
  readonly operationId: string;
  /** Server-owned localized message selection. */
  readonly locale: SaayaLocale;
  /** Selects the demo-labelled text; the recipient stays server-owned. */
  readonly demo: boolean;
}

const DEMO_ALERT_ENDPOINT = "/api/demo-alert"; // GROUNDED-EXEMPT: first-party app route name.

export interface FamilyAlertChannelResponse {
  readonly status: "accepted" | "duplicate" | "not_configured" | "failed" | "unknown" | "sending";
}

/**
 * Requests the server-mediated first-miss family alert. The recipient and the
 * message live on the server; this call carries no contact data. HTTP
 * acceptance is reported as "accepted" and never as delivery — Cloud API
 * message status is a separate server concern. Any failure here is returned
 * truthfully and must never suppress the ladder.
 */
export async function requestFamilyAlert(
  request: FamilyAlertRequest,
  signal: AbortSignal | null = null,
  fetchImpl: typeof globalThis.fetch = (input, init) => globalThis.fetch(input, init),
): Promise<FamilyAlertOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(DEMO_ALERT_ENDPOINT, {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: signal ?? undefined,
    });
  } catch {
    // The request may still have reached the server; claim nothing either way.
    return "unknown";
  }

  let body: FamilyAlertChannelResponse | null = null;
  try {
    body = (await response.json()) as FamilyAlertChannelResponse | null;
  } catch {
    body = null;
  }

  if (body !== null && body.status === "accepted") {
    return "accepted";
  }
  if (body !== null && body.status === "not_configured") {
    return "notready";
  }
  if (body?.status === "unknown" || body?.status === "sending" || body?.status === "duplicate") return "unknown";
  if (response.ok) {
    // An undocumented success body is still a settled outcome we cannot verify.
    return "unknown";
  }
  return "failed";
}
