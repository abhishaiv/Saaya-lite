import type { NextRequest } from "next/server";

export const DEMO_ACCESS_COOKIE = "saaya_demo_access";
export const DEMO_ACCESS_TTL_SEC = 8 * 60 * 60; // GROUNDED-EXEMPT: bounded private-demo authorization lifetime.

const ACCESS_PAYLOAD_VERSION = "v1";
const encoder = new TextEncoder();

/**
 * A browser proves it knows the private demo key once at /demo-access. The
 * resulting session cookie is HttpOnly and signed with that same server-only
 * key, so neither an Origin header nor client JavaScript authorizes a send.
 */
export async function createDemoAccessValue(
  demoKey: string,
  nowEpochMs: number = Date.now(),
): Promise<string> {
  const expiryEpochMs = nowEpochMs + DEMO_ACCESS_TTL_SEC * 1000;
  const payload = `${ACCESS_PAYLOAD_VERSION}:${expiryEpochMs}`;
  return `${payload}.${await sign(payload, demoKey)}`;
}

export async function isDemoAccessAuthorized(
  request: NextRequest,
  demoKey: string,
): Promise<boolean> {
  const value = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  if (value === undefined) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!isUnexpiredPayload(payload)) return false;
  return constantTimeEqual(signature, await sign(payload, demoKey));
}

async function sign(value: string, demoKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(demoKey),
    { hash: "SHA-256", name: "HMAC" }, // GROUNDED-EXEMPT: standard HMAC SHA-256 algorithm identifier.
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isUnexpiredPayload(payload: string): boolean {
  const match = /^v1:([0-9]{13})$/.exec(payload);
  if (match === null) return false;
  const expiryEpochMs = Number(match[1]);
  return Number.isSafeInteger(expiryEpochMs) && Date.now() < expiryEpochMs;
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
