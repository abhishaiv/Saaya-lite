import { describe, expect, it, vi } from "vitest";

import { requestFamilyAlert, type FamilyAlertRequest } from "./familyAlertChannel";

/**
 * The client half of the first-miss alert. The fetch is stubbed at the boundary;
 * no credential exists anywhere in this file because the client never sees one.
 */

const REQUEST: FamilyAlertRequest = {
  demo: true,
  locale: "en",
  operationId: "11111111-2222-3333-4444-555555555555:family-alert", // GROUNDED-EXEMPT: synthetic protocol fixture; no live message or product value.
};

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: ok ? 200 : 502, // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  });
}

function sentBody(calls: readonly unknown[][]): FamilyAlertRequest {
  const body = JSON.parse(String((calls[0][1] as RequestInit).body));
  expect(Object.keys(body).sort()).toEqual(["demo", "locale", "operationId"]);
  return body;
}

describe("family alert channel", () => {
  it("reports accepted for a provider-accepted send and never claims delivery", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "accepted" }));
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("accepted");
  });

  it("does not infer acceptance from a duplicate without its stored outcome", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "duplicate" }));
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("unknown");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports notready when the server answers not_configured", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "not_configured" }, false));
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("notready");
  });

  it("reports failed for a documented upstream failure", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "failed" }, false));
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("failed");
  });

  it("reports unknown when the request itself cannot reach the server", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("network down");
    });
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("unknown");
  });

  it("reports unknown for an undocumented success body instead of guessing", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ surprise: true }));
    const outcome = await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    expect(outcome).toBe("unknown");
  });

  it("never turns an ambiguous acknowledgement or pending reservation into failed or delivered", async () => {
    for (const status of ["unknown", "sending"]) {
      const fetchMock = vi.fn(async () => jsonResponse({ status }, false));
      expect(await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch)).toBe("unknown");
    }
  });

  it("sends only operation, locale and demo flag - no contact data, no message body", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "accepted" }));
    await requestFamilyAlert(REQUEST, null, fetchMock as unknown as typeof fetch);
    const body = sentBody(fetchMock.mock.calls as unknown as readonly unknown[][]);
    expect(body.operationId).toBe(REQUEST.operationId);
    expect(body.locale).toBe("en");
    expect(body.demo).toBe(true);
  });

  it("passes the abort signal through so an I'm OK can cancel an in-flight request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "accepted" }));
    const controller = new AbortController();
    await requestFamilyAlert(REQUEST, controller.signal, fetchMock as unknown as typeof fetch);
    const init = (fetchMock.mock.calls[0] as unknown as [unknown, RequestInit])[1];
    expect(init.signal).toBe(controller.signal);
  });
});

describe("credential isolation (acceptance item 9)", () => {
  it("keeps WhatsApp credentials out of every client-side source file", async () => {
    const { readdir, readFile, stat } = await import("node:fs/promises");
    const path = await import("node:path");

    async function* walk(dir: string): AsyncGenerator<string> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (/\.(ts|tsx|js|jsx|css|json)$/.test(entry.name)) yield full;
      }
    }

    const offenders: string[] = [];
    for await (const file of walk("src")) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const text = await readFile(file, "utf8");
      if (text.includes("WHATSAPP_ACCESS_TOKEN") || text.includes("NEXT_PUBLIC_WHATSAPP")) {
        offenders.push(file);
      }
    }
    // The server route lives in app/, not src/, so nothing client-side may name it.
    expect(stat("app/api/demo-alert/route.ts")).toBeTruthy();
    expect(offenders).toEqual([]);
  });
});
