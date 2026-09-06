import { NextRequest, NextResponse } from "next/server";

/**
 * The one server-side messaging surface of Round 2: the automatic first-miss
 * family alert. Recipient, message text and Cloud API credentials are owned by
 * this route's environment; the request may carry no contact data and no
 * content. There is deliberately no arbitrary-recipient endpoint.
 *
 * Truthfulness contract (ROUND2_DEMO_DAY_PLAN.md): HTTP 200 from the Cloud API
 * is reported as "accepted" and never as delivered. A failure here must never
 * suppress the ladder on the client. Credentials live only in server env:
 * WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_DEMO_RECIPIENT,
 * WHATSAPP_API_VERSION (optional, default v23.0) and the optional
 * WHATSAPP_DEMO_KEY for non-browser callers.
 */

type AlertLocale = "en" | "te";

const DEMO_TEXT: Record<AlertLocale, string> = {
  // fact: BUSINESS_RULES.md §8 approved demo alert text, founder 2026-09-06.
  en: "Saaya Lite demo: a scheduled check-in wasn't answered. This is a test alert; no emergency has been reported.",
  te: "సాయ లైట్ డెమో: షెడ్యూల్ చేసిన చెక్-ఇన్‌కి సమాధానం రాలేదు. ఇది ఒక పరీక్ష అలర్ట్; ఏ అత్యవసర పరిస్థితి నమోదు కాలేదు.",
};

const NORMAL_TEXT: Record<AlertLocale, string> = {
  // fact: BUSINESS_RULES.md §8 approved normal alert text, founder 2026-09-06.
  en: "A scheduled Saaya Lite check-in wasn't answered. Please try contacting them to check in.",
  te: "షెడ్యూల్ చేసిన సాయ లైట్ చెక్-ఇన్‌కి సమాధానం రాలేదు. వారిని సంప్రదించి తనిఖీ చేయమని ప్రయత్నించండి.",
};

const OPERATIONS: Record<string, "sending" | "accepted" | "failed" | "unknown"> = {};

// fact: alert.dedup.track.max — bounded per-instance dedup memory.
const MAX_TRACKED_OPERATIONS = 500;
// fact: alert.sends.cap — bounded per-instance outbound message budget.
const MAX_SENDS_PER_INSTANCE = 50;
let sendsUsed = 0;

const OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:family-alert$/;
const DEFAULT_API_VERSION = "v23.0"; // GROUNDED-EXEMPT: provider API version pin, not a product dimension.
const UPSTREAM_TIMEOUT_MS = 10_000; // GROUNDED-EXEMPT: SI unit conversion and an operational bound on the upstream call.

function configuration() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  const recipient = process.env.WHATSAPP_DEMO_RECIPIENT ?? "";
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION;
  const demoKey = process.env.WHATSAPP_DEMO_KEY ?? null;
  return {
    accessToken,
    apiVersion,
    configured: accessToken !== "" && phoneNumberId !== "" && recipient !== "",
    demoKey,
    phoneNumberId,
    recipient,
  };
}

function recordOperation(operationId: string, status: "sending" | "accepted" | "failed" | "unknown"): void {
  OPERATIONS[operationId] = status;
  const tracked = Object.keys(OPERATIONS);
  if (tracked.length > MAX_TRACKED_OPERATIONS) {
    // Insertion-order eviction keeps the dedup memory bounded; a lost entry
    // only means a repeat request is re-sent, which the send cap still bounds.
    delete OPERATIONS[tracked[0]];
  }
}

function sameOriginOrKeyed(request: NextRequest, demoKey: string | null): boolean {
  const authorization = request.headers.get("authorization");
  if (demoKey !== null && authorization === `Bearer ${demoKey}`) return true;
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (origin === null) return demoKey === null;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const config = configuration();
  if (!sameOriginOrKeyed(request, config.demoKey)) {
    return NextResponse.json({ status: "failed" }, { status: 401 });
  }
  if (!config.configured) {
    // Truthful dependency report: the caller continues without an alert.
    return NextResponse.json({ status: "not_configured" }, { status: 503 });
  }

  let body: { operationId?: unknown; locale?: unknown; demo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  const operationId = body.operationId;
  const locale: AlertLocale = body.locale === "te" ? "te" : "en";
  const demo = body.demo === true;
  if (typeof operationId !== "string" || !OPERATION_ID_PATTERN.test(operationId)) {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  if (OPERATIONS[operationId] === "accepted") {
    return NextResponse.json({ status: "duplicate" }, { status: 202 });
  }
  if (sendsUsed >= MAX_SENDS_PER_INSTANCE) {
    return NextResponse.json({ status: "failed" }, { status: 429 });
  }

  const text = demo ? DEMO_TEXT[locale] : NORMAL_TEXT[locale];
  recordOperation(operationId, "sending");
  sendsUsed += 1;

  let upstreamOk = false;
  let outcomeKnown = true;
  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          text: { body: text, preview_url: false },
          to: config.recipient,
          type: "text",
        }),
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
    upstreamOk = response.ok;
  } catch (error) {
    // A timeout may still land upstream, so its outcome is unknown; a plain
    // connection failure never reached the provider.
    outcomeKnown = !(error instanceof Error && error.name === "TimeoutError");
  }

  if (upstreamOk) {
    recordOperation(operationId, "accepted");
    return NextResponse.json({ status: "accepted" }, { status: 202 });
  }
  recordOperation(operationId, outcomeKnown ? "failed" : "unknown");
  return NextResponse.json(
    { status: outcomeKnown ? "failed" : "unknown" },
    { status: 502 },
  );
}

export async function GET(request: NextRequest) {
  const config = configuration();
  if (!sameOriginOrKeyed(request, config.demoKey)) {
    return NextResponse.json({ status: "failed" }, { status: 401 });
  }
  const operationId = request.nextUrl.searchParams.get("operationId");
  if (operationId === null || !OPERATION_ID_PATTERN.test(operationId)) {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  const status = OPERATIONS[operationId];
  if (status === undefined) {
    return NextResponse.json({ status: "failed" }, { status: 404 });
  }
  return NextResponse.json({ operationId, status });
}