# Saaya Lite - Codex Task List

> ## THE ORDER IN THIS FILE IS NOT THE EXECUTION ORDER
>
> **`graph/build_graph.json` owns the order.** Find your node by **id**, never by position
> on this page. The `E1 ... E9` headings below are the original evening grouping, kept only
> because `BUILD_PLAN.md`'s cut order refers to them.
>
> The graph runs **risk-first**, which is deliberately different:
>
> ```
> T1.1 -> T2.1 -> T4.1 -> T4.2 -> T1.2 -> T8.1 -> T8.2 -> T1.3
>    ... T9.0 -> T9.1 -> T9.2
> ```
>
> The two most dangerous nodes clear early, and the required live demo link exists by
> hour 14 rather than hour 24. Reasoning in `GRAPH_ENGINEERING.md`.

Atomic, ordered, each with acceptance criteria. **Execute in order.** Do not batch two
tasks into one prompt: the log entry per task is a submission deliverable.

## How to run a task

1. Paste the **Prompt** block into Codex.
2. Codex reads the **Reads** files before writing code.
3. Verify against **Done when**.
4. Write the `CODEX_LOG.md` entry immediately, including what needed correcting.

## Standing preamble, prepend to every prompt

```
You are building Saaya Lite, a native Android app in Kotlin + Jetpack Compose.
Read these first and follow them exactly:
  docs/spec/SPEC_README.md   (precedence order and non-negotiables)
  docs/FEATURES.md           (the scope contract)
Then read the files listed for this task.

Hard rules:
- No AI, ML or model calls anywhere. Every decision is a stated rule from BUSINESS_RULES.md.
- Never invent a number, threshold, colour or string. If one is missing, STOP and say so.
- The trust boundary: nothing identifying leaves the device before SOS.
- Do not add dependencies beyond those listed in ARCHITECTURE.md.
- Match the existing code style. Kotlin official style, explicit types on public APIs.
- Write the JVM unit tests named in TEST_PLAN.md as part of the task, not later.
```

---

## E1 - Scaffold

### T1.1 Project skeleton
**Reads:** `BUILD_CONFIG.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`
**Prompt:** Create the Gradle project: `applicationId com.nexaflow.saayalite`, minSdk 24,
targetSdk 34, compileSdk 34, Kotlin JVM 17, Compose BOM, Material 3, Hilt, Room,
security-crypto, play-services-location, Firebase BOM (Firestore + Auth),
kotlinx-serialization. Create the exact package tree from ARCHITECTURE.md with empty
placeholder files. Implement `ui/theme` fully from DESIGN_SYSTEM.md: every colour token,
all seven type styles, the spacing scale, both corner radii. Dark theme only.
Use the exact version catalog in `BUILD_CONFIG.md` §1. Apply every manifest privacy flag
from §5, including `allowBackup="false"`, the data extraction rules and the network
security config. Add the splash per §6 and the `.gitignore` entries per §3.
**No R8, no minification, no keystore.** Prototype posture, see `SPEC_README.md`.
**Done when:** the app installs on a real device and shows a themed empty screen using
`brand #A78BFA` on `background #0B0B0F`, **and** `manifest.xml` in the built APK shows
`allowBackup="false"`. Verify the latter with `aapt2 dump xmltree`, do not assume it.

### T1.2 Firebase wiring
**Reads:** `SETUP.md`, `SECRETS_AND_ACCESS.md`, `DATA_MODEL.md`
**Prompt:** Wire a NEW Firebase project (never Saaya production). Anonymous auth on first
launch. Add `google-services.json`. Write one test document to a `_smoke` collection on
launch, log the id, then delete it.
**Done when:** the document appears in the Firestore console and the anonymous uid is
logged. **Record the Firebase project id in CODEX_LOG.md.**

### T1.3 Component library
**Reads:** `COMPONENT_LIBRARY.md`, `DESIGN_SYSTEM.md`, `ICONOGRAPHY.md`, `MOTION_SPEC.md`
**Prompt:** Build all 14 shared composables C1 to C14 exactly as specified, at the exact dp
values, with every listed state (default, pressed, disabled, focused, loading, error).
Bundle Poppins subset to Latin basic in Regular 400, SemiBold 600 and Bold 700, and Noto
Sans Telugu. Bundle Material Symbols Rounded subset to the icon list in `ICONOGRAPHY.md`.
Build a debug-only gallery screen showing every component in every state.
**Done when:** the gallery renders all 14 components in all states, the combined font
assets are under 250 KB, and `C3 LadderCard` matches the iOS geometry exactly (fill
`#1F1F1F`, radius 22, padding 22, margin 30, spacing 14, border at accent 50%).

**Build this before any screen.** Screens compose these components and must never define
their own button, card or sheet.

---

## E2 - The map

### T2.1 Zone parsing
**Reads:** `DATA_MODEL.md`, `TEST_PLAN.md` (`ZoneParsingTest`)
**Prompt:** Copy the three source files into `assets/`. Implement `data/zone/ZoneLoader`
parsing all three into `Zone`, `ZoneCard` and `PoliceStation`. GeoJSON coordinates are
`[longitude, latitude]`: assert every centroid is within `lat 17.6..17.9, lon 83.1..83.5`
and throw with a clear message otherwise. Assert tier counts HIGH 6, MODERATE 9,
ELEVATED 4, SAFE 5. Write `ZoneParsingTest`.
**Done when:** all `ZoneParsingTest` cases pass on the JVM.

### T2.2 Map screen
**Reads:** `MAP_SPEC.md`, `SCREENS.md` S3, `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, `RESPONSIVE_SPEC.md`, `STATES_CATALOGUE.md`
**Prompt:** Home screen with a full-bleed dark map per `MAP_SPEC.md`: osmdroid, CARTO Dark
Matter tiles, no API key. Set the osmdroid user agent to the package name or OSM will block
the requests. Render the 19 non-SAFE zones with glow, fill, stroke and label in the draw
order specified, ordered by `risk_score` so a high zone is never buried. **SAFE zones must
not be drawn.** Her location dot per spec, with no heading cone. Attribution line
bottom-left, always visible, non-removable. Zones must paint without waiting for tiles.
**Done when:** 19 polygons render correctly over Vizag on a real device, the attribution is
visible, the map holds 60 fps while panning on a 2 GB device, and **turning off the network
still shows the zones** with the "Map offline" note.

---

## E3 - Zone detail and onboarding

### T3.1 Zone detail sheet
**Reads:** `SCREENS.md` S4, `BUSINESS_RULES.md` §9 §10, `COPY.md`, `COMPONENT_LIBRARY.md` (C6, C8, C10, C11), `STATES_CATALOGUE.md`
**Prompt:** Bottom sheet on zone tap per S4. Include the hour-aware display risk from §10,
the nearest-station block using the Haversine rule in §9 with `ACTION_DIAL` (never
`CALL_PHONE`), the `coordPrecision` honesty string, and the `SAFE` zone empty state
`zone_safe_no_data`. All strings from `COPY.md`.
**Done when:** M3, M4 and M5 in `TEST_PLAN.md` pass by hand.

### T3.2 Onboarding
**Reads:** `SCREENS.md` S2, `WEB_PLATFORM.md` (permission order), `BUSINESS_RULES.md` §7, `COMPONENT_LIBRARY.md` (C1, C7, C9, C12), `STATES_CATALOGUE.md`, `ACCESSIBILITY_SPEC.md`
**Prompt:** Four-step onboarding per S2. Follow the permission request order in
WEB_PLATFORM.md exactly: notifications, then foreground location after a rationale
screen, then background location as a **separate** request after foreground is granted.
Denial of background must not dead-end. PIN per §7: salted SHA-256 in
EncryptedSharedPreferences, weak-PIN rejection, confirm step. Room entities for `contact`.
**Done when:** M1 and M2 pass, and an instrumented test proves the plaintext PIN appears
nowhere in prefs, the database or logcat.

---

## E4 - Shadow. The highest-risk evening.

### T4.1 The engine (JVM only, no Android)
**Reads:** `STATE_MACHINE.md`, `BUSINESS_RULES.md`, `TEST_PLAN.md`
**Prompt:** Implement `domain/engine`: `rules.ts` holding every constant from
BUSINESS_RULES.md, `ArmingEvaluator`, `IntervalCalculator`, and `SessionEngine` as a pure
function `onEvent(state, event, ctx): EngineResult` emitting `Command`s. **Zero Android
imports in `domain/`.** Inject `Clock`. Implement the full transition table including
every edge case. Write `RulesTest` and `SessionEngineTest` in full.
**Done when:** every `RulesTest` and `SessionEngineTest` case passes with a fake clock and
no test sleeps. **Do this before any Android work tonight.** If the evening runs out, a
tested engine with no service is a far better outcome than a service with no engine.

### T4.2 Foreground service and geofencing
**Reads:** `WEB_PLATFORM.md`, `STATE_MACHINE.md` (recovery)
**Prompt:** `SaayaForegroundService` with `foregroundServiceType="location"`, calling
`startForeground` within 5 seconds. Register geofences for the 19 non-SAFE zones using
each `geofence_radius_m`, with `INITIAL_TRIGGER_ENTER`. On enter, run the real
point-in-polygon test and apply the 60 s dwell before arming. AlarmManager for every
ladder timer, never coroutine delay. Persist absolute deadlines. Implement the recovery
table. Boot receiver re-registers geofences.
**Done when:** the D1 demo trigger arms a session with **no user tap**, and killing the
process mid-countdown restores the correct remaining time.

### T4.3 Home session states and the demo panel
**Reads:** `SCREENS.md` S3 S12, `COPY.md`, `COMPONENT_LIBRARY.md` (C5, C13, C14), `MOTION_SPEC.md`
**Prompt:** Wire Home to `SessionState`: status pill, arm banner naming zone and hour,
arm/disarm. Build the demo panel per S12 with the speed toggle, zone simulation, ladder
jumps and reset, plus the permanent labelled banner while demo speed is on.
**Done when:** M6 passes and the demo banner is visible in every screenshot taken.

---

## E5 - The check-in ladder

### T5.1 Check-in screens
**Reads:** `SCREENS.md` S5 S6, `WEB_PLATFORM.md` (notifications), `COPY.md`, `COMPONENT_LIBRARY.md` (C2, C3, C4), `INTERACTION_SPEC.md` (haptics and sound), `MOTION_SPEC.md`, `ACCESSIBILITY_SPEC.md`
**Prompt:** Check-in 1 as a heads-up on `saaya_checkin` plus an in-app card, 90 s ring,
`brand` lavender with a 1.0 dp card border, showing `checkin1_reason` with the actual zone,
tier and hour. Check-in 2 full-screen over the lock screen on `saaya_urgent`, 60 s ring,
`amber` with a 1.5 dp border, alarm sound,
long vibration, DND bypass, `setShowWhenLocked` and `setTurnScreenOn`, with a graceful
fallback if `USE_FULL_SCREEN_INTENT` is refused. Both wire `OkTapped` and `HelpNowTapped`
into the engine. Countdown announcements at 60, 30 and 10 s via `LiveRegion`. Back is
consumed on check-in 2.
**Done when:** M7 and M8 pass, and check-in 2 appears over a locked screen on a real device.

---

## E6 - Family escalation

### T6.1 Escalation composer and screen
**Reads:** `BUSINESS_RULES.md` §8, `SCREENS.md` S7, `COPY.md`, `COMPONENT_LIBRARY.md` (C3, C4, C7), `INTERACTION_SPEC.md`
**Prompt:** Build the family message exactly per §8, including the non-removable
prototype disclosure line. Screen S7 with the rendered message, the 60 s amber ring, the
cancel action, and the no-contact path that continues the ladder rather than blocking it.
**Done when:** M9 and M10 pass, and the disclosure is visible on screen and not only in
the write-up.

### T6.2 Offline queue
**Reads:** `ARCHITECTURE.md` (queue), `BUSINESS_RULES.md` §11, `TEST_PLAN.md` (`QueueTest`)
**Prompt:** Room `queued_event`, a flusher with the 5/15/60/300/900 s backoff plus a
connectivity-regained trigger, SOS priority over SUS, `FAILED_PERMANENT` after 20 attempts
surfaced in UI state. Every Firestore write goes through the queue, with no direct writes
anywhere. Write `QueueTest`.
**Done when:** `QueueTest` passes and M15 passes on a real device in airplane mode.

---

## E7 - SOS and the state writes

### T7.1 SOS and PIN
**Reads:** `SCREENS.md` S8 S9, `BUSINESS_RULES.md` §7, `STATE_MACHINE.md` (SOS entry), `COMPONENT_LIBRARY.md` (C2, C9), `MOTION_SPEC.md` (SOS is instant), `INTERACTION_SPEC.md` (back is consumed)
**Prompt:** SOS screen per S8: no entry animation, elapsed timer, the F25 statement that
the state now has it, the itemised list of what was sent with contacts as a count only,
`ACTION_DIAL` quick dial for 112, 181 and the nearest station. PIN entry per S9 with the
lockout schedule and no recovery path. Implement the SOS entry common block including
writing a SUS event when the ladder was skipped.
**Done when:** M11 through M14 pass, and no navigation action escapes `SOS_ACTIVE`.

### T7.2 Anonymiser and the two writers
**Reads:** `DATA_MODEL.md`, `TEST_PLAN.md` (`AnonymiserTest`)
**Prompt:** `domain/engine/Anonymiser` producing the SUS payload. It must be structurally
impossible for it to emit a coordinate, a session id or a uid: build the payload from an
allow-list, never by filtering a larger object. Implement the SOS payload with precise
location, the timeline from `session_event`, nearest station and `contactsNotified` as an
Int. Deploy the Firestore rules from DATA_MODEL.md including the `hasAny` guard. Write
`AnonymiserTest` in full.
**Done when:** every `AnonymiserTest` case passes, especially the one asserting **zero**
write commands across `IDLE` -> `SHADOW` -> `CHECKIN_1` -> `CHECKIN_2`.

### T7.3 Police view
**Reads:** `SCREENS.md` S10, `COPY.md`, `COMPONENT_LIBRARY.md` (C7, C10, C11)
**Prompt:** The three honest sections. Section 1 headlines "nothing" in `IDLE`, `SHADOW`
and both check-ins. Sections 2 and 3 render real sample payloads produced by the actual
`Anonymiser`, annotated to show what is absent. Permanent `police_no_govt_link` footer.
**Done when:** M16 passes and the samples are generated by production code, not hardcoded.

---

## E8 - Console

### T8.1 Zone seeding
**Prompt:** A Node script seeding `zones/{stationId}` from the same GeoJSON. Idempotent,
re-runnable. Run it once.
**Done when:** 24 zone documents exist and the console can draw the same map as the phone.

### T8.2 The console
**Reads:** `CONSOLE_SPEC.md`
**Prompt:** Static HTML, CSS and vanilla JS on Firebase Hosting per CONSOLE_SPEC.md. No
framework, no build step, under 100 KB excluding tiles. SUS markers at zone centroids,
SOS markers at precise coordinates, the stat strip including the false-positive rate, the
record list with expandable SOS timelines, the three filters, and every non-negotiable
page element. `onSnapshot` for live updates. **Create the two composite indexes tonight.**
**Done when:** M17 passes from a phone on a different network in a private window, and an
incident raised on the phone appears without a refresh.

---

## E9 - Submission

### T8.3 Live journey trigger
**Reads:** `CONSOLE_SPEC.md` (the live journey trigger section), `DATA_MODEL.md`
**Prompt:** Add the "Watch a journey happen" control to the console per spec. Anonymous
sign-in, then write a real `sus_events` doc at +14 s and a real `sos_incidents` doc at
+28 s, both carrying `source: "CONSOLE_DEMO"`. Drive the narration strip from the same
schedule. Both records must arrive through the existing `onSnapshot` listener, not be
injected into the DOM. Auto-expand the SOS timeline at the end. Disable the button for
90 s after a press, with a visible countdown. Render `CONSOLE_DEMO` rows with a DEMO chip.
**Done when:** a judge on a phone, in a logged-out private window, presses one button and
watches a SUS record then an SOS record arrive live with narration, and the SOS timeline is
open at the end. Verify the documents genuinely exist in Firestore afterwards.

### T9.0 Landing page
**Reads:** `SUBMISSION.md`
**Prompt:** Build the static landing page at `console/build/index.html` per `SUBMISSION.md`.
Same palette and Poppins as the console, under 100 KB. Three buttons: console, APK
download with size and version shown, video. The working list and the mocked list side by
side at equal prominence.
**Done when:** the page loads logged out and all three links resolve.

### T9.1 Localisation and conditions
**Reads:** `COPY.md`, `RESPONSIVE_SPEC.md`, `ACCESSIBILITY_SPEC.md`
**Prompt:** Extract every string to `values/strings.xml` and `values-te/strings.xml` from
COPY.md, honouring the locked vocabulary table (favourites, never contacts) and keeping
every string marked (iOS verbatim) character for character. Verify no hardcoded user-facing string remains. Run the font-scale and low-end
passes.
**Done when:** M18, M19 and M20 pass. **Founder must verify the Telugu before the video.**

### T9.2 Verification sweep
**Reads:** `TEST_PLAN.md` layer 4
**Prompt:** Run V1 through V8 and paste the raw output into `CODEX_LOG.md`, including the
V7 grep and the V8 manifest check.
**Done when:** all eight pass and the evidence is in the log, because the write-up will
quote it.

---

## Cut order, if an evening overruns

Fixed in advance so it is never decided at midnight: Hindi (never started), then T7.3
(the console carries the police view), then manual arm, then map visual polish, then T6.2.

**Never cut:** T4.1, T4.2, T5.1, T6.1, T7.1, T7.2, T8.2.
