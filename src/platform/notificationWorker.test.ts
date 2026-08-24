import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PUBLIC_DIRECTORY = join(process.cwd(), "public");
const WORKER_PATH = join(PUBLIC_DIRECTORY, "saaya-sw.js");

describe("notification-only Service Worker", () => {
  it("has exactly one worker with notification posting and click focus", () => {
    const workerFiles = readdirSync(PUBLIC_DIRECTORY).filter((file) =>
      file.endsWith("-sw.js"),
    );
    const source = readFileSync(WORKER_PATH, "utf8");

    expect(workerFiles).toEqual(["saaya-sw.js"]);
    expect(source).toContain("showNotification");
    expect(source).toContain('addEventListener("notificationclick"');
    expect(source).toContain("focus");
  });

  it("has no fetch handler and no cache path", () => {
    const source = readFileSync(WORKER_PATH, "utf8");

    expect(source).not.toContain('addEventListener("fetch"');
    expect(source).not.toContain("caches");
    expect(source).not.toContain("cacheStorage");
  });
});
