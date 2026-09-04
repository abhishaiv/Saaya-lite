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
   position, arms on zone entry, runs the ladder and escalates locally. The round-one
   runtime has no writer, so reviewers see the local-only SOS disclosure and use the
   user-controlled dial handoff rather than a false state-view claim.
2. **The disclosure**, in the product and in the 250 words: pocket-in-the-background arming
   needs a native runtime. This is the honest half of the architecture answer, and the brief
   scores Honesty explicitly.
3. **The demo trigger** stays, labelled, so a reviewer can see the full ladder in seconds
   without standing in a Vizag zone at 4 a.m.

Saying exactly where the browser stops is a better architecture answer than pretending.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript** | the brief names Vercel; Lite ships no API routes or remote writers |
| Hosting | **Vercel**, deployed from the GitHub repo | named in the brief; push-to-deploy |
| Map | **Leaflet** + OpenStreetMap Standard tiles | no key, no billing, and an offline tile state that leaves bundled zones usable |
| State | React state + a reducer wrapping the pure engine | the engine is unchanged: pure TypeScript, no DOM |
| Local storage | **IndexedDB** (favourites, session), `localStorage` for flags | replaces Room |
| PIN | **Web Crypto** `SHA-256` over salt+pin | replaces EncryptedSharedPreferences |
| Backend | **None in Lite** | Firestore is reserved for the cut round-two state view |
| Fonts | Poppins + Noto Sans Telugu, self-hosted, `font-display: swap` | unchanged values |

## Browser APIs, and what each replaces

| Previous platform | Web | Notes |
|---|---|---|
| `FusedLocationProvider` | `navigator.geolocation.watchPosition` | `enableHighAccuracy: true` while armed. Sampling rates from `BUSINESS_RULES` still apply. |
| Geofencing API | **Haversine point-in-localized-circle in JS, on every fix** | the derived hotspot circle is authoritative. The historical polygon classifies frozen anchors once at load and `geofence_radius_m` is never used. |
| Wake lock plus a visible page | **Wake Lock API** + Page Visibility | `navigator.wakeLock.request('screen')` while armed, so the ladder keeps running |
| `an absolute deadline in IndexedDB` | `setTimeout` + an **absolute deadline in IndexedDB** | on visibility change, recompute from the deadline. Never trust the timer to have run. |
| System notifications | **Not used in Lite** | Check-ins are in-page while the page is open. Lite neither asks for notification permission nor calls `showNotification`. |
| Full-screen intent | an in-page full-screen overlay | a browser cannot wake a locked phone. Disclosed. |
| `allowBackup=false` | local data is not exported by default | favourites and the PIN hash live in IndexedDB and never reach a Saaya backend; a deliberate own-app message handoff is separate |
| Battery optimisation | Page Visibility + a stale-heartbeat check | if the tab was frozen, say so honestly on return |

## Permissions

Same order and the same rule as before: **explain before the browser prompts**, and never
dead-end on a denial.

1. **Geolocation** — a rationale screen in her words, then `getCurrentPosition`. Denied:
   continue with the map and manual arming, say so plainly.
2. **Wake Lock** — no prompt. Request on arm, re-request on visibility change, ignore failure.

**Never request anything on page load.** A permission prompt before the first screen is the
web equivalent of an install wall.

## Tab lifecycle — the thing most likely to break

| Event | Behaviour |
|---|---|
| Tab hidden | keep the session in IndexedDB with its absolute deadline. Timers may not fire. |
| Tab visible again | **recompute the ladder from the deadline, never resume the countdown.** If the deadline passed while hidden, advance the ladder immediately, exactly as the Android recovery table said. |
| Tab closed mid-session | on next open, detect the live session, show what happened, offer resume or resolve |
| Page refreshed | session survives in IndexedDB; state rehydrates |
| Offline | the ladder is local and unaffected. Lite has no writer, queue or reconnect flush. |

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

## The Service Worker — registered but not used for Lite alerts

There is **one** Service Worker and it exists for **one** reason: Chrome on Android does not
implement the `Notification` constructor. `new Notification(...)` throws there, and
`ServiceWorkerRegistration.showNotification()` is the only way to post a notification on our
primary target platform. The worker remains a narrow round-two capability; Lite does not
request notification permission or post notifications, so it never claims a system alert.

**It has no `fetch` handler and it caches nothing.** Not assets, not tiles, not data. It
registers, has no `fetch` handler, and has no current Lite delivery work. That is the
whole file.

Three consequences, stated so nobody implements around them:

1. **There is no offline first launch.** With no network and no cached shell, the page does
   not load. Do not claim installable-and-works-offline anywhere.
2. **There is no tile cache to configure and no cap to set.** Tiles are subject to the
   browser HTTP cache and OpenStreetMap's headers, and nothing else.
3. **"Offline" in this product means one specific thing:** the page is already open and
   connectivity drops. Zones stay drawn because they were already parsed, tiles stop
   arriving and we say so. The local ladder continues, but Lite has no writer, queue or
   reconnect flush to promise.

## What is deliberately absent

No analytics, no third-party scripts, no cookies beyond a session flag, and a Service Worker
that caches nothing at all. A reviewer can open devtools and see no application request
carrying personal, session or precise-location safety data at any ladder stage; ordinary
public map-tile reads are not safety-data delivery.
