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




## The tasks

### T1.1 — Scaffold: Next.js, TypeScript, theme tokens, Vercel

**COMPLETE.** Do not rebuild.

### T2.1 — Zone parsing to typed Zone/ZoneCard/PoliceStation (TS)

**COMPLETE.** Do not rebuild.

### T4.1 — Session engine, pure TypeScript, zero browser API

**COMPLETE.** Do not rebuild.

### T4.2 — Geolocation watch, arming, wake lock, tab lifecycle

**Risk:** HIGHEST · **Verify:** spec · **Hours:** 3.0
**Reads:** `STATE_MACHINE.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `COPY.md`, `TEST_PLAN.md`, `WEB_PLATFORM.md`

**Prompt:** `src/data/location/`: `watchPosition` with high accuracy while armed, point-in-polygon per fix, enter and exit dwells, the arming matrix. Wake Lock on arm, re-requested on visibilitychange. Timers as `setTimeout` PLUS an absolute `deadlineEpochMs` in IndexedDB; on every visibilitychange recompute from the deadline rather than resuming. Implement the recovery table. Add the demo trigger, labelled on screen.

**Done when:** the demo trigger arms a session with **no user tap**; closing the tab mid-countdown and reopening restores the correct remaining time; a deadline passed while hidden advances the ladder immediately.

> THE CENTRAL ANCHOR. A browser cannot arm in the background; arming holds while the page is open. See WEB_PLATFORM.md. The anchor is: arms with no tap, on a real mobile browser, page open.

### T1.3 — Component library C1 to C14 (React)

**COMPLETE.** Do not rebuild.

### M4 — Home: map, zones, her dot, session states, arm banner, demo panel

**Risk:** med · **Verify:** spec · **Hours:** 4.5
**Reads:** `MAP_SPEC.md`, `SCREENS.md`, `RESPONSIVE_SPEC.md`, `STATES_CATALOGUE.md`, `ARCHITECTURE.md`, `COMPONENT_LIBRARY.md`, `DESIGN_SYSTEM.md`, `WEB_PLATFORM.md`, `COPY.md`, `MOTION_SPEC.md`, `STATE_MACHINE.md`

**Merged node.** Replaces `T2.2`, `T4.3`. Both are the Home surface and share SCREENS, COMPONENT_LIBRARY, ARCHITECTURE and DESIGN_SYSTEM. Splitting them meant drawing the map, dropping context, then reloading it to put state on top of it. Load the reads ONCE and build every part before reporting.

- **T2.2 — Map screen: Leaflet, CARTO tiles, zones, her dot**
- **T4.3 — Home session states, arm banner, demo panel**

> **CHECKPOINT.** HOME IS LIVE. Map, zones, her dot, session states and the demo panel on a real phone. First thing worth showing anyone.

### M1 — Session UI: onboarding, check-ins, family escalation, SOS

**Risk:** med · **Verify:** spec · **Hours:** 10.5
**Reads:** `SCREENS.md`, `BUSINESS_RULES.md`, `COMPONENT_LIBRARY.md`, `ACCESSIBILITY_SPEC.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `COPY.md`, `WEB_PLATFORM.md`, `INTERACTION_SPEC.md`, `MOTION_SPEC.md`, `STATE_MACHINE.md`

**Merged node.** Replaces `T3.2`, `T5.1`, `T6.1`, `T7.1`. All four read COMPONENT_LIBRARY, SCREENS, COPY and STATE_MACHINE. Merging loads that set once instead of four times. Load the reads ONCE and build every part before reporting.

**Build in this order:**

1. Onboarding, MINIMAL: one flow for name + phone, PIN, and the location prompt. Everything after depends on a favourite and a PIN existing.
2. Check-in 1 and check-in 2, with the Notification API and the full-screen in-page overlay.
3. Family escalation: the composer and its screen.
4. SOS screen and PIN entry.
5. REDUCIBLE TAIL, only if budget allows: onboarding polish. Language selector, second and third contacts, progress-dot animation.

> **Cut line.** Steps 1 to 4 are the product. Step 5 is polish and may be dropped without the demo suffering. Commit after each step.

> **CHECKPOINT.** THE LADDER RUNS. Shadow, check-in 1, check-in 2, family escalation, SOS, end to end on a phone. This is the MVP: if everything stops here, there is still a working product to demo.

### M2 — Data and trust boundary: Firebase, queue, anonymiser, writers, and the trust screen

**Risk:** high · **Verify:** spec, boundary, invention · **Hours:** 6.0
**Reads:** `SETUP.md`, `SECRETS_AND_ACCESS.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `TEST_PLAN.md`, `WEB_PLATFORM.md`, `PROBLEM.md`, `SCREENS.md`, `COPY.md`, `COMPONENT_LIBRARY.md`, `OPERATING_MODEL.md`

**Merged node.** Replaces `T1.2`, `T6.2`, `T7.2`, `T7.3`. One data layer, one trust boundary. Splitting it made the anonymiser load DATA_MODEL separately from the queue that carries its output. T7.3 rejoins here: the trust screen renders exactly what the anonymiser produces, so building it beside the anonymiser is the one place it can be verified truthful rather than illustrative. Load the reads ONCE and build every part before reporting.

- **T1.2 — Firebase wiring, anonymous auth (project exists)**
- **T6.2 — Offline queue in IndexedDB with backoff**
- **T7.2 — Anonymiser and the two Firestore writers**
- **T7.3 — What the police see, in the citizen app**
  *Reinstated:* Dropped 2026-08-24 as duplicating the console. That was wrong: the console is a control-room view of every incident, S10 is HER trust screen showing what the state can see about her right now, which in Shadow and both check-ins is nothing. F28 calls it the trust feature. DEMO_SCRIPT gives it 2:12 to 2:30 and calls it the screen we care about most; the console is a separate segment at 2:30. Folded into M2, which owns the anonymiser whose output this screen renders.

### M3 — Console: seed zones and the state view

**Risk:** med · **Verify:** spec · **Hours:** 3.5
**Reads:** `DATA_MODEL.md`, `SETUP.md`, `CONSOLE_SPEC.md`, `DESIGN_SYSTEM.md`, `OPERATING_MODEL.md`

**Merged node.** Replaces `T8.1`, `T8.2`. Seeding exists only to give the console something to read. Same Firestore shape, same load. Load the reads ONCE and build every part before reporting.

- **T8.1 — Seed zones to Firestore**
- **T8.2 — State view console route**

> **CHECKPOINT.** THE ARGUMENT IS COMPLETE. The console receives the anonymous SUS event and the SOS incident live. This is what the submission is actually about.

### M5 — Ship: submission page, demo-path Telugu and a11y, spot checks

**Risk:** med · **Verify:** spec · **Hours:** 3.0
**Reads:** `SUBMISSION.md`, `COMPLIANCE.md`, `EVIDENCE.md`, `DEMO_SCRIPT.md`, `COPY.md`, `RESPONSIVE_SPEC.md`, `ACCESSIBILITY_SPEC.md`, `TEST_PLAN.md`, `BUILD_PLAN.md`

**Merged node.** Replaces `T9.0`, `T9.1`, `T9.2`. Three small nodes over the same submission and compliance set. Merged they load it once. Load the reads ONCE and build every part before reporting.

- **T9.0 — Submission page: video, summary, disclosures**
- **T9.1 — Localisation and a11y on the demo path only**
- **T9.2 — Verification spot checks V1 to V9**

> **CHECKPOINT.** SUBMITTABLE.
