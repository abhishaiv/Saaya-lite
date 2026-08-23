# Saaya Lite - Build Plan
Nine evenings, 3 hours each, Tue 2026-08-18 to Wed 2026-08-26. Submit Thu 2026-08-27.
Revised 2026-08-18 against the verified 33-feature list in FEATURES.md.

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

Then **+1.5 hours** for the console's live journey trigger (T8.3), so a judge can complete
the journey from the live link with no install.

Revised estimate: **~34 hours against 27.** Still a gap, still closed by Codex, but the
riskiest evening (E4, Shadow) now has more room and R8 can no longer eat an evening in E9.

**Nothing cut was visible to a judge.** The full posture table, including the things that
look like hardening but are actually submission evidence and must stay, is in
`spec/SPEC_README.md`.

The cut order below stays in force as insurance. It is not an expectation and it is not
a plan, it is what happens automatically if an evening misses its definition of done, so
that the decision is never taken at midnight by a tired person.

**Cut order, first to go:** Hindi strings, then F28 (in-app "what the police see", since
the console carries it), then F13 (manual arm), then map visual polish, then F22 (offline
queue).

**Never cut:** F10 auto-arm with no press, F15-F17 the check-in ladder, F19 context-rich
escalation, F23-F24 SOS with PIN, F29 the web console, F21 and F30 the disclosures.

## Evenings

### E1 - Tue Aug 18: decisions and scaffold
- Planning docs. **Done.**
- Android project: TypeScript, React, min SDK 24, package, icon, Saaya theme.
- New Firebase project, Firestore. Saaya production is never touched.
- Git repo init. **CODEX_LOG.md started tonight, not later.**
- **DoD:** an empty React app installs on a real Android phone and writes one test doc
  to the new Firestore.

### E2 - Wed Aug 19: the map (F6, F9)
- Port the audited Vizag data to `zones.json`: geometry, risk score, active hours,
  incident breakdown, women-safety count, nearest station and distance.
- Map screen rendering heat-zones. Hour-aware risk shading.
- **DoD:** the Vizag map renders real zones on the device and a zone reads differently at
  14:00 and 02:00.

### E3 - Thu Aug 20: zone detail and onboarding (F7, F8, F1-F5)
- Tap a zone: risk level, incident breakdown, women-safety count, nearest station with
  distance and a call button.
- Onboarding: trusted contact, location permission with a plain reason first, language,
  **PIN setup**.
- **DoD:** a stranger completes onboarding in under 90 seconds and can read the map.

### E4 - Fri Aug 21: Shadow, the core claim (F10-F14)
- Wake lock plus a visible page, location updates, zone entry and exit detection.
- Arming rules: zone risk crossed with hour of day.
- "Why it woke" banner. Quiet persistent status. Manual arm. One-tap disarm.
- **D1 demo trigger** to simulate zone entry, labelled on screen.
- **DoD:** walking or simulating into a zone arms a session with **no user tap**. This is
  the most important DoD in the plan and the likeliest evening to overrun.

### E5 - Sat Aug 22: SUS, the check-in ladder (F15-F18)
- Adaptive interval rules. Prompt, countdown, *I'm OK*, *I need help now*.
- Session state machine: idle, shadow, checking, escalating, SOS, resolved.
- **DoD:** a session runs shadow to check-in to resolved, and separately shadow to
  check-in to escalating. Weekend evening, so this is where an E4 overrun gets absorbed.

### E6 - Sun Aug 23: family escalation (F19-F22)
- Escalation composes the family message with its context: zone, hour, that zone's
  reported history, last known area, and the non-response.
- Cancel window with a visible timer. Mocked-delivery disclosure in the UI. Offline queue.
- **DoD:** escalation fires end to end, the contact view is correct, cancel works, the
  mock disclosure is on screen, and killing the network does not lose the escalation.

### E7 - Mon Aug 24: SOS and the state writes (F23-F27)
- SOS trigger from both routes: *I need help now*, and cancel-window lapse.
- PIN-protected stop. On-screen statement that the state now has it.
- Two writes: **anonymised SUS records** (zone-snapped, no session id, no name) and
  **full SOS incidents** (precise location, identity, session history).
- **DoD:** the trust boundary holds under test. Shadow and SUS produce nothing
  identifying; only SOS crosses.

### E8 - Tue Aug 25: the state view and the live link (F28-F30)
- Web console on Firebase Hosting. SUS and SOS, filterable last 24 hours / 7 days /
  30 days. Permanent "connected to no government system" disclaimer.
- In-app "what the police see", showing all three honest states. First on the cut list.
- **DoD:** the console URL loads in a logged-out private window, on a phone, and shows an
  incident the app created minutes earlier.

### E9 - Wed Aug 26: conditions and submission (F31-F33)
- Telugu strings. Low-end device pass. Throttled-network pass. Empty and error states.
- 3-minute video: the 4 a.m. ride and the four shut doors, Shakthi's 0.28%, T-Safe's
  1,300 downloads, the map, auto-arm with no press, escalation with its context, the
  trust boundary at SOS, the console, the disclosures.
- Write-up against the brief's six questions, drawn from PROBLEM.md. Codex contribution
  section drawn from CODEX_LOG.md.
- Signed deployed site. Landing page carrying the deployed site, the console link and the video.
- **DoD:** every link works from a logged-out private window with no access request.

**E9 is overloaded and I am saying so in advance.** Polish, translation, video, write-up
and the deployed site do not fit in three hours. If E1 through E8 hold, move the video and write-up
onto Sat Aug 22 or Sun Aug 23 alongside E5 and E6. If they do not hold, Telugu is cut
first and E9 becomes submission-only.

### Thu Aug 27: submit. The day is buffer, not workspace.

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| **E4 overruns.** Android background location, battery optimisation, permission tiers | **High** | Wake lock plus a visible page with a persistent notification. D1 demo trigger so the video never depends on real geofencing. E5 is a weekend evening and absorbs the overrun. |
| **37 hours of work in 27 hours of evenings** | **High** | Codex velocity, per the founder's call. The fixed cut order as insurance. Two weekend days held in reserve. |
| **E9 cannot hold polish plus submission** | **High** | Stated above. Move video and write-up to the weekend if E1-E8 hold. |
| Codex log is thin by E9 | **High** | It is the only evidence for the tooling requirement. Log the same evening, every evening. |
| Judges read this as another consumer safety app | Medium | Name Shakthi and T-Safe in the first ten seconds of the video, with their own numbers. |
| Scope creep back toward full Saaya | Medium | FEATURES.md is the contract. Nothing outside it gets built. |
| Console leaks or breaks on submission day | Medium | Synthetic data only, read-only, checked from a logged-out private window on E8 and again on E9. |
| An evening lost to life | Certain at least once | The buffer day and the cut order absorb one lost evening, not two. |

## What Codex does

A real allocation, and now the only basis for the brief's tooling requirement as well as
the answer to the schedule:

- **E1** scaffold, npm, React navigation, Firebase wiring.
- **E2** the crime-data to `zones.json` conversion script.
- **E3** onboarding screens and the PIN flow.
- **E4** geofence plumbing and the wake lock plus a visible page. The fiddliest boilerplate in the
  build and the evening most likely to overrun, so this is where Codex earns the most.
- **E5** the session state machine.
- **E6** the escalation builder and the offline queue.
- **E7** the two Firestore write paths and the anonymisation rules.
- **E8** the console.

Log each one in CODEX_LOG.md the evening it happens: **what was asked, what came back,
what shipped, and what needed correcting.** The last column is the honest one, and a
write-up that includes it will be trusted more than one that does not.
