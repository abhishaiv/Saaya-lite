# Saaya Lite - Scope
Decided 2026-08-18. Revised three times the same evening as the founder verified the
feature list. Changes need a line in progress.md.
**FEATURES.md is the contract.** This file explains the reasoning behind it.

## The rule that governs every scope call

**Saaya Lite is not a smaller Saaya. It is the one claim, proven.**

The claim: *she never presses anything, and what reaches the state is legible anyway.*
If a feature does not serve that sentence, it is out, however good it is.

This build is also indirect marketing for full Saaya, so it must feel like Saaya and must
not read as a stripped demo. Fewer things, finished.

## What is in: four tiers and a map

1. **The Visakhapatnam risk-zone map.** Heat-zone markings, zone detail, nearest station,
   risk that moves with the hour. This is why she installs it on a calm day, and without
   it we would be shipping an engine that nobody has a reason to own.
2. **Shadow.** Zone and hour arm it. No press. Nothing leaves the phone.
3. **SUS.** Adaptive check-in ladder. Still nothing leaves the phone.
4. **Family escalation.** Context-rich, with a cancel window. Contacts only.
5. **SOS.** PIN-protected, full-bleed, and she is told exactly what would be shared.

**Cut to round two 2026-08-28:** the state view itself, anonymised SUS records, full SOS
incidents, and a web console
filtered by last 24 hours, 7 days or 30 days.

**Saaya Lite contains no AI model, in the product or behind it.** Entirely deterministic,
entirely escalation-based. Every decision is a stated rule, and we say so rather than
implying intelligence we did not build.

## Out of scope, and why

| Cut | Why |
|---|---|
| The on-device AI engine (audio, motion, threat detection) | Founder decision. Not buildable in the time. Lives in full Saaya. |
| Live unsafe-roads display | Founder decision. Separate dataset and rendering path. Heat-zone markings stay. |
| AI or model-based incident labelling | Founder decision. No API key required. Context comes from how the signal is generated, not from classification after the fact. |
| H3 cells, k-anonymity gating, HyperLogLog density | Founder decision: unnecessary complication at this size. Replaced by zone-snapping plus time-window filters, which produce the same "this stretch keeps flagging" reading. The full machinery is documented in PROBLEM.md as the scale path. |
| Evidence capture and upload | Belongs to the SOS layer of full Saaya, not to the before layer. |
| Watch app, fake call | Not part of the claim. |
| Live location sharing to contacts | Deliberately out. Safetipin built it and removed it because it becomes control in the Indian family context. Contacts get an escalation, never a dot she cannot switch off. |
| Real SMS or WhatsApp delivery | Needs India DLT registration. Months of regulatory lead time. |
| Any live government integration | Forbidden by the brief and by our own honest-disclaimer rule. |

## Real vs mocked, decided before building

| Component | Status |
|---|---|
| Vizag risk-zone map, zone detail, nearest station | **REAL** |
| GPS, zone entry detection, hour-aware risk | **REAL** |
| Shadow: automatic arming, no press | **REAL** |
| SUS: adaptive check-in ladder | **REAL** |
| Family escalation, context, cancel window, offline queue | **REAL** |
| SOS, PIN-protected stop | **REAL** |
| Anonymised SUS records to the state view | **Cut, round two** |
| Full SOS incident to the state view | **Cut, round two** |
| Web console with 24h / 7d / 30d filters | **Cut, round two.** The live demo link is the citizen app. |
| Demo trigger to simulate zone entry | **REAL, a dev affordance**, labelled on screen |
| SMS and WhatsApp delivery to contacts | **MOCKED**, disclosed in the UI |
| Connection to AP Police, Shakthi, T-Safe, 112, ERSS | **NONE**, stated in-product |
| Any AI or ML | **NONE**. Nothing is inferred. Everything is a rule. |
| Demo contacts, names, incidents | **SYNTHETIC** |

## Why this still beats T-Safe without any AI

T-Safe already does check-in-and-escalate, so we must be able to say the difference in one
breath:

| | T-Safe | Saaya Lite |
|---|---|---|
| How it starts | she starts the trip, app or IVR | the zone arms it, no press |
| When it checks | fixed 15 minute timer | adapts to zone and hour |
| What arrives | an alert | an incident carrying zone, hour, reported history, non-response |
| Who is told | police | family first, the state only at SOS |
| What the state learns | one alert per trip | which stretches keep waking the app, from women who never file |
| On an ordinary day | nothing to open | a map she opens anyway |
| Coverage | cabs, Telangana | any journey |

The two that carry the argument: **she never starts it**, and **she had a reason to
install it before she ever needed it.** Both survive the AI cut intact.

## Stack

| Layer | Choice | Reason |
|---|---|---|
| App | **Next.js + TypeScript, mobile-first web** | Pivoted 2026-08-19: the brief states reviewers will not download a mobile app. ~94% of this spec transferred unchanged. |
| Backend | Firebase, **a NEW project**, never Saaya production | Protects the live iOS product. |
| State view console | **Cut 2026-08-28, round two.** Not built and claimed nowhere. | The live link is the citizen app. |
| Zone data | Existing audited Vizag dataset, verified present 2026-08-18 | 24 classified zones, station points, info cards. A port, not a build. |
| AI | **None** | Founder decision. No OpenAI API key required. |
| Build assistant | Codex CLI | Load-bearing. See below. |

## Codex is the sole basis for the tooling requirement

The brief asks the prototype to be built with Codex or powered by an OpenAI model. With no
model in the product, **Codex building it is the only leg this stands on.** That is
compliant, the brief allows exactly this, but it makes CODEX_LOG.md a deliverable rather
than a courtesy. Log every meaningful contribution the evening it happens: what was asked,
what came back, what shipped, and what needed correcting. The last column is the honest
one, and judges will trust the write-up more for it.

Codex is also the answer to the schedule. The verified 33-feature list costs roughly 37
hours and nine evenings supply 27. The founder's call on 2026-08-18 was to close that gap
with Codex velocity rather than by cutting features. The cut order in BUILD_PLAN.md
remains in force as insurance, not as an expectation.

## Designed for real Indian users

Scored directly by the brief, so these are build requirements.

- Low-end phone. Min SDK 24, no heavy 3D map, small deployed site.
- Slow or dropped connection. Escalation queues locally and syncs when the network
  returns. Losing signal must never lose the escalation.
- Low digital literacy. The primary path requires **zero taps**, which is the strongest
  accessibility property this product has.
- Language. English plus Telugu, given Visakhapatnam. Hindi only if time allows.

## City

**Visakhapatnam, confirmed** by the founder 2026-08-18.
