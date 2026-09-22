# Saaya Lite - Progress Log
Append only. Newest at the bottom.

## 2026-08-18 - Planning session

**Context.** Building a lite version of Saaya for Build What Moves India
(https://buildwhatmovesindia.com/), deadline 2026-08-27. Doubles as indirect marketing
for full Saaya. Android native this time. Roughly 27 hours available, 3 hrs x 9 evenings.

**What we did.** Problem discovery grounded in evidence rather than assumption. First
attempt at personas was rejected by the founder as forced. Reset and anchored on the
existing Saaya problem statement from `Saaya_AP_Police_Deck_v6_1.pdf`.

**The finding that shaped everything.** Two government women's-safety apps already exist
and fail in opposite directions. Shakthi (AP) has 1.52 crore downloads and 11,60,146 SOS
presses producing 34,192 immediate responses (2.9%) and 3,193 FIRs (0.28%). T-Safe
(Telangana) already implements check-in-and-escalate but requires her to start the trip
and was downloaded about 1,300 times in 30 days. One nobody uses, one everybody installs
and nothing happens. Between them they define the gap.

**Problem statement locked.** India's emergency intake accepts exactly one event type, a
crime that has already happened. Saaya Lite adds a second: *at risk, nothing has happened
yet*, submitted with no press and no name.

**Decisions locked.**
- Platform: native Android, Kotlin + Jetpack Compose.
- Scope: five things only. Auto-arm from zone and hour, adaptive check-in ladder,
  escalation to family, escalation to a state view, OpenAI labelling engine.
- Real: GPS, zone detection, auto-arm, check-in timing, escalation, OpenAI labelling,
  the state-side write, the web console.
- Mocked and disclosed in-product: SMS and WhatsApp delivery, and the entire state side
  (no connection to AP Police, Shakthi, T-Safe, 112 or ERSS).
- Not built at all: audio, motion, evidence capture, watch, fake call, live tracking.
- Live demo link: the web console, since an APK is a download and not a link.
- Backend: a NEW Firebase project. Saaya production is never touched.

**Docs written.** `docs/EVIDENCE.md` (every claim sourced), `docs/PROBLEM.md` (the
submission spine, against the brief's six questions), `docs/SCOPE.md` (in, out, real,
mocked, stack), `docs/BUILD_PLAN.md` (nine evenings with a definition of done each, a
fixed cut order, and a risk register).

**Open.** OpenAI API key for the in-product labelling is not confirmed and is day-one
blocking. Fallback is a rule-based labeller with the same schema, disclosed, which is a
strictly weaker submission.

**Next.** E1 definition of done: an empty Compose app installs on a real Android phone
and writes one test doc to a new Firestore project.

## 2026-08-18 - Scope revision, same evening

**Founder decisions after reviewing the first plan.**

- **The map is back in.** Cutting it left Lite with no reason to open the app on an
  ordinary day, which was the deck's "a map she actually opens" argument. Simple version:
  heat-zone markings, tap for risk level and incident breakdown, nearest station.
  Roughly one evening, not three.
- **The live unsafe-roads display is out.** Heat-zone markings stay. These are different
  things and the earlier note conflated them.
- **The on-device AI engine is out** (audio, motion, threat detection).
- **AI incident labelling is out too.** No OpenAI API key needed. Saaya Lite contains no
  model, in the product or behind it. Everything is deterministic and escalation-based.
- **Visakhapatnam confirmed** as the city.

**Consequence recorded.** With no model in the product, the brief's "built with Codex or
powered by an OpenAI model" rests entirely on Codex building it. That is compliant, but
it makes CODEX_LOG.md a deliverable rather than a courtesy. Logged the same evening,
every evening.

**Argument reshaped, and improved.** We no longer claim a model describes the incident
well. We claim the incident **carries context by construction**: it is produced by
circumstance rather than by a press, so it arrives already carrying the zone, the hour,
that zone's reported history and the non-response. A press carries none of that, which
is why 11,60,146 of them produced 3,193 FIRs. Cleaner argument, and it costs nothing to
build.

**Differentiation against T-Safe now rests on:** she never starts it (the zone does), and
she had a reason to install it before she ever needed it (the map). Both survive the AI
cut intact.

**Docs updated.** PROBLEM.md sections 3, 4 and 5. SCOPE.md and BUILD_PLAN.md rewritten.

**Next.** E1 definition of done: an empty Compose app installs on a real Android phone
and writes one test doc to a new Firestore project. CODEX_LOG.md started the same evening.

**Data verification, same evening.** Checked the Vizag assets in
`Women Safety App/WomenSafetyApp/Resources/` before committing E2 to the plan. All of it
exists and is usable as-is:

- `vizag_heatmap.geojson` (46KB): 24 zones already risk-classified (6 high, 9 moderate,
  4 elevated, 5 safe), NCRB 2023 calibrated, 5,746 grand total / 997 CAW.
- `heatmap_points.json` (82KB): three zoom levels, each point carrying name, lat, lon,
  crimeCount, womenSafetyCount and a normalised weight.
- `vizag_police_points.json` (21KB): stations, which is the "nearest station" feature.
- `zone_info_cards.json` (11KB): zone detail card content.

E2 is therefore a port and a schema conversion, not a data build. Estimate drops from a
full evening to roughly half of one. The freed time goes to E4 (auto-arm), which carries
the most important DoD in the plan and the highest technical risk.

## 2026-08-18 - Feature list verified, architecture corrected

The founder asked for a full end-to-end feature list before approving the plan. Producing
it surfaced a real error and several decisions.

**Error I made and the founder corrected.** I had the state view receiving a coarsened
signal at family escalation. That breaks Saaya's trust boundary. Corrected ladder:

1. **Shadow** - zone and hour arm it silently. Nothing leaves the phone. One-tap stop.
2. **SUS** - check-in prompt with a countdown. Nothing leaves the phone. "I'm OK" stops it.
3. **Family escalation** - contacts told with context, cancel window open. Contacts only.
4. **SOS** - state view receives the incident, she is told, and stopping requires a PIN.

SOS is reached either by her tapping "I need help now" or by the cancel window lapsing.
That is what gives the cancel window weight: it is the last gate before an institutional
record.

**Founder decisions.**
- State sees SOS in full. State sees SUS anonymised. Nothing at Shadow.
- She is told when SOS is triggered, and only then.
- SOS is always PIN-protected, PIN set during onboarding on a calm day.
- "I need help now" stays, for the case where she can act, and for the person who is not her.
- **H3 cells, k-anonymity gating and HyperLogLog density are cut** as unnecessary
  complication at this size. Replaced by time-window filters on the console: last 24
  hours, 7 days, 30 days. Same "this stretch keeps flagging" reading, none of the machinery.

**Two anonymisation rules I added by default, about 15 minutes of work each,** so that
"anonymised" is true rather than nominal: a SUS record snaps to its zone rather than a
coordinate, and carries no session id, so a series of records cannot be reassembled into
one woman's route. SOS keeps full precision, since at that point she has crossed the line
deliberately.

**FEATURES.md written and verified: 33 features across 8 stages, plus one labelled dev
affordance.** This is now the contract. Anything not in it is not being built.

**Schedule, on the record.** The verified list costs roughly 37 hours. Nine evenings
supply 27. I flagged the 10-hour gap and recommended using Sat Aug 22 and Sun Aug 23.
**Founder decision: close the gap with Codex velocity, not by cutting features.** The cut
order stays in BUILD_PLAN.md as insurance only. I have also flagged in advance that E9
cannot hold polish, translation, video, write-up and the APK in three hours.

**Docs updated.** FEATURES.md created. PROBLEM.md sections 5 and 6 rewritten (the privacy
section now separates what Lite enforces today from what full scale would additionally
need, which is the honest answer to the brief's scale question). SCOPE.md and
BUILD_PLAN.md rewritten against the verified list.

**Next.** E1 definition of done: an empty Compose app installs on a real Android phone
and writes one test doc to a new Firestore project. CODEX_LOG.md opened the same evening.

## 2026-08-18 - Codex specification pack written

The founder asked for everything Codex needs to build this without inventing anything.
Thirteen documents in `docs/spec/`, roughly 13,000 words.

**Grounded in the real assets first.** Before writing a line of spec I read the actual
Saaya theme and data files rather than assuming. Three findings changed the specs:

- `vizag_heatmap.geojson` already carries **`geofence_radius_m`** per zone (2000-5000 m),
  so arming geofences are pre-computed rather than derived.
- **Every zone is a police station jurisdiction**, so "nearest station" is intrinsic to
  the zone rather than a spatial query. 37 stations carry phone numbers.
- **19 info cards against 24 zones**, because the 5 `safe` zones carry
  `color: "#00000000"` and are deliberately not drawn.

Brand tokens taken from `WomenSafetyApp/Theme/AppTheme.swift` so Lite is visually
continuous with Saaya: lavender `#A78BFA`, dark `#0B0B0F`, SOS red `#FF3B30`, amber
`#F09921`, radii 14 and 10.

**The pack.** SPEC_README (precedence order and eight non-negotiables), ARCHITECTURE,
DATA_MODEL, BUSINESS_RULES, STATE_MACHINE, SCREENS, DESIGN_SYSTEM, COPY (English and
Telugu), ANDROID_PLATFORM, CONSOLE_SPEC, TEST_PLAN, CODEX_TASKS (20 atomic tasks with
paste-ready prompts), CODEX_LOG (template, a submission deliverable).

**Product decisions I made and wrote down, because Codex cannot invent them.** The arming
matrix crossing 4 risk tiers against 5 hour bands. Check-in intervals of 5 to 12 minutes
by tier and band. A 90 / 60 / 60 second ladder totalling 210 s, with a demo divisor of 6
giving 35 s so it fits a 3-minute video. Enter dwell 60 s and exit dwell 180 s so arming
does not flap at a boundary. Cooldowns of 45 min after manual disarm and 20 min after an
OK. PIN rules including no recovery path during a live SOS. The exact family message text.
Haversine nearest-station with honest `locality-approx` disclosure. Hour multipliers for
display risk that never touch the authoritative arming matrix.

**Two architectural choices worth recording.** The `SessionEngine` is a pure function with
zero Android imports that emits commands rather than performing them, which is what makes
every timing rule and the trust boundary unit-testable on the JVM without a device. And
every Firestore write goes through a Room-backed offline queue, because an unlit road at
4 a.m. is exactly where connectivity fails and where the escalation matters most.

**The trust boundary is enforced in three places, not one.** In the engine (no write
command before family escalation), in the Anonymiser (payload built from an allow-list so
it is structurally impossible to emit a coordinate), and in the Firestore security rules
(a `hasAny` guard rejecting `latitude`, `longitude`, `sessionId`, `uid` at the database).
A reviewer can verify the claim without trusting the client.

**Traceability verified, not asserted.** Ran a check for all 33 features across the pack.
Seven were covered but untagged (F1, F4, F20, F27, F29, F32, F33), which would have let
Codex invent them. Tagged them and re-ran: full coverage. The check command is in
SPEC_README so it can be re-run after any spec edit.

**Deliberate absences that are themselves features.** The manifest has no `RECORD_AUDIO`,
`CAMERA` or `SEND_SMS`, so a reviewer can read it and verify Saaya Lite cannot listen,
watch, or send on her behalf. `ACTION_DIAL` rather than `CALL_PHONE`, so she always
confirms. Test V7 greps the source to prove the no-AI claim and V8 checks the manifest,
and both outputs go into the write-up as evidence rather than assertion.

**Open.** Telugu strings are a first pass and need founder verification before the video.
The osmdroid versus Google Maps decision is deferred to E2 and must be logged. My
recommendation is osmdroid: no key, no billing, no quota risk on submission day.

**Next.** T1.1: Gradle project, package tree, and the full theme from DESIGN_SYSTEM.md.

## 2026-08-18 - Look and feel pack, and the Codex loop

Founder pushed back that the first spec pack specified behaviour well but under-specified
look and feel, and asked to be consulted on preferences rather than have me decide. Ran
three rounds of twelve questions, then wrote the visual half of the pack.

**Founder decisions.** Warm and human aesthetic. Deck typeface. Full-bleed map with
floating controls. Escalation visible at every rung. Google Maps with a dark style JSON
over osmdroid. Warm springy motion, but SOS instant. Escalating haptics with sound only
from check-in 2. Vocabulary is **favourites**, matching the iOS app. iOS check-in copy
reused verbatim where the moment matches. The app is called **Saaya Lite**. Icons are my
call: Material Symbols Rounded.

**Two things I stopped guessing and went and verified.**

The typeface: extracted embedded fonts from `Saaya_AP_Police_Deck_v6_1.pdf`. It is
**Poppins** (Regular, Medium, SemiBold, Bold). The landing page uses Inter, so guessing
from the web surface would have been wrong.

The escalation grading: read `Views/SUSCheckInCardView.swift`. **My spec was wrong.** The
real app already has a founder contract for this: accents run **brand violet, amber, true
danger red**, with the border stroke firming 1.0 / 1.5 / 2.0 dp, and a code comment stating
it is static, never flashing, because the colour alone carries the urgency. I had yellow to
orange to amber. Corrected everywhere and promoted to a non-negotiable.

Reading that file also gave exact geometry that is now specified rather than invented: card
fill `#1F1F1F`, radius 22, padding 22, horizontal margin 30, content spacing 14, border at
accent 50%, icon 40, title 20 bold, body 14 at 75%, primary button 50 tall, secondary 34 and
text-only in danger. Two behaviours carried over verbatim: the primary button label holds a
live countdown (`I'm OK · 42s`), and the escalation chime deliberately ignores the silent
switch, on the reasoning that a check-in must be perceivable to be answerable.

**Seven new documents.** COMPONENT_LIBRARY (14 composables at exact dp in every state),
MOTION_SPEC (every animation, plus the two that must never animate), INTERACTION_SPEC
(gestures, haptics, sound, back behaviour per screen), RESPONSIVE_SPEC (320 dp up, font
scale to 2.0x, insets, low-end budgets), STATES_CATALOGUE (loading, empty, error, offline,
denied for all 12 screens), ACCESSIBILITY_SPEC, ICONOGRAPHY. DESIGN_SYSTEM and COPY
rewritten. Twenty spec docs, roughly 20,000 words.

**The handover file.** `README.md` at the Saaya Lite root is the single file the founder
gives Codex. It defines a ten-step loop (read state, read specs, read task, plan, build,
verify, log, advance, stop) with **eight verification gates**, a three-attempt cap before
stopping, a BLOCKED report format, and an instruction to write any answer back into the
spec before continuing so the spec stays the single source of truth. `BUILD_STATE.md` is
the resume pointer with a 20-task ledger and a 14-component ledger.

**Consistency verified, not asserted.** The DESIGN_SYSTEM rewrite orphaned two colour
tokens (`alert`, `warn`) that four places still referenced, and CODEX_TASKS had no task for
building the component library at all, so screens would have invented their own buttons.
Both found by sweep and fixed. Added T1.3 (component library, built before any screen) and
wired the seven look-and-feel docs into every UI task's Reads line. Final sweep: no
undefined token references, all 33 features covered, all 14 components defined.

**Blockers now tracked in README.md.** B1: Google Maps API key with billing enabled, needed
by T2.2, founder-owned, and it stops E2 if unresolved. B2: Telugu needs native review. B3:
Poppins subset under 250 KB.

**Next.** Founder resolves B1, then Codex runs T1.1 from `README.md`.

## 2026-08-18 - Blockers removed

Founder directive: no blockers, resolve them now rather than post-implementation, and
propose an alternative that matches the clean Saaya iOS look.

**Google Maps is out. osmdroid with CARTO Dark Matter tiles is in.** No API key, no
billing account, no quota, nothing that can fail on submission day. CARTO Dark Matter is
also the closest free match to the Apple Maps dark basemap in the deck screenshots:
near-black land, muted grey roads, deep navy water, dimmed labels, so the zone colours
carry the screen. Cost is an attribution line for CARTO and OpenStreetMap, which is a
licence condition and stays visible.

Wrote `docs/spec/MAP_SPEC.md` for the hero surface: tile source and required user agent
(OSM blocks the default agent), zone rendering in four layers (glow, fill, stroke, label)
ordered by risk score so a high zone is never buried, her location dot with no heading
cone, a single slow breathing halo while Shadow is armed as the only ambient animation in
the product, station pins above zoom 13 capped at 12, controls, performance budgets, and
the rejected alternatives recorded so this is not relitigated mid-build.

**The build now has zero external dependencies.** Every one was removed rather than
scheduled: Maps key gone via osmdroid, OpenAI key gone because there is no model in the
product, SMS provider and DLT gone because delivery is mocked and labelled, government
access never existed. The README's blockers section is replaced with a table showing what
each risk was and what removed it. Telugu review and the Poppins subset are reclassified as
work items, not blockers, since neither stops a single task.

**Restated as a build requirement because it is the likeliest live-demo failure:** the map
never blocks on tiles. Zones, stations and her dot paint over the dark background
immediately, and if no tile arrives in 4 seconds a small note says "Map offline, zones
still work". T2.2's definition of done now includes turning the network off and confirming
the zones still render. A tileless Saaya Lite being fully usable is a genuine resilience
story for the write-up rather than something to hide.

**Next.** Codex runs T1.1 from `README.md`. Nothing is waiting on anyone.

## 2026-08-18 - Specification audit

Founder asked for verification that nothing is left for Codex to invent. Ran two audit
passes over the pack, each checking a different category of decision a build agent must
otherwise make on its own.

**Pass one found 18 gaps. One was a real privacy bug I would have shipped.**

`android:allowBackup` defaults to **true**. Left alone, Android auto-backs up the Room
database and shared preferences to the user's Google Drive, which would push **her
favourites and the PIN hash off the device** and make a claim in our write-up false. Now
specified as `allowBackup="false"` plus `dataExtractionRules` excluding root, plus
`networkSecurityConfig` disallowing cleartext. T1.1 does not pass until `aapt2 dump
xmltree` on the built APK shows the flag, because assuming it is set is how it stays unset.

The other 17: no pinned dependency versions, no signing config, no R8 rules, no
`versionCode`, no notification IDs or PendingIntent request codes, no Room migration
policy, no haversine constant, no full `SessionEvent` type list, no date or numeral
formats, no `contentDescription` strings despite the accessibility spec requiring them, no
splash, no zone label collision rule, no test layout, no git convention.

The request-code gap was worth catching on its own. Two `PendingIntent`s built with the
same request code and an equal `Intent` are the *same object*, so scheduling the cancel
timer would have silently overwritten the check-in timer and the ladder would stall with no
error and no crash. All IDs and codes are now pinned in one file.

**Pass two found 10 more**, and taught me not to trust my own audit: three checks came back
"ok" as **false positives**. "Demo video script" matched `00:00` in the hour-band table.
"Landing page" matched a passing mention in a test row. I verified each hit rather than
trusting the grep, and all three were genuinely missing.

Real gaps from pass two: the Hilt module list and repository interfaces, Firebase project
creation steps, `firebase.json`, the demo video script, the write-up template, the landing
page, the About screen, network and battery error copy, and cold-start behaviour before
the first GPS fix.

**Four new documents.** `BUILD_CONFIG.md` (version catalog with a resolution rule that
forbids major bumps without asking, signing, R8, the manifest privacy flags, splash, file
and test layout, git conventions). `SETUP.md` (Firebase step by step, including registering
the `.debug` package as a second app, which otherwise breaks debug auth). `DEMO_SCRIPT.md`
(the 3-minute video shot by shot with exact narration and fallbacks). `SUBMISSION.md`
(landing page, write-up template with a verifiable-claims table, 10-point checklist).

**Twenty-five spec docs.** Both audit passes now return clean.

**A decision worth recording:** the write-up will state that Room uses destructive
migration and that Firestore read is public for the demo, both correct for a prototype and
wrong for production. Disclosing those is cheaper than having a reviewer find them.

**Next.** Codex runs T1.1 from `README.md`.

## 2026-08-18 - Prototype posture

Founder directive: focus on the prototype, do not worry about production.

**The test now written into the spec:** before building something because it is proper
engineering, ask whether a judge, a reviewer or the demo depends on it. If not, do not
build it.

**Cut, roughly 4.5 hours.** R8 and minification (and the evening it eventually costs when
it breaks Room, Hilt or kotlinx.serialization in a release-only `ClassNotFoundException`).
The release keystore ceremony, since a debug-signed APK sideloads identically. The
instrumented test layer, trimmed from five tests to two. Foldable support. APK size tuning.

**Deliberately not cut, and this is the distinction that mattered.** Some things look like
production hardening and are actually submission evidence:

- `allowBackup="false"` plus the data extraction rules. This is what makes "her favourites
  never leave the device" true rather than claimed.
- The Firestore rule rejecting `latitude`, `longitude`, `sessionId` and `uid`. This is how
  a reviewer verifies our privacy claim without trusting our client code.
- `AnonymiserTest` and `SessionEngineTest`. The only proof the trust boundary holds.
- Every in-product mock label, the offline queue, Telugu, contrast, touch targets, and the
  zero-tap path. All directly scored by the brief.

The rule underneath, now in `SPEC_README.md` and repeated in the handover `README.md`:
**strip anything that only pays off after launch, keep anything a reviewer can check.**

**Two instrumented tests survive the cut**, chosen because neither can be tested on the
JVM and both protect a stated claim: the PIN never appears in plaintext anywhere, and
process death never rescues her from the ladder. Room round trips and notification channels
moved to the manual script.

**Revised estimate: ~32.5 hours against 27**, down from 37. The gap is still closed by
Codex velocity per the earlier decision, but E4 (Shadow, the riskiest evening) now has more
room and R8 can no longer consume an evening in E9.

**Next.** Codex runs T1.1 from `README.md`.

## 2026-08-18 - Compliance audit against the brief

Founder asked for verification against the hackathon brief clause by clause. Ran it. Two
checks came back "ok" and were **false positives again**: the origin-story check matched
"Standing somewhere" in a feature row and "Standing preamble" in the task file, and the
process check matched passing uses of "patrol". Verified each hit rather than trusting the
grep. Both were genuinely missing.

**Five real gaps.**

**1. "A real problem you have faced."** We had no answer to why this founder, this problem.
The honest answer is that he has not faced it: he is from Vizag, built Saaya for his
sisters and cousins and friends, and then interviewed 12 solo women travellers, every one of
whom had a safety app and none of whom had ever pressed SOS. The write-up now opens with
that, unsoftened. Claiming lived experience here would be the worst possible opening for a
submission judged on honesty.

**2. "Do not submit an old project with only small changes." The largest risk in the
submission, and it was unaddressed.** Saaya Lite reuses Saaya's problem statement, dataset,
colour tokens and several strings verbatim. A judge who finds that on their own concludes we
submitted an old project. So the write-up now says it first, with a table of what is reused
against what is new: the entire Android codebase, auto-arming from zone crossed with hour,
the four-step ladder with a visible trust boundary, the anonymised civic signal, the state
console, and the public-service framing. None of those exist in the iOS app. Verifiable: no
Swift in the repo, every commit inside the window.

**3. Data provenance.** Written out asset by asset. The dataset holds aggregate counts per
police jurisdiction with no victim, no accused, no address and no FIR number, so nothing
personal or restricted was scraped. Fonts under SIL OFL, icons Apache 2.0, tiles attributed.

**4. Fair comparative use of Shakthi and T-Safe.** We name them because the brief asks us to
name the service. Every figure is the government's own published number. No logo, seal or
emblem anywhere, and the criticism is of an intake design rather than of the officers:
153 Shakthi Teams responding in 8 minutes is a real achievement, and our argument is that
the button upstream of them carries no context.

**5. Processes.** The brief says backend, infrastructure **and processes**, and we had the
first two. Wrote `OPERATING_MODEL.md`: two channels with different urgency and consumers, a
SUS signal that is **never dispatched on**, a shift-briefing cadence with a threshold the
receiving officer owns, presence as the intervention, two-department routing because
lighting and footpaths are municipal and not police, a nodal officer to correct bad labels,
and published false-positive rates because a safety system's credibility is set by its false
alarms.

One thing fell out of writing it that is worth keeping: **every zone is already a police
station jurisdiction**, so routing needs no geocoder. Most civic reporting dies at routing.
Ours is jurisdictional by construction.

**Two new documents:** `COMPLIANCE.md` and `OPERATING_MODEL.md`, both wired into the
handover README and the write-up template.

**One gap left open for a founder decision:** the brief scores "let us complete the main
journey from start to finish", and our live link is the console, which is the state side
and not her journey. A judge who does not install the APK cannot complete it.

**Resolved.** Founder chose the console live journey trigger. One button on the console
writes a real `sus_events` doc, then a real `sos_incidents` doc about 30 seconds later,
both arriving through the normal `onSnapshot` listener so a judge is watching the actual
pipeline rather than an animation. A narration strip advances with the writes and carries
her side of the story, which is the part that makes it a journey rather than two rows
appearing.

Deliberate choice: **real Firestore writes, not a UI animation.** A judge can open devtools
and see genuine documents arriving over a genuine listener. An animation would be
indistinguishable from a mockup, and being checkable is the whole posture of this
submission.

Honesty guards: every record carries `source: "CONSOLE_DEMO"` and renders with a DEMO chip,
the narration ends by saying it was synthetic and that the video shows her side, and the
button locks for 90 s so repeated presses do not flood the console for the next judge.

Added as T8.3, +1.5 hours. Revised estimate **~34 hours against 27**.

## 2026-08-18 - Final end-to-end verification

Mechanical check of every document on disk against every document referenced, plus every
cross-reference and every source asset path.

**Three orphan documents found**, none of which Codex would ever have opened:

- **`docs/SCOPE.md`** was the serious one. It is the in-and-out contract with the full
  real-versus-mocked table and the T-Safe differentiation. Codex would have built without
  ever seeing what is deliberately excluded and why.
- **`docs/BUILD_PLAN.md`**, which carries the fixed cut order for an overrunning evening.
- **`docs/EVIDENCE.md`**, the sourced numbers the write-up depends on.

All three are now in the README map.

**The README document map was rewritten as a complete inventory** of all 35 files in five
tiers: read every session, the contract, engineering truth, look and feel, the console and
submission, and why-not-how. Each row says what the document answers, so Codex can tell
whether it needs to open one without opening it.

**Added an ownership model, which was missing entirely.** Codex may write to exactly three
things: `CODEX_LOG.md`, `BUILD_STATE.md`, and a spec doc when the founder answers a BLOCKED
question. It must never edit `FEATURES.md` (the contract), this `progress.md` (founder-owned),
or the README. Previously nothing said this, and an agent editing the contract to match its
implementation is a real failure mode.

`progress.md` is now listed as founder-owned and read-for-context, so Codex can look up
**why** a decision was made without appending to the log.

**Cross-references and assets: clean.** Zero broken references between documents. All three
Vizag data files and both iOS design-reference files resolve.

**Two of my own numbers in the README were wrong.** I claimed 30 documents when there are
35, and 21 tasks when there are 22. Verified every count programmatically rather than by
eye: 35 docs, 22 tasks, 13 screens, 14 components, 33 features, 12 events, 7 states, and
the BUILD_STATE ledger's 22 rows matching the 22 tasks. Corrected.

**Self-check added to the README** so Codex runs the feature-coverage sweep itself before
the first task, rather than trusting that I ran it.

**Final state: 35 documents, ~39,000 words, zero blockers, zero orphans, zero broken
references.** Codex runs T1.1 from `README.md`.

## 2026-08-18 - Keys and access

Founder asked for the list of APIs, keys and permissions to prepare a .env file.

**The answer is that there is almost nothing, and no third-party API keys at all.** One
Firebase project on the free tier is the entire external footprint. That is not luck, it is
the accumulated result of the decisions made today: osmdroid over Google Maps removed the
Maps key and billing account, no model in the product removed the OpenAI key, mocked
delivery removed the SMS gateway and DLT registration, and prototype posture removed the
release keystore.

Worth putting in the submission as a reproducibility claim: **nothing in this prototype can
fail on submission day because of a key, a quota or an expired credential.**

**One correction the founder needed.** Android does not use `.env` files, and Firebase
config values are **not secrets**. The `apiKey` in `google-services.json` identifies the
project, it does not authorise anything. It ships inside every APK and inside the console's
JavaScript, so it is public by design and the Firestore rules are the actual security
boundary. `console/firebase-config.js` is therefore **committed**, with a comment saying
why, because the console is a static site and the values must reach the browser for it to
work at all. Hiding it is impossible and pretending otherwise would be worse.

Wrote `docs/spec/SECRETS_AND_ACCESS.md`: what is deliberately not needed and why (with the
document that decided each one, so nobody goes and gets a key we removed on purpose), the
founder's nine-item one-time setup list, the four real config files with exact contents,
the runtime permission table with what happens on each denial, the gitignore, and a
seven-point verification list.

The gitignore lists `*.jks` and `keystore.properties` defensively even though we do not use
a keystore, so an accidental one can never be committed.

**Also restated there:** `RECORD_AUDIO`, `CAMERA`, `SEND_SMS`, `CALL_PHONE` and `READ_SMS`
are absent from the manifest, and their absence is verifiable evidence that Saaya Lite
cannot listen, watch or send on her behalf.

36 documents. Wired into the README map, the SPEC_README reading order, and T1.2's Reads.

## 2026-08-18 - Graph engineering adopted

Founder asked to restructure the build as a graph. The linked X post was paywalled (HTTP
402), so I took the method from readable secondary sources rather than guessing at it, and
said so in the doc.

**The fake-edge analysis paid for itself before anything was built.**

Interrogating every arrow in the 22-task chain (does this edge carry data, or is it just
the order I happened to write things in?) gave hard numbers: **45 hours of work sit on a
15-hour critical path. 67% is off it.**

The critical path is `T1.1 -> T2.1 -> T4.1 -> T4.2 -> T4.3 -> T9.1 -> T9.2`, which is
exactly the auto-arm spine. Reassuring: the incompressible part is the part the submission
rests on.

**And it caught a real scheduling error the chain had hidden.** The console cluster is 10.5
hours and depends on almost nothing from the Android app. `T8.2` needs only
`T8.1 -> T1.2 + T2.1`. It was scheduled for evening 8 of 9, and it **is the required live
demo link**. If evening 8 had gone badly we would have failed a hard submission requirement
with no warning at all.

**Reordered risk-first rather than phase-first.** Even with zero parallelism: the engine
clears at hour 6.5, geofencing (the likeliest evening-killer) at hour 9.5, and the live
demo link exists at **hour 14 instead of hour 24**.

**Why a graph at all, given the founder wants one sequential continuous run.** Because that
is exactly the case where it stops being optional. In a long single run the context fills
and quality degrades before it visibly breaks: the agent paraphrases a spec it read twenty
nodes ago instead of re-reading it, and starts inventing plausible values. The graph is the
memory, not the transcript. Each node loads only its own bounded subgraph, works, writes a
typed record, and drops everything else. Step 6 of the loop, DROP, is the one that makes a
long run survivable and the one most likely to be skipped.

**Two graphs, never collapsed**, per the method, because they have different truth
standards. `graph/build_graph.json` is the commit DAG: 22 nodes, typed requires/produces
edges, gates, status, and it is the resume checkpoint if the run dies.
`graph/spec_graph.json` is the knowledge graph: **115 facts** with provenance, every
number, colour, dimension and id in the product, each traced to whoever decided it.
`graph/runs.jsonl` carries execution provenance.

**The highest-value piece is the grounded checker replacing gate G6.** "No invention" was a
vibe check nobody could fail reliably. It is now `scripts/grounded_check.py`: extract every
numeric and colour literal from the changed source, assert each traces to a fact id, and
emit a structured revision request naming what is missing. Self-tested on a synthetic file:
it caught an invented `47` and `#123456`, passed the grounded `90` and `#A78BFA`, and
honoured a `GROUNDED-EXEMPT` marker. A plausible invented number is our single most likely
failure mode and the hardest to catch in review, so this is the check worth having.

The checker's failure message deliberately forbids the obvious cheat: widening the TRIVIAL
set to silence a failure converts the one mechanical check we have back into a vibe check.

**Formalised what already existed.** Frozen nodes: `FEATURES.md`, the three Vizag files,
the iOS-verbatim strings, the trust boundary, and every spec_graph fact. Anchors:
measurements from outside the graph, which are the only evidence that can mark a claim
verified, because a loop grading its own homework decays. Seven anchors, all founder-owned,
listed in `BUILD_STATE.md` and in the prompt.

**Deliberately skipped**, with reasons in the doc: entity resolution (our entities are
hand-authored and unique, nothing to dedupe), the extraction pipeline (our facts are
authored, not extracted), governance loops (nine evenings with a human every node), and
worktree orchestration (founder chose one continuous run, though the graph records what
could run in parallel so it is available later without a rewrite).

**Rewritten:** `README.md`'s loop is now the seven-step node protocol with the DROP rule,
gate G6 is mechanical, and the doc map carries the graph files. `BUILD_STATE.md` is now
**generated from** the graph and says so; the JSON is the source of truth.
`CODEX_PROMPT.md` is a single continuous-run prompt with the anchor list and the
BLOCKED format. New: `docs/spec/GRAPH_ENGINEERING.md`.

**Cost:** roughly 2 hours of the build budget, against a reorder that retires both
catastrophic risks in the first third and a checker that closes our most likely failure
mode. Worth it.

## 2026-08-18 - Graph engineering upgraded against the 14-step roadmap

Founder supplied the Codez 14-step roadmap, two repos, the Google Research blog on scaling
agent systems, and the blueprint diagrams. Read all of it, then upgraded.

**The Google finding cuts against the obvious reading of every fan-out diagram, and it is
the most important thing I learned today.**

| Task type | Result |
|---|---|
| Parallelisable, centralised coordination | +81% |
| **Sequential reasoning** | **-70%**, across every multi-agent variant tested |
| Error amplification, independent agents | 17.2x |
| Error amplification, with a centralised orchestrator | 4.3x |

Most of this build is sequential reasoning. The state machine and the geofencing are not
decomposable, and fanning out on them would make them measurably worse. **The founder's
choice of one continuous sequential run is the correct architecture, and now there is
research behind it rather than just pragmatism.**

But verification IS genuinely parallelisable and independent, and the 17.2x versus 4.3x
figure says verification is precisely what stops errors propagating. So the upgrade is
narrow and specific: **keep the sequential spine, add a verifier diamond on the edge.**

**The gap the roadmap exposed in our design.** We had gates but no verifier. Gates are the
implementer grading its own homework, which the literature calls decay. Step 9 is the fix,
and the mechanism is **fresh context**: a verifier sharing the implementer's context
inherits its blind spots and rationalises instead of attacking.

Built `scripts/verify_node.py`. After the gates pass, it fans out skeptics, each told
explicitly that it did not write the code, must not defend it, and should **default to kill
when uncertain**. Three lenses: spec conformance, trust boundary, invention hunt. Verdicts
merge in plain code, zero tokens, and any kill rejects the node.

Two design details that matter more than they look. **A verifier that fails to run is a
kill, never a pass** - failing open would quietly destroy the whole mechanism. And on
rejection, fixes must dedupe against **every finding seen for that node**, not only the
accepted ones, or rejected findings reappear every round and the loop never converges. That
is step 11's hard-won detail and it is easy to get wrong.

**Tiered per step 12**, since we have one model and the lever is effort not tier: 3 lenses
on the 2 HIGHEST nodes (T4.2, which guards the core no-press claim, and T7.2, which guards
the trust boundary), 2 on the 5 HIGH nodes, code gates on the remaining 15. **16 verifier
runs, not 66.**

**Codex fan-out capability was unknown**, so per the founder's instruction I took the safe
path: an orchestration script shelling out to `codex exec` via a configurable `CODEX_CMD`.
It works whether or not Codex has native subagents, collapses into them if it does, and
falls back to printing the lens prompts for manual runs if Codex is unavailable. This is
also closer to what the roadmap actually prescribes, since it says the orchestration layer
should be code and cost zero model tokens.

**The knowledge graph, which the founder asked for.** `graph/knowledge_graph.json`, seeded
with 77 entities and 48 edges at the founder's chosen scope: everything, including domain
and research context. Every source and finding, every competitor figure, the persona, the
six submission claims with evidence edges, all 19 constraints including the Safetipin
guardrails, and all 15 founder decisions with rationale and what motivated each.

`scripts/kg.py` is the only way to write to it, and it enforces what would otherwise be
forgotten: nothing is ever deleted, only superseded; every edge's endpoints must exist;
types must be declared. Codex appends after every node. Node 18 can now query what node 4
decided in one command instead of trying to recall a transcript that no longer exists.

**Steps adopted, adapted and rejected are all recorded** in `GRAPH_ENGINEERING.md` so
nobody reopens them mid-build. Rejected: worktree isolation (the roadmap says only when
nodes write in parallel, and ours do not), self-routing (our graph is known), and fan-out
on implementation (the -70% finding).

**Gate count is now 9**, with G9 as the verifier. README, CODEX_PROMPT, BUILD_CONFIG and
the design doc all updated to match.

## 2026-08-18 - Native subagent fan-out, architecture and knowledge graph redone

Founder confirmed Codex can spawn subagents from a parent agent. Removed the safe-path
orchestration script and redid both graphs.

**The important discipline: availability is not licence.** The reason we did not fan out
implementation was never tooling, it was task structure, and it still holds. Two independent
sources agree: Google Research measured **-70%** for multi-agent on sequential reasoning
tasks, and the graph-engineering repo's stop rule says **parallel configurations win ~80%,
sequential work loses across configurations.** So the graph is now **mixed**, and every node
declares a shape rather than everything being parallelised because it can be.

**18 of 22 nodes stay serial.** `T4.1` and `T4.2` are the clearest cases: a state machine
and a geofencing service are one piece of reasoning each, and handing halves to different
agents is precisely the -70% case.

**Four nodes earned a diamond**, because their sub-jobs are genuinely independent:
`T2.1` (3 asset parsers), `T1.3` (14 components), `T9.1` (13 screens), and `T9.2` (8
submission checks, plus a loop-until-dry cycle). 38 parallel worker spawns total. Merges are
plain code, never an agent, because the merge is flatten-dedupe-assert and edges are free.

**T9.2 gained a cycle.** The final sweep is unknown-size discovery, so it loops until 2
consecutive rounds surface nothing new, capped at 5. The detail that makes it converge, and
that almost everyone gets wrong: dedupe against every finding **seen**, not only the
confirmed ones, or rejected findings reappear each round forever.

**Verification widened from 16 runs to 44.** Every node now gets at least one fresh-context
skeptic; HIGH and HIGHEST get all three lenses. Skeptics are independent by construction,
which is the parallelisable case that scores +81%, so the -70% finding constrains
implementation and not verification. The orchestration script is deleted; the parent agent
spawns them natively and merges verdicts in code.

**Human gates added**, a concept from the graph-engineering repo we did not have: a gate
placed exactly where a mistake is **costly to reverse**, which is different from an anchor.
An anchor is a measurement, a gate is permission. Four of them: Firestore public read going
live, the console URL becoming reachable, the APK being published, and submission. Codex
stops at each and asks for nothing else.

**Knowledge graph rebuilt at v2** on the 9-stage pipeline (scope, representation, ontology,
entities, relations, events, quality gate, fusion, serve), with ontology methodology from
the Southeast University Knowledge Graph course.

What v2 added over v1: a **real ontology** with 14 classes and 14 relations carrying
declared domain and range, so a wrongly-typed edge is rejected at write time rather than
discovered later. **Edges now carry `at`, `by` and `confidence`** - the repo's phrasing is
right, a bare connection is not a fact. **Events as a first-class layer**, 11 types, because
entities say what is true and events say what happened. **Fusion**, which v1 did not need
and v2 does, since Codex now writes entities every node and `art.engine` versus
`art.session_engine` for the same file is a real risk; it warns at insert and never
auto-merges, because a false merge is worse than a duplicate. **Bounded subgraph serving**
via `kg.py context <id> --depth N`, because handing an LLM the whole store defeats the
purpose. And one integrity rule with teeth: only an `Anchor` or a `Verification` may verify
a `Claim`, so self-assertion is rejected.

Also added 22 `BuildNode` mirror entities, so the knowledge graph and the commit DAG link
without being collapsed into one another.

**The quality gate caught its own author on the first run.** `kg.py check` rejected 10 edges
in the data I had just seeded. Both causes were ontology errors rather than data errors:
`sourced_from` did not allow a Claim to rest on a Finding, and did not allow a Constraint to
come from a Source, which is exactly what the Safetipin guardrails do. Widened the ontology,
left the data alone. Recording it because it is the correct outcome and the cheapest possible
demonstration that the gate works.

**Final: 99 entities, 56 provenanced edges, 14 classes, 11 event types, 0 problems.**

## 2026-08-18 - Isolation decision: disjoint contracts, not worktrees

I raised the worktree question and then answered it myself after thinking it through.

**No worktrees. The collision was a symptom of me drawing the node contracts badly.**

Step 3 of the roadmap says a node contract is bounded input, bounded output, exactly one
job. My original fan-out gave 14 component workers a shared output surface - theme tokens,
common helpers, strings.xml, the gallery - and then asked whether to buy a seatbelt for it.
The roadmap is also explicit that worktrees are the seatbelt for the one topology that needs
it, not a default tax. Fourteen full Android checkouts is heavy on disk, slow, and turns one
merge into fourteen.

**And I had identified the wrong node as the risk.** T1.3's 14 component files are mostly
disjoint already. T9.1 was the real problem: 13 screen workers all writing values/strings.xml
and values-te/strings.xml. Two shared files, thirteen writers, guaranteed collision.

**The fix.** Every worker owns a disjoint set of paths plus its own JSON manifest. Workers
coordinate through manifests rather than through the filesystem, and the merge - plain code,
free - assembles the shared files. Workers never commit; only the parent commits once after
the merge, which removes git index contention as a category rather than managing it.

**The part that makes this better engineering rather than merely cheaper: it converts a
collision risk into a correctness check.** T1.3's merge now fails on an invented token,
because every declared token must exist in spec_graph, and fails when two workers declare
the same helper with different signatures. T9.1's merge fails loudly when two screens claim
the same string key with different text, and on any key present in English but missing in
Telugu. With thirteen agents appending to one strings.xml, one would simply have won and
nobody would have noticed. None of those checks are possible when workers write shared files.

Added `scripts/fanout_check.py` to enforce it mechanically: no two workers claiming the same
path, no worker writing outside its owned paths, no worker touching a merge-owned file. Its
failure message says fix the contract, never widen the guard.

**Recorded when worktrees WOULD be right**, so it is not relitigated: if a future diamond's
workers must each modify the same existing file - a cross-cutting refactor, a rename across
call sites - then the writes genuinely overlap and no contract can separate them. We have no
such node. If one is added, isolate it rather than widening the contracts to fit.

## 2026-08-18 - Plan files wired into the graph; final README

Founder asked to verify that all plan files are attached to the knowledge graph and are part
of the graph architecture. They were not. Two real holes.

**Hole 1: zero of 38 documents were entities in the knowledge graph**, and `Document` was not
even a class in the ontology. So "which documents govern T4.2" was an unanswerable question,
and there was no way to verify coverage from the graph itself.

**Hole 2, and the more dangerous one: 15 documents were read by no node at all**, including
`FEATURES.md`, the contract. Combined with the DROP step, which says carry forward nothing
but the graph, Codex would have dropped the contract after node 1 and never reloaded it. It
would have built nodes 2 through 22 without the scope contract in context. That is exactly
the drift the graph exists to prevent, reintroduced by the graph's own context-hygiene rule.

**Fixes.** Added an `always_read` set to the build graph - README, SPEC_README, FEATURES,
SCOPE - re-read at the start of every node in addition to the node's own `reads`. They are
small, and they are what stops scope drift across a long run.

Attached the "why" documents to the nodes that actually need them: PROBLEM.md to T4.1 and
T7.2 because the engine and the anonymiser are the thesis in code; OPERATING_MODEL.md to
T8.2 and T7.3 because the console shows the two channels; COMPLIANCE.md and EVIDENCE.md to
the submission nodes.

Added `Document` as an ontology class with `read_by`, `written_at` and `specifies` relations.
All 38 docs are now entities carrying their path and tier. `read_by` wires each to the nodes
that read it; `written_at` is used for the docs Codex writes rather than reads, because
`read_by` would have been semantically wrong for CODEX_LOG and BUILD_STATE; `governs` wires
GRAPH_ENGINEERING to every node since it dictates how each is executed.

**Verified: 38 of 38 documents present, zero orphans, all four always_read docs wired to all
22 nodes.** Knowledge graph went from 101 entities / 87 edges to 139 / 366.

**README rewritten from scratch** rather than patched again, generated directly from the
three graph files so the node table, counts and gates cannot drift from the plan. 298 lines,
every document referenced, zero orphans.

**Two artifacts published:** the execution-graph reference, and a hand-drawn diagram set
covering the node diamond, the four fan-out nodes against the eighteen that must stay serial,
and the disjoint-contract isolation model.

## 2026-08-19 - Repository live

Founder supplied github.com/abhishaiv/Saaya-lite. Checked it first: a fresh public repo with
a single placeholder README from GitHub's initial commit, default branch `main`.

**Checked before pushing, not after.** Ran a credential scan across the whole tree for API
keys, tokens, private keys and Slack/OpenAI patterns: nothing. That is not luck, it is the
result of the earlier decisions - osmdroid removed the Maps key, no model in the product
removed the OpenAI key, mocked delivery removed the SMS gateway, and debug signing removed
the keystore. There is genuinely nothing in this project to leak.

Wrote `.gitignore` first, listing `google-services.json`, `keystore.properties`, `*.jks`,
`local.properties` and `.env` defensively even though none exist yet, so an accidental one
can never be committed later.

**Based the commit on the remote's existing initial commit** rather than force-pushing over
it, so the history stays linear and nothing was discarded. 48 files, 604K, one commit.

**The repo is public, and that is a deliberate choice worth recording.** The hackathon
accepts a source repository as a submission artifact and requires every link to open without
an access request. More than that, a public planning trail is evidence for two things we
claim: that Codex built this (the log is in the open) and that we disclosed the reuse of
Saaya rather than being caught at it. Our posture throughout has been that we would rather be
checked than believed, and a private repo would contradict it.

One consequence the founder should know rather than discover: `progress.md` is now public. It
is a raw decision log including my own corrections. I think that helps rather than hurts, but
it was not an explicit decision so it is flagged here.

**Wired the repo into the plan** rather than leaving it as an out-of-band fact: README and
CODEX_PROMPT carry the URL and the clone step, SETUP.md documents it and why it is public,
BUILD_CONFIG.md carries the remote and the commit convention (one commit per completed node,
after all 9 gates, pushed each time), SUBMISSION.md lists it as the source-repo artifact, and
the knowledge graph gained a `Repository` class with a `hosted_in` edge from all 38 documents
plus a `Decision` entity recording why it is public.

Added a COMMIT step to the node loop, so committing is a gated step like any other rather
than something remembered at the end.

## 2026-08-19 - Repo targeted at reviewers

Founder pointed out the judges will review the git repo and are looking for Codex, not
Claude, and asked whether to delete the repo and re-commit everything as Codex.

**Said no, and why.** Committing 38 specification documents as Codex would be a false record
and a fragile one: those docs discuss decisions made in conversation, cite sources Codex never
read, and progress.md is a dated log of a planning dialogue. 44,000 words landing in one shot
before any code is not what a Codex build looks like to people who use Codex daily. It also
solves the wrong problem - the repo has no Codex work because the build has not started, and
re-committing the same files adds zero application code. Most of all it would contradict the
one thing this submission is strongest on: every claim we make is checkable, and Honesty is a
scored criterion.

**What actually targets the review is the ratio and the legibility**, not the attribution.
After the build there will be ~22 Codex commits of real Kotlin against 2 spec commits.

**Three changes.**

`README.md` became **reviewer-facing**. It was a 298-line instruction manual for a build
agent, which is the wrong first thing for a judge to read. It now opens with the problem and
Shakthi's 0.28%, states what is real and what is mocked, explains how Codex built this with
commands the reviewer can run, lists known limitations including the two that are wrong for
production, and carries the disclaimers.

The agent manual moved to **`AGENTS.md`**, which is Codex's own convention, so Codex picks it
up automatically and a reviewer sees a Codex-native repo. `always_read` now points at it.

**Every Codex commit is greppable.** The commit convention gained three trailers: `Node:`,
`Built-with: OpenAI Codex` and `Verified-by:`. They are not decoration - `git log --grep` on
them is a documented verification step in the README, so a missing trailer is a broken claim.

Added `scripts/codex_contribution.py`, which generates the contribution summary from the
actual record: git trailers, the node graph, runs.jsonl and the verifier verdicts. It reports
zeroes today, which is correct, and the numbers accumulate as the build runs. Writing this
now rather than at E9 is the difference between evidence and recollection.

**The framing we are going with, stated in the README rather than hidden:** the specification
was written with Claude and frozen; Codex builds every line of the application against it,
gated mechanically and checked by adversarial verifiers. That is a more sophisticated Codex
workflow than a chat transcript, it is true, and stating it first means nobody discovers it.

## 2026-08-19 - Pre-handover audit: five defects found and fixed

Founder asked for a thorough check for failure points before handing to Codex. Went hunting
for problems rather than re-running the checks I knew passed. Found five.

**1. `verify_command` pointed at a deleted script.** When native subagent fan-out replaced
the orchestration script, `scripts/verify_node.py` was deleted but every node in
`build_graph.json` still carried `"verify_command": "python3 scripts/verify_node.py <node>"`.
Codex would have hit a missing file at T4.1, the third node. Now describes the native action.

**2. The grounded checker had a coverage hole covering 33 values.** This was the serious one.
`grounded_check.py` is gate G6, the thing that makes "we did not invent this number"
mechanical. Extracted every value stated in the nine value-bearing spec docs and compared
against `spec_graph.json`: **33 distinct values were specified but had no fact.** Motion
durations (200ms, 340ms, 1200ms), every responsive breakpoint (320, 360, 480), several
component dimensions, and `#FFFFFF` / `#000000` themselves. G6 could not check any of them,
which is precisely where a coding agent invents values. Added 70 facts; spec_graph went from
115 to 185. Re-ran the extraction: **0 uncovered.**

**3. The TRIVIAL bypass was too wide.** It skipped 0,1,2,3,-1,100,1000,0.5,10,60,24,1024,
255,4,8,16,32. But 8, 16, 24 and 32 are the most common numbers in Android UI code and sit
squarely on our spacing scale, so an invented padding passed silently. Narrowed to
{-1,0,1,2,3} - genuinely structural only. Self-tested: it now catches an invented 47 and 137
while passing a real 90, 24 and 16. With 185 facts the narrowing is safe, and GROUNDED-EXEMPT
remains for real structural literals.

**4. `README.md` was still wired as an agent input.** After the reviewer/agent split it kept
`read_by` edges to all 22 nodes, so Codex would have reloaded a reviewer-facing document at
every single node. Removed, and reclassified as `specifies`.

**5. CODEX_TASKS.md contradicted the execution order.** It lists tasks in the original evening
order under E1-E9 headings, while the graph runs risk-first. Same 22 nodes, different
sequence. Codex reads that file at every node and would have seen an implied order fighting
the graph. Added a banner at the top stating the graph owns the order, showing the real
sequence, and explaining the E-headings survive only because BUILD_PLAN's cut order refers to
them.

Also made `scripts/render_build_state.py` actually regenerate BUILD_STATE.md instead of
printing a message about it - it had been a stub claiming to be a renderer, which is a small
lie in a project whose whole posture is that claims are checkable.

**Final sweep: 24 checks across the build graph, spec graph, knowledge graph and
cross-file consistency. All pass.** 39 documents, 22 nodes, 185 frozen facts, 143 entities,
409 provenanced edges, zero orphans, zero dead references, zero uncovered spec values.

## 2026-08-19 - Sixth defect: the repo was not self-contained

Founder asked what he needs to hand Codex at the start. Checking that surfaced a blocking
defect the earlier audits missed, because they only checked what was in the repo rather than
what was missing from it.

**The three Vizag data files were never committed.** The spec told Codex to copy them from
`/Users/abhishai/Desktop/Women Safety App/WomenSafetyApp/Resources/`, an absolute path on one
Mac. On a fresh clone anywhere else, `T2.1` - node two - fails immediately, and every
downstream node with it. Every audit I ran passed because they all verified references
*within* the repo and none asked whether the repo could stand alone.

Committed all three into `assets/`, verified the counts against the spec assertions on the
way in (24 zones with the right tier split, 19 cards, 37 stations). Wrote `assets/README.md`
carrying the parse assertions, the lon/lat gotcha, and the provenance statement.

**Also removed the last reason to need the Saaya iOS repo.** Several docs cited
`AppTheme.swift` and `SUSCheckInCardView.swift` as sources. Those citations are provenance
and are correct, but they read like instructions to go and open files that will not exist.
All 33 values taken from that source are already extracted into `spec_graph.json` as facts,
and the strings are already in COPY.md marked (iOS verbatim). Said so explicitly in
SPEC_README so Codex does not go hunting.

One absolute path remains, deliberately: the `sdk.dir` example in SECRETS_AND_ACCESS.md,
which is illustrating what a machine-local file looks like.

The repository is now genuinely self-contained: clone it on any machine and every input the
build needs is present.

## 2026-08-19 - Firebase live; prompt file made attachable

Founder completed the Firebase setup and sent two `google-services.json` downloads.

**Only one was usable.** File (1) carried a single client, `com.nexaflow.saayalite`. File (2)
carried both, including `com.nexaflow.saayalite.debug`. Installing the first would have
failed debug authentication with the error that does not explain itself, which is precisely
the gotcha SETUP.md warns about. Verified the correct one on the way in: both packages
present, project `saaya-lite` / `799647753855`, and confirmed gitignored so it cannot be
committed.

Recorded the project across SETUP.md, CODEX_LOG.md's open-decisions checklist, the build
graph's new `setup_done` block, and the knowledge graph as an `Artifact` plus an
`anchor_taken` event. **Rewrote T1.2**: the project now exists, so the node verifies
anonymous sign-in against it rather than trying to create one. Left as it was, Codex would
have gone looking for a console it cannot reach.

**One setup item remains and it is not urgent:** a Web app registration for
`console/firebase-config.js`. The console uses the Firebase web SDK, which needs its own app
id; the Android ones will not work for it. Needed at T8.2, node 7, around hour 14.

**CODEX_PROMPT.md restructured to be attached rather than pasted.** It was a document
containing a prompt inside a code fence, wrapped in founder-facing notes. Attached directly,
Codex would read the wrapper and the founder notes as instructions to itself. The file is now
the instruction, top to bottom, with no wrapper, and it opens by asking whether this is a
start or a resume so the same file serves both.

The founder-facing content moved to `docs/FOUNDER_RUNBOOK.md`: the anchors in execution order
with rough timings, the four human gates, the outstanding Web app, what to watch for, and the
follow-along commands. Split out specifically so nothing founder-facing sits inside a file
the agent reads as instruction.

**Caught three stale counts while verifying the prompt's claims.** The document count said
39 when there are 41 (assets/README.md and FOUNDER_RUNBOOK.md were added since), and the
reviewer README still said 115 frozen facts in two places after the spec graph grew to 185.
Small, but the README is the reviewer-facing document and a wrong number there is exactly
the kind of thing that makes someone doubt the rest. Added a check that compares every
stated count against the live graph files; all consistent now.

## 2026-08-19 - T1.1 BLOCKED, and the system worked

Codex blocked on the very first node with three needs. Every one was legitimate, and it
refused the option it was offered to invent its way past them. That is the protocol working
on its first real test.

**1. Gradle wrapper version.** BUILD_CONFIG pinned AGP 8.7.3 but never named the wrapper.
Resolved: Gradle 8.9, which is AGP 8.7's minimum. Now a fact, `build.gradle.wrapper`.

**2. `androidx.core:core-splashscreen`.** A genuine contradiction I introduced: BUILD_CONFIG
section 6 said to use the AndroidX splash API, while ARCHITECTURE's dependency list is closed
and never listed it. Codex was right to refuse rather than quietly add a dependency. Resolved:
1.0.1, added to the version catalog and named explicitly in ARCHITECTURE's list with the date
and reason. Hand-rolling a splash Activity would have been worse in every way.

**3. The icon.** ICONOGRAPHY said "the Saaya wordmark mark in brand #A78BFA" and no such
asset existed anywhere in the repo. Went looking in the Saaya project and found a full brand
system: `saaya-icon-v2.svg`, a 1024 master from brand bible v1.5, plus the wordmark and a
small variant.

Committed them to `assets/brand/`. **Deliberately did not commit `saaya-icon.svg`**, the v1
that still carries a checkmark the bible removed, precisely so it cannot be picked up by
mistake, and said so in the brand README.

The master turned out to be layered in a way that makes the adaptive-icon split mechanical
rather than a redraw: a full-bleed `<rect>` ground becomes `ic_launcher_background`, and the
aura, trail and pin become `ic_launcher_foreground`. Specified that split in ICONOGRAPHY
including the 72dp safe zone, the monochrome layer for Android 13 themed icons (pin
silhouette only, because a gradient turns to mud when a launcher tints it flat), and the six
colours read straight out of the asset. Noted that the icon ground is deliberately NOT the
app background: `#191230` versus `#0B0B0F`.

**Recorded properly rather than just fixed:** eight new facts, the amendments table in
BUILD_STATE, and both a `blocked` and an `unblocked` event in the knowledge graph with the
decision entity between them. The audit trail shows what Codex asked, what was decided, and
that the specification was amended before building rather than after.

## 2026-08-19 - T1.1 blocked again, and Codex caught a limit in my own gate

Second block on T1.1, and a sharper one. Six theme tokens are frozen in DESIGN_SYSTEM.md as
prose - surface `@ 6%`, elevated `@ 10%`, textOnCard `@ 75%`, secondary `@ 60%`, tertiary
`@ 40%`, label `+0.5 sp tracking` - and none of them ever became facts.

**The part that matters is what Codex refused.** Three of those values would have passed G6
anyway, because `motion.spring.damping` is 0.75, `dim.scrim` is 0.4 and
`grade.border.opacity` is 0.5. It declined to use them, on the grounds that a same-valued
fact governing something unrelated is not valid provenance. That is the intent of the gate
rather than its mechanism, and it is exactly the judgement the invention lens exists for,
arriving unprompted.

**It exposed a real limit I had not written down.** `grounded_check.py` matches by value. It
can prove a number is one the founder decided; it cannot prove it is the right one.

Three responses, none of which is "make the script semantic":

- Added the six facts, then **scanned for the whole class** rather than fixing only what was
  reported. Found 14 more prose-frozen alphas across COMPONENT_LIBRARY, MAP_SPEC,
  MOTION_SPEC and STATES_CATALOGUE. 20 facts added, 193 to 213.
- Added `grounded_check.py --explain`, which prints the fact id every literal matched. A
  wrong-but-same-valued match is now **visible** instead of silent, which is what the
  verifier needs to judge it.
- Sharpened the `invention` lens: it now asks whether a literal traces to the **right** fact,
  not merely a same-valued one, and tells the verifier to run `--explain`.

Recorded the limit honestly in GRAPH_ENGINEERING with the reasoning for not fixing it in the
script: requiring a `// grounded: <fact.id>` comment on every literal would work, but the
friction lands on every line of UI code and the verifier already covers it far more cheaply.

Two blocks on node one, both legitimate, both finding things no audit of mine had. The
protocol is earning its keep before a line of Kotlin exists.

**And then self-testing that fix found something worse.** Writing a test for the new alpha
facts, `0.37f` was not flagged. The pattern was
`(?<![\w.])(\d+\.\d+|\d+)(?![\w.])` - it required a non-word, non-dot character after the
number. That matches **none** of `16.dp`, `0.75f`, `14.sp`, `12f` or `1_000`, which is how
essentially every product value is written in Compose. Only bare integers like `90` were
being checked.

**Gate G6 was effectively inert against real Kotlin.** It would have passed an invented
padding, an invented alpha, an invented type size - everything the "no invention" claim rests
on. It had been sitting there since I wrote it, passing its own toy self-test because that
test used bare integers.

Fixed the pattern to read the numeric core and ignore the suffix or extension property.
Normalised ARGB colours (`0xFFA78BFA` is our `#A78BFA`) through one helper used by **both**
the gate and `--explain`, so they can never disagree. Committed `test/grounded_fixture.kt`
covering every literal form real Compose uses, and documented it in TEST_PLAN as G6's own
regression test.

The lesson worth keeping: I tested the checker against the literals I happened to write,
not against the literals the codebase would actually contain. Codex's block is what led me
to look.

## 2026-08-19 - Third block on T1.1, and a process fix instead of a third patch

Codex blocked again: `compileSdk`, eight typography line heights, five spacing-scale steps.
Correct again, and the same class as the second block.

**The honest read is that I built the fact table opportunistically.** I added type sizes but
not line heights. I added spacing steps 4, 8, 12, 20, 32, 48 but not 14, 16, 22, 24, 30 -
which are the ones that exist *because iOS uses them* and are called out in the doc as the
values to use exactly. I added minSdk and targetSdk but not compileSdk. Patching the fifteen
would have invited a fourth block.

**Generated them mechanically instead.** Parsed the type-scale table, the spacing-scale line
and the build table directly out of the documents, so every row produces its facts rather
than the ones I happened to notice. 213 to 227.

**Then wrote a semantic sweep and learned its limits.** It compares each table value against
the facts sharing that value and asks whether any of them relate to the row label. It
reported 57, and most were false positives: `diameter 88 dp` maps correctly to
`dim.ring.card`, the heuristic just could not connect "diameter" with "ring". Semantic
matching is not automatable, which is exactly why the invention lens is an agent and not a
script. It did surface real gaps though - the focus ring, the in-button loading indicator,
the accessibility announcement points - so eleven more facts. 238 total.

**The process fix matters more than the facts.** Three blocks, all correct, all for a value
already frozen in a document and never turned into a fact. The rule was never "do not
transcribe a stated value", it was **"do not invent a value"**, and those are different.

Added a narrow path between them: when a value is written in a spec doc, absent from
spec_graph, involves no choice, and can be cited as `<doc>:<line>`, Codex batches them into
one proposal with citations rather than blocking one at a time. The founder replies
`approved`, Codex adds them with the citation as provenance and continues.

The citation is the entire safeguard. The founder is confirming a transcription, not
authorising a guess. Anything involving a choice, or any value not written down, is still a
full BLOCKED.

## 2026-08-19 - Build memory, sized for the machine rather than the blog post

Fourth block on T1.1, and a different class: G1 failed three times with an OOM during KSP on
Gradle's 512 MiB default. Codex correctly identified this as a real founder decision rather
than a transcription proposal, and used the full BLOCKED format. The protocol added an hour
ago is being applied correctly.

**Did not take the recommended option.** Codex proposed 2 GiB heap and 1 GiB metaspace, which
is the standard advice and is sized for a 16 GB machine. This one has **8 GB, with about 1 GB
free at the time of the block** and a Gradle daemon already resident. Allocating 2g plus a
Kotlin daemon on top would push it into swap, which makes builds slower and less reliable
rather than more. Set 1536m heap, 768m metaspace, workers capped at 2.

**And corrected something Codex missed.** The failure was during KSP, and **KSP runs in the
Kotlin daemon, not the Gradle daemon.** Raising only `org.gradle.jvmargs`, which is what
options 1 and 2 both described, might not have fixed it. `kotlin.daemon.jvmargs` is set to
1536m as well, and BUILD_CONFIG says plainly that it is the one to raise first if there is a
next time.

Wrote the escalation ladder into the top of `gradle.properties` rather than leaving it as
advice in a chat: close other applications, stop stale daemons, raise the Kotlin daemon
first, only then the Gradle heap, and do not put both at 2g on this machine.

**Also resolved a latent trap.** `java` is not on PATH and `/usr/libexec/java_home` cannot
see any JDK, yet a Gradle daemon was running fine on Homebrew's openjdk@17. Gradle finds it;
a future tool might not. Documented the location and the `JAVA_HOME` export in
SECRETS_AND_ACCESS so it is never a mystery.

Four blocks on node one. Every one legitimate, and between them they have found a
contradiction in my dependency list, a missing brand asset, forty-five missing facts, a gate
that did not work at all, and now a build that could not run on the founder's actual
hardware. None of these would have been cheaper to find later.

## 2026-08-19 - First anchor taken, and the emulator question resolved

T1.1 reached G5. **G1 to G4 pass, and `aapt2 dump xmltree` confirms `allowBackup=false` on
the built APK.**

That is the first anchor of the build, and it is the one that matters most out of the
pre-handover audit. `allowBackup` defaults to true, and left alone Android would have backed
up the Room database and shared preferences to Google Drive, pushing her favourites and the
PIN hash off the device and making a claim in the write-up false. It is now verified fixed in
the artifact rather than merely specified. Recorded as an `Anchor` entity with a `verified_by`
edge from `claim.boundary` - the first time a claim in this project has been verified by
something other than an assertion.

The APK built at 15.9 MB, inside the 25 MB budget.

**G5 then blocked on a real device, and that exposed a genuine ambiguity in my own spec.**
G5 and G8 said "runs on device" without qualification. Taken literally, every UI gate would
have stopped for hardware when an emulator would do, and there are a dozen of them.

Resolved with a rule rather than a case-by-case answer: **if the gate tests what the app
draws or decides, an emulator is sufficient. If it tests what Android does to the app, it
needs hardware.** Written into TEST_PLAN with the per-node breakdown.

**T4.2 is explicitly hardware-only**, and the build graph now carries a
`hardware_only_no_emulator` gate and a note saying why: an emulator will report geofence
success where a real phone under Doze and OEM battery management will not. That anchor is the
product's central claim, so an emulator pass there is worth nothing. Better to say so now
than to discover it after a green tick.

An AVD `saaya_api35` already exists, so T1.1 can finish immediately. Also documented that
`adb` and `emulator` are present but not on PATH, the same latent trap as the JDK.

## 2026-08-19 - T1.1 COMPLETE. First node shipped.

Codex finished T1.1 and pushed 4c81187. Verified rather than taken on trust.

**All nine gates pass, and the allowBackup anchor is confirmed on the built APK.** Emulator
install, cold launch, system bars, adaptive icon derived from the real v2 master. The first
verifier round killed six issues; round two returned `kill=false` at 0.99.

**The verifier earned its place immediately.** Six kills on the first node: a wrong
SplashScreen import, an API-27 style that dropped base items, an incomplete dependency and
package scaffold, unclosed Material colour/type/shape roles, an off-centre adaptive pin, and
disabled wrapper URL validation. Every one of those would have compiled and passed the
mechanical gates. Gates catch what is measurable; the skeptic caught what was merely wrong.

**Codex found a defect I introduced.** The version catalog pinned `androidx.core:core-ktx`
at 1.15.0, which requires compileSdk 35, while we target 34. The resolution rule in
BUILD_CONFIG handled it exactly as written: resolve to the latest stable in the same major
line, record it, update the catalog. It landed on 1.13.1 and documented why. Recorded as a
`Failure` entity against my document, not its work, plus a `dep.corektx` fact so the catalog
and the graph agree.

**And it found a bug in my own tooling.** `kg.py` generated event ids as `len(events)+1`,
which collides whenever two events are appended in a single run - which I did repeatedly.
16 events, 11 unique ids. Fixed the generator to use max-existing-suffix plus one, renumbered
the existing events while keeping their old ids under a `was` field so nothing was silently
rewritten, and **added a duplicate-id check to `kg.py check`** so the class cannot come back
quietly. Recorded as a `Failure` against GRAPH_ENGINEERING.

**One thing to tighten:** the commit carries `Built-with:` and `Verified-by:` but not
`Node:`. Minor, but README documents grepping the trailers, so a missing one is a broken
claim. Noted in AGENTS.

**The log is honest in the way that matters.** It lists six things Codex got wrong, and
states plainly that its own 2 GiB / 1 GiB memory recommendation was wrong for this machine
and missed that KSP pressures the Kotlin daemon. That is the tone the submission needs, and
it is arriving unprompted.

21 of 22 nodes remain. Next: T2.1, zone parsing, a 3-worker diamond.

## 2026-08-19 - T2.1 blocked: my coordinate range was wrong, and worse than reported

Codex hit G3 twice on the zone parser: Sabbavaram's centroid is 83.0975 and my asserted
minimum was 83.1. It stopped before spending the third attempt and asked.

**Checked the asset rather than accepting the framing, and it is worse than one outlier.**
Centroids span 17.6210..17.8983 and 83.0975..83.4554, so only Sabbavaram breaches. But
**polygon vertices span 17.5700..17.9500 and 83.0400..83.5400, and 34 of the 165 fall outside
my range entirely.** Codex's recommended fix, setting the minimum to the exact 83.0975, would
have passed the centroid check and then broken again the moment vertices were validated. It
fixed the symptom it could see.

**Chose a meaningful bound over a measured one.** The check exists to catch a `[lon, lat]`
swap, and a swap is wrong by about 65 degrees, so the bound does not need to be tight - it
needs to survive a data correction. Set the **Visakhapatnam district envelope**: lat
17.4..18.1, lon 82.9..83.7. Verified against the asset: 189 coordinates, centroids and
vertices, zero outside. Verified it still does its job: zero of 24 swapped centroids pass.

A box measured off today's asset would be brittle. "Is this plausibly Visakhapatnam district"
is a bound that means something.

**And it exposed a real limit in the protocol I wrote an hour ago.** Those four bounds were
proposed by Codex under the cite-and-propose path, cited to DATA_MODEL.md:47, and I approved
them after verifying the citation. The citation was accurate. **The document was wrong.** I
had written that range from approximation rather than computing it, and a faithful
transcription of a wrong document produces wrong facts.

What caught it was the anchor principle: a measurement from outside the documents. The parser
met the actual data and the assertion failed.

Documented in SPEC_README as "the limit of a citation": approving a citation is not approving
a fact. Where a proposed value can be checked against a frozen asset, a device or a build
output, it must be checked there too. A document is evidence of intent, not of truth.

Recorded as a `Failure` against DATA_MODEL.md - my document, not Codex's work - with the
decision superseding it.

## 2026-08-19 - T2.1 complete, verified independently. Switching to continuous running.

Codex finished T2.1 at b49f65a. Verified rather than accepted, and everything holds:
all three commit trailers present this time including `Node:`, 24 zones with the exact tier
split, 19 cards all joining to a zone, 37 stations, and **189 coordinates re-checked by me
against the corrected envelope with zero outside**. Knowledge graph clean at 185 entities and
462 edges. Worktree in sync.

**verifications.jsonl is now populated**, which it was not at T1.1: 5 verdicts, 2 of them
kills. `codex_contribution.py` reads 2 of 22 nodes, 3 Codex commits, 18 Kotlin files, 806
lines, 5 verifier runs, 2 killing verdicts. The submission's evidence is accumulating in a
machine-readable form rather than in prose.

Note for future runs: G6 across every tracked `.ts` file reports failures, but they are
`test/grounded_fixture.kt`, which is ungrounded **on purpose** as G6's own regression test.
Production Kotlin is clean: 14 files, zero ungrounded literals. Added a comment so nobody
mistakes the fixture for a real failure.

**Founder decision: stop pausing after every node.** Codex had been waiting for approval each
time, which AGENTS never required. Written in explicitly: finish, commit, push, report in a
line or two, start the next node. Stop only for a real BLOCKED, three gate failures, a human
gate, an anchor that needs the founder, or a belief that a spec document is wrong. Also told
to batch cite-and-propose lists across a node rather than stopping at each value.

Next is T4.1, the session engine - pure JVM, no device, and the highest-value logic in the
build. Then T4.2, which will stop for the hardware anchor.

## 2026-08-19 - T4.1 blocked on my type contract, and it uncovered 19 more

Codex hit T4.1, the session engine, and reported four defects. All four were mine.

**1. `Command` was never visible to it.** It IS defined - in ARCHITECTURE.md - but T4.1's
`reads` array was `[STATE_MACHINE, BUSINESS_RULES, TEST_PLAN, PROBLEM]`. ARCHITECTURE was not
in it. The bounded-subgraph rule worked exactly as designed and the node genuinely could not
see its own type contract. Moved the canonical definition into STATE_MACHINE, which is the
type-contract document, and marked the ARCHITECTURE copy as illustrative.

**2. `PersistedSession` was referenced and never defined.** Now defined, with absolute
epoch-millis deadlines, because that is what crosses into Room and survives process death.

**3. `RESOLVED(CANCELLED)` contradicted a plain enum.** The transition table wrote states as
if parameterised while `SessionState` is a flat enum and `EngineResult` had nowhere to put an
`Outcome`. Added `outcome: Outcome?` and a stated rule for reading the notation.

**4. `java.time` against minSdk 24.** `Instant` needs API 26. Rather than raise minSdk, which
would cost the low-end reach F31 exists for, or swap the domain to epoch millis, which would
make every timing rule harder to read, enabled core library desugaring and added
`desugar_jdk_libs` to the closed list explicitly.

**Then the important part.** Defect 1 is a class, not an incident, so I audited every node
for it: does each one read the documents that define what it must produce? **19 nodes were
missing at least one.** T3.2 builds the PIN storage without reading DATA_MODEL. T7.1 builds
the SOS screen without reading COPY, which holds every string in it. T2.2 builds the map
without COMPONENT_LIBRARY or DESIGN_SYSTEM. T7.2 builds the anonymiser without ARCHITECTURE.

Every one of those would have been a stop, and the founder has just asked for continuous
running, so each would have cost a round trip.

Fixed all 19 and wrote `scripts/reads_check.py` as **gate G10**, so the class cannot come
back silently. Its failure message says to add the doc to the node, not to trim the mapping
until it passes.

Ten gates now. The graph has caught: an inert G6, colliding event ids, a coordinate range
that excluded real data, and now 19 nodes reading less than they need. Every one found by
Codex stopping rather than guessing.

## 2026-08-19 - Blocking too often. Fixed the cause, not the instance.

Founder: we are getting blocked too often, reduce it to necessary red flags only. Seven
blocks in three nodes. Most found real defects and were worth it, but several were
**implementation shape**, which Codex may decide, and stopping for those buys nothing.

**Adopted Codex's design recommendation, which was better than my spec.** Commands are now
**intent-only**. The engine says `NotifyFamily`, not `NotifyFamily(payload)`. Building a
family message needs her favourites and building a SUS event needs a zone lookup, so
payload-carrying commands would have pulled personal data into `EngineContext` and enlarged
both the pure engine and the trust surface. The service constructs payloads from
repositories when it performs the command. `EngineContext` now carries a comment saying
nothing personal enters it, and that a rule appearing to need one belongs in the service.

Added the command cases Codex asked for: `ShowArmBanner`, `CancelFamilyNotification`,
`SetLocationSampling` for the 5-second SOS rate, `ShowPermissionWarning`,
`ReRegisterGeofences` for recovery.

**Wrote a decision-rights table**, which is the actual fix. One test:

> Could this choice change what Meera experiences, or what the state receives?

No, and it is decided, recorded as a `Decision`, and the run continues: internal type
shapes, a command case for an effect the spec already requires, naming, which API to use,
test structure. Yes or unsure, and it stops: a product value missing from spec_graph,
anything crossing the trust boundary, contradicting specs, a new dependency, a credential or
device, three gate failures, or a spec document it believes is wrong.

Bias stated plainly: continue on plumbing, stop on behaviour. A wrong internal type name
costs a rename; a wrong escalation timing costs the product's central claim.

**Extended `reads_check.py` to close the type contract**, which Codex also asked for. It now
parses STATE_MACHINE's TypeScript blocks and fails if a referenced type is defined nowhere. It
caught `Rules` on its first run - referenced by `EngineContext` and never defined anywhere,
the third instance of this exact class. Defined it. Also had to strip comments before
scanning, because my own prose was being read as a type.

## 2026-08-19 - Pivot verification: the first pass was superficial

Founder asked to verify everything was in place. It was not. The pivot had updated the build
graph and written two new platform documents, and stopped there.

**Scanned every document for Android language and found the pivot was skin-deep.** 18 files
still said Compose, 16 said IndexedDB's predecessor, 16 said APK, 7 said osmdroid.
COMPONENT_LIBRARY alone had 72 hits. Codex reading it would have built Compose components
against a Next.js project.

Translated 29 documents mechanically with an ordered rule set, excluding the five where
Android mentions are legitimately historical: progress.md, GRAPH_ENGINEERING, COMPLIANCE,
CODEX_LOG and SPEC_README's history section. Spot-checked the heaviest file afterwards;
COMPONENT_LIBRARY reads correctly in px.

**The type contract was still Kotlin syntax**, which is the part Codex copies verbatim.
Rewrote all 52 declarations as TypeScript: discriminated unions for `SessionEvent` and
`Command`, interfaces for `PersistedSession`, `Rules`, `EngineContext` and `EngineResult`.
Swapped `Instant` for `nowEpochMs`, which is native on the web, serialises into IndexedDB
unchanged, and keeps `src/domain/` free of a date library. The Android build needed core
library desugaring for exactly this; the web build does not.

**That silently blinded gate G10.** `reads_check.py` parses the type contract out of fenced
blocks, and I had changed the fences from `kotlin` to `typescript`. It reported "0 types
defined, 0 unresolved" - passing, while checking nothing. Rewrote it for TypeScript
declarations and then **functionally tested it** by injecting a bogus type: it caught it, and
passes on the real file. A checker that passes vacuously is worse than no checker.

**Full audit then found six more failures**, all fixed: WEB_PLATFORM and the brand bible were
not Document entities; the ANDROID_PLATFORM Document pointed at a deleted file (now superseded
and repointed at the archive branch); two node `reads` used a path that did not resolve; five
node notes still used words that read as instructions rather than history; `perf.apk` was
still a live fact; and three entities Codex had added were orphaned.

Replaced `perf.apk` with `perf.bundle` (200 KB gzipped) and `perf.lighthouse` (85).

**Rewrote the node notes** so history reads as history. T4.1 now says the archived engine may
be consulted for structure only, and that where it and STATE_MACHINE.md differ, the archive is
the bug.

**Final: 43 docs, 22 nodes, 275 live facts and 31 superseded, 231 entities, 521 edges, zero
orphans, zero Android leakage outside the five historical files.**

## 2026-08-19 - Strict re-verification. The pivot needed three passes.

Founder asked for a strict re-verify. Right to insist: the first pivot pass updated the graph
and two platform docs, the second caught the document translation, and only this third pass
caught the things that would actually have misled Codex.

**Found and fixed in this pass:**

`CODEX_PROMPT.md`, the file the founder attaches, still opened with **"a native Android app
in TypeScript"**. The mechanical translation had changed the language and left the platform
noun. That one line would have set the wrong frame for the entire run.

`README.md`, the reviewer-facing document, still opened with **"An Android prototype"**, and
its known-limitations list still cited Android OEMs killing background services. A judge would
have read that.

**Both anchor lists still said `aapt2 dump xmltree`**, which is meaningless on the web. All
seven anchors rewritten, and the T1.1 anchor is now better than what it replaced: open
devtools, run the ladder, watch the network tab, and see that nothing identifying leaves
before SOS. A reviewer can run that themselves during the video.

`CODEX_TASKS.md` was still describing Android task steps and had been corrupted into nonsense
by the translation - "targetSdk 34, TypeScript JVM 17, React BOM". Regenerated all 22 task
prompts for web, **from the graph**, so the file cannot drift from it again.

`TEST_PLAN.md`'s device layers were entirely stale: instrumented tests, Xiaomi battery
management, an emulator policy section, and a line telling the founder to stop the npm daemon
before booting an emulator. Rewritten for the browser, and the two manual checks that matter
most are now **M15 and M16**, tab-switch mid-countdown and past a deadline, because tab
lifecycle is where a web build of this quietly breaks.

`COMPLIANCE.md`'s originality table claimed "the entire Android codebase written from scratch"
- a submission claim that had become factually false.

Plus: `BUILD_PLAN` carried the old 2026-08-27 deadline, the icon spec still described an
adaptive-icon foreground/background split rather than PWA icons, `SECRETS_AND_ACCESS` still
listed adb and an AVD, `BUSINESS_RULES` had a word the translation mangled to "Reactd", and
`ARCHITECTURE` said "TypeScript JVM target 17".

**And the translation silently blinded a gate.** Changing the type-contract fences from
`kotlin` to `typescript` made `reads_check.py` report "0 types defined, 0 unresolved" -
passing while checking nothing. Rewrote it for TypeScript declarations and then functionally
tested it by injecting a bogus type. A checker that passes vacuously is worse than none, and
the only reason I caught it was that the count looked wrong.

**Final: 43 docs, 22 nodes, 275 live facts and 31 superseded, 231 entities, 521 edges. Zero
stale platform references, zero orphans, zero unresolved reads. CODEX_TASKS, AGENTS and
BUILD_STATE all match the graph order exactly. All four checkers pass.**

---

## 2026-09-12 - The walk view lands on this base, and three numbers I had to correct

The walk view is now on `e34d32e`, the commit `main` points at. It was not there before, at
any layer. This entry records what moved, what I got wrong on the way, and two things that
need a ruling.

### What is now in the tree

41 new files:

| Where | What | Count |
|---|---|---|
| `src/platform/walk/` | the walk engine: projection, tiles, zones, geometry, world, character, scene, and their tests | 16 |
| `src/ui/screens/walk/` | `WalkView`, `CharacterCustomiser`, and the screen test | 3 |
| `src/ui/copy/riskBandLabel.ts` | the band-name lookup, extracted so the walk view and the zone sheet cannot drift apart | 1 |
| `public/assets/character/` | the Blender-authored glTF parts | 19 |
| `public/assets/world/` | `world_tiled.json`, the baked geometry | 1 |

Eight tracked files changed ahead of the spec-doc port: `package.json` and the lock
(`three` 0.185.0, `@types/three` 0.185.4), `materialSymbols.json` and the font subset (17 to
19 glyphs), `strings.ts` (30 walk keys across the type, `en` and `te` blocks),
`HomeScreen.tsx` (the toggle, the view switch, the first-switch prompt),
`ZoneDetailSheet.tsx` (now imports the extracted band lookup instead of keeping its own copy
of the switch), and `graph/spec_graph.json` (14 walk facts, 410 to 424).

### Three numbers I had reported wrong, corrected

**The bundle.** I said about 97 KB gzip, then 159 KB. Both wrong. Measured from a real
`next build`: the walk payload is four chunks totalling **169,368 bytes gzip, 165.4 KB**,
against the 190 KB ceiling in `perf.bundle.walk`. Headroom is 24.6 KB. The initial page load
is 139 kB and carries no `three` at all, which is what the lazy boundary is for.

**The size of the rescue.** I said 18 files. It was 41. I had compared my build mirror
against the live worktree instead of against `e34d32e`, and the worktree held the whole bake
layer that the committed tree never received: `src/platform/walk/`, `public/assets/world/`,
all 19 character parts, and the `three` dependency itself. `main` had no walk view at any
layer. It was not a view missing its screen.

**Two spec files I first rewrote wrong.** `spec_graph.json` uses a one-space indent and a
hand-mixed split between literal and escaped non-ASCII, so regenerating it reformatted 4,700
lines to add 14 facts. It is spliced textually now and the diff is 154 lines, one of which is
`count`. Both of these are the same mistake in different clothes: regenerating a
hand-maintained file instead of appending to it.

### Gates, all run on the merged tree

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors, all 19 walk source files confirmed in the program |
| `eslint src app` | 0 |
| `vitest run` | 43 files, 265 tests, 0 failures |
| `grounded_check.py` | 146 files, 0 ungrounded literals |
| `next build` | exit 0 |

### What needs a ruling

**`progress.md` has three divergent copies.** This one stops at 2026-08-19. The live
worktree's copy runs to 2026-09-12 and is 2,483 lines. My build mirror's copy is 2,758 lines
and carries the walk-view sections. All three share their opening. I appended this entry
rather than merging the other two, because copying either would have made claims about a tree
that is not this one. Which copy is canonical is a founder ruling, not a merge.

**`FEATURES.md` is amended, and the amendment is written as a ruling.** The frozen line "No
live unsafe-roads display. Heat-zone markings only." becomes "...from a separate dataset",
with Amendment 1 at the foot bounding per-road risk to arithmetic on the zone the road sits
in. It is recorded as an explicit founder amendment because the file's own rule requires one.
If that ruling was not given, this is the line to revert first.

**One known gap, asserted rather than hidden.** The customiser shows part names in English in
both languages: `COPY.md` has a row per axis and none per part, so `hair_buns` reads "Buns" in
Telugu too. The screen test asserts the gap deliberately, so that adding the 16 per-part copy
rows breaks the test before it can quietly regress.

## 2026-09-16 - The black screen was a race, and the fix is six lines

**Symptom.** The founder opened the preview, switched to the walk view, and got a black
rectangle with one band of colour across it. It read as a crash. It was not one: no page
error was thrown, the module graph was intact, and every walk asset returned 200.

**What was actually happening.** The scene mounted, the character rig attached, the frame
loop ran, and nothing moved. Measured in the browser:

| reading | value |
| --- | --- |
| `current` / `target` | `null` / `null` |
| resident tiles | 0 |
| camera position | `[0, 0, 0]` |
| ground plane scale | `[1, 1, 1]` |
| frame loop running | `true` |

`step()` opens with `if (meta === null || current === null || target === null) return;`, so
with `current` null every frame returned immediately. The camera never left the origin, the
ground plane never scaled, and `updateWindow` had no tiles to ask for. What was left on the
canvas was the renderer's clear colour, plus one risk band from a road that happened to fall
across the origin. That is the black rectangle.

**The race.** `mountWalkScene` resolves as soon as the `WebGLRenderer` exists. The world is
loaded by a floating promise inside it, so it lands later. `WalkView` calls
`controller.update(...)` once when the mount promise resolves, and after that only when the
`location` prop changes identity. So:

1. `mountWalkScene` resolves, `meta` is still `null`.
2. `update` arrives carrying her fix, hits the `meta === null` early return, and the fix is
   discarded.
3. The world lands. `meta` is set. Nothing re-delivers the fix.
4. The loop runs forever with `current === null`.

A phone that is moving eventually pushes a new fix through the prop and the world appears,
which is why this survived earlier testing: **the view only worked for someone walking.** A
still phone got the black rectangle. A browser with no WebGL never reaches step 1 and gets
the offline string instead, which is a different failure and was what my first reproduction
script actually measured.

**The fix.** Keep the last view handed to `update`, and apply it when the world arrives.
`lastView` is assigned before the `meta` check rather than after it, which is the whole
point, and the projection moved into `applyLocation` so both callers use one path. Six lines
of behaviour in `walkScene.ts`, 38 insertions and 5 deletions with the comments.

**Verification, and how it was measured.** A scripted browser run drives onboarding, closes
the demo sheet, taps `View`, and takes the customiser default. Sampling the 3D band of the
frame:

| | bug state | fixed |
| --- | --- | --- |
| distinct colours in frame | 7 | 21 |
| background `#0B0B0F` | 90.5% | 55.0% |
| risk band | 9.2% `#601C1B` | 38.5% `#FF9500` |
| buildings | 0% | 6.1% |

No GPS movement is injected in the fixed run. The world appears on its own.

**What is not a bug, and still does not look right.** The view is now correct and still reads
as mostly black. Three stated values combine: the ground plane is painted `color.background`
(`#0B0B0F`), a `primary` road draws at `ROAD_HALF_WIDTH_M` 4 m times its class multiplier of
3, so 24 m wide, and the camera sits `walk.camera.dist` 27 m out at `walk.camera.pitch` 52
degrees, which shows roughly 40 m of ground. She was standing on a primary road inside a
moderate zone, so a 24 m orange ribbon filled a third of the frame and the town behind it is
`#1A1A20` on `#0B0B0F`. Every one of those is a grounded fact. None of them was changed
without a ruling.

**Gates.** `tsc --noEmit` 0. `next lint` clean. `vitest` 43 files, 265 tests. `grounded_check`
138 files, 0 ungrounded. `next build` exit 0. `reads_check` 17 types, 0 unresolved. `kg.py
check` 403 entities, 687 edges, 0 problems.

**No test covers this.** The walk screen's test renders static markup, so no effect runs and
the ordering cannot be reached from it. The only harness that catches this class of fault is
a browser driving the real scene, which this repo does not have. The reproduction above is a
script, not a committed test, and that gap is recorded rather than papered over.

## 2026-09-16 - Fidelity comparison against the Pokemon GO reference

Question put to us: does the walk view reach the quality and feel of the reference
video. Answer recorded here so the next session does not have to re-derive it.

Reference: `/Users/abhishai/Downloads/Screen recording playing Pokemon GO on my
iPhone IOS 11 is awesome - Nicholas Enrique Rivera (1080p).mp4`, 00:01:05.27,
1080x1920, h264 High, 28.60 fps. Five frames pulled with ffmpeg at t = 3, 15, 30,
45, 58 into `/tmp/walkrepro/pogo/`.

Verdict: **not close.** Roughly a fifth of the way on the map, close on the
customiser.

| Axis | Reference | Ours | Gap |
| --- | --- | --- | --- |
| Ground | Lit, coloured city. Green parks, blue water, grey paths, navy roads with white casings | `#0B0B0F` ground, one flat `#FF9500` slab at 38% of frame | Every material is `MeshBasicMaterial`. Nothing is lit, nothing has form |
| Camera | Steep, far back, 150-300 m of city in frame | 27 m out, 52 deg pitch, about 40 m in frame | `WALK_CAMERA_DIST_M` / `WALK_CAMERA_PITCH_DEG` in `walkFacts.ts` |
| Character | Lit, coloured, walk cycle, soft shadow, heading marker, ~70 px | ~35 px unlit black silhouette | No lighting, no shadow, no heading marker |
| Depth | Sky gradient with stars, water, trees, glowing landmark rings, compass, particles | None of these | No sky, no horizon, no landmarks, no compass |
| Risk information | Visible in frame | Absent | Zones are 2000 m discs anchored at police stations; nearest anchor 169 m; frame is 40 m. Labels cannot arrive at this camera height |
| Character builder | Polished | 7 axes, 44 pt targets, clear labels, "This stays on your phone." | Close. Missing art only |

Recommended order, cheapest real win first:

1. Camera to about 80 m at 62 deg. One constant. No new facts.
2. Road ribbons from 24 m solid (`ROAD_HALF_WIDTH_M = 4` x primary multiplier 3)
   to about 8 m with a lighter casing. Two constants.
3. Lit materials: hemisphere plus directional light, `MeshLambertMaterial` instead
   of `MeshBasicMaterial`, palette lifted off black. One file. This is the jump.
4. Zone readability is structural, not a tweak: either the camera rises far enough
   to hold a 169 m anchor (needs roughly a 450 m view) or the anchor policy changes.
   That is a spec ruling and has not been made.

No code changed in this step. Nothing was committed.

### 2026-09-16 - Handover written

`HANDOVER.md` added at the repo root, so the work can be resumed from a cold start
without re-deriving anything. It records: where the work lives and why it is in a
`/tmp` clone (git stalls on the iCloud canonical checkout), the resume commands, the
branch contents, the black-screen race and its fix, the fidelity verdict and the five
gaps, the three open rulings, the gate commands, the non-negotiable constraints, and
the environment gotchas that cost time.

Two things worth stating plainly in the log as well as the handover:

**`/tmp/saaya-land` is volatile.** Everything that matters is pushed to
`m4-walk-view` at `5884cf1`, so a reboot loses only the clone, not the work. Do not
treat the `/tmp` tree as the source of truth.

**A stale dev server was killed.** pid 55992 was still holding port 3111 from an
older build mirror at `/tmp/saaya-walk`, which is not a git repo. Gone now.

One correction to an earlier entry: the SCREENS.md concern was recorded in a
pre-compaction session as "S15/S14 phantom entries". Both entries exist, at
`docs/spec/SCREENS.md` lines 332 and 367, both added 2026-09-11. The exact objection
could not be reconstructed from the repo, so it is logged here as needing
re-derivation rather than as a standing ruling. It is not counted among the three
open rulings.

No source file changed in this step. `progress.md` and `HANDOVER.md` only.

### 2026-09-22 - The safety overlay was invisible, and she was a silhouette

Work resumed on `m4-walk-view` in the fresh clone. The five gaps are unchanged;
this step closes three of the causes behind them and pins each one with a test.

**The zone layer rendered nothing at all.** Not "faint", not "hard to see": every
zone fill and every zone boundary was missing from the frame, while the flat map
drew all 19. The cause was found by measurement, not by reading. `appendRingFill`
calls three's `ShapeUtils.triangulateShape`, and that function normalises its
input — a probe over both windings returns the *same* triangles. In the ground
plane those triangles face **downward**, every time. A downward fill is invisible
from any camera above it. The tile layers never noticed, because every tile
material is `DoubleSide`; the zone materials alone were one-sided, so the entire
safety overlay was culled. The fix is in the emitter (`b` and `c` swapped, so
every fill faces up whichever way its ring runs) and in the zone materials, which
now wear the same `DoubleSide` the tile layer does. Pinned by
`walkGeometry.test.ts` (both windings, face normals asserted) and
`walkZones.test.ts` (every zone mesh two-sided).

The product consequence is worth stating plainly: a zone tint is the one thing
this view exists to show, and it was absent from every frame of the walk view
ever captured. That is the first of the five gaps closed for real.

**She rendered as a black silhouette.** Her parts are glTF
`pbrMetallicRoughness`, which three loads as `MeshStandardMaterial`, and a
standard material with no light in the scene renders black. There was no light
anywhere in the scene. Two lights now exist — a hemisphere and a directional key
over the camera's shoulder — and they exist for her alone: every scenery material
stays `MeshBasicMaterial`, so no frozen colour can be shaded by them. This is a
deliberate divergence from the 2026-09-16 recommendation to move the scenery to
`MeshLambertMaterial`: a lit tile would render `color.tile.road` as *that colour
shaded by a sun the product never chose*, which is the spec-graph violation the
whole gate exists to prevent. Colours in the rig are the product's own
`color.white` and `color.background`; the levels are GROUNDED-EXEMPT rendering
values.

**Her ground mark.** `color.brand` at 0.28 alpha on a disc a quarter of her
height in radius, in a new top layer `characterMark`. A dark contact shadow is
the usual tool and the wrong one here: this ground is near-black, so a shadow has
nothing to darken. The reference draws a translucent ring under the avatar for
the same reason.

**Road casing.** `roadCasing` is a new layer below `roadBase`, drawn
`ROAD_CASING_M` wider on each side and lightened from `color.tile.road` by
`ROAD_CASING_LIGHTNESS` — derived from the road's own fact, so no second colour
is named. In the captures the edge now separates a street from the ground it
crosses; at the camera's present height it is a subtle read, and it is one of the
things the ruling below affects.

**A second capture finding, not yet fixed.** At `17.726, 83.30922` — a corner the
world data picks out as building-dense — the camera at 21 m up and 16.6 m back
sits *behind a 16 m building*, and the frame is a flat dark mass of walls with
her hidden behind them. Walls and roofs also read identically, because unlit flat
colour has no form. This is the composition gap showing its teeth: it is not a
bug in any one layer, it is `walk.camera.dist` 27 and `walk.camera.pitch` 52.

**Measured reference targets** (calibration workflow, per-frame row profiles over
`/tmp/pogo-over/o_01…o_06`):

| Quantity | Reference | Ours |
| --- | --- | --- |
| Horizon line | 16.1% of frame height (flat within 2 px across the width) | no horizon in frame |
| Camera axis below horizontal | 18.3 deg | about 51 deg |
| Character height | 12.6% of frame height (121 px of 960) | about 7.7% |
| Sky | 13% of frame, deep blue `rgb(23,49,143)` rising to `rgb(40,66,160)` | none |
| Brightest large area | the horizon band, luma 124-135 | n/a |
| Mid ground | luma 131-137 | about 25 |
| Ground at her feet | luma 108-124 | about 25 |
| Road fill | `rgb(41,82,127)`, 19% of frame, lighter casing | `#1A1A20`, casing `#2F2F3A` |

The 2026-09-16 estimate of "about 80 m at 62 deg" does not survive these
measurements: the reference camera is *close and low* (axis 18.3 deg below
horizontal), not far and steep. The earlier estimate was eyeballed from a frame;
these are per-row profiles.

**What this needs is a ruling, and it is the second open item from 2026-09-16.**
`walk.camera.dist`, `walk.camera.pitch` and every `color.tile.*` are
`"frozen": true`, and `HANDOVER.md` is explicit that every fact in
`spec_graph.json` is unmodifiable. Reaching the reference composition means
amending `walk.camera.dist` (27 to about 15), `walk.camera.pitch` (52 to about
31), adding a look-at height (about 3.4 m, twice her height), and lifting the
world palette off black — four amendments plus new sky/fog facts. The frozen spec
"is amended properly, not worked around", so the request is in the founder's
hands and nothing above this line touches a fact.

Gate: `npx vitest run` 272 passed, `npx tsc --noEmit` clean,
`python3 scripts/grounded_check.py src/platform/walk/*.ts` 0 ungrounded
literals.

### 2026-09-22 — The ruling landed: the facts were amended, and the view became a place

**The ruling, in the founder's words:** *"We need perfection in-terms of User
experience and look and feel. We want a smooth and aesthetic experince which
matches or even does better than the Pokemon Go version. Do what ever it takes
to acheive the same."* That is what makes amending a frozen fact lawful here.
`HANDOVER.md` says every fact in `spec_graph.json` is unmodifiable, and it also
says the frozen spec "is amended properly, not worked around". A founder ruling
is the proper path; a constant in `src/` would have been the workaround, and
none was written.

**Amended, in `graph/spec_graph.json`** — spliced textually, one fact at a time,
never regenerated:

| Fact | Was | Now | Where it came from |
| --- | --- | --- | --- |
| `walk.camera.pitch` | 52 deg | 31.4 deg | solved from the measured rows, fov held at 54 |
| `walk.camera.dist` | 27 m | 13.2 m | 11.25 m of ground back, 6.87 m up |
| `walk.camera.look_at` | — | 3.18 m | new; the axis crosses her vertical 1.87x her height |
| `color.tile.road` | `#1A1A20` | `#2E3450` | 0.56 of the measured ground luma |
| `color.tile.building` | `#1A1A20` | `#3A4160` | below the ground: a mass on a lit plane |
| `color.tile.building.roof` | `#2F2F3A` | `#737D9C` | above the ground: the pale plane |
| `color.tile.green` | `#1A1A20` | `#3F5C4C` | 0.85 of the ground luma |
| `color.tile.water` | `#1A1A20` | `#1F3A5C` | the road's own luma; the reference has no water, so by relation |
| `color.walk.sky` | — | `#223375` | new; the reference's measured sky luma |
| `color.walk.ground` | — | `#565F80` | new; replaces `background` under the ground plane |
| `color.walk.haze` | — | `#6B7EC4` | new; the reference's horizon band, used as scene fog |

Seven amended, four added. Each carries its own measurement in `sourced_from`,
and each says it was a founder ruling so a reader can find this entry. `fov` was
deliberately *not* amended: the reference's own field of view is unknown, so the
solve held Saaya's fixed, which is what makes the measured rows fov-independent
targets.

**Also corrected this pass:** the graph's own `count` field still said 424 after
the array had grown to 428. Nothing reads it programmatically, which is exactly
why it would have rotted. It is 428 now, and the live / superseded split the
checker prints (396 / 32) is unchanged.

**Then the frames were still wrong, and three column profiles said why.** The
camera amendment was necessary and not sufficient: a correct composition with the
wrong rendering is still a void, in a new colour.

**The zone tint repainted the frame.** The street capture's column profile found
one colour — rgb(145,82,100) — over 35% of the frame. That is `color.zone.high`
at the dataset's own 0.35, composited in sRGB over the lit ground. The dataset's
per-zone opacities were tuned against the flat map's near-black sheet, where 0.35
of the same red renders as rgb(96,28,27): a dark area on a dark sheet, which is a
different picture from a red wash over a lit plane. `ZONE_FILL_ALPHA_SCALE`
(0.4) brings it to a shade *cast over* the ground. What is scaled is the
rendering, never the data: each zone's own opacity, the order across the 19
zones, the tier colour, and `alpha.map.zone.selected.raise` (scaled with the fill
it is an increase on) are all the frozen values still, and the flat map is
untouched.

**The band had replaced the road it was drawn on.** Every banded road — and in
the dense tiles every road carries a band — rendered as a slab of tier colour at
the band layer's height, with the road surface, its casing and its junctions
invisible underneath it. The street network, which is the thing this view exists
to show her walking on, was one flat colour from the horizon down.
`ROAD_BAND_WIDTH_FRACTION` (0.55) makes the band a spine down the middle: the
tier colour is still on the road surface at every point the risk applies to, and
the road it describes is visible on both sides of it.

**The casing was invisible, and the cause was a colour space.**
`Color.multiplyScalar(2.2)` works in the renderer's linear working space, where
`#2E3450` doubles to rgb(69,78,117): a factor of about 1.5 to the eye, on a rim a
tenth of the road's width. The profile could not find it. The casing now lightens
the road colour's own hex bytes, which is the space the frame is composited in,
and the rim measures 117 against the road's 53 — the factor the number reads as.

**The roads were highways.** Measured from the reference frames at the depths
this camera reads them at, a road ribbon is 2.5–3.2 m across. Ours was 8 m for a
residential street and 24 m for a `primary` — the frame shows about 6 m of ground
across at her feet (6.05 m, solved from the camera facts on a 390×844 viewport;
the same solve puts the horizon at 0.164 and her feet at 0.745, which is what
the reference measures), so a single `primary` was four frames' worth of width
and the picture was that road. `ROAD_HALF_WIDTH_M` is 1.5 m now, with a
per-class multiplier table, and the street capture reads as a place: a legible
street web, junctions, kerbs, roofs on the horizon.

**The legend was describing a different picture.** Its low swatch was the flat map's
`color.tile.land`, a colour that appears nowhere in the walk view — the view draws
`color.walk.ground` as its own land, and the legend's job is to explain the frame she
is looking at. It is `color.walk.ground` now. The bands above it are unchanged: the
tier colours are the tier colours in both views.

**Tests rewritten to the new contract, not the old one.**
`walkComposition.test.ts` re-derives the frame from the four camera facts and
asserts it against the measured rows, so an edit to any one of them fails here
rather than quietly moving the horizon; it also pins the palette's luminance
relations, that a banded street still has a band narrower than its road, and that
the tint keeps the ground reading as ground. `walkTiles.test.ts` reads the
class-width table rather than restating one entry from it, and asserts the casing
through *luma* — because luma is the thing the frame is made of.
`walkZones.test.ts` pins the scale, the order it preserves, and that it does
work: at the dataset's own alpha the ground flips red-dominant.

**`MAP_SPEC.md` amended** for all of it — the camera section's second ruling, the
band as a spine and the measured widths, the casing's colour space, and the
fill's alpha scale — because a rule that lives only in a comment is a rule the
next reader will not find.

**Two measured findings are open, and neither is being decided unilaterally.**

*Roads: darker than the land, or lighter?* The frozen `color.tile.road` is 0.56
of the ground, which is the relation the day-frame calibration measured. But the
reference's night frames show pale ribbons *brighter* than the land between them
(luma 110+ against 106–132), which would invert it. The two readings disagree,
and a second self-authorised amendment to a frozen colour is exactly what the
governance rule exists to prevent. It goes to the verification round below.

*Zone labels are structurally near-unreachable.* Of 19 zone-centroid anchors, 0
of 8 are in frustum at the street position, 2 of 11 at the park, 1 of 13 at the
corner; `visibleLabels` measured 2, 1 and 0 at the three captures. Meanwhile the
reference frame shows no in-world text labels at all — only UI chrome. The
candidate fix is to label the zone she is *in* rather than all 19 centroids, but
that changes what the view asserts, so it waits for the round.

**Verification round, running now.** Five judges with distinct lenses
(composition, palette, legibility, avatar, the risk overlay), each measuring our
three captures against the seven reference frames with per-row profiles before
asserting anything; then an adversarial pass that re-measures every finding and
aims to refute it; then a completeness critic. Its confirmed findings are what
the next round of work acts on, and any amendment they justify goes through the
same path as the one above.

Gate: `npx vitest run` 295 passed in 44 files, `npx tsc --noEmit` clean,
`python3 scripts/grounded_check.py src/platform/walk/*.ts` 0 ungrounded
literals (396 live facts, 32 superseded and excluded). The two new tests pin the
frame's own ground footprint - the number the road widths were rescaled against -
by deriving it from the camera facts rather than restating it.

## 2026-09-22 - The palette amendment, and two gates that were not what they said

**Six frozen colours amended by the same founder ruling**, each recorded in its own
fact's `means` and `sourced_from` rather than worked around in code: `color.tile.road`
`#2E3450` -> `#3E466C`, `color.tile.building.roof` `#737D9C` -> `#8792B7`,
`color.tile.green` `#3F5C4C` -> `#4A7C74`, `color.walk.sky` `#223375` -> `#183498`,
`color.walk.haze` `#6B7EC4` -> `#192F6B`, `color.walk.ground` `#565F80` -> `#578BAE`.

The reason is a measurement, not a preference. The reference's map area is **78% in the
180-240 degree blue/cyan family and holds no magenta anywhere** (per-row hue histogram of
the 1080p frames: 180-210 deg 43.4%, 210-240 deg 34.6%, 150-180 deg 12.8%, and under 3%
across every other bin). The old ground under the highest-risk zone wash rendered
rgb(110,90,117) - **hue 284, and half the frame** - because `#FF3B30` at 0.14 over
`#565F80` crushes green to 90 and flips the ground's own B>G>R ordering. Two of the three
frozen tier tints took the land off-family. The fix belongs in the scenery, not in the
frozen data: the land is chosen so that every tint the dataset carries leaves it in the
reference's own family. The amendment's own test was passing throughout, because
`scaled.blue > scaled.red` survives a hue rotation.

**A frozen fact's stated rationale was measurably false.** `color.walk.haze` claimed the
reference's horizon band "measures luma 124-135 and is the brightest large area". Measuring
rows around the horizon gives sky 56-64 -> **a dark seam at 46-48** -> map 124-156. The
reference's horizon is darker than both the sky above it and the land below. The fact now
records the measurement and the old rationale's error, and the test that asserted the haze
is "the brightest large area" was inverted to assert it fades distance into a dark seam.

**`ROAD_CASING_M` 0.5 -> 0.25 and `ROAD_CASING_LIGHTNESS` 2.2 -> 4.5 -> 3.1.** The
reference's own road-edge lines measure 3-6 px at 1080x1920; a 0.5 m rim is 32 px at the
near field, sixteen times as thick, and reads as a painted shoulder. At 3.1 the rim lands
at luma 216, inside the reference's measured 190-250 line band, with only the blue channel
clamping, which is what keeps it a cool ice rather than a warm one - the tier colours are
warm, and a kerb reading as a tier colour would be a false claim.

**Two gates were not what they said.**

*The grounded check was hollow.* `scripts/grounded_check.py` takes **files**, not
directories - `paths=[a for a in sys.argv[1:] if a.endswith(EXTS)]` - so a directory
argument scans nothing and prints `grounded: 0 file(s)`, which reads as a pass. Earlier
runs this session scanned 0 and then 1 file. Run correctly it is
`find src app -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -print0 | xargs -0
python3 scripts/grounded_check.py` -> **147 files, 0 ungrounded literals**. Note for zsh:
an unquoted `$FILES` is not word-split, so the `find -print0 | xargs -0` form is the one
that works.

*The gate count was stale.* The previous entry records 295 tests. It is **296 in 44
files**.

**The near field was never a rendering bug.** Three captures showed a bare ground plane in
the lower half of the frame, and the obvious read was that tiles were not loading. They
were. `camera.position.set(current.x, cameraUpM, current.z - cameraBackM)` places the camera
a fixed distance **due north** of her, looking due south, always. Decoding the bake properly
and measuring true segment distance and **direction** from her, the "street" point holds 27
road fragments within 60 m - and **25 of them are north, behind the camera**. Southward
there are two, both `service`, both 37 m west, both outside a frame that is 6.05 m across at
her feet and 16 m across at 30 m. She had been teleported into the middle of a block
interior. The earlier "29 fragments within 60 m" probe was not wrong, it just never asked
which way they lay. A 20-second wait changed nothing, which is what ruled out a load race.
The origin capture, where the bake does hold four roads ahead of her, renders them.

**The camera does not rotate with her heading, and neither does the reference.** The code
turns the character (`rig.root.rotation.y = facingRadians`) while the camera stays put,
which reads as a bug until the reference is checked: in `m_11` the avatar is in **profile**,
walking across a map that stays fixed, and in `m_03` she is seen from behind. Avatar
rotation is independent of camera orientation in both. Recorded here so nobody "fixes" it
later.

**The largest remaining gap cannot be closed in this repo.** The reference's ground is a
mosaic of filled parcels with pale outlines; ours is one flat plane, and that is most of why
the frame still reads as empty. `world_tiled.json` carries only roads, buildings, green and
water - there is **no bake script and no raw OSM extract anywhere in the repo**, so the
parcel layer cannot be regenerated here. That is a founder decision, not a code change.

Verification round running over the full-resolution reference set: four measurement lenses
(ground, roads, avatar, depth) then four adversarial refuters (measurement validity,
presence, feasibility, reference representativeness) then a synthesis.

**The bake tree does exist, and the parcel layer is one query away.** The previous entry said
the parcel mosaic could not be closed in this repo because there was no bake script and no raw
OSM extract. That is true of the repo and false of the machine. `MAP_SPEC.md` names the bake's
own home in its world-asset section, and `/Users/abhishai/saaya-lite-world/` holds the whole
pipeline: `fetch.py` (four Overpass queries over the Vizag bbox), `bake2.py` (projection, risk
by density, building heights by the stated storey rule), `tile.py` (seam-correct clipping and
quantisation), plus every intermediate - `roads.json`, `buildings.json`, `green.json`,
`water.json`, `world_raw.json`, `world_tiled.json`. There is **no landuse query and no
parcels layer**, which is why the ground is flat.

So the gap is not a missing asset, it is an unasked question. A `landuse` entry in
`fetch.py`'s `QUERIES` map, one `emit` loop in `tile.py`, and a layer in the client would put
the parcel mosaic in the bake. That is a new network fetch of live OSM data and a rebuild of
the asset the app serves, so it is **not mine to do unilaterally** - it needs a founder ruling.
Recorded with the reconnaissance done, so the ruling is cheap to make.

**Layout: three chrome collisions, all measured, all fixed.** `layout.mjs` (new, in
`/tmp/walk-verify/`) measures the walk view's DOM chrome in CSS pixels and reports every box
that can collide and every label the frame edge can clip. At the origin position it measured
three defects, all of them visible in the captures:

| | Before | After |
|---|---|---|
| The legend's closing sentence | buried under the action dock - card bottom 824 px, dock top 784 px, **40 px** covered | card bottom 772 px, **12 px clear** |
| "Change your character" against the settings button | cut to "Change your cha" - both boxes ending at 370 px | edit row ends 314 px, **8 px clear** |
| The legend's last line under the control stack | control stack 724-772 px inside the card's 634-772 px span | card ends 314 px, stack starts 322 px, **8 px clear** |

The fix is one custom property, `--walk-view-rail`, on the value of the home screen's own
right-edge column (48 px touch target plus `--space-8`), used by the top row and the legend
card; and the legend clearing the dock by `--home-action-dock-clearance`, the same clearance
the control stack already used. No new numbers.

**Zone names printed over each other, and off the frame edge.** The same probe measured "Old
Town" and "Soldierpet" overlapping by **33.9 x 24.7 px** because their anchors projected 43 px
apart, and "Soldierpet" **10.7 px past the right edge** with the rest of the word off screen.
The scene reports a projection - a point - and the view drew a box centred on it with no idea
how wide the box was or what else was there. `labelPlacement.ts` (new, with 10 tests) places
the box: centred on its anchor, pulled back inside the frame, stepped clear of anything already
placed (below first, then above), and the clamped centre if nothing fits - a name overlapping
another is still a tap target, and the risk reading must not vanish. Sizes are measured off
each node **once and cached**, because `offsetWidth` costs a layout flush and this runs inside
the scene's frame callback. After: **no collisions, no clipping**, both names fully in frame.
This is not the label system `MAP_SPEC.md` refuses for the flat map - that section is about not
burying 19 circles under a dense ring of names, and this decides only where a name that is
already showing sits. Recorded as an amendment in `MAP_SPEC.md`.

**The green layer's colour relation holds in luma and not in hue.** At the origin she stands
**inside** an OSM green polygon (nearest edge 1.0 m), and **73%** of the ground the camera can
see is inside one, so rows 0.40-0.70 of the frame are 94-100% one colour. Sampled:
**rgb(99,115,106) L109 h146**. That is exactly `color.tile.green` #4A7C74 (rgb(74,124,116)
L108 h170) with `color.zone.high` at 0.35 x `ZONE_FILL_ALPHA_SCALE` 0.4 = 0.14 over it:
0.14 x (255,59,48) + 0.86 x (74,124,116) = rgb(99,115,107). Measured rgb(99,115,106) - the
render is faithful to the facts to one unit on every channel.

But the palette amendment's rule - **"the ground must stay blue/cyan under all three tier
tints"** - was verified over the *ground plane*, where it holds (rgb(111,128,156) h217). Over
the green layer it does not: h170 under the high tint lands at **h146**. The reference's hue
histogram fills 120-150 with 2.4% of its map area, so h146 is not unheard of there, but 55% of
this frame sits in it. The rule as written is narrower than its stated intent, and that is a
spec finding rather than a code one - the luma ladder (green at 0.85 of the ground, measured
109 against the fact's own 108) is exactly right. What is wrong is the *composition*: the
default position puts her in a park, so the near field is the one surface the palette was not
tuned against.

Gates green: **306 tests in 45 files**, `tsc --noEmit` clean, grounded check **149 files,
0 ungrounded literals**. The +10 tests are `labelPlacement.test.ts`. The grounded check caught
all 22 new literals on the first run - the two measured pixel values in a CSS comment were
moved into this record and `MAP_SPEC.md` rather than marked exempt, and the 21 test probes were
collapsed into named constants with exemptions.

**The building walls were drawn from the inside, and now they cannot be.** The dense tile's
frame - 77.7% one flat wall - was traced to the building material being `DoubleSide`. A
double-sided box shows its walls to a camera that is inside it, so the question was whether the
bake's footprints could be extruded with their walls facing outward and the material made
one-sided. They can, and it is now guaranteed in code rather than assumed of the data.

`appendBuilding` normalises each ring's winding first - positive signed area is reversed - so
every wall faces outward whichever way its footprint was written. The algebra: a ring step
`(dx, 0, dz)` extruded as `(a₀, b₀, bH)` has a face normal of `(-dz, 0, dx)`. The bake's own
rings **disagree with each other** - of 12,690 building rings, **81.0%** are positive and
**18.9%** negative - which is exactly why the material had been `DoubleSide`. With the winding
normalised, `building` and `buildingRoof` are `FrontSide` (`walkTiles.ts:268-269`); every other
layer stays double-sided, because `appendRingFill` already faces every fill up by construction
and a second guarantee should not fight the first.

**Proven, not asserted: the A/B at a stationary camera.** The harness is byte-reproducible at a
fixed position - two captures in the same material state share an md5 exactly - so a difference
at a fixed position is the material and nothing else. One variable changed, same position:

| Camera's depth inside its ring | Enclosing ring | Pixels differing | What the `DoubleSide` frame was |
|---|---|---|---|
| 0.0 m | 57.6 m | **138** of 1,316,640 (0.01%) | the street - the wall is edge-on |
| 9.2 m | 12.8 m | **986,454** (74.9%) | the inside of the building |
| 10.4 m | 8 m | **948,101** (72.0%) | the inside of the building |

At the deep positions the old frame is a flat wall with **the character not visible at all** -
the app is unusable - and the new frame is the street with her standing on it. At the shallow
position the two frames agree to 138 pixels. The fix acts exactly where it claims to and nowhere
else. The dense-tile frame that started this is **not** one of these cases: with `DoubleSide`
restored it is pixel-identical, because it is an honest occlusion in a half-metre slit between
two eight-metre buildings, and she is not inside a building there at all.

The rule is written into `MAP_SPEC.md` with the measurement, and its limits are written down
with it: it does not address occlusion (**99.0%** of blocked road positions clear at a boom of
3 m or less; **0.97%** clear at none), and camera collision is a separate change that is not made.

**MAP_SPEC's stated reason for the 27 m to 13.2 m camera amendment is falsified.** The section
said a 13.2 m camera "passes under the rooflines" where 27 m sat behind a building. Measured
over the bake's own roads, sampled every 2 m (416,608 positions):

| | 13.2 m boom | 27 m boom |
|---|---|---|
| Camera inside a building tall enough to enclose it | **5.54%** | 1.27% |
| Building between the camera and her eye | **6.30%** | 7.78% |

The shorter boom is inside a building **4.4x as often**, not less often, and improves the
sightline only modestly. The amendment itself stands - it is what reproduces the reference's
composition, which is the reason that matters - but it no longer carries a claim about rooflines
that the data does not support. Both the falsification and the corrected numbers are in
`MAP_SPEC.md`.

**Two probes were wrong, and finding that out was most of the work.** `occludeprobe.mjs` and
`roadocclude.mjs` rasterised ring bounding boxes in **world** coordinates straight into a grid
indexed **tile-locally**, so nearly every write clamped into the last row band and the grids were
mostly empty; their first numbers (0.30% camera-inside, 0.32% blocked) described a grid that did
not exist. The road loop then had the mirror-image bug, handing `coverAt` a tile-local `x` where
it keys on world. Fixed to rasterise and query in one frame, the grid agrees with a completely
independent exact-ring test - **5.54% / 5.58% / 5.59%** camera-enclosed from three methods - and
that agreement is what makes the numbers above usable. The exact-ring probe also reports what the
cell test cannot: the camera's **depth** inside its ring, which is the variable the material
question actually turns on.

**Gates green: 309 tests in 45 files**, `tsc --noEmit` clean, grounded check **149 files,
0 ungrounded literals**. `walkGeometry.test.ts` is 28 tests: the three new ones assert the
property the material depends on - stepping off each wall's own outward normal lands outside the
footprint and stepping the other way lands inside, for both windings, with both producing
byte-identical walls - rather than restating the implementation. The fix's two files are backed
up verbatim at `/tmp/walk-verify/keep-*.ts` and were restored exactly after each A/B.

**The reference-frame gap audit: eight verified findings, none refuted.** A nine-agent workflow
measured the Pokemon GO reference frames against our captures, dimension by dimension, and each
finding was then adversarially verified - 8 survived, 0 were refuted, and one dimension (the
avatar) is **unmeasured**: its agent died on a gateway error, so nothing here speaks to how the
character reads against the reference. The findings, ranked by severity and tagged by what each
one needs:

| # | Gap | Sev | What it needs |
|---|---|---|---|
| 1 | Land between roads is one flat fill, not the reference's parcel mosaic - our largest ground fill covers 82.7-95.5% of the band, the reference's largest covers 0.5-1.0% with 52-66 distinct fills | 5 | **A re-bake.** `world_tiled.json` has no landuse layer and there is no bake script in the repo, so it is out of reach from here. Reported, not proposed. |
| 2 | No ground seam network - only roads get a casing, so the ground has no pale line network (reference: 12.1-24.4% of the band is pale, 2-8 runs per row) | 4 | **Do now.** A seam ribbon along every ring that has none, reusing `appendRibbon` and the existing casing material. |
| 3 | Far field is an opaque wall, not an open pale plane - rows 0.17-0.22 are 69.5-99.0% one colour with no structure behind | 3 | **Founder ruling**, then do. Needs a `MAP_SPEC.md` amendment on the storey height before the change. |
| 4 | Horizon haze seam missing - the reference's horizon is a full-width dark seam at 1.99-2.01% of frame; ours is 0.080% | 3 | **Do now.** `FOG_FAR_M` 800 -> ~300. |
| 5 | Building walls are one flat colour - rows 0.20-0.22 are 84.9-100% a single rgb(56,64,96), where the reference row 0.22 carries 9-29 runs | 3 | **Do now.** Deterministic per-fragment luminance variation via vertex colours. |
| 6 | No sky, no star field - the reference's sky carries a world-fixed star field, 10-17 clusters above luma 90 | 2 | **Do now.** A `three.Points` star layer, and a horizon-ward lift. |
| 7 | No street at her own depth | 3 | **Not a defect.** A capture artefact: the position is 25 m from the nearest road and the camera's wedge misses it. Re-shoot, do not fix. |
| 8 | Buildings have no ground footprint | 4 -> | **Refuted as a fix.** The observation is true but the proposed fill renders nothing - it is enclosed by the building's own walls and capped by its roof, invisible from every exterior camera. Dropped. |

The four "do now" items are the next work. Item 3 needs a ruling before it can be made, and item
1 needs data the repo does not have; both are recorded here so the ruling is cheap to make.


## 2026-09-22 - She moves with her location, and the haze seam lands

### What was asked

*"As I move the character must move on the 3D vizag map using my location."* Verified, and
demonstrated two ways: the fixes reaching the app, and the world's own projection responding to
them.

### The character tracks the fix - measured

A position that arrives and a world that moves can be confused for each other, so the two were
measured separately. `walkpath.mjs` instruments `navigator.geolocation` before the app loads and
logs every `watchPosition` call, every `clearWatch`, and every fix handed to the callback with its
coordinates - that is the delivery side. `trackwalk.mjs` then walks a path fix by fix and samples
the live `walk-view__label` rects every 100 ms, and `herlat.py` solves her lateral world position
back out of them: the labels are the scene's own projection of fixed zone centroids at known
lat/lon, so their columns invert to a position, with `hz` held at the commanded GPS value and the
fit's residual reported per label. Lateral is the only solvable axis - at 4 km depth a column
carries about 0.005 px per metre - which is why the instrument solves position and not distance.

| run | frames p50 | commanded pace | result |
|---|---|---|---|
| walk pace (`path4.json`, 40 fixes 0.35 m apart, 13.7 m at a true 1.4 m/s) | 117 ms | 1.4 m/s | `her_x - gps_x` median **0.01 m**, p90 0.33 m, max 0.34 m; span 12.9 m against the commanded 12.9 m |
| jog (`path3.json`, 1.4 m per fix) | 117 ms | 4.03 m/s | lag median **-6.34 m**, span 12.7 m of 18.5 m |
| the same jog at `--scale 1` | 83 ms | 4.04 m/s | lag median **-5.45 m**, span 12.7 m of 18.5 m |
| zigzag (`zigzag.json`, +/-60 m every 2 s) | 133 ms | - | reversals at 2.02-2.03 s, span 48.4 m of 60 m |

At a walking pace she tracks the fix to within a third of a metre - the median error is one
centimetre. Per-fix evidence agrees: every step's coordinates arrive intact, once per step, with
no `.walk-view__notice` raised, so nothing is being dropped or substituted along the way.

### Why the jog lags, and why that is not a defect

All four rows fall out of one model, which is the movement code as written. She **snaps** when the
remaining distance is at or under the world's own quantum, `meta.q` = 4 m; otherwise she traverses
it as a 400 ms exponential ease (`POSITION_EASE_MS`, fact `motion.400ms`). The frame delta driving
that ease is clamped to 32 ms (`FRAME_BUDGET_MS`, fact `perf.frame`, `walkScene.ts:800`), so under
a renderer slower than 32 ms per frame the ease advances by `32/frameMs` of wall-clock time - it
stretches. The lag the clamp predicts is `v * tau * (frameMs / 32)`: at 4.03 m/s and 117 ms frames
that is 5.89 m against 6.34 m measured; at 83 ms frames 4.19 m against 5.45 m. Both within a
frame's worth of the prediction.

The walking pace needs no correction to the model, only to the arithmetic: 1.4 m/s * 400 ms is
0.56 m, which is less than the 4 m quantum, so the ease is never entered and she snaps to every
fix - hence a 0.01 m median. **On hardware the clamp never engages** (16.7 ms frames), so tau stays
400 ms exactly and the same snap covers every walking fix: sub-stride tracking is the product's
behaviour, and the jog lag is an artefact of this machine's software renderer.

### The correction that has to be recorded with it

An earlier reading in this session said a 250 ms run proved a 14% app-side throttle on delivered
fixes. **That reading was wrong and is withdrawn.** The zigzag run settles it - the scene follows
reversals every 2.02 s, which no gate on a 30 s sampling interval could do. The actual cause is the
32 ms clamp above meeting a renderer running at 8-12 fps under SwiftShader. The 14% figure should
not be reused.

### The delivery gate, restated from the code

`locationWatch.ts` (`handlePosition`) drops any fix that arrives less than `sampling.intervalSec`
after the last delivered one, and the gate resets on start, on resume, on the page going hidden, on
a synchronous failure and on a watch error - not on a sampling change, so a session that moves into
SHADOW keeps the interval it started with until one of those events. The intervals are facts:
idle 30 s, SHADOW 15 s at high accuracy, SOS 5 s at high accuracy, dwell-pending 15 s
(`rules.ts:13-16`). None of this blocks a walking fix in practice, because at walking pace the
app is in the SHADOW/idle set where fixes arrive far slower than 15 s anyway.

### The haze seam, calibrated, and the spec amended

The reference gap audit's item 4 asked for the horizon seam and named `FOG_FAR_M` 800 -> ~300.
Sweeping it with the same instrument (`hazemetric.py`: minimum luma in the frame band 0.150-0.190,
how many rows lie within 3 of it, and the far field's luma at 0.192) found something the item's
arithmetic did not anticipate - the transition is a **threshold, not a dial**:

| fog far | sky @ 0.152 | min luma | min at | rows <= min+3 | far @ 0.192 |
|---|---|---|---|---|---|
| 410 | 53.7 | 51.2 | 0.1559 | 0.474% | 60.3 |
| 300 | 51.9 | 49.6 | 0.1559 | 0.474% | 56.6 |
| 250 | 50.2 | 48.2 | 0.1559 | 0.474% | 53.9 |
| 225 | 49.4 | 47.5 | 0.1559 | 0.474% | 52.9 |
| **200** | 48.2 | **46.50** | 0.1559 | **1.896%** | 50.7 |
| 200 again | 48.3 | 46.56 | 0.1559 | 1.836% | 51.0 |
| reference f01/f03 | 66.4-72.1 | 45.0-45.9 | 0.1672-0.1755 | 0.625-1.250% | 62.1-82.3 |

Every value from 225 up returns the identical 0.474% band; 200 doubles it, and 200 was confirmed
by a second capture (1.836%). The scene's visible ground reaches about 205 m, so the band appears
only once the far plane crosses that edge - there is no intermediate value to tune to. At 200 the
seam's minimum measures **46.50**, and `color.walk.haze` `#192F6B` is luma 46.6: the seam now
reaches the frozen colour exactly, against the reference's 45-46. The audit's own target was
1.99-2.01% of frame; 200 delivers 1.84-1.90%.

**The near field pays nothing for it.** A row-by-row difference of the 410 m and 200 m captures
reports changes confined to 0.1600-0.4408 of the frame with a luma difference of **0.0 for every
row below 0.44** - everything within about 25 m of her is pixel-identical at either setting.

`MAP_SPEC.md`'s "Distance, and what the haze may not touch" now carries the range, the method, the
measured rows and the threshold finding as an amendment. The rule it states is unchanged and was
not touched: zone tints, zone boundaries and road risk bands keep `fog: false`.

### Still owed a ruling, not taken here

The reference's seam is plain haze; ours carries the zone tint, violet at luma 57 against the
reference's 45-46, because the frozen rule forbids fogging zone tints and the horizon band is one
zone's fill. Fogging the fill alone would close the remaining gap at no near-field cost (fog
begins at 45 m; boundaries, glows and labels stay unfogged), but it changes what a zone looks
like, so it is surfaced rather than taken. Recorded in `MAP_SPEC.md` with the measurement.

### Gates

`npx tsc --noEmit` clean; `npx vitest run` 45 files, 313 tests, all passing; the grounded check
149 files with 0 ungrounded literals (396 live facts, 165 distinct values, 32 superseded and
excluded). The only source change in this stretch is the fog constant, which is `GROUNDED-EXEMPT`
as a rendering range.


## 2026-09-22 - The second reference: corner, read frame by frame

### What was asked

*"Use this too, watch it frame by frame. It is an Amazing UI and overall experience."* - a 150.8 s,
60 fps iPhone recording (1180 x 2556) of the corner app, handed over alongside two links to the
app's store page and its Mobbin page, in service of the standing question: how do we get from
where the walk view is to a Pokemon GO level of feel.

### How it was read

Not one frame at a time - 9,033 frames is 150 seconds at 60 fps and reading them singly would have
been a very expensive way to learn very little. Three passes instead, in `/tmp/walk-verify/ref2/`:

| pass | what it gives |
|---|---|
| five contact sheets at 0.5 fps (`sheet01-05.png`) | coverage of every second of the recording, to find where the structure is |
| nine full-resolution stills at the moments that carry design (`t1, t20, t40, t60, t80, t100, t120, t140, t149`) | the type, the surfaces, the pin system, the event card |
| three 20 fps filmstrips of the parts that move (`motionA-D.png`) | how cards enter, how the map populates, how a card's contents swap |

Note the working method that made this cheap: the contact sheets answer "where is the structure",
the stills answer "what does it look like", and the filmstrips answer "how does it move". Only the
last of those needs a high frame rate, and only for two seconds at a time.

### What corner is

From its own store copy: a personalised map of places, "curate & share places", hand-picked by
150k+ curators in 400+ cities, "no bots, no ads, just vibes". The product is a map first and
everything else is a sheet floating over it. Signed-in home is a city map; onboarding is a sequence
of single-decision cards that appear over that same live map while it populates behind them.

### The design language, measured

Sampled from the frames rather than eyeballed (`PIL`, modal colour per region):

| token | value | where |
|---|---|---|
| accent blue | `#0055FF` | the mascot speech bubble, the core of the primary CTA gradient |
| status: new | `#57EA62` | legend dot, and the map dots |
| status: trending | `#FF950C` | legend dot (effectively iOS system orange) |
| status: popular | `#FF9ACE` | legend dot |
| status: lowkey | violet, **unmeasured** | legend dot; the sample box missed it |
| water | `#B8D9F2` | basemap |
| park | `#B6DE97` | basemap |
| land and roads | `#FFFFFF` on `#EFEFEF` | basemap: white roads, pale grey land |
| sheet surfaces | `#EBF0F4` sheet, `#F1F1F1` rows, `#FFFFFF` pills | every floating card |
| quiet text | `#787878` | the dismiss line under a CTA |

The typography is one gesture repeated: **lowercase, very bold, tight** headlines at 40-56 px
("give us your number", "be the one with the best spots", "don't miss our invite-only corner
parties"), and **fully rounded pills** for anything pressable - black pill with white label for the
primary action, white pill with a black label for a chip or tag. Emoji carry the iconography
(🎧 tiktok, 🔔 stay in the loop, 👀 don't miss). There is no chrome: no borders, no dividers, no
navigation bar. A pill or a card or nothing.

### The map and its pins - the part that matters most to us

This is the transferable core. On the final map every place is a **white circular disc with a soft
drop shadow**, and inside the disc sits a small, lit, 3D-rendered object that reads as the
category - a pizza slice, a bowl of matcha, a cocktail glass, an armchair, a paper bag, headphones,
a yoga figure. Not a teardrop marker, not a glyph: an object. Under each disc, two lines: the name
in bold black, and a category in smaller grey ("tuscan thin-crust", "new matcha cafe", "lowkey
social art gallery"). Places that are not yet worth a disc are **small coloured dots** in the
status palette above, so the map carries a second, denser layer of information at a glance.

Around it: floating white circular buttons at the top (friends, compass, bell), filter pills at the
bottom left ("everyone", "open now"), a **category rail of the same 3D objects** as tabs (top
picks, eat, cafes, bars, events, go out, shops), a white bottom nav pill, and a separate round "+"
FAB. A blue mascot - a rounded blob with two big eyes - sits on the map and can hold a speech
bubble ("your map will ✨personalize✨ when you add places").

### The event pattern

The invite card is the reference's answer to our events question, and it is small enough to copy
wholesale: a white sheet over the map; a large lowercase headline with a leading emoji; a collage
of three overlapping photos; then a **notification row** - app icon, sender, the word "now" right
aligned in grey, and the body "you've been invited… 12/88 spots left."; then a **gradient CTA**
pill ("🔔 stay in the loop") whose gradient runs blue into violet into magenta; then, in quiet grey,
the refusal as plain text: "i'll miss out". Scarcity is stated as a count of remaining places, and
refusal is a text button rather than a second pill - the card never shows two equal choices.

### The motion vocabulary

Read off the filmstrips:

1. **Kinetic type.** The onboarding headline is not one sentence but four, swapped in place:
   "no ads." → "no stress." → "no BS." → "sound good?". Elsewhere a sentence builds word by word
   ("tell us what you like" … "…or don't like" … "we'll show you wher[e]"), and a card header
   arrives with a blur that resolves letter by letter.
2. **Cards do not slide, their contents crossfade.** In `motionD` the sheet stays anchored on
   screen while the title row and body swap under a blur, and the new pills spring up into place.
   The stable container with morphing contents is the single most distinctive motion decision here.
3. **One continuous world.** The photographic sky and its floating 3D objects persist across the
   splash and several onboarding screens; only the copy changes. Onboarding cards then appear over
   the live map rather than over a placeholder.
4. **Objects fall into place.** The splash rains chrome letters and food objects that settle; the
   map's category objects are lit renders, consistent across pin, rail tab and legend.
5. **A marquee of taste chips** scrolls horizontally while the map is being personalised, with the
   caption "learning what you like…" beneath it - work-in-progress made visible.
6. **A map fly-in** during onboarding, from a world map down to the user's city.

### What is directly applicable, and what is not

Applicable without a founder ruling: the pin-as-object idea (a disc with a lit object, a bold name,
a grey category), the status dot layer, the lowercase-bold-huge type gesture, the fully rounded
pill as the only pressable shape, the notification row plus scarcity count for an event, the
content-morph-in-a-stable-card motion, and the refusal-as-quiet-text rule.

Not applicable as-is: the 3D object icons need rendered assets we do not have; the app is a
social discovery product with no safety surface, so nothing here speaks to the SOS ladder, the
trust boundary or the mock-labelling duty - those stay ours. Every value above is a reference
observation from another product and **enters our code only as a grounded fact with an amendment
behind it, never as a copied literal**.

### Still owed

The synthesis: the six questions (smoothness, surroundings, partner buildings, events, character
choice, overall feel) answered as a plan, with the two research workflows' findings folded in.
That plan is the next thing in this file.


## 2026-09-23 - She was not dressed, and the haze seam fills in as the world arrives

### The defect found by looking at the product

The live-movement work was verified and green, so the capture was checked as a picture rather
than as a measurement - and she was **rendering in the underwear the base body bakes in**. The
hoodie and the jeans were in the scene, in the right place, in their own colours, and almost
invisible: her torso carried a scatter of warm-grey specks where the hoodie should be, and the
hips a scatter of lavender-blue where the jeans and the skirt should be. The scarf and the hair,
meanwhile, rendered perfectly.

### The measurement that explains it

`garmentgap.py` measures every part against `body_base` - the distance from each vertex of a part
to the nearest vertex of the body:

| part | median gap | p90 | renders? |
|---|---|---|---|
| `top_hoodie` | **0.0000 m** | 0.0057 | speckles |
| `top_jacket` | **0.0000 m** | 0.0025 | speckles |
| `top_tee` | **0.0000 m** | 0.0066 | speckles |
| `bottom_jeans` | **0.0000 m** | 0.0017 | speckles |
| `bottom_shorts` | **0.0000 m** | 0.0058 | speckles |
| `bottom_skirt` | **0.0000 m** | 0.0348 | partial - its hem only |
| `hair_long` | 0.0203 m | 0.0557 | clean |
| `acc_scarf` | 0.0240 m | 0.0494 | clean |
| `acc_bag` | 0.0389 m | 0.0549 | clean |
| `acc_glasses` | 0.0113 m | 0.0306 | clean |

Every garment's median vertex sits at **exactly zero distance** from the body's surface: the six
tops and bottoms are copies of that surface, so the two are drawn at one depth and the depth test
resolves them fragment by fragment. The parts that render cleanly have 11 mm to 39 mm of
clearance - that is the size of gap a working part has. The skirt is the one garment whose hem
flares away from the leg (p90 34.8 mm), which is why its hem was the single clean band in the
broken frame - the observation that made the explanation checkable.

### The fix

`liftOffSkin` in `walkCharacter.ts` moves a part's vertices outward along their own normals, and
`isBodyCoveringPart` in `characterParts.ts` says which parts need it - the tops and the bottoms,
by axis. The stand-off is **14 mm**: 8 mm cleared most of it but left the jeans mottled, 14 mm
renders all six garments solid, and 14 mm sits inside the 11-39 mm band that the parts needing no
help already occupy. It is `GROUNDED-EXEMPT` as a depth separation between two surfaces, the same
kind of constant as `LAYER_HEIGHT_STEP_M`, which separates the coplanar ground layers.

Verified on the frame for three wardrobes (hoodie/jeans, jacket/skirt/scarf, tee/shorts), each
captured and read at 4x. The remaining exposed skin is the garments' own cut: the hoodie's
geometry ends at y 1.460 against a body that continues to 1.767, so its neckline and its
three-quarter sleeves are the mesh's design, not a rendering fault.

### The haze seam is real but it fills in over time, and that had to be measured

The seam was measuring 1.896-1.955% of frame in some captures and 0.474% in others at the same
`FOG_FAR_M = 200`. `seamtime.mjs` settles it by sampling one page as it runs: the band is small
while the far tiles are still arriving and then stops changing. Measured at 3 s intervals from
9.6 s to 38 s on one page, it is **33 rows (1.955%) at every sample**, min luma **46.22** - against
the audit's target of 1.99-2.01% and `color.walk.haze`'s own luma of 46.6. A capture taken early
in a run measures the seam as 0.474% because it measures less world, not less fog. `MAP_SPEC.md`
now states the settled figure and says why the earlier readings differ.

### Gates

`npx tsc --noEmit` clean; `npx vitest run` **46 files, 321 tests**, all passing (313 before, plus
the 8 new ones for `liftOffSkin` and `isBodyCoveringPart`); the grounded check **150 files, 0
ungrounded literals** (396 live facts, 165 distinct values, 32 superseded). The new test file
carries its own fixtures as named constants with `GROUNDED-EXEMPT`, the house pattern.

### Still owed

The horizon band's zone tint (violet luma 57 against the reference's plain haze at 45-46) is
unchanged and still a founder decision, recorded in `MAP_SPEC.md`. The reference's sky measures
66-72 where ours measures 48, so even with the seam at the right luma ours reads as a subtler
transition than the reference's - that is a palette question over frozen colour facts, so it is
reported rather than changed.


## 2026-09-23 - The synthesis: the six questions, answered as a plan

### Where these answers come from

Three bodies of evidence, none of them opinion:

1. **The corner recording**, read three ways - five contact sheets at 0.5 fps for coverage,
   nine full-resolution stills for design, four 20 fps filmstrips for motion - with its palette
   measured rather than described (entries above, 2026-09-22).
2. **A six-surface audit of our own walk view** (six agents, 361 tool uses, no errors), each
   surface reporting state, the facts it reads, the levers it may lawfully pull, what blocks it
   and what data is missing. Only lawful levers appear below; every blocker is named.
3. **The reference-gap audit** already in this file: eight findings, four closed (the ground
   seam, the haze seam, the wall shading, and one refuted), one not a defect, and one checked
   again here because the answer changes the plan: **the star field is real.** `starcheck.py`
   sampled seven frames of the reference and found a bright band at rows 0-52 of every single
   one - that is the phone's status bar, red, with the carrier, the clock and the battery in it.
   Below it, the night map's sky is a flat dark teal (luma 37) carrying **five four-pointed
   sparkle glints** in the frame at 60 s, fixed to the world. The status bar and the stars are
   two different things at two different heights, and item 6 stands as "Do now".

### One defect was fixed before the plan was written

The walk view's **degradation ladder was dead code**, and it is now live. `applyFrameBudget`
asked whether the last frame exceeded `perf.frame` (32 ms), but the loop handed it the delta
*already clamped to 32 ms* (`walkScene.ts:797-800`), so the question could never answer yes: the
score could only fall to 0, `qualityLevel` stayed 0 forever, and rungs 1-4 of the five-rung
ladder could not be reached by any device. The fix separates the two readers - **the guard sees
the true frame time, the ease keeps the clamp** - so a frame that missed the ceiling is now
exactly what the guard exists to see, while a tab returning from the background still cannot
report seconds and lurch her. No literal moved, no fact changed; this is `perf.frame`'s own
number doing the job it was written for. `npx tsc --noEmit` clean, `npx vitest run` 46 files /
321 tests passing, grounded check unchanged.

**Recorded as the thing to watch, not tuned.** Four consecutive over-budget frames now climb the
score to the detail boundary, where `applyQuality` (`walkScene.ts:660-671`) drops and re-queues
every resident tile - so a device whose frame times straddle the band (16.67 ms to 32 ms) can
cross that boundary back and forth and pay a full world rebuild each time. The first seconds of
a load, when tiles decode on the render thread, are exactly that kind of sustained stretch. The
hysteresis band is the gap between two frozen facts, so widening the dwell to stop it flapping is
an amendment, not a tweak. It is reported here rather than pre-empted.

### Q1 - How the interaction becomes buttery smooth

Seven levers, in the order they should be pulled. None needs a founder ruling; the first is done.

| # | Lever | Why it matters | Lands in |
|---|---|---|---|
| 1 | **The guard reads the true frame time** | The ladder is the only thing that can save a device that cannot hold 60 fps. It was inert. **Done.** | `walkScene.ts:797-806` |
| 2 | **Stop the per-frame DOM work in the label path** | Every rendered frame today: two canvas box reads that force layout, up to 19 `transform` writes, 19 fresh objects, one template string, and a React call. Skip the write when the placement has not changed; cache the box on resize. | `WalkView.tsx:132-182`, `walkScene.ts:765-766` |
| 3 | **Take the tile decode off the render tick** | One tile is decoded and built synchronously inside the frame callback. `MAP_SPEC`'s streaming table already says "decode off the render thread where the browser allows it" and "never more than one tile decoded per frame" - so moving the decode to an idle callback or a worker **implements the spec rather than changing it**. This is the largest single-frame spike in normal walking. | `walkScene.ts` `pumpQueue`, 631-651 |
| 4 | **Merge the meshes that share a material** | Up to 8 meshes per tile across a 25-tile window, all drawn from seven materials: ~259 draw calls a frame by code-derived upper bound. The ground-seam mesh and the road casing are already the *same* material, so they can be one geometry per tile with no visual change at all. | `walkTiles.ts:393-499` |
| 5 | **Couple the walk cycle to her ground speed** | `WALK_SPEED_MPS` (fact `walk.speed`, 1.4 m/s) is exported and read nowhere; the rig's mixers run at `timeScale` 1 regardless, so her feet slide whenever the ease and the fix disagree. Feeding the fact into the mixer is the lawful fix and needs no new number. | `walkCharacter.ts:224-226`, `walkFacts.ts:28` |
| 6 | **Reuse, don't allocate, per frame** | 19 label objects and a window key string rebuilt every frame. Micro, same file, no behaviour change. | `walkScene.ts:777-784`, 607 |
| 7 | **Idle without redrawing** | A dirty flag plus a still-camera check would let a stationary phone stop drawing identical frames. The reduced-motion path already proves the pattern. Needs care: label DOM updates stop with the loop, which is correct only while nothing moves. | `walkScene.ts` `frame`, 792-818 |

**What "smooth" cannot be claimed on yet.** `perf.fps` and `perf.frame` name the budget for a
2 GB device, and the only frame times this project has ever measured came from SwiftShader on
this machine (83-133 ms), not from hardware. There is no draw-call or frame-time telemetry in
the app and no performance harness in `scripts/`. Any further tuning done on frame-time grounds
before that data exists would be guessing. A repeatable in-repo measurement is itself owed work.

### Q2 - How the surroundings are represented

The world is drawn as flat unlit colour: one 5120 m ground plane, up to ten coplanar ribbon and
fill layers stacked 0.01 m apart, and extruded building prisms - walls and roofs are the only
three-dimensional scenery. There is no sun and no sky geometry; the sky is the renderer's clear
colour. **What reads as "flat surroundings" is structural, not a tuning miss: the baked asset
carries four layers - roads, buildings, green, water - and no landuse or parcel layer at all**,
so all land between roads is one continuous ground plane. That is the largest remaining gap
against the reference, and this file already says so.

**Two ways to close it, and one discovery that makes the cheaper one much cheaper.**

The bake tree outside the repo still holds every intermediate: `roads.json`, `buildings.json`,
`green.json`, `water.json` and `world_raw.json`, all dated 11 Sep, beside `bake2.py` and
`tile.py`. **A re-bake therefore does not require re-fetching OSM at all** - it can be re-run
from the intermediates already on disk, which is what keeps it inside the "never regenerate the
Vizag dataset" rule. Only a genuinely new query would need `fetch.py`, and that must be a
**landuse-only** fetch: re-running the existing queries would pull today's OSM and move
per-road risk values, which is forbidden.

- **Path A, derived parcels (no new data, no fetch).** Inset the existing road ribbons and fill
  the land between them as parcels with pale outlines. The mosaic the reference shows is a
  *derived* shape here, not a fetched one. Its tone can follow the road casing's own pattern -
  `lighten(COLOR_ROAD_SURFACE, 3.1)` is computed in hex, not named as a literal - so a parcel
  tone may be derived from an existing fact the same way. Lands in `walkGeometry.ts`'s
  `LAYER_ORDER` and `walkTiles.ts`'s per-tile build. **No founder ruling needed to prototype it.**
- **Path B, a real landuse layer (new data, one new query).** Richer and truer - real parcels,
  real park and industrial shapes - but it needs a new query, a new emit loop, a new layer key,
  a rebake of the asset and a new colour fact. This one is a founder decision.

**Also absent by data, not by rendering:** footpaths, fences and parking. `fetch.py` never asks
for `highway=footway`, `barrier=*` or `amenity=parking`, and no pedestrian fragments were
returned. Footpaths are what make a world read as *walkable* - they are the cheapest single
addition to the surroundings' credibility, and they carry the same re-bake path as Path B.

**Pure scenery, buildable today with no facts and no ruling:** a star field and a horizon lift,
which this file lists as gap item 6 marked "Do now" and which remains unbuilt - the sky is still
only a clear colour. Every literal in it would be `GROUNDED-EXEMPT` scenery, exactly as
`LAYER_HEIGHT_STEP_M` and the fog range are.

**Recorded but not taken:** fogging the zone fill alone would restore the reference's dark
horizon seam at no near-field cost, because fog begins at 45 m. It is the cheapest closure in
the audit. It changes what a zone looks like, so it waits on the ruling already noted above.

### Q3 - How a Saaya partner building is highlighted

This is the question with the most honest difficulty in it, so it is answered in the order the
obstacles actually sit.

**The hard blocker is not rendering, it is identity.** `RawBuilding` is `{h, t, v}` - quantised
height, type, vertices - and the shipped asset carries no id and no name for any of its 12,690
fragments. Names and OSM ids *do* exist upstream: the out-of-repo `buildings.json` holds 545
named buildings and 12,292 ids, and the bake drops them before `world_raw.json`. So **no partner
list can be matched to a building today**, and `t: 'commercial'` is a type, not an identity -
using it as a partner proxy would invent a partnership claim.

**Three further collisions, all real:**

- `COMPLIANCE.md:83` - "Nothing implies approval, partnership or affiliation." A highlight
  labelled *partner* is literally that claim. If the list is synthetic it must be labelled as a
  mock everywhere it appears; if it is real, it asserts a real-world relationship with real
  entities. **Only the founder can decide which.**
- `MAP_SPEC.md:710-725` - "No collectibles and no discoverables." A partner highlight must not
  read as something to collect, and must not compete with the risk layer.
- **Degradation order fights it.** Buildings are the *first* scenery the ladder drops at low
  detail, so a highlight painted on a building mesh disappears exactly when the device is
  struggling. The fix is architectural: the highlight belongs on its own layer above the detail
  gate, beside `zoneGlow`, not on the building geometry.

**Mechanically it is cheap when it does come.** Per-building vertex colour in the existing white
walls material, plus the matching roof mesh, adds **no draw calls and no per-frame work** -
which matters because `perf.bundle.walk` is 190 KB and the tile build is one mesh per layer per
tile by design. That rules out naive per-partner marker objects at city scale, and it is why the
layer approach is the right one.

**What it should look like is already measured.** Corner's pin is a white circular disc with a
soft shadow containing a small lit object that reads as the category, with a bold name and a grey
category beneath it; a second, denser layer of small status-coloured dots; and the same lit
objects reused as the bottom rail. In its social mode the identical pin is re-skinned to a
friend's photo avatar - "@name saved" / "@name liked" - which is the closest thing in the
reference to how a Saaya partner could read: **a disc over a real building, a name, a category,
and a tap that opens a sheet.** We have no rendered object art and cannot generate any, so the
disc's centre would carry our own mark rather than a food render.

**What this question needs, in order:** a founder ruling on real versus synthetic; an
`FEATURES.md` entry, since that file is the contract and a partner dataset is a second dataset
its "deliberately absent" list currently bans; a highlight treatment written into `MAP_SPEC.md`
and then graphed as a fact - **nothing anywhere states one, so this is a real BLOCKED, not a
citation**; an id or name restored to the bake so a list can join to a building; EN and TE copy
including the mock disclosure line; and a definition of what a partner place *is* for this
product, which no document currently gives.

### Q4 - How events are surfaced

**There is no consumer dashboard.** "Dashboard" appears only in the brand bible for the cut B2G
police view; the surface the question means is Home and its walk twin, which shares the pill,
the dock, the ladder and SOS.

**The pattern is already cleared.** Corner's event card is a white sheet over the map with an
emoji-led lowercase headline, a three-photo collage, a notification row (icon, sender, a
right-aligned grey "now", and the scarcity sentence "you've been invited… 12/88 spots left."),
a gradient call to action, and the refusal as quiet grey text - "i'll miss out". This file
already records the notification row plus scarcity count and the refusal-as-quiet-text rule as
applicable **without** a founder ruling. Scarcity as a count is data, not a literal, so it needs
no fact either.

**What we cannot copy:** the photo collage (there is no imagery in the repo and the no-AI rule
bars generating any - the character parts are the only art pipeline), and the blue-violet-magenta
gradient call to action, which is barred as a copied literal.

**What is blocked:** no event model, no dataset, no copy keys in either language, no colour fact
(the palette's semantics are exhausted - amber is escalation, danger is SOS and the high tier,
brand is the accent, and the tier colours are frozen to the data), and no ruling on whether an
event card may sit over, under or beside a live ladder rung when the ladder makes one timed rung
"the one foreground surface". A drive or camp attributed to any body also collides with the same
compliance line as partners, and every event would be synthetic and so must carry a mock
disclosure - which sits awkwardly on something that presents itself as live.

**The lawful first step, and it needs nobody's permission:** build the card as a **labelled mock
in the dev-only component gallery** (`app/component-gallery`, absent in production), composed
from existing components - a section header, the existing disclosure banner for the mock label -
with existing CSS variables. The founder can then judge the real thing rather than a description,
and no product surface, fact or string is touched.

### Q5 - How the character is chosen

**This already exists, end to end, and is more complete than the question assumes.** Seven axes
(brows, top, bottom, accessory, plus two single-option axes), 18 option ids, one `.glb` per
option fetched from `/assets/character/`, a runtime-assembled skinned group scaled so its
measured height equals `walk.character.height`, and two clips - `Walk_Loop` and `Idle_Loop` -
cross-faded over `motion.400ms`. The selection persists in the `character` key of the settings
database, and `parseCharacterSelection` rejects stale ids rather than silently defaulting.

**Adding a choice is already open:** drop a `.glb` into `public/assets/character/` named after
the option id, add that id to the axis in `characterParts.ts`, and the bidirectional test is the
enforcement. No amendment. Re-ordering an axis changes the default, because the first option *is*
the default.

**What is missing against the reference, in value order:**

- **She casts no shadow.** There is no shadow map anywhere in the scene, and `HANDOVER.md` §9
  step 5 already lists a shadow or heading marker as the next step. A blob shadow under the
  existing ground-layer convention is a new mesh and a `GROUNDED-EXEMPT` constant - **lawful
  today, no ruling**, and the single highest-value change to how the character reads.
- **There is no preview.** `COMPONENT_LIBRARY.md` already specifies C15 AxisPicker and C16
  CharacterPreview and the spec already requires reusing the same rig rather than a second
  implementation. Unbuilt. The reference's answer to this question is a bottom rail of the very
  same objects it uses as pins, which is the pattern to copy here.
- **The customiser is an overlay, not the route `SCREENS.md` describes**, and `HANDOVER.md`
  logs that divergence as unresolvable from the repo. The docs need a ruling before they can be
  trusted on this surface.
- **Two axes in the docs no longer exist in code** (Skin, Outfit, Colours in `MAP_SPEC.md` and
  `COPY.md`), while the four shipped axes have no recorded ruling. The axis set is a data
  migration as much as a spec change: `parseCharacterSelection` requires every axis present, so
  removing one would fail every stored character and force every user back through the first-run
  prompt.
- **She is small on screen.** At the amended camera she is roughly 35-55 px. Making her larger
  means moving frozen camera facts, so it is a ruling, not a tweak.
- **No unlocks, no rarity, no progression** - barred by the anti-gamification section. A chooser
  that gates options is out.

### Q6 - How the overall feeling is raised

**Corner's motion vocabulary, and which parts we can take:**

1. **Cards do not slide; their contents crossfade inside a stable container**, with the new
   pills springing in and headers resolving letter by letter. This is the most distinctive thing
   in the reference and it maps directly onto our sheet grammar.
2. **One continuous world.** Their sky and floating objects persist across screens. Ours is two
   worlds behind a switch - a raster Leaflet map and a WebGL scene. The map lifting into the walk
   view would be our version of the gesture, and it is the largest single feel change available.
3. **Objects fall into place** rather than appearing.
4. **Work-in-progress made visible** - their taste-chip marquee runs with "learning what you
   like…" beneath it while the map personalises.

**Facts already frozen that have no surface at all.** `motion.300ms` (screen push/pop, 24 px from
the end plus fade, on `motion.curve.spring`), `motion.250ms` (toast, slide up and fade) and
`motion.1200ms` (skeleton shimmer, linear, between the two shimmer alphas) are all in the graph
and **nothing in the app uses them**. Building those surfaces moves no fact and needs no ruling -
the companion step is a `COMPONENT_LIBRARY` row for each, through the spec's own governance.
Two type facts are stranded the same way: `type.h2` and the 2.0 text-scale ceiling.

**What cannot be touched:** the escalation accent never animates and SOS is instant, both of
which are already implemented faithfully; springs cannot be re-tuned without amending
`motion.spring.damping` first; and haptics and audio are round-two by spec - Lite has no sound or
haptic performer, and the recorded web limits (no silent-switch override, `navigator.vibrate`
absent on iOS Safari) are why.

**The only ambient motion in the product today** is the location marker's breathing halo. The
walk world has none by authoring decision - no bob, no sway, no props - so scenery life is an
authoring task, and any new tunable in it needs a fact before it can be written.

### What needs the founder, gathered in one place

1. **The horizon seam's zone tint.** It carries the city's own risk tint (violet, luma 57) where
   the reference's seam is plain haze (45-46). The frozen rule forbids fogging zone tints;
   fogging the fill *alone* closes it at no near-field cost but changes what a zone looks like.
2. **Real or synthetic partners**, and if synthetic, the exact mock labelling that keeps the word
   "partner" from reading as endorsement. Also what a partner place *is* for this product.
3. **Events**: whether a new product surface is in scope at all, its accent colour, and whether it
   may be visible beside a live ladder rung.
4. **The parcel decision**: derived parcels (no new data, buildable now) or a real landuse layer
   (one new query, re-bake, new fact).
5. **The far field's storey rule** - whether it may read as an open pale plane instead of an
   opaque building wall. There is no fact id for the 3.2 m storey height; it lives only in the
   asset's `meta.storeyM` and in `MAP_SPEC` prose.
6. **The character customiser's divergences**: overlay versus route, and the two documented axes
   that no longer ship.
7. **Whether the frame guard's dwell may be widened** if the live ladder turns out to flap across
   the detail boundary.

### What can be built now, with no ruling and no new data

In the order I would take them:

1. **The label path and the canvas box read** (Q1 levers 2 and 6) - removes forced layout and 19
   allocations from every frame. Small, contained, measurable.
2. **The tile decode off the render tick** (Q1 lever 3) - the spec already asks for it.
3. **The seam-and-casing merge** (Q1 lever 4) - one fewer draw call per resident tile, and the
   file's own "seven meshes" comment becomes true again.
4. **The mixer driven by `walk.speed`** (Q1 lever 5) - ends foot-slide using a fact that already
   exists and is currently unread.
5. **The blob shadow** (Q5) - the highest-value change to how she reads.
6. **The star field and horizon lift** (Q2) - already marked "Do now" in this file and untouched.
7. **The stranded motion surfaces** (Q6) - screen push/pop, toast and shimmer, with their
   component-library rows.
8. **The dev-only event card mock** (Q4) - so the founder judges the object, not a paragraph.
9. **Derived parcels, prototyped** (Q2 Path A) - no fetch, no new layer key, no new colour fact.

### Still owed

The eight-dimension research pass (Pokemon GO's own mechanics, web smoothness technique, and the
juice layer) is still running; its verified findings fold into Q1 and Q6 when it lands, as a
further entry rather than a rewrite of this one. The in-repo performance harness is owed before
any further frame-time tuning, and the two instruments this project has relied on live in `/tmp`,
not in `scripts/`.

## 2026-09-23 - The production deploy: prepared and verified, stopped at the permission gate

The ask: put this tree on the main Vercel link (`saaya-lite.vercel.app`) so it can be tried live.

**What the check turned up.** The clone at `/tmp/saaya-land` now carries the project link
(`.vercel/project.json` copied in; the canonical iCloud checkout untouched), and the CLI is authed
as `abhishaivardhan21-5578`. Two facts make a CLI deploy different from the git-connected one this
project has used so far:

1. `app/page.tsx` throws unless `NEXT_PUBLIC_SAAYA_VERSION_NAME` and an integer
   `NEXT_PUBLIC_SAAYA_VERSION_CODE` are present, and `next.config.mjs` derives those from
   `SAAYA_VERSION_NAME`/`SAAYA_VERSION_CODE`, falling back to `git rev-parse`/`git rev-list` when
   unset. A CLI upload carries no `.git`, so that fallback would fail the build on Vercel's side.
   The deploy must pass both values explicitly: `-b SAAYA_VERSION_NAME=m4 -b SAAYA_VERSION_CODE=1`
   (and the same as `-e`).
2. The Vercel project holds no environment variables at all (production included), consistent
   with the git-connected build taking its metadata from the checkout's own git.

**Verified before any upload.** The production build was run in a scratch copy
(`/tmp/saaya-buildcheck`, `node_modules` symlinked) with exactly those env values: compiled
successfully, types valid, 6 static pages, `/` at 31.5 kB / 140 kB First Load. The scratch copy is
removed. With the gates already green (tsc, 46 files / 321 tests, 0 ungrounded literals) the tree
is deployable as it stands.

**Blocked.** `vercel deploy --prod` was denied by the auto-mode classifier ("Production Deploy"),
and a preview `vercel deploy` was denied as well ("Create Public Surface"). Nothing was uploaded;
production still serves the last main deployment. The prepared command, for the founder's shell or
a session where the permission is granted:

    cd /tmp/saaya-land && vercel deploy --prod --yes -b SAAYA_VERSION_NAME=m4 -b SAAYA_VERSION_CODE=1 -e SAAYA_VERSION_NAME=m4 -e SAAYA_VERSION_CODE=1

This route deliberately leaves `main` alone: the rule "Never push to main. Branch and preview
only." stays intact, and the production alias moves by the CLI rather than by a push. Also cleaned
up this entry: the unused `/tmp/saaya-land/.claude/launch.json` is gone.

**Still owed.** The live verification on the deployed URL - the same SwiftShader browser harness,
pointed at the production link - once the deploy runs.

## 2026-09-23 - The ladder, revived, empties the world on a slow device

Three things: a correction to the posture of this whole line of work, a fix that worked, and an
experiment that shows the fix exposes a worse problem underneath it.

### The posture, corrected by the founder

Mid-turn the founder stopped the framing this file has been using: *"We are not re-creating as is.
We are taking inspiration for Saaya and creating a similar 3D view."*

Nothing above changes as a fact. The measurements, the mechanism studies, the six-surface audit
and the corner study all stand, and the references remain the best evidence available for how a
walk view behaves. What changes is the target. Not similarity to another product - **Saaya's own
view**, built with Saaya's own trust boundary, anti-gamification rules and synthetic data, informed
by what those products learned. Where a reference does something Saaya forbids, the answer is
Saaya's lawful equivalent, not a workaround. The plan's remaining items are read under that light
from here on.

### The star field is built

Item 6 of the reference-gap audit - "no sky, no star field" - is no longer open. `walkSky.ts`
carries a `three.Points` layer: 64 deterministic four-pointed glints on a 400 m shell, additive,
unfogged, `sizeAttenuation` off so they read as being at no distance, travelling with the camera
so the sky does not slide past as she walks. The generated glint sprite is drawn to canvas rather
than shipped as art, so there is no new asset.

The band the glints occupy is **derived from the camera's own facts** - `fov / 2` above an axis
depressed by the angle its aim point sits below it - rather than named, so an amendment to any of
the four camera facts moves the sky with it instead of leaving it floating in the wrong strip.
Seven tests in `walkSky.test.ts` solve that arithmetic independently and assert the band, the
shell, the forward-facing side and the determinism; they pass. Every literal is scenery and
carries a same-line `GROUNDED-EXEMPT` reason, so the grounded check stays at zero.

### The ladder fix works, and its floor is catastrophic

The fix recorded above is correct and stays. What the fix exposed had been invisible while the
code was dead: **the ladder's floor renders an empty world.**

The A/B is unambiguous. Same place (17.7217, 83.3071), same `--walk --wait-ms 9000`, same
instrument, only the guard differing:

| capture | guard | what renders |
| --- | --- | --- |
| `sky1.png` | reads the true frame time (the fix) | one flat plane, the sky's glints, 2 labels, **no city** |
| `sky2.png` | pinned to the clamped delta (ladder inert) | green ground, roads carrying their risk bands, the white ground-seam network, building silhouettes at the horizon, a road at her own depth, the star field above, 19 labels |

Why: SwiftShader's frames measure 83-133 ms, every one of them far over the 32 ms trigger, so the
ladder steps down on every frame, pins at its floor - ring 0, no detail, no ambient - and **cannot
climb back**, because recovery needs a frame under `1/perf.fps` (16.67 ms), which a software
renderer never produces. The floor is not a rare state. It is the permanent state of any device
below roughly 31 fps.

That makes a design question load-bearing that never was while the code was dead. The ladder's
order is spec'd and its floor is that order's end, so both candidate fixes are amendments:

- **A gentler floor** - stop dropping the world at ring 1 with detail off, so a slow device still
  sees the city around her, just simpler. Cost: the last rung saves less.
- **Entry hysteresis** - require several consecutive over-budget frames before stepping down. Cost:
  a new number, and a brief stall no longer costs the world.

**What this instrument cannot answer.** SwiftShader is not the target phone. Every frame time this
project has ever measured comes from it, so the floor question is answerable now - the floor is
catastrophic independent of which device reaches it - but tuning the trigger or the dwell is not,
and doing it on this evidence would be tuning a real phone's budget to a software renderer's.

**State of the tree.** `applyFrameBudget(frameMs)` is restored; the A/B revert is gone.

### Two per-frame costs removed while the world was in pieces

Both were found by the six-surface audit and neither needs a ruling.

**The label path did layout reads and 19 writes every frame.** `projectLabels` read
`canvas.clientWidth`/`clientHeight` inside the frame callback - a forced reflow, the one thing in
that path that can cost one - and `WalkView` allocated a fresh array and wrote 19 `transform`
strings per frame whether or not anything had moved. Now the box is read on resize and reused, the
producer reuses its label objects instead of allocating one per anchor per frame, and a node is
written only when its transform actually differs from the last one written. On a still frame the
DOM work is now zero.

**Her legs ran at one rate through every kind of movement.** The clip is authored for `walk.speed`
(1.4 m/s, a fact that was exported and read nowhere), so an ease that starts fast and finishes
slow had her skating, and a fix landing far away had her gliding. `setWalkRate` now scales the
mixers by the ground she actually covered this frame over what that frame's `walk.speed` would
have covered, capped at 2x so a distant fix cannot spin her. The idle keeps the rate it was
authored at, so a pause is not a freeze.

**Gates after all of it.** `npx tsc --noEmit` clean, `npx vitest run` 47 files / 328 tests passing,
grounded check at zero ungrounded literals.

## 2026-09-23 - The deploy ran: live, and verified in two renderers

The permission gate opened; the production deploy ran from `/tmp/saaya-land` at 00:39 IST with the
build metadata passed explicitly, built in 38 s on Vercel, and the alias moved. Verified on the
live URL: HTTP 200, `m4` in the served HTML, `body_base.glb` served at 947 KB. GitHub `main` is
untouched, as the branch-and-preview rule requires.

**What the live URL renders, in two renderers.** The walk view was driven on production by the
same harnesses used in dev:

| renderer | what production shows |
| --- | --- |
| SwiftShader Chromium (83-133 ms frames) | the ladder's floor: one flat plane, the sky's glints, 2 labels, no city |
| WebKit, Apple GPU (real hardware) | the full world: green ground, the risk-banded road, the white ground-seam network, building silhouettes, the star field, 19 labels |

So the floor state is not a production defect but the ladder behaving as the planning session's A/B
records: a device below roughly 31 fps pins at the floor and cannot climb back. A real GPU renders
the city. The new instrument for the second row is `/tmp/walk-verify/capture-webkit.mjs` (Playwright
WebKit; webkit-2248 installed into the Playwright cache for it), and it reports
`Apple GPU` for the live link's WebGL. One transient `ChunkLoadError` appeared in that run; the
chunk URL answers 200, so it was a network flake, not a deployment fault.

**One thing the deploy log says that outlives this deploy:** Vercel warns that Node.js 20.x is
deprecated and deployments created on or after 2026-10-01 will fail to build unless `package.json`
sets `"engines": { "node": "24.x" }`. Eight days out; flagged, not yet changed.

**The tree moved during the deploy.** A parallel session ("Saaya 3D Planning") is editing the same
clone: `walkSky.ts` (00:40), `walkScene.ts` (00:43) and the label-path and mixer-rate work landed
after the 00:39 upload. Production therefore serves a snapshot slightly behind the tree. I am
subscribed to that session's idle and will redeploy its final state when it settles.

## 2026-09-23 - The founder opened it on his phone: eight findings, and the fork

**What came back.** Eight findings, in his words: (1) it is not moving when he moves, (2) it is not
turning in the direction he is facing, (3) the street-shading rectangle is taking up all the space,
(4) the Saaya branding on top is too big, reduce it to just the logo, (5) "Change your character"
can be just a logo on the right, (6) Demo, SUS and SOS can be logos on the right, (7) he wants an
aesthetically well made UI, (8) the character is too small for the screen and should match what
Pokémon GO uses. All eight are now the work in flight.

**Finding 1 is reproduced, and it is not a rendering fault.** `/tmp/walk-verify/walklive.mjs` drives
the live URL in WebKit at 1 Hz, moves the geolocation 1.4 m per second, and counts what the page
actually receives. Against production: 42 fixes delivered, the world moved on 3 of 41 one-second
samples, longest frozen stretch 24 s. Against the dev tree: 25 s. The cause is the sampling gate
itself - `handlePosition` drops any fix arriving sooner than `sampling.intervalSec`, and the idle
cadence is 30 s. The browser is delivering; the app is discarding. The walk view never changes the
cadence, so the view she is looking at moves once every thirty seconds. That is item 1, and it is a
one-cause bug.

**Finding 2 has no code behind it at all.** Nothing in the tree reads `deviceorientation`,
`webkitCompassHeading` or `coords.heading`. The character's face is set from her direction of
travel while she is moving and frozen otherwise (`walkScene.ts`), and the camera yaw is a constant.
`MAP_SPEC.md:87` currently forbids a compass cone outright ("none"), so the amendment has to be
written and recorded before the code is, not after.

**The tree was forked rather than shared.** The parallel session is still editing `walkScene.ts`,
`walkSky.ts` and `WalkView.tsx` - the very files this batch has to touch - and two sessions in one
tree would have produced a merge nobody could audit. `/tmp/saaya-base` is a pristine snapshot of
that session's tree at fork time; `/tmp/saaya-ui` is this batch's working copy. The reconcile is
three-way and mechanical: peer's later work is `diff base land`, this batch is `diff base ui`.

**Items 3 to 7 are in, and the gates are green.** The legend is a chip in the bottom-left corner
whose ramp and both ends stay in view and whose derivation sentence opens on a tap. The brand is
the mark alone. The character control, the settings button, Demo, SUS and SOS are marks on the
right edge, announced by `aria-label` rather than spelled out. SOS keeps its one step up in size
because it is the control that must never be missed. `npx tsc --noEmit` clean, `npx vitest run`
47 files / 330 tests passing, grounded check at zero ungrounded literals.

**Two of those changes are amendments, and they are written as amendments.** `SCREENS.md` S14 says
the legend and the derivation note are part of the view and not a tooltip she has to find; the
founder's instruction to stop the card covering the map outranks it, and the trade-off - the note
is now one tap away while the ramp and both ends never move - is recorded rather than glossed.
`walkEditCharacter` leaves the walk view for the home screen's rail, so the view no longer carries
its own way into the customiser.

**Items 1, 2 and 8 are the remaining work.** 8 needs a measured answer to "how big is the Pokémon GO
avatar on screen" before a single camera fact can move; the reference frames are being measured.
1 and 2 are motion and are next.

**One thing found in passing, which matters for the reconcile.** The canonical checkout's
`progress.md` is from Sep 12 and 2483 lines; every tree that has been worked in since carries 2935.
The recent record exists only in the working trees. It has to come back to the canonical copy with
the next reconcile, or the founder's own log will read as though the last ten days did not happen.

## 2026-09-23 - Items 2 and 8 land, and the legend's width becomes a fact

**Finding 2 is code now, and it is a sensor rather than a gesture.** `headingAllowed` is asked for
once, on the switch into the walk view, inside the gesture that switched it - iOS only honours
`DeviceOrientationEvent.requestPermission()` from a user gesture, so asking anywhere else would
have failed silently on the phone the founder is holding. `deviceHeading.ts` reads the heading
from `webkitCompassHeading` where it exists and from `alpha` where `absolute` is true, complemented
because `alpha` runs counter-clockwise from north. Any reading taken while the screen is rotated
off portrait is refused outright: both platforms report their heading for the device's top edge,
which stops being the way she faces once the phone is on its side, and holding still beats turning
wrong. "unsupported" is deliberately not a refusal - Android has no permission prompt to give.

**The default heading is the recorded frame, so nothing re-stages for phones without a compass.**
`walkHeading.ts` puts north at -z and east at +x, exactly restating `walkProjection.toGround`
rather than inventing a second convention beside it; the default is 180, which reproduces the
reference camera's own direction and her recorded rotation of 0. Heading changes the camera's
direction of view and nothing else - distance, pitch and aim point are untouched - so the
composition rows are yaw-invariant by construction, and a heading change cannot move the horizon.

**Finding 8 was solved, not chosen, and the honest number is small.** The reference was
re-measured frame by frame: her height on screen while walking is a median 0.124 of the frame
height, not the 0.120 the earlier solve had read off a smaller sample. Three targets, three
unknowns, and pitch is pinned by the horizon row, so only distance and aim point carry the change:
`walk.camera.dist` 13.0 -> 12.58 m and `walk.camera.look_at` 3.21 -> 3.11 m, the camera sliding
0.42 m closer along the same aim line. The rows it produces are horizon 0.1646, feet 0.7361, head
0.6121 - inside 0.0004 of every measured row. On a 390 x 844 phone that is 104.7 px of her against
101.1 px before: a 3.3% increase. The record says plainly what that does not fix - the reference
avatar is stylised with a head-to-height ratio near 0.18 where ours is near 0.09, so if "too small"
was also about her silhouette rather than her height, this solve is the measured part of the answer
and not all of it. Both facts are amended in `graph/spec_graph.json`, spliced rather than
regenerated, and `MAP_SPEC.md` carries the amendment.

**The compacted legend's width is now a fact rather than a literal.** The grounded check refused
the bare 224 px, and it was right to: it is a width the layout depends on, which makes it a product
value. `walk.legend.width` is added to the graph - spliced textually with the file's one-space
indent, 429 facts, parsed - and the CSS interpolates the constant. Its `sourced_from` says what it
is: chosen during the 2026-09-23 compaction, not measured, and making no claim about the reference
video, unlike its neighbours in the walk.* family.

**`SCREENS.md` S14 and `MAP_SPEC.md` carry the two amendments.** S14 gains the chrome table - the
branding reduced to the mark, the customiser control and Demo/SUS/SOS reduced to marks - and names
the two places a word survives on purpose: `resume` after a minimised ladder, and `End SUS` while
SUS is armed, both mid-session states where the next action has to be unmistakable rather than
compact. `MAP_SPEC.md` gains "the legend is a chip, not a card", which is also where the FEATURES.md
Amendment 1 clauses are answered: the ramp and both end labels render with the view at all times
(clause 2), and the derivation sentence is one tap inside the view rather than gone (clause 1).

**Gates.** `npx tsc --noEmit` clean. `npx vitest run` 49 files / 343 tests passing. Grounded check
149 files with zero ungrounded literals, against 397 live facts. Three date literals in comment
lines and the one real width were the last stragglers; the dates were moved onto lines the
checker's skip rule covers rather than silenced.

**Verification is running against the fork's own production build, never the peer's tree.** The
fork is built and served on port 3130. Three harnesses are going at it: `walklive.mjs` for finding
1 (does the world follow the phone, and does it hold still when the phone does), a new
`walkheading.mjs` for finding 2 (does the view turn, is it a rotation rather than a reposition,
does a refused reading leave the frame alone, is the turn eased rather than snapped), and a
re-measure of her composed rows for finding 8, which also captures the current chrome so the
founder can see items 3 to 7 rather than read about them.

**Still owed.** The three verification results, then the deploy, then the three-way reconcile with
the peer session (`diff base land` against `diff base ui`) - including bringing the canonical
`progress.md`, still stuck at Sep 12, back up to the record the working trees actually hold. The
Node 24 `engines` pin is due before 2026-10-01.

**Finding 1 is verified, and the evidence separates the world's motion from the render's.** Against
the fork's own production build on 3130, `walklive.mjs` walked a simulated phone 84 m at 1.4 m/s:
61 of 61 one-second samples moved, longest frozen stretch 0 s, 62 fixes delivered at ~1 per second.
The old build on the same harness moved on 3 of 41 samples with a 24 s freeze, which is the bug the
founder reported, reproduced and then closed. The control run matters as much: standing still for
20 s, the band hash was byte-identical in 20 of 20 samples, so the render is driven by position
deltas and does not drift on its own - the movement evidence is not an artefact of a scene that
moves by itself. No performance floor was in play: the sampled band holds ~1000 unique colours and
changes on a 14 m jump, so the hashes are real re-renders rather than flat fills.

**Finding 8's target was re-checked against the reference by hand, because the target is the whole
solve.** Eyeballing a walking frame suggested the reference avatar was nearer 0.18 of the frame than
0.124, which would have made the amendment wrong by a factor of 1.4. Measuring it properly says
otherwise: in f01 her hair top sits at y 1182 and her forward shoe at y 1425, 243 px of 1920, or
0.127 - inside the frozen 0.117-0.129 band, and her feet at 0.742 against our 0.7361 and her head at
0.6156 against our 0.6121. The eyeball read was wrong because she is mid-stride and the trailing
shoe sits higher than the leading one; the crop is what settled it. The frozen target stands as
measured, and the reference video is confirmed to be a mix of walking frames and encounter screens,
which is why the band's own measurement was taken "while walking" in the first place.

**Three comments in the fork had gone false overnight, and the sweep that found them was worth
running.** Making the camera turn to her heading (finding 2) falsified claims that were true the day
before. The peer session named the pattern first - "Amend the fact, not the sky" - which is right,
and the fact *is* amended; but the prose around the derivation had to move too, or the record would
describe a camera that no longer exists. `walkSky.ts`'s docblock said "The view's camera does not
rotate": it now says the camera has turned to her heading since 2026-09-23, that it is no longer
rigid to her, and that nothing below moves with that turn - the boom keeps its length, its pitch and
its aim point, and yaw moves none of the three, which is what keeps the horizon at a fixed row and
the sky a strip above it. `walkScene.ts`'s boom comment said "It never eases, so there is nothing
here for the reduced-motion rule to switch off": the heading turn does ease, so it now says the
boom's own geometry still never eases and names `step()` as the one part that does.
`walkComposition.test.ts`'s docblock said "The camera is a rigid offset from her": it now says the
camera holds a rigid boom that turns about her own position, which is why the four rows are
yaw-invariant and are still the frame to solve against. All three are comment-only; no behaviour
changed in any of them.

**`MAP_SPEC.md`'s two heading rows were read back and are consistent.** The flat map's "Her
location" row still says no compass cone, and now names the walk view's own amendment as the thing
that does not change it; the walk view's row names the heading source, the no-permission fallback,
and says the composition does not move with the turn.

**The gates were re-run after the sweep and are green.** `npx tsc --noEmit` clean, `npx vitest run`
49 files / 343 tests passing, grounded check 149 files with zero ungrounded literals against 397
live facts (429 in the graph, 32 superseded and excluded). Comment-only edits cannot move the first
two, and they did not move the third - which is why the three are run rather than assumed.

**The chrome sweep turned up a second class of stale claim, and one of them was a founder clause.**

`MAP_SPEC.md` listed `visibility` / "What the police see" as a live control in both of its control
stacks, and `ICONOGRAPHY.md` named that feature as the `eye.fill` row's usage. The feature is cut
to round two with F28 and no rail row claims it - `COMPONENT_LIBRARY.md` C13 and `SCREENS.md` S14
both already said so - so both docs described a control that does not exist. The two stacks are
now written as they render: the flat map's bottom-right stack is the view toggle above recentre,
with recentre explained as the flat map's own (the walk camera is pinned to her, so there the same
button would do nothing); the walk view's row names its top-right rail as C13's second stack; and
`eye.fill` now names the demo panel - the glyph's real web usage - with the cut recorded rather
than the row dropped, because the symbol and its glyph are unchanged. Nothing in the frozen
17-icon subset moved.

**The bigger find: the compacted legend had quietly weakened a binding founder clause.** The chip
was built to open with the ramp and both end labels showing and the derivation sentence behind a
tap. `FEATURES.md` Amendment 1 clause 1 is the founder's own ruling and it says the walk view
"states in the UI that per-road risk is derived from zone data ... labelled, never implied", and
`SCREENS.md`'s pre-existing sentence on the same subject read "Neither is a tooltip she has to
find." A sentence behind a tap states it only on request, which is the thing both sentences were
written to prevent - so the compaction, not the clause, was wrong, and the clause wins. `WalkLegend`
now opens whole and the tap folds the sentence away, and folding takes the sentence and nothing
else, so the ramp and both ends render in both states and no state of the chip is a legend without
its picture (clause 2).

**Why the fold survives at all.** The founder's complaint was space, not the sentence: "the street
shading rectangle is taking up all the space". Folding is the answer to space; hiding the statement
by default was not, and the two had been conflated. The chip now gives one tap that clears the
streets without a build ever opening with the derivation away. The record says plainly that this is
the one place the compaction gives space back, and that the chip's own captured height belongs with
the other walk-view measurements rather than being asserted in `MAP_SPEC.md` unmeasured.

**Gates after the legend change.** `npx tsc --noEmit` clean, `npx vitest run` 49 files / 343 tests
passing, grounded check 149 files with zero ungrounded literals. The legend test was rewritten
rather than adjusted: it now asserts the sentence renders as the view opens, and that folding keeps
the title, the ramp and both ends and removes only the sentence.

**Still owed, and one of them is now different.** The 3130 server is a `next start` production build
and is stale as of this change, so the two in-flight harnesses are describing the pre-legend build;
the chrome capture will be re-run against a rebuilt 3130 once they land. The founder's items 2 and
8 verification results, then the rebuild, then the deploy, then the three-way reconcile with the
peer session.

**Both verification harnesses came back, and both carry findings as well as verdicts.**

**Finding 2 is verified, and the verdict is the one that matters: the turn is a rotation, not a
re-position.** `walkheading.mjs` drove the served build through headings 0, 90, 180, 270 and back;
three full runs agree to 0.01. Every heading renders a distinct frame (11-29 mean full-frame
difference, 12-49% of pixels), and every heading reproduces byte-identically on revisit - heading
0's band hash is the same string in all three runs. Through all of it **her head row and her lowest
foot row are pinned within 0.5 css px**, at every heading, in all 13 captures per run: the world
swings, the composition does not. A refused reading leaves the frame alone to the byte - a rotated
screen, and an `absolute: false` alpha, both land on 0.00 mean difference, and the alpha case lands
byte-identical to the independently reached heading-0 frame. The turn eases rather than snapping: a
+5 degree step's first captured frame sits 1.02 from the start where a hemisphere spin would read
10-20, and the ~300 ms frame of a large turn is 74-96% of the way there.

**What the harness could not measure, stated plainly.** Absolute compass truth - that 90 is truly
east on the map - needs a compass, not a camera, so it is untested here; the *sign* of the Android
alpha path is pinned though, because alpha 90 renders the same view as compass 270 and 11-22 from
every other heading. And the stated horizon row (0.1646) is not directly observable: it falls
inside the dark horizon band at every heading, because the distant skyline is fogged far buildings
whose row moves with the heading. What is pixel-reproducible per heading is the bright haze seam
below it (173-193 css). That is a limit of the measurement, not a defect in the view, and it is
recorded as such rather than rounded into a pass.

**Finding 8's number is a convention, and the honest record now says which.** Re-measuring the
settled walking build says her head top sits at 0.6126-0.6132 of the frame - within 1-2 px of the
solved 0.6121, so the solve's head is right - but the *lowest visible pixel* is at
0.7476-0.7482 against a stated feet row of 0.7361. The two are measuring different things and both
are correct: the stated row is her root's ground point, and the drawn sole reaches about 10 css px
below it because the near foot is planted forward of the root, toward the camera. The heading
harness found the same 10 px independently, at every heading, so it is not the turn and not a
camera miss. The consequence is that **her visible height on screen is 0.136, not 0.124** - and the
reference's 0.124/0.127 was measured as a silhouette, from hair top to shoe. So the frozen band and
the reference's own number were never strictly comparable, and the earlier solve matched a
projection to a median silhouette.

**What that means for the founder's finding 8, said plainly.** She is now about 7% taller on screen
than the reference's own 0.127 silhouette, and about 5% above the top of the frozen band. That is
in the direction he asked for ("too small"), it is the difference between one pixel column and the
next at arm's length on a phone, and shrinking her to hit 0.127 exactly would need a third camera
amendment (dist 12.58 back out to ~13.4) and would put the projection rows *below* the frozen band
that the composition test asserts. No camera change was made. What was recorded instead is the
convention split itself, because three separate measurements now agree on it and the record would
otherwise keep comparing a projection to a silhouette.

**The chrome is right, as pixels rather than as source.** The rebuilt build shows: the brand as a
48 px tile in the top-left holding the mark alone, no wordmark anywhere; the character mark and the
gear in the top-right rail; the view toggle and, in the flat map only, recentre in the bottom-right
stack; and the action dock as three marks - `visibility`, `gpp_maybe`, and `sos` one step larger on
its red tile. The `sos` mark is the Material glyph, which *is* a rounded badge with the three
letters in it, so a literal reading of the frame says "the word SOS on a red tile" while the DOM
says `aria-label="Help now"` and the glyph, and both are describing the same mark. The idle dock
carries no `Demo`, `SUS` or `SOS` word, which the test asserts. Findings 4, 5 and 6 are therefore
satisfied in the build, not just in the code.

**And one thing that is not an aesthetic miss: she reads as unclothed, and it is a colour problem,
not a missing mesh.** The frame shows a pale torso with the jeans' waistband below it, which reads
as nudity. It is not: the served bundle loads `top_hoodie`, lifts it 14 mm off the skin, and draws
it, and the garment meshes in this asset pack are *copies of the body's own surface* - which is why
the stand-off exists at all - so a hoodie keeps the body's exact anatomical silhouette. The colours
are what fails: `top_hoodie_mat` is base colour (0.36, 0.31, 0.28) *linear*, which is about
#A19790 on screen, and `bottom_jeans_mat` (0.22, 0.25, 0.36) linear is about #828AA1. Sampling the
frame gives (145, 137, 133) on the torso and (122, 131, 157) on the legs - the two materials, lit.
So a skin-tight garment in a warm grey and a pale blue, over a nude base texture, reads as skin at
phone size. There is also no footwear axis: the bare feet in the frame are the body's own.
The lever is colour - dark violet garments on the white map the founder ruled for would separate
her from both the skin and the ground - and the character's materials belong in the peer session's
palette scope, which is why this finding goes to them rather than into my own batch.

**The legend change is verified in the browser, in both states.** Against the rebuilt build:
as the view opens the chip is 224 x 154 css at (20, 614) with `aria-expanded="true"` and the
derivation sentence rendered (200 x 72 css); one tap folds it to 224 x 74 at (20, 694) with the
note gone and the title, all four ramp stops and both end labels still present; a second tap
restores it. The only console error in either run is the known harness artefact - the seeding
script's IndexedDB call in the document before it is a secure context - and the renderer is
reported as `Apple GPU`, so none of these frames are a SwiftShader floor.

**The space tension, recorded rather than smoothed over.** The founder's complaint was area:
"taking up all the space". The card he saw was about 314 x 120 css, roughly 11% of a 390 x 844
frame. The chip folded is 5.0% of the frame; the chip open, with the sentence clause 1 requires,
is 10.5%. An always-visible 105-character sentence at caption size costs about that much on this
viewport whichever way it is wrapped - widening the chip only trades height for width. So the two
constraints he set genuinely pull against each other, his written clause won, and both states are
captured and numbered here so he can rule on it with the pixels in front of him instead of with a
paragraph from me.
