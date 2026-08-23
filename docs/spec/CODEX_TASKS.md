# Saaya Lite - Codex Task List

> ## THE ORDER IN THIS FILE IS THE EXECUTION ORDER
> 
> Generated from `graph/build_graph.json`, so it cannot drift from the graph. Find your node
> by **id**. The order is risk-first: the two most dangerous nodes clear early and the live
> submission URL exists by hour 14. Reasoning in `GRAPH_ENGINEERING.md`.

**Platform: Next.js + TypeScript on Vercel.** Pivoted 2026-08-19. A previous build is archived
on branch `archive/android-kotlin`; consult it for structure only, never as spec.

## How to run a task

1. Read the node in `graph/build_graph.json` and the docs in its `reads` array, plus `always_read`.
2. Follow the node loop in `AGENTS.md`. All ten gates, then the verifiers.
3. Write the `CODEX_LOG.md` entry immediately, including what needed correcting.

## Standing preamble for every node

```
Hard rules:
- No AI, ML or model calls anywhere in the product. Every decision is a stated rule.
- Never invent a value. Every literal traces to a LIVE fact in graph/spec_graph.json.
  Superseded facts do not count as provenance.
- src/domain/ has ZERO browser API, React or DOM. That is what keeps it testable.
- No dependency outside BUILD_CONFIG.md's closed list.
- Nothing identifying leaves the device before SOS.
- Write the tests named in TEST_PLAN.md as part of the node, not afterwards.
```

### T1.1 — Scaffold: Next.js, TypeScript, theme tokens, Vercel

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `BUILD_CONFIG.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `ICONOGRAPHY.md`, `assets/brand/README.md`, `WEB_PLATFORM.md`

**Prompt:** Create the Next.js project: App Router, TypeScript `strict`, the exact versions in `BUILD_CONFIG.md`. Create the directory tree from `ARCHITECTURE.md` with placeholder files. Implement `src/ui/theme` fully from `DESIGN_SYSTEM.md`: every colour token as a CSS custom property, all eight type styles with their line heights, the spacing scale, both radii. Dark only. Self-host Poppins (Regular/SemiBold/Bold, Latin subset) and Noto Sans Telugu. Wire the repo to Vercel and get a preview URL.

**Done when:** the preview URL loads on a real mobile browser showing a themed empty page using `brand #A78BFA` on `background #0B0B0F`; total font payload under 250 KB; no console errors.

> A previous build of this node targeted a different platform and is archived on branch archive/android-kotlin. Build fresh for web. Nothing from that branch is required.

### T2.1 — Zone parsing to typed Zone/ZoneCard/PoliceStation (TS)

**Risk:** low · **Shape:** diamond · **Verify:** spec
**Reads:** `DATA_MODEL.md`, `TEST_PLAN.md`, `assets/README.md`

**Prompt:** Copy the three files from `assets/` into `public/assets/`. Implement `src/data/zone/` parsing them into `Zone`, `ZoneCard`, `PoliceStation`. GeoJSON coordinates are `[longitude, latitude]`: assert every centroid AND every polygon vertex falls inside the district envelope from `DATA_MODEL.md`, and throw clearly otherwise. Write `zoneParsing.test.ts`.

**Done when:** every case passes under `npx vitest run`: 24 zones with tiers 6/9/4/5, 19 cards all joining to a zone, 37 stations, 189 coordinates inside the envelope.

> A previous build of this node is archived on branch archive/android-kotlin. Build fresh for web. The parse assertions and counts are unchanged.

> **Diamond:** 3 workers. one worker per bundled asset file. Then `fanout_check.py`, then merge in code.

### T4.1 — Session engine, pure TypeScript, zero browser API

**Risk:** HIGH · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `STATE_MACHINE.md`, `BUSINESS_RULES.md`, `TEST_PLAN.md`, `PROBLEM.md`, `ARCHITECTURE.md`, `BUILD_CONFIG.md`

**Prompt:** Implement `src/domain/engine/`: `rules.ts` holding every constant from `BUSINESS_RULES.md`, `armingEvaluator.ts`, `intervalCalculator.ts`, and `sessionEngine.ts` as a pure `onEvent(state, event, ctx): EngineResult` returning intent-only Commands. **Zero browser API, React or DOM in `src/domain/`.** Clock via `ctx.nowEpochMs`. Copy the type contract from `STATE_MACHINE.md` exactly. Implement the full transition table including every edge case.

**Done when:** every `rules.test.ts` and `sessionEngine.test.ts` case passes with a fake clock and no test sleeps, and a grep for `window|document|navigator|localStorage` in `src/domain/` returns nothing.

> An earlier implementation of this engine, passing all gates and its verifiers, is archived on branch archive/android-kotlin and may be consulted for STRUCTURE only. STATE_MACHINE.md is authoritative: where they differ, the archive is the bug.

### T4.2 — Geolocation watch, arming, wake lock, tab lifecycle

**Risk:** HIGHEST · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `STATE_MACHINE.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `COPY.md`, `TEST_PLAN.md`, `WEB_PLATFORM.md`

**Prompt:** `src/data/location/`: `watchPosition` with high accuracy while armed, point-in-polygon per fix, enter and exit dwells, the arming matrix. Wake Lock on arm, re-requested on visibilitychange. Timers as `setTimeout` PLUS an absolute `deadlineEpochMs` in IndexedDB; on every visibilitychange recompute from the deadline rather than resuming. Implement the recovery table. Add the demo trigger, labelled on screen.

**Done when:** the demo trigger arms a session with **no user tap**; closing the tab mid-countdown and reopening restores the correct remaining time; a deadline passed while hidden advances the ladder immediately.

> THE CENTRAL ANCHOR. A browser cannot arm in the background; arming holds while the page is open. See WEB_PLATFORM.md. The anchor is: arms with no tap, on a real mobile browser, page open.

### T1.2 — Firebase wiring, anonymous auth (project exists)

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `SETUP.md`, `SECRETS_AND_ACCESS.md`, `DATA_MODEL.md`

**Prompt:** The Firebase project already exists with anonymous auth enabled. Do NOT create one. Wire the web SDK from `console/firebase-config.js`, sign in anonymously, write one doc to `_smoke`, read it back, delete it.

**Done when:** anonymous sign-in returns a uid against project `saaya-lite` and the smoke doc round-trips.

> The Firebase project is already created and app/google-services.json is already in place with BOTH package names. Do NOT create a project. Verify anonymous sign-in returns a uid against project 'saaya-lite', write one doc to a _smoke collection, read it back, delete it.

### T8.1 — Seed zones to Firestore

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `DATA_MODEL.md`, `SETUP.md`

**Prompt:** A Node script seeding `zones/{stationId}` from the same GeoJSON. Idempotent and re-runnable. Run it once.

**Done when:** 24 zone documents exist and the console can draw the same map as the app.

### T8.2 — State view console route

**Risk:** HIGH · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `CONSOLE_SPEC.md`, `DATA_MODEL.md`, `DESIGN_SYSTEM.md`, `OPERATING_MODEL.md`

**Prompt:** The state view at its own route per `CONSOLE_SPEC.md`. Same dark palette. SUS markers at zone centroids, SOS at precise coordinates, the stat strip including the false-positive rate, the record list with expandable SOS timelines, the three time filters, every non-negotiable page element. `onSnapshot` for live updates. Create the composite indexes now, not at the end.

**Done when:** the route loads in a logged-out private window on a phone and shows an incident created minutes earlier, without a refresh.

> Supporting evidence, not the live link. Reviewers test the citizen experience, not an admin panel.

### T1.3 — Component library C1 to C14 (React)

**Risk:** med · **Shape:** diamond · **Verify:** spec, invention
**Reads:** `COMPONENT_LIBRARY.md`, `DESIGN_SYSTEM.md`, `ICONOGRAPHY.md`, `MOTION_SPEC.md`, `ARCHITECTURE.md`

**Prompt:** Build all 14 components C1 to C14 exactly as `COMPONENT_LIBRARY.md` specifies, at the exact px values, with every listed state. Subset Material Symbols Rounded to the icon list. Build a dev-only gallery route showing every component in every state.

**Done when:** the gallery renders all 14 in all states and `C3 LadderCard` matches its geometry: fill `#1F1F1F`, radius 22, padding 22, margin 30, spacing 14, border at accent 50%.

> **Diamond:** 14 workers. one worker per component C1-C14. Then `fanout_check.py`, then merge in code.

### T2.2 — Map screen: Leaflet, CARTO tiles, zones, her dot

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `MAP_SPEC.md`, `SCREENS.md`, `RESPONSIVE_SPEC.md`, `STATES_CATALOGUE.md`, `ARCHITECTURE.md`, `COMPONENT_LIBRARY.md`, `DESIGN_SYSTEM.md`, `WEB_PLATFORM.md`

**Prompt:** Home: full-bleed Leaflet map per `MAP_SPEC.md`, CARTO Dark Matter tiles, no key. Render the 19 non-SAFE zones in four layers ordered by `risk_score`. **SAFE zones must not be drawn.** Her dot with no heading cone. Attribution bottom-left, always visible. Zones must paint before tiles load.

**Done when:** 19 polygons render correctly over Vizag on a mobile browser, attribution is visible, and **with the network offline the zones still render** with the map-offline note.

### T4.3 — Home session states, arm banner, demo panel

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `SCREENS.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `MOTION_SPEC.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `STATE_MACHINE.md`

**Prompt:** Wire Home to session state: status pill, arm banner naming zone and hour, arm and disarm. Build the demo panel with the speed toggle, zone simulation, ladder jumps and reset, plus the permanent labelled banner while demo speed is on.

**Done when:** entering a simulated zone arms with no tap and the demo banner appears in every screenshot.

### T3.1 — Zone detail sheet, nearest station

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `SCREENS.md`, `BUSINESS_RULES.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `STATES_CATALOGUE.md`, `ARCHITECTURE.md`

**Prompt:** Zone detail sheet on tap: risk level, incident breakdown, women-safety count, hour-aware display risk, nearest station with distance and a `tel:` link, the `coordPrecision` honesty string, and the SAFE-zone empty state.

**Done when:** tapping a high zone shows counts and station; tapping a SAFE zone shows `zone_safe_no_data`, not an empty card.

### T3.2 — Onboarding, permissions, favourites, PIN (Web Crypto)

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `SCREENS.md`, `BUSINESS_RULES.md`, `COMPONENT_LIBRARY.md`, `ACCESSIBILITY_SPEC.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `COPY.md`, `WEB_PLATFORM.md`

**Prompt:** Four-step onboarding. Rationale screens BEFORE each browser permission prompt, never on load. Geolocation denial must not dead-end. PIN via Web Crypto: 16-byte random salt, SHA-256 over salt+pin, stored in IndexedDB. Favourites in IndexedDB, never uploaded.

**Done when:** onboarding completes in under 90 seconds; denying geolocation still reaches Home; and a test proves the plaintext PIN appears nowhere in IndexedDB, localStorage or the console.

### T5.1 — Check-in 1 and 2, Notification API, full-screen overlay

**Risk:** HIGH · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `SCREENS.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `INTERACTION_SPEC.md`, `MOTION_SPEC.md`, `ACCESSIBILITY_SPEC.md`, `ARCHITECTURE.md`, `WEB_PLATFORM.md`

**Prompt:** Check-in 1 as a gentle in-page card plus a Notification, 90 s ring, `brand` accent, 1.0 px border, showing why it checked now. Check-in 2 full-screen overlay, 60 s ring, `amber`, 1.5 px, `requireInteraction: true`, alarm sound, long vibration. Both wire OK and Help Now into the engine. Countdown announcements at 60, 30 and 10 s via a live region. Back and Escape consumed on check-in 2.

**Done when:** the ladder runs 90 then 60 seconds with correct accents and borders, and dismissing the Notification does not stop the countdown.

### T6.1 — Family escalation builder and screen

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `BUSINESS_RULES.md`, `SCREENS.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `INTERACTION_SPEC.md`, `ARCHITECTURE.md`

**Prompt:** Build the family message exactly per `BUSINESS_RULES.md` section 8, including the non-removable prototype disclosure line. The UI layer builds it from repositories; the engine only emits `NotifyFamily`. Screen per `SCREENS.md` S7 with the rendered message, the 60 s `danger` ring, cancel, and the no-favourite path that continues the ladder.

**Done when:** escalation fires, the message is correct, cancel works, and the mock disclosure is on screen rather than only in the write-up.

> The escalation message is built by the UI layer from repositories, never by the engine. No Command carries personal data.

### T6.2 — Offline queue in IndexedDB with backoff

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `TEST_PLAN.md`, `DATA_MODEL.md`, `WEB_PLATFORM.md`

**Prompt:** IndexedDB `queued_event` store, a flusher with the 5/15/60/300/900 s backoff plus an `online` listener, SOS priority over SUS, and `FAILED_PERMANENT` after 20 attempts surfaced in UI state. Every Firestore write goes through the queue.

**Done when:** `queue.test.ts` passes and, with the network offline, running the ladder loses nothing and flushes on reconnect.

### T7.1 — SOS screen and PIN entry

**Risk:** HIGH · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `SCREENS.md`, `BUSINESS_RULES.md`, `STATE_MACHINE.md`, `COMPONENT_LIBRARY.md`, `MOTION_SPEC.md`, `INTERACTION_SPEC.md`, `ARCHITECTURE.md`, `COPY.md`

**Prompt:** SOS screen: no entry animation, elapsed timer, the statement that the state view now has it, the itemised list of what was sent with favourites as a COUNT only, `tel:` quick dial for 112, 181 and the nearest station. PIN entry with the lockout schedule and no recovery path. Implement the SOS entry common block including the catch-up SUS event when the ladder was skipped.

**Done when:** no navigation, back or refresh escapes SOS; only the correct PIN stops it; five wrong attempts lock out.

### T7.2 — Anonymiser and the two Firestore writers

**Risk:** HIGHEST · **Shape:** serial · **Verify:** spec, boundary, invention
**Reads:** `DATA_MODEL.md`, `TEST_PLAN.md`, `PROBLEM.md`, `ARCHITECTURE.md`

**Prompt:** `src/domain/anonymiser.ts` producing the SUS payload from an ALLOW-LIST, never by filtering a larger object, so emitting a coordinate or session id is structurally impossible. The SOS payload with precise location, the timeline, nearest station and `contactsNotified` as a number. Deploy the Firestore rules including the `hasAny` guard.

**Done when:** every `anonymiser.test.ts` case passes, especially the one asserting **zero** write commands across IDLE to SHADOW to CHECKIN_1 to CHECKIN_2.

### T7.3 — What the police see, in the citizen app

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `SCREENS.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `OPERATING_MODEL.md`, `ARCHITECTURE.md`

**Prompt:** The three honest sections. Section 1 headlines "Right now: nothing" in IDLE, SHADOW and both check-ins. Sections 2 and 3 render real sample payloads produced by the actual anonymiser, annotated to show what is absent. Permanent no-government-connection footer.

**Done when:** the samples are generated by production code, not hardcoded.

### T8.3 — Console live journey trigger

**Risk:** med · **Shape:** serial · **Verify:** spec, invention
**Reads:** `CONSOLE_SPEC.md`, `DATA_MODEL.md`

**Prompt:** Add the "Watch a journey happen" control per `CONSOLE_SPEC.md`. Anonymous sign-in, then write a real SUS doc at +14 s and a real SOS doc at +28 s, both carrying `source: "CONSOLE_DEMO"`. Drive the narration strip from the same schedule. Both must arrive through the existing `onSnapshot` listener, not be injected into the DOM.

**Done when:** a reviewer on a phone in a private window presses one button and watches both records arrive live, with the SOS timeline open at the end.

### T9.0 — Submission page: video, summary, disclosures

**Risk:** low · **Shape:** serial · **Verify:** spec
**Reads:** `SUBMISSION.md`, `COMPLIANCE.md`, `EVIDENCE.md`, `DEMO_SCRIPT.md`

**Prompt:** Build the submission page: the 250-word summary, the embedded video, the what-is-real and what-is-mocked lists side by side at equal prominence, and every disclaimer. State plainly that no login is required.

**Done when:** the page loads logged out and every link resolves.

### T9.1 — Localisation, low-end, font scale, a11y

**Risk:** med · **Shape:** diamond · **Verify:** spec, invention
**Reads:** `COPY.md`, `RESPONSIVE_SPEC.md`, `ACCESSIBILITY_SPEC.md`, `COMPLIANCE.md`

**Prompt:** Extract every string to `en` and `te` resource files from `COPY.md`, honouring the locked vocabulary (favourites, never contacts) and keeping every string marked (iOS verbatim) character for character. Run the 320 px, 2.0x text-zoom and throttled-3G passes.

**Done when:** no hardcoded user-facing string remains; every screen works at 320 px and 2.0x zoom; Lighthouse mobile performance is 85 or better.

> **Diamond:** 13 workers. one worker per screen S1-S13. Then `fanout_check.py`, then merge in code.

### T9.2 — Verification sweep V1 to V8

**Risk:** HIGH · **Shape:** diamond+cycle · **Verify:** spec, boundary, invention
**Reads:** `TEST_PLAN.md`, `SUBMISSION.md`, `COMPLIANCE.md`, `EVIDENCE.md`, `BUILD_PLAN.md`, `DEMO_SCRIPT.md`

**Prompt:** Run V1 through V8 and paste the raw output into `CODEX_LOG.md`, including the no-AI grep and the network-tab evidence that nothing identifying leaves the device before SOS.

**Done when:** all eight pass and the evidence is in the log, because the write-up quotes it.

> **Diamond:** 8 workers. one worker per submission check V1-V8. Then `fanout_check.py`, then merge in code.

## Cut order, if time runs out

Fixed in advance so it is never decided at midnight: Telugu, then `T7.3` (the console carries
the police view), then manual arm, then map visual polish, then `T6.2`.

**Never cut:** `T4.1`, `T4.2`, `T5.1`, `T6.1`, `T7.1`, `T7.2`, `T2.2`, `T9.0`.
