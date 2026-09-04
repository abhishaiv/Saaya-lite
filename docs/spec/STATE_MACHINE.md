# Saaya Lite - Session State Machine
The heart of the app. Implemented as a **pure function** in `src/domain/engine/sessionEngine.ts`
with zero browser API, React or DOM, so every rule here is unit-testable under vitest.

`export function onEvent(state: SessionState, event: SessionEvent, ctx: EngineContext): EngineResult`

`EngineContext` carries `nowEpochMs: number`, `zone: Zone | null`, the current
`hourBand: HourBand`, the frozen `armedHourBand: HourBand | null`, and `rules: Rules`.
The canonical declaration is the TypeScript block below. Where this prose and that block
ever disagree, **the block wins.**

**Epoch millis everywhere, no date library.** Every instant in the domain is a `number` of
milliseconds since the Unix epoch. There is no `Date`, no `Instant`, no date library in
`src/domain/`, and the engine never calls `Date.now()`: time arrives as `ctx.nowEpochMs`.
This is what lets the whole ladder run in milliseconds under a fake clock, and it is the
same representation that crosses into IndexedDB, so nothing is converted at the boundary.
`HourBand` is derived from the clock **outside** the engine and passed in.

---

## States

| State | Meaning | What leaves the phone |
|---|---|---|
| `IDLE` | Not watching. Map browsable. | nothing |
| `SHADOW` | Armed and watching. She did nothing to start it. | **nothing** |
| `CHECKIN_1` | Gentle check-in showing, 90 s countdown. | **nothing** |
| `CHECKIN_2` | Urgent check-in showing, 60 s countdown. | **nothing** |
| `FAMILY_ESCALATED` | Local family-message preview, 60 s cancel window open. | nothing |
| `SOS_ACTIVE` | Local-only SOS with user-controlled dial actions. | nothing from Saaya |
| `RESOLVED` | Terminal for this session. | nothing further |

**Lite has no delivery boundary in round one: no transition writes to Firestore, a queue or
contacts.** The pure engine retains future delivery intents for M2, but the runtime has no
consumer for them and the UI never claims they were performed.

## Events

| Event | Source |
|---|---|
| `ZoneEntered(zoneId)` | `watchPosition` fix inside an authoritative localized hotspot circle + 60 s dwell |
| `ZoneExited(zoneId)` | `watchPosition` fix outside every hotspot circle owned by the active parent zone + 180 s dwell |
| `ManualArm` | user taps arm |
| `ManualDisarm` | user taps "I am home" |
| `CheckInTimerFired` | an absolute deadline in IndexedDB |
| `CountdownExpired(step)` | an absolute deadline in IndexedDB |
| `OkTapped` | user |
| `HelpNowTapped` | user |
| `CancelTapped` | user |
| `PinAccepted` | user, after PIN verify |
| `AppKilledRestart` | page recovery after a frozen or closed tab, see recovery |

---

## Reading the transition table

`RESOLVED(CANCELLED)` is shorthand. `SessionState` is a plain enum, so it means:
**`state = RESOLVED` and `outcome = Outcome.CANCELLED` in the returned `EngineResult`.**
The state is never parameterised; the outcome rides alongside it.

## Transition table

| From | Event | Guard | To | Commands |
|---|---|---|---|---|
| `IDLE` | `ZoneEntered` | arming matrix says yes AND no cooldown active | `SHADOW` | capture `armedHourBand=current hourBand`, `ScheduleTimer(CHECKIN, interval)`, persist its absolute deadline, show arm banner, start the location watch and request the wake lock |
| `IDLE` | `ZoneEntered` | matrix says no, or cooldown | `IDLE` | none, and **do not notify her**. Silence is correct here. |
| `IDLE` | `ManualArm` | - | `SHADOW` | keep `armedHourBand=null`, `ScheduleTimer(CHECKIN, 10 min)`, persist its absolute deadline, start the location watch and request the wake lock |
| `IDLE` | `HelpNowTapped` | - | `SOS_ACTIVE` | begin the location watch and wake lock, then see SOS entry below. A direct SOS is available at any point after onboarding. |
| `SHADOW` | `CheckInTimerFired` | - | `CHECKIN_1` | `ShowCheckIn(90, GENTLE)`, `ScheduleTimer(CD1, 90)` |
| `SHADOW` | `ZoneExited` | armMode = AUTO_ZONE | `RESOLVED(DISARMED)` | `CancelTimer(CHECKIN)`, stop the local watch, release the wake lock, log `ZONE_EXIT` |
| `SHADOW` | `ZoneExited` | armMode = MANUAL | `SHADOW` | none. Manual arming is not zone-bound. |
| `SHADOW` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | cancel timers, stop the local watch, release the wake lock, start 45 min cooldown for this zone |
| `SHADOW` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry below |
| `CHECKIN_1` | `OkTapped` | - | `SHADOW` | `CancelTimer(CD1)`, `ScheduleTimer(CHECKIN, interval from armedHourBand)`, persist its absolute deadline, 20 min cooldown |
| `CHECKIN_1` | `CountdownExpired(1)` | - | `CHECKIN_2` | `ShowCheckIn(60, URGENT)`, `ScheduleTimer(CD2, 60)`. The frozen `PlayUrgentAlert` intent has no Lite performer. |
| `CHECKIN_1` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `CHECKIN_1` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | `CancelTimer(CD1)`, `HideCheckIn`, stop the local watch, release the wake lock, start 45 min cooldown for this zone |
| `CHECKIN_2` | `OkTapped` | - | `SHADOW` | as above |
| `CHECKIN_2` | `CountdownExpired(2)` | `armMode = AUTO_ZONE` | `FAMILY_ESCALATED` | `WriteSusEvent`, `NotifyFamily`, `ShowFamilyScreen`, `ScheduleTimer(CANCEL, 60)`; Lite ignores automatic delivery intents, while the screen may offer a separate user-controlled local device handoff |
| `CHECKIN_2` | `CountdownExpired(2)` | `armMode = MANUAL` | `FAMILY_ESCALATED` | `NotifyFamily`, `ShowFamilyScreen`, `ScheduleTimer(CANCEL, 60)`; no civic-record intent is emitted; the same separate user-controlled local device handoff may be shown |
| `CHECKIN_2` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `CHECKIN_2` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | `CancelTimer(CD2)`, `HideCheckIn`, stop the local watch, release the wake lock, start 45 min cooldown for this zone |
| `FAMILY_ESCALATED` | `CancelTapped` | `AUTO_ZONE` civic record was durably queued | `RESOLVED(CANCELLED)` | `CancelTimer(CANCEL)`, `PatchSusOutcome(CANCELLED_BY_USER)`, local cleanup; Lite ignores the automatic delivery intent |
| `FAMILY_ESCALATED` | `CancelTapped` | otherwise | `RESOLVED(CANCELLED)` | `CancelTimer(CANCEL)`, local cleanup; no civic outcome patch |
| `FAMILY_ESCALATED` | `CountdownExpired(cancel)` | - | `SOS_ACTIVE` | `ShowSos`, `RequirePinToStop`; future incident intents are ignored in Lite |
| `FAMILY_ESCALATED` | `HelpNowTapped` | - | `SOS_ACTIVE` | as above but `trigger=MANUAL_HELP_BUTTON` |
| `SOS_ACTIVE` | `PinAccepted` | - | `RESOLVED(ESCALATED_SOS)` | local cleanup and stop the local watch. The future incident-patch intent is ignored in Lite. |
| `SOS_ACTIVE` | anything else | - | `SOS_ACTIVE` | **ignore.** Only a correct PIN leaves SOS. |
| any | `AppKilledRestart` | - | see recovery | |

**Every other (state, event) pair is a no-op.** Log it at debug level and do not crash.

Manual disarm from either check-in writes no SUS event or SOS incident, notifies nobody,
requires no PIN, and records only the local `DISARMED` outcome. Only an active SOS is
PIN-protected.

For every active `AUTO_ZONE` session, `armedHourBand` is non-null and remains the band
captured on the `IDLE -> SHADOW` transition. It governs every later `CHECKIN` reschedule;
the current wall-clock band does not replace it. For every `MANUAL` session,
`armedHourBand` is null and the fixed 10-minute interval applies. `armedAt` remains the
original session-arm time after “I’m OK”. Merely changing hour bands emits no command, write,
notification or interruption.

### Round-two civic-record scope

**Founder decision 2026-09-02:** only an `AUTO_ZONE` session emits the anonymous civic
signal at `FAMILY_ESCALATED`. Its verified containment, frozen zone and frozen hour band are
the evidence that makes that coarse signal meaningful. A `MANUAL` session stays local through
`FAMILY_ESCALATED`: it emits no civic record and does not infer a zone or hour band. Either
arm mode may create the detailed incident only after it reaches `SOS_ACTIVE`.

`NotifyFamily` is an engine intent to compose and show the family-message preview. It is not
a claim that the message was sent: a browser tap does not prove an installed messaging app
opened, so the web app keeps `familyMessageDelivery` as `DISPLAYED_ONLY`. Device verification
is human evidence, never a payload state; the app never records delivery.

## SOS entry, common block

Whenever any state transitions to `SOS_ACTIVE`, Lite performs only local SOS behaviour:

1. Show the local-only SOS disclosure. Lite does not promise a local audit timeline.
2. An IDLE entry starts the location watch and requests the wake lock; the same 5 s SOS sampling then applies.
3. Offer user-controlled `tel:` handoffs for 112, 181 and the nearest station where known.
4. Require the PIN to stop SOS.

The pure engine also retains remote, patch and notification commands as **future M2 intents
only**. The round-one runtime has no consumer for them,
`susEventWritten` stays false, and no UI says that a state view or contact received anything.

## Recovery after a frozen or closed tab

A hidden tab is throttled and a closed tab stops entirely. On the next visibilitychange or page load:

| Persisted state | Action |
|---|---|
| `IDLE` or `RESOLVED` | nothing |
| `SHADOW` | restart the location watch and restore the next check-in from persisted `deadlineEpochMs`. Never recompute it from `armedAt` or current rules. If already overdue, fire `CheckInTimerFired` immediately. |
| `CHECKIN_1` / `CHECKIN_2` | recompute remaining countdown from the persisted deadline. **If the deadline already passed while dead, advance the ladder immediately.** Do not silently reset the countdown. |
| `FAMILY_ESCALATED` | recompute the cancel window. If it lapsed while dead, **go straight to SOS.** |
| `SOS_ACTIVE` | resume SOS, keep requiring the PIN, and re-present the in-page SOS overlay when the page is visible. |

The rule underneath: **a frozen or closed tab must never rescue her from the ladder.** A
phone that dies mid-ladder is more likely to be a real emergency, not less. On web this is
the common case rather than the rare one, which makes the rule more important, not less.

## Edge cases, decided in advance

| Case | Decision |
|---|---|
| Zone exit while in `CHECKIN_2` | Ladder continues. Leaving the zone does not prove she is safe, and she still has not answered. |
| Two overlapping zones | Use the **highest** `risk_tier`. On a tie, the higher `risk_score`. |
| Airplane mode at escalation | The local ladder remains visible. Lite has no queue or future-send claim. |
| No contact configured | Ladder still runs. Family step shows "no contact set, add one" and proceeds to SOS on lapse. Never block the ladder on missing config. |
| Location revoked mid-session, `AUTO_ZONE` | Move to `RESOLVED(DISARMED)`, persistent warning. It armed on containment and can no longer tell whether she is contained. Never pretend to watch when blind. |
| Location revoked mid-session, `MANUAL` | **The session continues.** She asked to be watched, and the ladder is timers rather than coordinates, so it needs no fix to run. Show the same persistent warning; a current fix can still choose the nearest local dial action, but Lite sends no payload. Disarming here would take the fallback from exactly the user who would not grant location in the first place. |
| The browser froze or closed the tab | Detect on load by comparing `deadlineEpochMs` with now. Show an honest "Saaya was stopped by your browser" notice, then apply the recovery table above. Never silently restart the countdown. |
| She uninstalls mid-SOS | Out of scope. Do not attempt to prevent. |
| Clock change or DST | Countdowns are absolute `deadlineEpochMs`, so a wall-clock change moves them with it. That is accepted: epoch millis are UTC and IST has no DST. Hour bands are derived from wall clock in Asia/Kolkata. Never use `performance.now()` for a deadline: it does not survive a frozen tab. |
| Demo mode toggled mid-session | Applies to the **next** timer only. Never retroactively shortens a running countdown. |
| Active `AUTO_ZONE` session crosses hour bands | Keep `armedHourBand` frozen until `RESOLVED`. A current-band n/a cell cannot disarm it; a later new session still evaluates the current band normally. |

## Test hooks required

`onEvent` takes `ctx.nowEpochMs` and `ctx.rules`; there is no ambient clock to stub. `TEST_PLAN.md` drives the full
ladder in milliseconds with a fake clock. **No test may use a real timer or `await` a real delay.**

---

## Full type definitions

Copy these exactly. Do not add cases, do not rename. **This is the type contract**; where it
and any other document differ, this one wins.

```typescript
export type SessionState =
  | "IDLE" | "SHADOW" | "CHECKIN_1" | "CHECKIN_2"
  | "FAMILY_ESCALATED" | "SOS_ACTIVE" | "RESOLVED";

export type Outcome   = "RESOLVED_OK" | "CANCELLED" | "ESCALATED_SOS" | "DISARMED";
export type ArmMode   = "AUTO_ZONE" | "MANUAL";
export type Urgency   = "GENTLE" | "URGENT" | "CRITICAL";
export type TimerId   = "CHECKIN" | "CD1" | "CD2" | "CANCEL";
export type HourBand  = "NIGHT_DEEP" | "DAWN" | "DAY" | "NIGHT_EARLY" | "NIGHT_LATE";
export type RiskTier  = "HIGH" | "ELEVATED" | "MODERATE" | "SAFE";
export type SosTrigger = "LADDER_LAPSE" | "MANUAL_HELP_BUTTON";
export type SosStatus  = "ACTIVE" | "STOPPED";
export type SusOutcome = "PENDING" | "CANCELLED_BY_USER" | "ESCALATED_TO_SOS" | "RESOLVED_LATE";

export type SessionEvent =
  | { kind: "ZoneEntered"; zoneId: string }
  | { kind: "ZoneExited"; zoneId: string }
  | { kind: "ManualArm" }
  | { kind: "ManualDisarm" }
  | { kind: "CheckInTimerFired" }
  | { kind: "CountdownExpired"; timer: TimerId }
  | { kind: "OkTapped" }
  | { kind: "HelpNowTapped" }
  | { kind: "CancelTapped" }
  | { kind: "PinAccepted" }
  | { kind: "PermissionRevoked"; permission: string }
  | { kind: "AppKilledRestart"; persisted: PersistedSession };

// COMMANDS: INTENT ONLY. The engine decides WHAT should happen; the UI and data layers
// build any payload from their own stores when they perform it. NO Command carries
// personal data. Building a family message needs her favourites and building a SUS event
// needs a zone lookup; pulling either into EngineContext would enlarge the pure engine and
// the trust surface at once. That rule outranks convenience.
export type Command =
  | { kind: "ShowCheckIn"; step: 1 | 2; countdownSec: number; urgency: Urgency }
  | { kind: "HideCheckIn" }
  | { kind: "ShowArmBanner"; zoneId: string; band: HourBand }
  | { kind: "ShowFamilyScreen" }
  | { kind: "ShowSos" }
  | { kind: "NotifyFamily" }
  | { kind: "CancelFamilyNotification" }
  | { kind: "WriteSusEvent" }
  | { kind: "PatchSusOutcome"; outcome: SusOutcome }
  | { kind: "WriteSosIncident"; trigger: SosTrigger }
  | { kind: "PatchSosStatus"; status: SosStatus }
  | { kind: "ScheduleTimer"; id: TimerId; delaySec: number }
  | { kind: "CancelTimer"; id: TimerId }
  | { kind: "StartLocationWatch" }
  | { kind: "StopLocationWatch" }
  | { kind: "SetLocationSampling"; intervalSec: number }
  | { kind: "RequestWakeLock" }
  | { kind: "ReleaseWakeLock" }
  // Round-two local-history intent. Lite has no session_event store or performer.
  | { kind: "LogSessionEvent"; type: string; detail?: string }
  | { kind: "StartCooldown"; zoneId: string; minutes: number }
  | { kind: "PlayUrgentAlert" }
  | { kind: "RequirePinToStop" }
  | { kind: "ShowPermissionWarning"; permission: string };

// What survives a closed tab or a refresh. Persisted to IndexedDB.
// Deadlines are ABSOLUTE epoch millis so a countdown is recomputed, never resumed.
export interface PersistedSession {
  sessionId: string;
  state: SessionState;
  armMode: ArmMode;
  zoneId: string | null;
  armedAtEpochMs: number;
  // The band captured on IDLE -> SHADOW, per session.auto_zone.hour_band_policy =
  // FREEZE_AT_ARM. Null for MANUAL sessions, which use the fixed interval. This MUST be
  // persisted: without it a session recovered after a frozen tab cannot reschedule on the
  // band it armed under, and would silently switch to the current band.
  armedHourBand: HourBand | null;
  deadlineEpochMs: number | null;
  // Reserved for the round-two writer. The Lite runtime always persists false.
  susEventWritten: boolean;
  outcome?: Outcome;
}

// The frozen constants the engine reads. Every value comes from BUSINESS_RULES.md and has
// a fact in graph/spec_graph.json. Tests inject a variant to drive the ladder in
// milliseconds instead of minutes.
export interface Rules {
  checkIn1Sec: number;
  checkIn2Sec: number;
  cancelWindowSec: number;
  enterDwellSec: number;
  exitDwellSec: number;
  manualDisarmCooldownMin: number;
  okCooldownMin: number;
  manualIntervalMin: number;
  demoDivisor: number;
  intervals: Record<string, number>;      // `${RiskTier}:${HourBand}` -> minutes
  armingMatrix: Record<string, boolean>;  // `${RiskTier}:${HourBand}` -> arms?
  samplingShadowSec: number;
  samplingSosSec: number;
}

// NOTHING PERSONAL ENTERS HERE. No favourites, no message text, no precise coordinate.
// If a rule appears to need one, that rule belongs in the UI or data layer, not the engine.
export interface EngineContext {
  nowEpochMs: number;
  zone: Zone | null;
  hourBand: HourBand;          // the current wall-clock band
  armedHourBand: HourBand | null;  // frozen at arm; governs every reschedule. null = MANUAL
  rules: Rules;
  armMode: ArmMode;
  armedAtEpochMs: number | null;
  deadlineEpochMs: number | null;
  cooldowns: Record<string, number>;   // zoneId -> epoch millis until which it may not re-arm
  hasFavourite: boolean;
  susEventWritten: boolean;
}

export interface EngineResult {
  state: SessionState;
  commands: Command[];
  outcome?: Outcome;   // set ONLY when state === "RESOLVED"
}

// The engine is this one function and nothing else.
export function onEvent(
  state: SessionState,
  event: SessionEvent,
  ctx: EngineContext
): EngineResult;
```

**`nowEpochMs`, not a date object.** The previous platform needed a date library and a polyfill for it.
On the web, epoch millis is the native currency, it serialises into IndexedDB unchanged, and
it keeps `src/domain/` free of any date library. `HourBand` is still derived through a clock
helper so tests can inject time.

## First launch and cold start, before any location fix

The gap between the service starting and the first GPS fix is real, often 5 to 30 seconds
outdoors and longer indoors. Decided behaviour:

| Situation | Behaviour |
|---|---|
| App opens, no fix yet | Map renders zones immediately, no dot, sheet shows "Finding you". `IDLE`. **Never guess a zone from the last known fix on a cold start.** |
| Last known fix exists and is under 5 minutes old | Use it for map centring only. **Never for an arming decision.** |
| First fix arrives, she is inside a HIGH hotspot circle at NIGHT_DEEP | Start the 60 s enter dwell now. She arms 60 s later, not instantly, exactly as if she had walked in. |
| First fix has accuracy worse than 100 m | Ignore for containment, keep sampling. Show the dot with its accuracy circle. |
| No fix within 60 s | `loc_slow` in the sheet. Keep trying: this is a slow fix, not a denied permission, so there is nothing to re-enable and no link to offer. Do not give up and do not claim to be watching. |
| Manual arm with no fix | **Allowed.** Arms in `MANUAL` mode with a 10 min interval. The ladder does not need a coordinate to run; a later current fix can choose the nearest local dial action, but Lite sends no payload. |

There is no background arming. A browser cannot watch position with the page hidden, so
every fix that feeds a dwell arrives while the page is visible and holding a wake lock; see
`WEB_PLATFORM.md`. The first qualifying fix starts a fresh dwell, a last-known fix never
starts or completes that proof, and any interruption to the watch discards accumulated
dwell evidence rather than resuming it. A permission denial or a watch error emits no
`ZoneEntered` and is reported honestly in the sheet.

The principle: **never claim to be watching when we are blind, and never let blindness stop
her from arming manually.**
