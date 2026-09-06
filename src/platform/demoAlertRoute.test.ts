import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The first-miss alert route under test. The upstream Cloud API call is
 * mocked; no credential ever appears here and no request leaves the process.
 */

type RouteModule = typeof import("../../app/api/demo-alert/route");

const OPERATION_ID = "11111111-2222-3333-4444-555555555555:family-alert";
const SAME_ORIGIN = "http://localhost:3000";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function postRequest(
  body: unknown,
  origin = SAME_ORIGIN,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`${SAME_ORIGIN}/api/demo-alert`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin, ...headers },
    method: "POST",
  });
}

function statusRequest(operationId: string): NextRequest {
  return new NextRequest(
    `${SAME_ORIGIN}/api/demo-alert?operationId=${encodeURIComponent(operationId)}`,
    { headers: { origin: SAME_ORIGIN }, method: "GET" },
  );
}

const ENV_KEYS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_DEMO_KEY",
  "WHATSAPP_DEMO_RECIPIENT",
  "WHATSAPP_PHONE_NUMBER_ID",
] as const;

/**
 * The route reads its credentials from process.env at request time (not import
 * time), so the stub env must stay installed for the whole test. beforeEach
 * clears it before each test; the module instance is per-test via resetModules.
 */
async function loadRoute(env: Record<string, string | undefined>): Promise<RouteModule> {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  return (await import("../../app/api/demo-alert/route")) as RouteModule;
}

const CONFIGURED_ENV = {
  WHATSAPP_ACCESS_TOKEN: "test-access-token",
  WHATSAPP_PHONE_NUMBER_ID: "1199637663229019",
  WHATSAPP_DEMO_RECIPIENT: "919999999999",
};

beforeEach(() => {
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("demo alert route", () => {
  it("reports not_configured when credentials or the recipient are missing", async () => {
    const route = await loadRoute({
      WHATSAPP_ACCESS_TOKEN: undefined,
      WHATSAPP_PHONE_NUMBER_ID: undefined,
      WHATSAPP_DEMO_RECIPIENT: undefined,
    });
    const response = await route.POST(postRequest({ operationId: OPERATION_ID }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_configured" });
  });

  it("rejects a cross-site request without the optional key", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const response = await route.POST(
      postRequest({ operationId: OPERATION_ID }, "https://evil.example"),
    );
    expect(response.status).toBe(401);
  });

  it("accepts a keyed caller without an origin header", async () => {
    const route = await loadRoute({
      ...CONFIGURED_ENV,
      WHATSAPP_DEMO_KEY: "test-key",
    });
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [] }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const response = await route.POST(
      new NextRequest(`${SAME_ORIGIN}/api/demo-alert`, {
        body: JSON.stringify({ operationId: OPERATION_ID }),
        headers: {
          authorization: "Bearer test-key",
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends the server-owned recipient and message and reports accepted", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [] }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const response = await route.POST(
      postRequest({ operationId: OPERATION_ID, locale: "te", demo: true }),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/1199637663229019/messages");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer test-access-token",
    );
    const sent = JSON.parse(String(init.body));
    expect(sent.to).toBe("919999999999");
    expect(sent.messaging_product).toBe("whatsapp");
    expect(sent.recipient_type).toBe("individual");
    expect(sent.type).toBe("text");
    // The Telugu demo text is the approved one, and no status is ever claimed
    // as delivered here.
    expect(sent.text.body).toContain("డెమో");
    expect(sent.text.body).toContain("పరీక్ష అలర్ట్");
  });

  it("replies duplicate for a repeat of an already accepted operation", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [] }, 200));
    vi.stubGlobal("fetch", fetchMock);
    await route.POST(postRequest({ operationId: OPERATION_ID }));
    const second = await route.POST(postRequest({ operationId: OPERATION_ID }));
    expect(second.status).toBe(202);
    expect(await second.json()).toEqual({ status: "duplicate" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports failed when the provider rejects the message", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: {} }, 400)));
    const response = await route.POST(postRequest({ operationId: OPERATION_ID }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: "failed" });
  });

  it("reports unknown when the upstream call times out", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const timeoutError = new Error("timed out");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw timeoutError;
      }),
    );
    const response = await route.POST(postRequest({ operationId: OPERATION_ID }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: "unknown" });
  });

  it("rejects a malformed operation id", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const response = await route.POST(
      postRequest({ operationId: "not-a-session-id:family-alert" }),
    );
    expect(response.status).toBe(400);
  });

  it("bounds outbound sends per instance", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [] }, 200));
    vi.stubGlobal("fetch", fetchMock);
    for (let index = 0; index < 50; index += 1) {
      const suffix = `11111111-2222-3333-4444-${String(index).padStart(12, "0")}`;
      const response = await route.POST(
        postRequest({ operationId: `${suffix}:family-alert` }),
      );
      expect(response.status).toBe(202);
    }
    const capped = await route.POST(
      postRequest({
        operationId: "99999999-2222-3333-4444-555555555555:family-alert",
      }),
    );
    expect(capped.status).toBe(429);
    expect(await capped.json()).toEqual({ status: "failed" });
    expect(fetchMock).toHaveBeenCalledTimes(50);
  });

  it("reports the truthful recorded status by operation id", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: {} }, 500)));
    await route.POST(postRequest({ operationId: OPERATION_ID }));
    const status = await route.GET(statusRequest(OPERATION_ID));
    expect(await status.json()).toEqual({
      operationId: OPERATION_ID,
      status: "failed",
    });
  });

  it("keeps 404 truthful for an unknown operation id", async () => {
    const route = await loadRoute({ ...CONFIGURED_ENV });
    const status = await route.GET(statusRequest(OPERATION_ID));
    expect(status.status).toBe(404);
  });
});