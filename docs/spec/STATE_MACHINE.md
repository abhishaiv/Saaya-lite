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
| `FAMILY_ESCALATED` | Contacts notified, 60 s cancel window open. | **anonymised SUS event** + contacts |
| `SOS_ACTIVE` | Full emergency. | **full SOS incident**, identity and precise location |
| `RESOLVED` | Terminal for this session. | nothing further |

**The trust boundary sits between `CHECKIN_2` and `FAMILY_ESCALATED` for the SUS event,
and between `FAMILY_ESCALATED` and `SOS_ACTIVE` for identity and precise location.**
No other transition may write to Firestore. This is a correctness requirement.

## Events

| Event | Source |
|---|---|
| `ZoneEntered(zoneId)` | `watchPosition` fix + polygon test + 60 s dwell |
| `ZoneExited(zoneId)` | `watchPosition` fix + polygon test + 180 s dwell |
| `ManualArm` | user taps arm |
| `ManualDisarm` | user taps "I am home" |
| `CheckInTimerFired` | an absolute deadline in IndexedDB |
| `CountdownExpired(step)` | an absolute deadline in IndexedDB |
| `OkTapped` | user |
| `HelpNowTapped` | user |
| `CancelTapped` | user |
| `PinAccepted` | user, after PIN verify |
| `AppKilledRestart` | service restart, see recovery |

---

## Reading the transition table

`RESOLVED(CANCELLED)` is shorthand. `SessionState` is a plain enum, so it means:
**`state = RESOLVED` and `outcome = Outcome.CANCELLED` in the returned `EngineResult`.**
The state is never parameterised; the outcome rides alongside it.

## Transition table

| From | Event | Guard | To | Commands |
|---|---|---|---|---|
| `IDLE` | `ZoneEntered` | arming matrix says yes AND no cooldown active | `SHADOW` | capture `armedHourBand=current hourBand`, `ScheduleTimer(CHECKIN, interval)`, persist its absolute deadline, show arm banner, start FGS |
| `IDLE` | `ZoneEntered` | matrix says no, or cooldown | `IDLE` | none, and **do not notify her**. Silence is correct here. |
| `IDLE` | `ManualArm` | - | `SHADOW` | keep `armedHourBand=null`, `ScheduleTimer(CHECKIN, 10 min)`, persist its absolute deadline, start FGS |
| `SHADOW` | `CheckInTimerFired` | - | `CHECKIN_1` | `ShowCheckIn(90, GENTLE)`, `ScheduleTimer(CD1, 90)` |
| `SHADOW` | `ZoneExited` | armMode = AUTO_ZONE | `RESOLVED(DISARMED)` | `CancelTimer(CHECKIN)`, stop FGS, log `ZONE_EXIT` |
| `SHADOW` | `ZoneExited` | armMode = MANUAL | `SHADOW` | none. Manual arming is not zone-bound. |
| `SHADOW` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | cancel timers, stop FGS, start 45 min cooldown for this zone |
| `SHADOW` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry below |
| `CHECKIN_1` | `OkTapped` | - | `SHADOW` | `CancelTimer(CD1)`, `ScheduleTimer(CHECKIN, interval from armedHourBand)`, persist its absolute deadline, 20 min cooldown |
| `CHECKIN_1` | `CountdownExpired(1)` | - | `CHECKIN_2` | `ShowCheckIn(60, URGENT)`, `PlayUrgentAlert`, `ScheduleTimer(CD2, 60)` |
| `CHECKIN_1` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `CHECKIN_1` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | `CancelTimer(CD1)`, `HideCheckIn`, stop FGS, start 45 min cooldown for this zone |
| `CHECKIN_2` | `OkTapped` | - | `SHADOW` | as above |
| `CHECKIN_2` | `CountdownExpired(2)` | - | `FAMILY_ESCALATED` | `WriteSusEvent(...)`, `NotifyFamily(...)`, `ScheduleTimer(CANCEL, 60)` |
| `CHECKIN_2` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `CHECKIN_2` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | `CancelTimer(CD2)`, `HideCheckIn`, stop FGS, start 45 min cooldown for this zone |
| `FAMILY_ESCALATED` | `CancelTapped` | - | `RESOLVED(CANCELLED)` | `CancelTimer(CANCEL)`, patch SUS outcome to `CANCELLED_BY_USER`, notify contacts of the cancel |
| `FAMILY_ESCALATED` | `CountdownExpired(cancel)` | - | `SOS_ACTIVE` | `WriteSosIncident(trigger=LADDER_LAPSE)`, patch SUS outcome to `ESCALATED_TO_SOS`, `RequirePinToStop` |
| `FAMILY_ESCALATED` | `HelpNowTapped` | - | `SOS_ACTIVE` | as above but `trigger=MANUAL_HELP_BUTTON` |
| `SOS_ACTIVE` | `PinAccepted` | - | `RESOLVED(ESCALATED_SOS)` | patch incident `status=STOPPED, stoppedAt`, stop FGS |
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

## SOS entry, common block

Whenever any state transitions to `SOS_ACTIVE`:

1. Write `session_event(SOS_TRIGGERED)` locally.
2. Build the full timeline from `session_event` rows for this session.
3. `WriteSosIncident` with precise location, uid, timeline, nearest station.
4. If no SUS event exists yet for this session (she tapped Help Now directly from
   `SHADOW` or `CHECKIN_1`), **also write a SUS event** with `outcome=ESCALATED_TO_SOS`,
   so the civic layer is not blind to a session that skipped the ladder.
5. Notify contacts at full urgency.
6. Show the on-screen statement that the state now has it (F25).
7. Escalate location sampling to 5 s.
8. `RequirePinToStop`.

## Recovery after a frozen or closed tab

A hidden tab is throttled and a closed tab stops entirely. On the next visibilitychange or page load:

| Persisted state | Action |
|---|---|
| `IDLE` or `RESOLVED` | nothing |
| `SHADOW` | restart the location watch and restore the next check-in from persisted `deadlineEpochMs`. Never recompute it from `armedAt` or current rules. If already overdue, fire `CheckInTimerFired` immediately. |
| `CHECKIN_1` / `CHECKIN_2` | recompute remaining countdown from the persisted deadline. **If the deadline already passed while dead, advance the ladder immediately.** Do not silently reset the countdown. |
| `FAMILY_ESCALATED` | recompute the cancel window. If it lapsed while dead, **go straight to SOS.** |
| `SOS_ACTIVE` | resume SOS, keep requiring the PIN, re-show the notification. |

The rule underneath: **a frozen or closed tab must never rescue her from the ladder.** A
phone that dies mid-ladder is more likely to be a real emergency, not less. On web this is
the common case rather than the rare one, which makes the rule more important, not less.

## Edge cases, decided in advance

| Case | Decision |
|---|---|
| Zone exit while in `CHECKIN_2` | Ladder continues. Leaving the zone does not prove she is safe, and she still has not answered. |
| Two overlapping zones | Use the **highest** `risk_tier`. On a tie, the higher `risk_score`. |
| Airplane mode at escalation | Everything queues. UI shows "queued, will send when connected". Ladder timing is unaffected. |
| No contact configured | Ladder still runs. Family step shows "no contact set, add one" and proceeds to SOS on lapse. Never block the ladder on missing config. |
| Location permission revoked mid-session | Move to `RESOLVED(DISARMED)`, show a persistent warning. Never pretend to watch when blind. |
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
| First fix arrives, she is inside a HIGH zone at NIGHT_DEEP | Start the 60 s enter dwell now. She arms 60 s later, not instantly, exactly as if she had walked in. |
| First fix has accuracy worse than 100 m | Ignore for containment, keep sampling. Show the dot with its accuracy circle. |
| No fix within 60 s | `loc_slow` in the sheet. Keep trying: this is a slow fix, not a denied permission, so there is nothing to re-enable and no link to offer. Do not give up and do not claim to be watching. |
| Manual arm with no fix | **Allowed.** Arms in `MANUAL` mode with a 10 min interval. The ladder does not need a coordinate to run: only the SOS payload does, and by then there will be one, or the last known fix is sent with its age stated. |

There is no background arming. A browser cannot watch position with the page hidden, so
every fix that feeds a dwell arrives while the page is visible and holding a wake lock; see
`WEB_PLATFORM.md`. The first qualifying fix starts a fresh dwell, a last-known fix never
starts or completes that proof, and any interruption to the watch discards accumulated
dwell evidence rather than resuming it. A permission denial or a watch error emits no
`ZoneEntered` and is reported honestly in the sheet.

The principle: **never claim to be watching when we are blind, and never let blindness stop
her from arming manually.**
