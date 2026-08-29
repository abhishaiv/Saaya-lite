# Saaya Lite - Build Plan
From 2026-08-19 to the deadline. Submission closes **2026-08-28 at 20:00 IST, with no grace period.**
Revised 2026-08-19 for the web platform. `graph/build_graph.json` owns the execution order;
this file carries the cut order and the risk register.

## The schedule reality, on the record

The verified feature list originally costed roughly **37 hours** against **27** available.

**Founder decision 2026-08-18 (a): close the gap with Codex velocity, not by cutting
features.** Sat Aug 22 and Sun Aug 23 fall inside the window and remain available.

**Founder decision 2026-08-18 (b): prototype posture.** Do not build for production. This
removed roughly **4.5 hours** of work that no judge would ever see:

| Removed | Hours |
|---|---|
| R8 and ProGuard, including the evening it eventually costs when it breaks IndexedDB or serialization | ~1.5 |
| Release keystore and signing config | ~0.5 |
| Instrumented test layer, trimmed from five tests to two | ~1.5 |
| Foldable support | ~0.5 |
| deployed site size tuning | ~0.5 |

The earlier console estimate is superseded: Lite's live journey stays entirely in the
citizen app and has no console trigger.

Revised estimate: **~34 hours against 27.** Still a gap, still closed by Codex, but the
riskiest evening (E4, Shadow) now has more room and R8 can no longer eat an evening in E9.

The current Lite cut is visible only through honest absence and disclosure. The full posture
table, including the things that look like hardening but are actually submission evidence and
must stay, is in `spec/SPEC_README.md`.

The cut order below stays in force as insurance. It is not an expectation and it is not
a plan, it is what happens automatically if an evening misses its definition of done, so
that the decision is never taken at midnight by a tired person.

**Current cut, 2026-08-28:** the state view, Firestore writers, web console and offline
queue are deferred to round two. The live Lite build retains the map and the entirely
local safety flow.

**Never cut:** F10 auto-arm with no press, F15-F17 the check-in ladder, F19's local
context-rich preview, F23-F24 SOS with PIN, and F21/F30's honest disclosures. The web
console is a round-two feature and must not be claimed by Lite.

## Evenings

- Planning docs. **Done.**
- Next.js project: App Router, TypeScript strict, theme tokens, fonts, Vercel preview URL.
- Firebase is deferred to round two. Saaya production is never touched.
- Git repo init. **CODEX_LOG.md started tonight, not later.**
- **DoD:** the Vercel preview URL loads on a real mobile browser without creating a
  remote safety record.

- Port the audited Vizag data to `zones.json`: geometry, risk score, active hours,
  incident breakdown, women-safety count, nearest station and distance.
- Map screen rendering heat-zones. Hour-aware risk shading.
- **DoD:** the Vizag map renders real zones on the device and a zone reads differently at
  14:00 and 02:00.

- Tap a zone: risk level, incident breakdown, women-safety count, nearest station with
  distance and a call button.
- Onboarding: name, one favourite, location permission with a plain reason first, **PIN setup**
  and the required safety-flow tour.
- **DoD:** a stranger completes onboarding in under 90 seconds and can read the map.

- Wake lock plus a visible page, location updates, zone entry and exit detection.
- Arming rules: zone risk crossed with hour of day.
- "Why it woke" banner. Quiet persistent status. Manual arm. One-tap disarm.
- **D1 demo trigger** to simulate zone entry, labelled on screen.
- **DoD:** walking or simulating into a zone arms a session with **no user tap**. This is
  the most important DoD in the plan and the likeliest evening to overrun.

- Adaptive interval rules. Prompt, countdown, *I'm OK*, *I need help now*.
- Session state machine: idle, shadow, checking, escalating, SOS, resolved.
- **DoD:** a session runs shadow to check-in to resolved, and separately shadow to
  check-in to escalating. Weekend evening, so this is where an E4 overrun gets absorbed.

- Escalation composes the family message with its context: zone, hour, that zone's
  reported history, last known area, and the non-response.
- Cancel window with a visible timer. Mocked-delivery disclosure in the UI. No offline
  queue in Lite.
- **DoD:** escalation reaches the local message preview, cancel works, the mock disclosure
  is on screen, and a dropped network never changes the local flow or implies delivery.

- SOS trigger from both routes: *I need help now*, and cancel-window lapse.
- PIN-protected stop. On-screen local-only disclosure and user-controlled dial actions.
- State writers are cut to round two; this build makes no SUS or SOS write.
- **DoD:** the trust boundary holds under test. Nothing leaves the device and no screen
  claims otherwise.

- State-view/console route, writers and live incident data are deferred to round two. Lite
  has no console URL, state-facing screen or incident delivery path.

- Telugu strings. Low-end device pass. Throttled-network pass. Empty and error states.
- 3-minute video: the 4 a.m. ride and the four shut doors, Shakthi's 0.28%, T-Safe's
  1,300 downloads, the map, auto-arm with no press, the local escalation preview, the
  trust boundary at SOS, and the disclosures.
- Write-up against the brief's six questions, drawn from PROBLEM.md. Codex contribution
  section drawn from CODEX_LOG.md.
- Signed deployed site. Landing page carrying the deployed site and the video.
- **DoD:** every link works from a logged-out private window with no access request.

**E9 is overloaded and I am saying so in advance.** Polish, translation, video, write-up
and the deployed site do not fit in three hours. If E1 through E6 hold, move the video and write-up
onto Sat Aug 22 or Sun Aug 23 alongside E5 and E6. If they do not hold, Telugu is cut
first and E9 becomes submission-only.


## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| **T4.2 overruns.** Tab lifecycle is where a web build of this quietly breaks: a hidden tab is throttled, timers may not fire, and a resumed countdown that was never recomputed looks fine until it matters. | **High** | Absolute deadlines in IndexedDB, recomputed on every visibilitychange, never resumed. The D1 demo trigger so the video never depends on real geolocation. Manual checks M15 and M16 exist for exactly this. |
| **37 hours of work in 27 hours of evenings** | **High** | Codex velocity, per the founder's call. The fixed cut order as insurance. Two weekend days held in reserve. |
| **E9 cannot hold polish plus submission** | **High** | Stated above. Move video and write-up to the weekend if E1-E8 hold. |
| Codex log is thin by E9 | **High** | It is the only evidence for the tooling requirement. Log the same evening, every evening. |
| Judges read this as another consumer safety app | Medium | Name Shakthi and T-Safe in the first ten seconds of the video, with their own numbers. |
| Scope creep back toward full Saaya | Medium | FEATURES.md is the contract. Nothing outside it gets built. |
| A screen implies delivery when Lite is local-only | Medium | Keep the local-only disclosure beside the family preview and SOS actions; do not expose a console or state view. |
| An evening lost to life | Certain at least once | The buffer day and the cut order absorb one lost evening, not two. |

## What Codex does

A real allocation, and now the only basis for the brief's tooling requirement as well as
the answer to the schedule:

- **E1** scaffold, npm, React navigation and local runtime wiring.
- **E2** the crime-data to `zones.json` conversion script.
- **E3** onboarding screens and the PIN flow.
- **E4** geofence plumbing and the wake lock plus a visible page. The fiddliest boilerplate in the
  build and the evening most likely to overrun, so this is where Codex earns the most.
- **E5** the session state machine.
- **E6** the local escalation-preview builder.
- **E7 / E8** are deferred to round two: writers, anonymisation transport and console.

Log each one in CODEX_LOG.md the evening it happens: **what was asked, what came back,
what shipped, and what needed correcting.** The last column is the honest one, and a
write-up that includes it will be trusted more than one that does not.
