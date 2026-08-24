# Saaya Lite - Web Platform
Replaces `WEB_PLATFORM.md`, archived alongside this file. Written 2026-08-19 after the
brief confirmed reviewers will not download a mobile app.

## The honest limitation, stated first

**A browser cannot arm in the background.** There is no Service Worker geolocation, no
equivalent of a wake lock plus a visible page, and a backgrounded tab is throttled or frozen. Our
central claim is *she never presses anything, the zone arms it* - and on the web that only
holds **while the page is open.**

We do not paper over this. We handle it three ways:

1. **The journey that actually works, live.** She opens the map to check a stretch, which is
   the reason she opens it at all. From that moment the page holds a wake lock, watches
   position, arms on zone entry, runs the ladder, escalates, and writes to the state view.
   Reviewers complete that end to end.
2. **The disclosure**, in the product and in the 250 words: pocket-in-the-background arming
   needs a native runtime. This is the honest half of the architecture answer, and the brief
   scores Honesty explicitly.
3. **The demo trigger** stays, labelled, so a reviewer can see the full ladder in seconds
   without standing in a Vizag zone at 4 a.m.

Saying exactly where the browser stops is a better architecture answer than pretending.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript** | the brief names Vercel; API routes give us server-side Firestore writes |
| Hosting | **Vercel**, deployed from the GitHub repo | named in the brief; push-to-deploy |
| Map | **Leaflet** + the same CARTO Dark Matter tiles | no key, no billing, and the tile source is unchanged from `MAP_SPEC.md` |
| State | React state + a reducer wrapping the pure engine | the engine is unchanged: pure TypeScript, no DOM |
| Local storage | **IndexedDB** (favourites, session, queue), `localStorage` for flags | replaces Room |
| PIN | **Web Crypto** `SHA-256` over salt+pin | replaces EncryptedSharedPreferences |
| Backend | **Firestore**, same project `saaya-lite` | unchanged |
| Fonts | Poppins + Noto Sans Telugu, self-hosted, `font-display: swap` | unchanged values |

## Browser APIs, and what each replaces

| Previous platform | Web | Notes |
|---|---|---|
| `FusedLocationProvider` | `navigator.geolocation.watchPosition` | `enableHighAccuracy: true` while armed. Sampling rates from `BUSINESS_RULES` still apply. |
| Geofencing API | **point-in-polygon in JS, on every fix** | we already treat the polygon as authoritative; `geofence_radius_m` becomes a cheap pre-filter |
| Wake lock plus a visible page | **Wake Lock API** + Page Visibility | `navigator.wakeLock.request('screen')` while armed, so the ladder keeps running |
| `an absolute deadline in IndexedDB` | `setTimeout` + an **absolute deadline in IndexedDB** | on visibility change, recompute from the deadline. Never trust the timer to have run. |
| Notification channels | **Notification API** via Service Worker | `requireInteraction: true` for check-in 2 |
| Full-screen intent | an in-page full-screen overlay | a browser cannot wake a locked phone. Disclosed. |
| `allowBackup=false` | nothing leaves the device by default | favourites and the PIN hash live in IndexedDB and are never uploaded |
| Battery optimisation | Page Visibility + a stale-heartbeat check | if the tab was frozen, say so honestly on return |

## Permissions

Same order and the same rule as before: **explain before the browser prompts**, and never
dead-end on a denial.

1. **Geolocation** — a rationale screen in her words, then `getCurrentPosition`. Denied:
   continue with the map and manual arming, say so plainly.
2. **Notifications** — requested only when she first arms, never on load. Denied: the
   in-page ladder still runs while the tab is open.
3. **Wake Lock** — no prompt. Request on arm, re-request on visibility change, ignore failure.

**Never request anything on page load.** A permission prompt before the first screen is the
web equivalent of an install wall.

## Tab lifecycle — the thing most likely to break

| Event | Behaviour |
|---|---|
| Tab hidden | keep the session in IndexedDB with its absolute deadline. Timers may not fire. |
| Tab visible again | **recompute the ladder from the deadline, never resume the countdown.** If the deadline passed while hidden, advance the ladder immediately, exactly as the Android recovery table said. |
| Tab closed mid-session | on next open, detect the live session, show what happened, offer resume or resolve |
| Page refreshed | session survives in IndexedDB; state rehydrates |
| Offline | the ladder is local and unaffected. Writes queue in IndexedDB and flush on reconnect. |

The principle from `STATE_MACHINE.md` is unchanged: **a frozen tab must never rescue her
from the ladder.**

## Performance, for real Indian users

| Budget | Value |
|---|---|
| First contentful paint on 3G | under 2.5 s |
| JS bundle, gzipped | under 200 KB |
| Lighthouse mobile performance | 85 or better |
| Works without map tiles | zones render over the background immediately, as before |
| Minimum viewport | 320 px |

No web fonts blocking first paint. No map library on the critical path: zones can draw
before Leaflet loads.

## What is deliberately absent

No analytics, no third-party scripts, no cookies beyond a session flag, no service worker
caching of anything personal. A reviewer can open devtools and see that nothing leaves the
device before SOS.
