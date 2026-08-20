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
