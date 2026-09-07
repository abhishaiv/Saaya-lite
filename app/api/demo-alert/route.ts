import { NextRequest, NextResponse } from "next/server";

import { isDemoAccessAuthorized } from "../../../src/server/demoAccess";
import {
  DemoAlertStore,
  type StoredAlertStatus,
} from "../../../src/server/demoAlertStore";

type AlertLocale = "en" | "te";

const DEMO_TEXT: Record<AlertLocale, string> = {
  // Founder-approved controlled-demo text. This is the only text this endpoint can send.
  en: "Saaya Lite demo: a scheduled check-in wasn't answered. This is a test alert; no emergency has been reported.",
  te: "సాయ లైట్ డెమో: షెడ్యూల్ చేసిన చెక్-ఇన్‌కి సమాధానం రాలేదు. ఇది ఒక పరీక్ష అలర్ట్; ఏ అత్యవసర పరిస్థితి నమోదు కాలేదు.",
};

const OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9]+:family-alert$/;
const DEFAULT_API_VERSION = "v23.0"; // Provider API pin, not a product dimension.
const UPSTREAM_TIMEOUT_MS = 10_000; // Operational provider deadline in milliseconds. // GROUNDED-EXEMPT: operational provider request bound; never a ladder deadline.
const MAX_OPERATION_ID_LENGTH = 80; // GROUNDED-EXEMPT: bounded untrusted durable-store key input.
const MIN_DEMO_KEY_LENGTH = 32; // GROUNDED-EXEMPT: minimum private authorization-secret length.

interface AlertConfiguration {
  readonly accessToken: string;
  readonly apiVersion: string;
  readonly demoKey: string;
  readonly phoneNumberId: string;
  readonly recipient: string;
  readonly redisToken: string;
  readonly redisUrl: string;
}

function configuration(): AlertConfiguration | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  const recipient = process.env.WHATSAPP_DEMO_RECIPIENT ?? "";
  const demoKey = process.env.WHATSAPP_DEMO_KEY ?? "";
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const enabled = process.env.WHATSAPP_DEMO_ENABLED === "confirmed";
  const recipientConfirmed = process.env.WHATSAPP_DEMO_RECIPIENT_CONFIRMED === "confirmed";
  const templateConfirmed = process.env.WHATSAPP_DEMO_TEMPLATE_CONFIRMED === "confirmed";
  if (
    accessToken === "" ||
    phoneNumberId === "" ||
    recipient === "" ||
    demoKey.length < MIN_DEMO_KEY_LENGTH ||
    !isApprovedRedisUrl(redisUrl) ||
    redisToken === "" ||
    !enabled ||
    !recipientConfirmed ||
    !templateConfirmed
  ) {
    return null;
  }
  return {
    accessToken,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION,
    demoKey,
    phoneNumberId,
    recipient,
    redisToken,
    redisUrl,
  };
}

export async function POST(request: NextRequest) {
  const config = configuration();
  if (config === null) return NextResponse.json({ status: "not_configured" }, { status: 503 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  if (!(await isDemoAccessAuthorized(request, config.demoKey))) {
    return NextResponse.json({ status: "failed" }, { status: 401 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }
  if (request.signal.aborted) return unknownResponse();

  const body = await alertBody(request);
  if (body === null) return NextResponse.json({ status: "failed" }, { status: 400 });

  const store = new DemoAlertStore(config.redisUrl, config.redisToken);
  let reservation: Awaited<ReturnType<DemoAlertStore["reserve"]>>;
  try {
    reservation = await store.reserve(body.operationId);
  } catch {
    // Do not send when durable deduplication and budget enforcement are unavailable.
    return NextResponse.json({ status: "failed" }, { status: 503 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }
  if (reservation === "capped") return NextResponse.json({ status: "failed" }, { status: 429 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  if (reservation === "duplicate") return storedResponse(await storedStatus(store, body.operationId));
  if (request.signal.aborted) {
    await recordBestEffort(store, body.operationId, "unknown");
    return unknownResponse();
  }

  let providerStatus: StoredAlertStatus = "unknown";
  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          text: { body: DEMO_TEXT[body.locale], preview_url: false },
          to: config.recipient,
          type: "text",
        }),
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
        // If the browser cancels while this route is in flight, stop waiting
        // for the provider too. The reservation remains and the result is
        // recorded as unknown, never retried as a fresh send.
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        ]),
      },
    );
    providerStatus = response.ok && (await hasMessageId(response)) ? "accepted" : response.ok ? "unknown" : "failed";
  } catch {
    // Any network interruption can leave the provider outcome ambiguous.
    providerStatus = "unknown";
  }

  try {
    await store.record(body.operationId, providerStatus);
  } catch {
    // The original reservation remains durable, so no retry can create a second send.
    return unknownResponse();
  }
  return storedResponse(providerStatus);
}

export async function GET(request: NextRequest) {
  const config = configuration();
  if (config === null) return NextResponse.json({ status: "not_configured" }, { status: 503 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  if (!(await isDemoAccessAuthorized(request, config.demoKey))) {
    return NextResponse.json({ status: "failed" }, { status: 401 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }
  const operationId = request.nextUrl.searchParams.get("operationId");
  if (operationId === null || !OPERATION_ID_PATTERN.test(operationId)) {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  const store = new DemoAlertStore(config.redisUrl, config.redisToken);
  try {
    const status = await store.status(operationId);
    return status === null
      ? NextResponse.json({ status: "failed" }, { status: 404 }) // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
      : NextResponse.json({ operationId, status });
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 503 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }
}

async function alertBody(request: NextRequest): Promise<{ operationId: string; locale: AlertLocale } | null> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort();
  if (keys.length !== 3 || keys[0] !== "demo" || keys[1] !== "locale" || keys[2] !== "operationId") return null;
  if (
    body.demo !== true ||
    typeof body.operationId !== "string" ||
    body.operationId.length > MAX_OPERATION_ID_LENGTH ||
    !OPERATION_ID_PATTERN.test(body.operationId)
  ) return null;
  if (body.locale !== "en" && body.locale !== "te") return null;
  return { locale: body.locale, operationId: body.operationId };
}

function isApprovedRedisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "upstash.io" || url.hostname.endsWith(".upstash.io"));
  } catch {
    return false;
  }
}

async function hasMessageId(response: Response): Promise<boolean> {
  try {
    const body = (await response.json()) as { messages?: unknown };
    return Array.isArray(body.messages) && body.messages.some(
      (message) => typeof message === "object" && message !== null && typeof (message as { id?: unknown }).id === "string" && (message as { id: string }).id !== "",
    );
  } catch {
    return false;
  }
}

async function storedStatus(store: DemoAlertStore, operationId: string): Promise<StoredAlertStatus> {
  try {
    return (await store.status(operationId)) ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function recordBestEffort(store: DemoAlertStore, operationId: string, status: StoredAlertStatus): Promise<void> {
  try {
    await store.record(operationId, status);
  } catch {
    // The durable reservation still prevents a retry from sending.
  }
}

function storedResponse(status: StoredAlertStatus): NextResponse {
  if (status === "accepted" || status === "sending") {
    return NextResponse.json({ status }, { status: 202 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }
  return NextResponse.json({ status }, { status: 502 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
}

function unknownResponse(): NextResponse {
  return NextResponse.json({ status: "unknown" }, { status: 502 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
}
