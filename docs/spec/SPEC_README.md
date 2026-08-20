# Saaya Lite - Specification Pack
Written 2026-08-18 for Codex. Read this file first, every session.

## What this is

A spoon-fed build specification. **Codex should not need to invent anything.** If a
number, string, colour, threshold or schema is missing here, that is a bug in the spec.
Stop and ask rather than guessing, then the answer gets written into the spec.

## Reading order

1. **`../FEATURES.md`** - the contract. 33 features. Anything not in it is not built.
1b. **`SETUP.md`** - Firebase project, tooling, repo layout, deploy commands. Do once.
1c. **`SECRETS_AND_ACCESS.md`** - keys, credentials, config files, runtime permissions.
     **No third-party API keys exist in this project.** If you think you need one, stop.
2. **`BUILD_CONFIG.md`** - Gradle, pinned versions, signing, R8, manifest privacy flags.
2b. **`ARCHITECTURE.md`** - modules, layers, packages, threading.
3. **`DATA_MODEL.md`** - Room entities, Firestore collections, security rules, seed data.
4. **`BUSINESS_RULES.md`** - every number in the product. Arming matrix, timers, formulas.
5. **`STATE_MACHINE.md`** - the session engine. States, events, guards, edge cases.
6. **`SCREENS.md`** - every screen and its layout, the navigation graph.
6b. **`MAP_SPEC.md`** - the hero surface: osmdroid, tiles, zone rendering, offline.

**Look and feel, all founder-decided on 2026-08-18. Read all seven before writing any UI:**

7. **`DESIGN_SYSTEM.md`** - colour, Poppins type scale, shape, the escalation grading.
8. **`COMPONENT_LIBRARY.md`** - every shared composable at exact dp, in every state.
9. **`ICONOGRAPHY.md`** - Material Symbols Rounded, and the SF Symbols mapping.
10. **`MOTION_SPEC.md`** - every animation, and the two things that must never animate.
11. **`INTERACTION_SPEC.md`** - gestures, haptics, sound, back behaviour per screen.
12. **`RESPONSIVE_SPEC.md`** - 320 dp up, font scale to 2.0x, insets, low-end budgets.
13. **`STATES_CATALOGUE.md`** - loading, empty, error, offline, denied, for all 12 screens.
14. **`ACCESSIBILITY_SPEC.md`** - screen reader, focus, contrast, motor, cognitive.

**Then:**

15. **`COPY.md`** - every user-facing string, English and Telugu, plus locked vocabulary.
16. **`ANDROID_PLATFORM.md`** - permissions, foreground service, notifications, battery.
17. **`CONSOLE_SPEC.md`** - the web console, which is our live demo link.
18. **`TEST_PLAN.md`** - acceptance criteria per feature.
19. **`CODEX_TASKS.md`** - the ordered task list. This is what you actually execute.
20. **`CODEX_LOG.md`** - append to this every session. It is a submission deliverable.
21. **`DEMO_SCRIPT.md`** - the 3-minute video, shot by shot. E9.
22. **`SUBMISSION.md`** - landing page, write-up template, pre-submission checklist. E9.

## Prototype posture

**Founder directive 2026-08-18: this is a prototype. Do not build for production.**

When you are about to do something because it is "proper engineering", apply this test:

> Does a judge, a reviewer, or the demo depend on it?

If no, do not build it. Nine evenings is the constraint, and gold-plating the build is how
the ladder ends up untested.

| Do NOT build | |
|---|---|
| R8, minification, obfuscation | breaks Room and serialization in ways that eat evenings |
| Release keystore ceremony | debug signing installs fine when sideloaded |
| Broad instrumented test coverage | slow to write, needs a device, protects little |
| Foldables, tablets, landscape | portrait phone only |
| APK size optimisation | get it reasonable, do not tune it |
| Crash reporting, analytics, telemetry | we collect nothing, deliberately |
| Migrations, backfills, versioned schemas | destructive migration is correct here |
| RBAC, audit trails, retention policies | described in the write-up, not built |
| Performance micro-optimisation | hit the stated budgets, then stop |

**But some things look like production hardening and are actually submission evidence.
Build these, they are cheap and they are the point:**

| Build it | Because |
|---|---|
| `allowBackup="false"` + data extraction rules | makes "favourites never leave the device" true, not merely claimed |
| The Firestore rule rejecting `latitude`/`longitude`/`sessionId`/`uid` | lets a reviewer verify the privacy claim without trusting our client |
| `AnonymiserTest` and `SessionEngineTest` | the only proof the trust boundary actually holds |
| Every in-product mock label | Honesty is a scored criterion |
| The offline queue | "works on a slow Indian network" is a claim we make |
| Telugu, contrast, touch targets, zero-tap path | the brief scores accessibility directly |

The rule underneath: **strip anything that only pays off after launch. Keep anything a
reviewer can check.**

## Precedence, when documents disagree

1. `FEATURES.md` (scope: is this built at all?)
2. `BUSINESS_RULES.md` (values: what number?)
3. `STATE_MACHINE.md` (behaviour: what happens when?)
4. `DATA_MODEL.md` (shape: what does it look like?)
5. Everything else.

If a conflict survives that order, stop and ask. Do not pick one.

## Non-negotiables

These have a reason behind them that is not obvious from the code. Do not "improve" them.

1. **No AI, no ML, no model calls.** Anywhere. Every decision is a stated rule. This is a
   founder decision and a submission claim. Adding a model breaks the honesty section.
2. **The trust boundary is at SOS.** Shadow and SUS send the state nothing identifying.
   Precise location and identity cross only at SOS. Never move this line for convenience.
3. **A SUS record snaps to its zone and carries no session id.** Never write a coordinate
   and never write anything that links two SUS records to the same phone or person.
4. **Contacts never leave the device.** They live in Room and are never uploaded.
5. **No live location sharing exists.** Not disabled, not hidden. Absent. Contacts receive
   an escalation, never a trackable dot.
6. **Every mock is labelled in the UI.** SMS is shown as composed and not dispatched, in
   the product itself, not only in the write-up.
7. **No government branding, logos, or implied endorsement.** The disclaimer is permanent.
8. **All demo data is synthetic.** No real names, numbers, Aadhaar, PAN, OTP or payment
   data, ever, including in test fixtures.
9. **The escalation accent never animates.** Lavender, amber, red, static, with the border
   stroke firming 1.0 / 1.5 / 2.0 dp. This is a founder contract carried from the iOS app:
   the colour alone carries the urgency. No pulse, no flash, no tween.
10. **SOS appears instantly.** No animation, ever.
11. **They are called favourites**, never contacts. See the vocabulary table in `COPY.md`.
12. **Strings marked (iOS verbatim) in `COPY.md` are copied character for character** from
    the real app. Do not reword them.

## Source data, already audited and present

Copy from `assets/` in this repo:

| File | Contents |
|---|---|
| `vizag_heatmap.geojson` | 24 Polygon zones. Each is a police station jurisdiction and carries `risk_tier`, `risk_score`, `color`, `opacity`, `total_cases`, `women_safety_cases`, `crime_breakdown`, `geofence_radius_m`, `areas_covered`, `risk_notes`, station lat/lon. |
| `zone_info_cards.json` | 19 detail cards, keyed by `station_id`. Only the 19 non-safe zones have one. |
| `vizag_police_points.json` | 37 stations with `phone`, `address`, lat/lon. |

**Do not regenerate or "improve" this data.** It was audited against NCRB 2023 city data
(5,746 grand total, 997 crimes against women). Regenerating it breaks the evidence chain
in the submission.

## Feature traceability

Every feature F1-F33 in `../FEATURES.md` is specified somewhere in this pack. Verify with:

```bash
for i in $(seq 1 33); do grep -rq "F$i\\b" docs/spec/ || echo "UNCOVERED F$i"; done
```

This must print nothing. If it prints a feature, that feature has no specification and
Codex would have to invent it. Fix the spec, do not invent.

**F33 (zero-tap primary path) is not a screen, it is a property.** It is satisfied by
F10 auto-arming with no press, and it is verified by test M6: the session must arm with
no user tap. If M6 ever requires a tap, F33 is broken regardless of what any screen says.

## Definition of done, for any task

A task is done when: it compiles, it runs on a real Android device, its acceptance
criteria in `TEST_PLAN.md` pass, and its entry is written in `CODEX_LOG.md`.


## The Saaya iOS source is not required

**You do not need the Saaya iOS source.** Every value taken from it is already extracted
into `graph/spec_graph.json` as a fact (33 of them), and every string taken from it is
already in `COPY.md` marked "(iOS verbatim)". The `sourced_from` fields naming
`AppTheme.swift` and `SUSCheckInCardView.swift` are provenance, not instructions to go and
read them. That repository is not required to build this one.

---

## Proposing a fact for a value the specification already states

Three times at `T1.1` the build blocked on the same thing: a value **already frozen in a
specification document** that had never been turned into a fact. Each block was correct, and
each cost a round trip for something that required no decision.

The rule was never "do not transcribe a stated value". It is **"do not invent a value"**.
Those are different, so there is now a narrow path between them.

**When, and only when, all four hold:**

1. The value is **written in a specification document** — a table cell, a stated rule.
2. It is **absent** from `graph/spec_graph.json`, or present only under an id that governs
   something else (`grounded_check.py --explain` shows you which).
3. You are **not** choosing between options. There is no design decision to make.
4. You can cite it as **`<doc>:<line>`**.

**Then:** batch them, do not block one at a time. Post a single list:

```
PROPOSED FACTS (values already stated, no decision needed)
  <fact.id>  <value> <unit>  "<meaning>"   <- DOC.md:LINE
  ...
Blocking on approval.
```

The founder replies `approved` (or corrects individual entries). Then **you** add them with
the doc-and-line as `sourced_from`, record a `spec_amended` event, and continue.

**This is not permission to invent.** If a value is not written in a document, or if two
readings are possible, that is a real BLOCKED and it goes through the full format. The
citation is the whole safeguard: the founder is confirming a transcription, not authorising
a guess.
