import { NextRequest, NextResponse } from "next/server";

import {
  createDemoAccessValue,
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_TTL_SEC,
} from "../../../src/server/demoAccess";

const MIN_DEMO_KEY_LENGTH = 32; // GROUNDED-EXEMPT: minimum private authorization-secret length.

function demoKey(): string | null {
  const value = process.env.WHATSAPP_DEMO_KEY ?? "";
  return value.length >= MIN_DEMO_KEY_LENGTH ? value : null;
}

export async function POST(request: NextRequest) {
  const key = demoKey();
  if (key === null) return NextResponse.json({ status: "not_configured" }, { status: 503 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  if (!isAccessBody(body) || !constantTimeEqual(body.key, key)) {
    return NextResponse.json({ status: "failed" }, { status: 401 }); // GROUNDED-EXEMPT: standard HTTP response status, not product policy.
  }

  const response = NextResponse.json({ status: "authorized" }, { status: 200 });
  response.cookies.set({
    httpOnly: true,
    maxAge: DEMO_ACCESS_TTL_SEC,
    name: DEMO_ACCESS_COOKIE,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    value: await createDemoAccessValue(key),
  });
  return response;
}

function isAccessBody(value: unknown): value is { readonly key: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length === 1 && entries[0]?.[0] === "key" && typeof entries[0][1] === "string";
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
