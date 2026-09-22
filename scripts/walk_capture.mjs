/**
 * Capture the walk view for visual verification.
 *
 * Usage:
 *   node scripts/walk_capture.mjs <outfile.png> [lat] [lon] [--walk]
 *        [--wait-ms N] [--keep-open] [--fast-clock] [--scale N]
 *
 * Environment:
 *   WALK_URL          defaults to http://localhost:3120
 *   WALK_CHARACTER    JSON naming axes to override on the seeded wardrobe,
 *                     e.g. '{"top":"top_jacket"}'
 *   PLAYWRIGHT_PATH   explicit path to a playwright install, if not resolvable
 *
 * Why this file exists in the repo: the walk view is judged on captures, and
 * until now the instrument lived in /tmp, so it could not be re-run by anyone
 * else and did not survive a clean. This is that instrument, and it is the one
 * the deploy verification points at production (WALK_URL=https://saaya-lite.vercel.app).
 *
 * Two things about this environment are not obvious and are load-bearing:
 *
 *  1. Headless Chromium needs the SwiftShader launch args below or every WebGL
 *     context is null. A capture without them is a blank canvas, not a failure.
 *
 *  2. Playwright is not a dependency of this project. It is resolved from, in
 *     order: PLAYWRIGHT_PATH, a normal `require("playwright")`, then the gstack
 *     skill install. Nothing is installed and package.json is untouched.
 *
 * The IndexedDB seed is deliberately double-encoded: `characterStore.read()`
 * returns a value only when `typeof value === "string"`, so the stored record
 * must be a JSON *string*, not an object. Seeding an object silently routes the
 * app to the character customiser instead of the map.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    "playwright",
    "/Users/abhishai/.claude/skills/gstack/node_modules/playwright",
  ].filter(Boolean);
  const tried = [];
  for (const candidate of candidates) {
    if (candidate.startsWith("/") && !existsSync(candidate)) {
      tried.push(`${candidate} (absent)`);
      continue;
    }
    try {
      return require(candidate);
    } catch (error) {
      tried.push(`${candidate} (${error.code ?? "error"})`);
    }
  }
  throw new Error(
    `playwright could not be resolved. Tried:\n  ${tried.join("\n  ")}\n` +
      `Set PLAYWRIGHT_PATH to a playwright install to fix this.`,
  );
}

const { chromium } = loadPlaywright();

const args = process.argv.slice(2);

// Flags are parsed as a set, not by filtering `--`-prefixed tokens out: filtering leaves each
// value flag's *argument* behind as a positional, so `--wait-ms 9000` used to put 9000 into `lat`
// and the run died on Playwright's latitude range check. Unknown flags throw, so a typo fails
// loudly here instead of silently becoming a coordinate.
const BOOLEAN_FLAGS = new Set(["--walk", "--keep-open", "--fast-clock"]);
const VALUE_FLAGS = new Set(["--wait-ms", "--scale"]);
const positional = [];
const flagValues = new Map();
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (VALUE_FLAGS.has(arg)) {
    if (i + 1 >= args.length) throw new Error(`${arg} needs a value`);
    flagValues.set(arg, args[i + 1]);
    i += 1;
  } else if (BOOLEAN_FLAGS.has(arg)) {
    flagValues.set(arg, true);
  } else if (arg.startsWith("--")) {
    throw new Error(`unknown flag: ${arg}`);
  } else {
    positional.push(arg);
  }
}

const out = positional[0] ?? "walk-capture.png";
const lat = parseFloat(positional[1] ?? "17.7217");
const lon = parseFloat(positional[2] ?? "83.3071");
if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) {
  throw new Error(`bad coordinates: lat=${positional[1]} lon=${positional[2]}`);
}
const doWalk = flagValues.has("--walk");
const keepOpen = flagValues.has("--keep-open");
const extraWaitMs = flagValues.has("--wait-ms") ? parseInt(flagValues.get("--wait-ms"), 10) : 2500;
// `--scale` is `deviceScaleFactor`, and it is NOT cosmetic: it changes which layers render.
// Measured on 2026-09-23 at the founder's origin, everything else held equal (same clock, same
// 12000 ms settle): at `--scale 2` the ground reads `#F0D1DB`, the zone tint over
// `color.walk.ground`; at `--scale 1` the same ground reads `#EDE9F7`, untinted, and the tint is
// absent from the frame entirely. A `--scale 1` capture therefore cannot be used to judge the
// palette, and a palette claim measured at 2 must not be re-checked at 1. The default stays 2
// because that is the DPR a phone actually has, and it is the setting every recorded palette
// measurement was taken at.
//
// The separating run, once the fast clock was understood: at `--fast-clock` on *both* sides, scale
// 2 gives the green composite `#DBB5DB` at 42.65% and casings `#B4A3DE` at 4.77%, while scale 1
// gives plain `color.walk.ground` `#EDE9F7` at 49.91% with no tint, no green composite and casings
// at 0.02%. So the tint's absence at scale 1 is **not** a rung confound - DPR removes those layers
// on its own. The world otherwise renders identically (same building, road, sky, character), so it
// is specifically the two ground overlays that go missing.
//
// Mechanism still unknown, and this is a real open question: read the tint's draw path before
// trusting any DPR-dependent behaviour. What is settled is the rule - **scale 1 may not be used to
// judge the palette or the ground overlays at all**, and the default stays 2.
const SCALE = flagValues.has("--scale") ? parseInt(flagValues.get("--scale"), 10) : 2;
const URL = process.env.WALK_URL ?? "http://localhost:3120";

const DEFAULT_CHARACTER = JSON.stringify({
  body: "body_base",
  brows: "brows",
  hair: "hair_long",
  eyes: "eyes_almond",
  top: "top_hoodie",
  bottom: "bottom_jeans",
  acc: "acc_glasses",
});
// A/B the wardrobe from the outside: WALK_CHARACTER='{"top":"top_jacket"}'
// replaces named axes of the seed, so two captures can differ by exactly one part.
const CHARACTER_JSON = process.env.WALK_CHARACTER
  ? JSON.stringify({ ...JSON.parse(DEFAULT_CHARACTER), ...JSON.parse(process.env.WALK_CHARACTER) })
  : DEFAULT_CHARACTER;

function seedIndexedDb() {
  const open = (name, version, stores) =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => {
        for (const store of stores) {
          if (!request.result.objectStoreNames.contains(store)) {
            request.result.createObjectStore(store);
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const put = (db, store, key, value) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  return Promise.all([
    open("saaya-lite-onboarding", 1, ["settings", "favourite"]).then(async (db) => {
      await put(db, "settings", "current", { onboarded: true, pin: null });
      await db.close();
    }),
    open("saaya-lite-settings", 1, ["settings"]).then(async (db) => {
      await put(db, "settings", "character", globalThis.__CHARACTER_JSON__);
      await db.close();
    }),
  ]).then(() => {
    globalThis.__seeded = true;
  });
}

// `--keep-open` shows the run in a real window so a person can look at it and drive it.
// The SwiftShader flags stay on: they are what give Chromium a working WebGL context.
const browser = await chromium.launch({
  headless: !keepOpen,
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  locale: "en-IN",
  geolocation: { latitude: lat, longitude: lon },
  permissions: ["geolocation"],
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
});
await context.addInitScript(`globalThis.__CHARACTER_JSON__ = ${JSON.stringify(CHARACTER_JSON)};`);
await context.addInitScript(seedIndexedDb);

// `--fast-clock` feeds the render loop a fixed 16.6 ms step per frame no matter how long the
// frame really took, so the ladder climbs instead of falling to its floor. **This is how the walk
// view is meant to be captured**, because without it the ladder sits on the floor and the floor
// drops walls, roofs, ground seams, green and water - i.e. exactly what a look judgement is about.
//
// Measured 2026-09-23 with a matched A/B at the founder's origin, two runs per mode, every input
// held equal but the flag:
//
//   natural clock -> `detail: false` rung. Ground reads `#F0D1DB` at 49.71% (the zone tint over
//                    `color.walk.ground`), the green composite 0.00%, casings 0.03%.
//   --fast-clock  -> a `detail: true` rung. Ground reads `#DBB5DB` at 42.65% (the same tint over
//                    `color.tile.green`), and casings `#B4A3DE` at 4.77% - both of which only
//                    exist when detail is on.
//
// Both modes reproduced to two decimals on the repeat run, so this is deterministic and not a
// load artefact. An earlier note in this file claimed the flag does NOT move the ladder, on the
// evidence that `ab-top.png` and `ab-floor.png` were identical. That pair was a mis-measurement,
// not a finding, and it is recorded here so it is not rediscovered: a matched A/B beats a pair of
// old captures, and those two were never a matched A/B.
//
// Not established: whether this rung is the top one (index 0, resident ring 2) or the one below
// (index 1, resident ring 1). The two differ only in draw distance, and no measurement yet
// separates them - so do not claim a capture shows the top rung, only that it shows detail.
//
// What still holds from before: pinning the quality level inside the app was the only way to be
// certain which rung a capture shows, and the shipped code no longer offers it. So the rung of a
// capture is *inferred* from what renders, never known.
if (flagValues.has("--fast-clock")) {
  await context.addInitScript(() => {
    // Under `perf.fps`'s own 16.667 ms frame, so the ladder climbs rather than merely holding.
    const STEP_MS = 16.6;
    let fakeMs = 0;
    const realRaf = globalThis.requestAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = (callback) =>
      realRaf(() => {
        fakeMs += STEP_MS;
        callback(fakeMs);
      });
  });
}

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const log = (msg) => console.log(`[walk_capture] ${msg}`);

await page.goto(URL, { waitUntil: "load", timeout: 60000 });
log(`page loaded: ${URL}`);

// The gate reads IndexedDB once, on mount, and the init script's seed is async,
// so the first paint can race it. Wait for the seed to land, then reload onto a
// guaranteed-seeded store.
await page.waitForFunction(() => globalThis.__seeded === true, { timeout: 30000 });
await page.reload({ waitUntil: "load", timeout: 60000 });
log("seeded and reloaded");

await page.waitForSelector(".home-screen", { timeout: 60000 });
log("home screen visible");

const close = page.locator('button[aria-label="Close"]');
if (await close.count()) {
  await close.first().click();
  log("closed demo sheet");
}

// `copy.viewToggle` is exactly "View" in English.
const toggle = page.locator('button[aria-label="View"]');
await toggle.waitFor({ timeout: 20000 });
await toggle.click();
log("toggled to walk view");

await page.waitForSelector("canvas.walk-view__canvas", { timeout: 30000 });
log("canvas present");

// The customiser must not be blocking: it would mean the character seed failed.
// This is a hard stop, because a capture of the customiser looks like a valid
// screenshot and has been mistaken for one before.
const customiser = page.locator(".character-customiser, [class*='customiser']");
if (await customiser.count()) {
  log("FATAL: customiser overlay present - character seed did not take");
  await browser.close();
  process.exit(1);
}

// Wait for the world: the loading status disappears once onWorldReady fires.
await page
  .waitForFunction(
    () => {
      const status = document.querySelector(".walk-view__status");
      return !status || status.textContent.trim().length === 0;
    },
    { timeout: 60000 },
  )
  .catch(() => log("WARNING: walk-view__status never cleared (world may not have loaded)"));
log("world ready (status cleared)");

await page.waitForTimeout(extraWaitMs);

if (doWalk) {
  // Nudge her ~20 m up the road so the walk cycle and easing are exercised.
  await context.setGeolocation({ latitude: lat + 0.00018, longitude: lon + 0.00012 });
  log("nudged location (walk)");
  await page.waitForTimeout(2200);
}

await page.screenshot({ path: out });
log(`screenshot -> ${out}`);

const stats = await page.evaluate(() => {
  const canvas = document.querySelector("canvas.walk-view__canvas");
  const labels = Array.from(document.querySelectorAll(".walk-view__label"));
  const visible = labels.filter((n) => !n.hidden);
  return {
    canvas: canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null,
    labelCount: labels.length,
    visibleLabels: visible.map((n) => n.textContent),
    viewMode: document.querySelector(".home-screen")?.dataset.viewMode ?? null,
  };
});
log(`stats: ${JSON.stringify(stats)}`);
if (consoleErrors.length) {
  log(`console errors (${consoleErrors.length}):`);
  for (const e of consoleErrors.slice(0, 12)) log(`  ${e}`);
}

if (!keepOpen) {
  await browser.close();
} else {
  log("keeping browser open; press Ctrl-C to exit");
  await new Promise(() => {});
}
