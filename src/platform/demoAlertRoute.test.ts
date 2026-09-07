import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type RouteModule = typeof import("../../app/api/demo-alert/route");
type AccessModule = typeof import("../../app/api/demo-access/route");

const ORIGIN = "http://localhost:3000"; // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
const REDIS_URL = "https://example.upstash.io";
const OPERATION_ID = "11111111-2222-3333-4444-555555555555:123456789:family-alert"; // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
const ENV_KEYS = [
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_DEMO_ENABLED",
  "WHATSAPP_DEMO_KEY",
  "WHATSAPP_DEMO_RECIPIENT",
  "WHATSAPP_DEMO_RECIPIENT_CONFIRMED",
  "WHATSAPP_DEMO_TEMPLATE_CONFIRMED",
  "WHATSAPP_PHONE_NUMBER_ID",
] as const;

const CONFIGURED_ENV: Record<(typeof ENV_KEYS)[number], string> = {
  UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
  UPSTASH_REDIS_REST_URL: REDIS_URL,
  WHATSAPP_ACCESS_TOKEN: "test-access-token",
  WHATSAPP_DEMO_ENABLED: "confirmed",
  WHATSAPP_DEMO_KEY: "test-demo-key-not-a-real-secret-for-unit-tests",
  WHATSAPP_DEMO_RECIPIENT: "919999999999", // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
  WHATSAPP_DEMO_RECIPIENT_CONFIRMED: "confirmed",
  WHATSAPP_DEMO_TEMPLATE_CONFIRMED: "confirmed",
  WHATSAPP_PHONE_NUMBER_ID: "1199637663229019", // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function alertRequest(
  body: unknown = { demo: true, locale: "en", operationId: OPERATION_ID },
  cookie?: string,
): NextRequest {
  return new NextRequest(`${ORIGIN}/api/demo-alert`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(cookie === undefined ? {} : { cookie }),
    },
    method: "POST",
  });
}

async function loadRoute(env: Partial<Record<(typeof ENV_KEYS)[number], string>> = CONFIGURED_ENV): Promise<RouteModule> {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  return (await import("../../app/api/demo-alert/route")) as RouteModule;
}

async function accessCookie(): Promise<string> {
  const access = (await import("../../app/api/demo-access/route")) as AccessModule;
  const response = await access.POST(
    new NextRequest(`${ORIGIN}/api/demo-access`, {
      body: JSON.stringify({ key: CONFIGURED_ENV.WHATSAPP_DEMO_KEY }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const cookie = response.headers.get("set-cookie");
  if (cookie === null) throw new Error("demo access cookie was not set");
  return cookie.split(";", 1)[0];
}

function installRedisAndProvider(
  provider: () => Promise<Response> = async () => jsonResponse({ messages: [{ id: "wamid.test" }] }, 200),
) {
  const values = new Map<string, string>();
  let sends = 0;
  let budget = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === REDIS_URL) {
      const command = JSON.parse(String(init?.body)) as string[];
      if (command[0] === "EVAL") {
        const operationKey = command[3];
        if (values.has(operationKey)) return jsonResponse({ result: 0 });
        if (budget >= 50) return jsonResponse({ result: -1 });
        values.set(operationKey, "sending");
        budget += 1;
        return jsonResponse({ result: 1 });
      }
      if (command[0] === "GET") return jsonResponse({ result: values.get(command[1]) ?? null });
      if (command[0] === "SET") {
        values.set(command[1], command[2]);
        return jsonResponse({ result: "OK" });
      }
      throw new Error(`Unexpected Redis command: ${command[0]}`);
    }
    if (String(input).startsWith("https://graph.facebook.com/")) {
      sends += 1;
      return provider();
    }
    throw new Error(`Unexpected fetch URL: ${String(input)}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, get sends() { return sends; } };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("controlled demo alert route", () => {
  it("fails closed before configured private credentials, durable storage, and confirmations exist", async () => {
    const { fetchMock } = installRedisAndProvider();
    const route = await loadRoute({});
    const response = await route.POST(alertRequest());
    expect(response.status).toBe(503); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(await response.json()).toEqual({ status: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a forged same-origin request without an HttpOnly signed access cookie", async () => {
    const harness = installRedisAndProvider();
    const route = await loadRoute();
    const request = alertRequest();
    request.headers.set("origin", ORIGIN);
    request.headers.set("referer", `${ORIGIN}/`);
    const response = await route.POST(request);
    expect(response.status).toBe(401); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(harness.sends).toBe(0);
  });

  it("rejects a wrong operator key, tampered cookie and expired signed cookie", async () => {
    const harness = installRedisAndProvider();
    const route = await loadRoute();
    const access = await import("../../app/api/demo-access/route");
    const wrong = await access.POST(new NextRequest(`${ORIGIN}/api/demo-access`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "wrong-key" }),
    }));
    expect(wrong.status).toBe(401); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(wrong.headers.get("set-cookie")).toBeNull();
    const { createDemoAccessValue, DEMO_ACCESS_COOKIE, DEMO_ACCESS_TTL_SEC } = await import("../server/demoAccess");
    const expired = await createDemoAccessValue(CONFIGURED_ENV.WHATSAPP_DEMO_KEY, Date.now() - DEMO_ACCESS_TTL_SEC * 1000);
    for (const cookie of [`${await accessCookie()}tampered`, `${DEMO_ACCESS_COOKIE}=${expired}`]) {
      expect((await route.POST(alertRequest(undefined, cookie))).status).toBe(401); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    }
    expect(harness.sends).toBe(0);
  });

  it("accepts only a signed browser session and the exact demo-only payload", async () => {
    const harness = installRedisAndProvider();
    const route = await loadRoute();
    const cookie = await accessCookie();
    const response = await route.POST(alertRequest(undefined, cookie));
    expect(response.status).toBe(202); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(await response.json()).toEqual({ status: "accepted" });
    expect(harness.sends).toBe(1);

    const providerCall = harness.fetchMock.mock.calls.find(
      ([input]) => String(input).startsWith("https://graph.facebook.com/"),
    );
    const sent = JSON.parse(String((providerCall?.[1] as RequestInit).body));
    expect(sent.text.body).toContain("Saaya Lite demo");
    expect(sent.text.body).toContain("test alert");
  });

  it("forbids normal-path text, omitted demo, and unknown body fields", async () => {
    const harness = installRedisAndProvider();
    const route = await loadRoute();
    const cookie = await accessCookie();
    for (const body of [
      { demo: false, locale: "en", operationId: OPERATION_ID },
      { locale: "en", operationId: OPERATION_ID },
      { demo: true, locale: "en", operationId: OPERATION_ID, recipient: "attacker" },
    ]) {
      expect((await route.POST(alertRequest(body, cookie))).status).toBe(400);
    }
    expect(harness.sends).toBe(0);
  });

  it("requires a provider message id before reporting accepted", async () => {
    const harness = installRedisAndProvider(async () => jsonResponse({ messages: [] }, 200));
    const route = await loadRoute();
    const cookie = await accessCookie();
    const response = await route.POST(alertRequest(undefined, cookie));
    expect(response.status).toBe(502); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(await response.json()).toEqual({ status: "unknown" });
    expect(harness.sends).toBe(1);
  });

  it("retains an unknown reservation and never re-sends it", async () => {
    const harness = installRedisAndProvider(async () => {
      throw new TypeError("network interrupted");
    });
    const route = await loadRoute();
    const cookie = await accessCookie();
    expect(await (await route.POST(alertRequest(undefined, cookie))).json()).toEqual({ status: "unknown" });
    expect(await (await route.POST(alertRequest(undefined, cookie))).json()).toEqual({ status: "unknown" });
    expect(harness.sends).toBe(1);
  });

  it("reserves an operation atomically under concurrent requests", async () => {
    const harness = installRedisAndProvider();
    const route = await loadRoute();
    const cookie = await accessCookie();
    const [first, second] = await Promise.all([
      route.POST(alertRequest(undefined, cookie)),
      route.POST(alertRequest(undefined, cookie)),
    ]);
    expect([first.status, second.status].sort()).toEqual([202, 202]); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(harness.sends).toBe(1);
  });

  it("deduplicates durably across server instances", async () => {
    const harness = installRedisAndProvider();
    const first = await loadRoute();
    const cookie = await accessCookie();
    expect((await first.POST(alertRequest(undefined, cookie))).status).toBe(202); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    const second = await loadRoute();
    expect((await second.POST(alertRequest(undefined, cookie))).status).toBe(202); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(harness.sends).toBe(1);
  });

  it("enforces the global durable cap rather than a process-local cap", async () => {
    const harness = installRedisAndProvider();
    const first = await loadRoute();
    const cookie = await accessCookie();
    for (let index = 0; index < 50; index += 1) {
      const suffix = String(index).padStart(12, "0");
      const id = `11111111-2222-3333-4444-${suffix}:123456789:family-alert`; // GROUNDED-EXEMPT: synthetic protocol fixtures for the global-budget test.
      expect((await first.POST(alertRequest({ demo: true, locale: "en", operationId: id }, cookie))).status).toBe(202); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    }
    const second = await loadRoute();
    const capped = await second.POST(alertRequest({
      demo: true,
      locale: "en",
      operationId: "99999999-2222-3333-4444-555555555555:123456789:family-alert", // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
    }, cookie));
    expect(capped.status).toBe(429); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
    expect(harness.sends).toBe(50);
  });
});
