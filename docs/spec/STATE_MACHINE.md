# Saaya Lite - Session State Machine
The heart of the app. Implemented as a **pure function** in `domain/engine/SessionEngine.kt`
with zero Android imports, so every rule here is unit-testable on the JVM.

`fun onEvent(state: SessionState, event: SessionEvent, ctx: EngineContext): EngineResult`

`EngineContext` carries `now: Instant`, `zone: Zone?`, the current `hourBand: HourBand`,
the frozen `armedHourBand: HourBand?`, and `rules: Rules`.

**`java.time` on minSdk 24.** `Instant` and friends require API 26. We keep `java.time` in
the domain because it is expressive and testable, and enable **core library desugaring** so
it runs on API 24. See `BUILD_CONFIG.md` §1c. Do not substitute `Long` epoch millis in the
domain signatures; do use absolute epoch millis in `PersistedSession`, because that is what
crosses into Room.

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
| `ZoneEntered(zoneId)` | geofence + polygon test + 60 s dwell |
| `ZoneExited(zoneId)` | polygon test + 180 s dwell |
| `ManualArm` | user taps arm |
| `ManualDisarm` | user taps "I am home" |
| `CheckInTimerFired` | AlarmManager |
| `CountdownExpired(step)` | AlarmManager |
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

## Recovery after process death

The service is `START_STICKY` and Android will kill it. On restart:

| Persisted state | Action |
|---|---|
| `IDLE` or `RESOLVED` | nothing |
| `SHADOW` | re-register geofences and restore the next check-in from persisted `deadlineEpochMs`. Never recompute it from `armedAt` or current rules. If already overdue, fire `CheckInTimerFired` immediately. |
| `CHECKIN_1` / `CHECKIN_2` | recompute remaining countdown from the persisted deadline. **If the deadline already passed while dead, advance the ladder immediately.** Do not silently reset the countdown. |
| `FAMILY_ESCALATED` | recompute the cancel window. If it lapsed while dead, **go straight to SOS.** |
| `SOS_ACTIVE` | resume SOS, keep requiring the PIN, re-show the notification. |

The rule underneath: **process death must never rescue her from the ladder.** A phone that
dies mid-ladder is more likely to be a real emergency, not less.

## Edge cases, decided in advance

| Case | Decision |
|---|---|
| Zone exit while in `CHECKIN_2` | Ladder continues. Leaving the zone does not prove she is safe, and she still has not answered. |
| Two overlapping zones | Use the **highest** `risk_tier`. On a tie, the higher `risk_score`. |
| Airplane mode at escalation | Everything queues. UI shows "queued, will send when connected". Ladder timing is unaffected. |
| No contact configured | Ladder still runs. Family step shows "no contact set, add one" and proceeds to SOS on lapse. Never block the ladder on missing config. |
| Location permission revoked mid-session | Move to `RESOLVED(DISARMED)`, show a persistent warning. Never pretend to watch when blind. |
| Battery saver kills the service | Detect via missed heartbeat on next launch. Show an honest "Saaya was stopped by the system" notice with the settings deep link from `ANDROID_PLATFORM.md`. |
| She uninstalls mid-SOS | Out of scope. Do not attempt to prevent. |
| Clock change or DST | Use monotonic elapsed time for countdowns, wall clock only for hour bands. |
| Demo mode toggled mid-session | Applies to the **next** timer only. Never retroactively shortens a running countdown. |
| Active `AUTO_ZONE` session crosses hour bands | Keep `armedHourBand` frozen until `RESOLVED`. A current-band n/a cell cannot disarm it; a later new session still evaluates the current band normally. |

## Test hooks required

`SessionEngine` takes an injected `Clock` and `Rules`. `TEST_PLAN.md` drives the full
ladder in milliseconds with a fake clock. **No test may use real `delay` or `Thread.sleep`.**


---

## Full type definitions

Copy these exactly. Do not add cases, do not rename.

```kotlin
enum class SessionState { IDLE, SHADOW, CHECKIN_1, CHECKIN_2, FAMILY_ESCALATED, SOS_ACTIVE, RESOLVED }

enum class Outcome { RESOLVED_OK, CANCELLED, ESCALATED_SOS, DISARMED }

enum class ArmMode { AUTO_ZONE, MANUAL }

enum class Urgency { GENTLE, URGENT, CRITICAL }

enum class TimerId { CHECKIN, CD1, CD2, CANCEL }

enum class HourBand { NIGHT_DEEP, DAWN, DAY, NIGHT_EARLY, NIGHT_LATE }

enum class RiskTier { HIGH, ELEVATED, MODERATE, SAFE }

sealed interface SessionEvent {
    data class ZoneEntered(val zoneId: String) : SessionEvent
    data class ZoneExited(val zoneId: String) : SessionEvent
    data object ManualArm : SessionEvent
    data object ManualDisarm : SessionEvent
    data object CheckInTimerFired : SessionEvent
    data class CountdownExpired(val timer: TimerId) : SessionEvent
    data object OkTapped : SessionEvent
    data object HelpNowTapped : SessionEvent
    data object CancelTapped : SessionEvent
    data object PinAccepted : SessionEvent
    data class PermissionRevoked(val permission: String) : SessionEvent
    data class AppKilledRestart(val persisted: PersistedSession) : SessionEvent
}

// NOTHING PERSONAL ENTERS HERE. No favourites, no coordinates, no message text.
// If a rule appears to need one, the rule belongs in the service, not the engine.
data class EngineContext(
    val now: Instant,
    val zone: Zone?,
    val hourBand: HourBand,
    val armedHourBand: HourBand?,
    val rules: Rules,
    val armMode: ArmMode,
    val armedAt: Instant?,
    val deadline: Instant?,
    val cooldowns: Map<String, Instant>,
    val hasFavourite: Boolean,
    val susEventWritten: Boolean
)

// The frozen constants the engine reads. Every value comes from BUSINESS_RULES.md and has
// a fact in graph/spec_graph.json. Rules.DEFAULT is the production instance; tests inject
// a variant to drive the ladder in milliseconds instead of minutes.
data class Rules(
    val checkIn1Sec: Int,
    val checkIn2Sec: Int,
    val cancelWindowSec: Int,
    val enterDwellSec: Int,
    val exitDwellSec: Int,
    val manualDisarmCooldownMin: Int,
    val okCooldownMin: Int,
    val manualIntervalMin: Int,
    val demoDivisor: Int,
    val intervals: Map<Pair<RiskTier, HourBand>, Int>,
    val armingMatrix: Map<Pair<RiskTier, HourBand>, Boolean>,
    val samplingShadowSec: Int,
    val samplingSosSec: Int
) {
    companion object { val DEFAULT: Rules get() = TODO("populate from BUSINESS_RULES.md; every value must have a spec_graph fact") }
}

data class EngineResult(
    val state: SessionState,
    val commands: List<Command>,
    val outcome: Outcome? = null      // non-null ONLY when state == RESOLVED
)

// --- Commands: INTENT ONLY. ---
// The engine decides WHAT should happen. It never constructs a payload, because building a
// family message needs her favourites and building a SUS event needs a zone lookup, and
// pulling either into EngineContext would enlarge the pure engine AND the trust surface.
// The service and data layers construct payloads from repositories when they perform the
// command. No Command carries personal data. That is the rule; obey it over convenience.
sealed interface Command {
    // ladder UI
    data class ShowCheckIn(val step: Int, val countdownSec: Int, val urgency: Urgency) : Command
    data object HideCheckIn : Command
    data class ShowArmBanner(val zoneId: String, val band: HourBand) : Command
    data object ShowFamilyScreen : Command
    data object ShowSos : Command

    // outbound effects. The service builds the payload; the engine only says "now".
    data object NotifyFamily : Command
    data object CancelFamilyNotification : Command
    data object WriteSusEvent : Command
    data class PatchSusOutcome(val outcome: SusOutcome) : Command
    data class WriteSosIncident(val trigger: SosTrigger) : Command
    data class PatchSosStatus(val status: SosStatus) : Command

    // timers
    data class ScheduleTimer(
        val id: TimerId,
        val delaySec: Int,
        val deadlineEpochMs: Long
    ) : Command
    data class CancelTimer(val id: TimerId) : Command

    // service and sensing
    data object StartForegroundService : Command
    data object StopForegroundService : Command
    data class SetLocationSampling(val intervalSec: Int) : Command
    data object ReRegisterGeofences : Command

    // local bookkeeping
    data class LogSessionEvent(val type: String, val detail: String? = null) : Command
    data class PersistSessionArm(
        val armMode: ArmMode,
        val armedHourBand: HourBand?,
        val armedAtEpochMs: Long
    ) : Command
    data class StartZoneCooldown(val zoneId: String, val minutes: Int) : Command

    // alerts and gating
    data object PlayUrgentAlert : Command
    data object RequirePinToStop : Command
    data class ShowPermissionWarning(val permission: String) : Command
}

enum class Urgency { GENTLE, URGENT, CRITICAL }
enum class SosTrigger { LADDER_LAPSE, MANUAL_HELP_BUTTON }
enum class SosStatus { ACTIVE, STOPPED }
enum class SusOutcome { PENDING, CANCELLED_BY_USER, ESCALATED_TO_SOS, RESOLVED_LATE }

// --- What survives process death. Written to Room, read on service restart. ---
data class PersistedSession(
    val sessionId: String,
    val state: SessionState,
    val armMode: ArmMode,
    val zoneId: String?,
    val armedHourBand: HourBand?,
    val armedAtEpochMs: Long,
    val deadlineEpochMs: Long?,       // absolute, so a countdown can be recomputed
    val susEventWritten: Boolean,
    val outcome: Outcome? = null
)
```

`susEventWritten` exists so the SOS entry block knows whether to write a catch-up SUS event
when she skipped the ladder with Help Now. `hasFavourite` exists so the family step can
render `family_no_contact` without the engine touching a repository.

`deadlineEpochMs` is written whenever any `CHECKIN` timer is scheduled or rescheduled.
`ScheduleTimer` carries that absolute deadline so the service persists the engine's value
rather than reconstructing it from a later wall-clock band or changed `Rules` instance.
`armedHourBand` is required when recovering an active `AUTO_ZONE` session and must be null
for `MANUAL`; a missing AUTO_ZONE value is invalid persisted data and follows the existing
recovery error path. Recovery never invents a replacement band.

**The engine takes `EngineContext` and returns `EngineResult`. It reads nothing else and
touches no IO.** That is what makes every rule in `BUSINESS_RULES.md` testable on the JVM.


## First launch and cold start, before any location fix

The gap between the service starting and the first GPS fix is real, often 5 to 30 seconds
outdoors and longer indoors. Decided behaviour:

| Situation | Behaviour |
|---|---|
| App opens, no fix yet | Map renders zones immediately, no dot, sheet shows "Finding you". `IDLE`. **Never guess a zone from the last known fix on a cold start.** |
| Last known fix exists and is under 5 minutes old | Use it for map centring only. **Never for an arming decision.** |
| First fix arrives, she is inside a HIGH zone at NIGHT_DEEP | Start the 60 s enter dwell now. She arms 60 s later, not instantly, exactly as if she had walked in. |
| First fix has accuracy worse than 100 m | Ignore for containment, keep sampling. Show the dot with its accuracy circle. |
| No fix within 60 s | `caption` in the sheet: location is taking longer than usual, with a link to location settings. Keep trying. Do not give up and do not claim to be watching. |
| Manual arm with no fix | **Allowed.** Arms in `MANUAL` mode with a 10 min interval. The ladder does not need a coordinate to run: only the SOS payload does, and by then there will be one, or the last known fix is sent with its age stated. |

The principle: **never claim to be watching when we are blind, and never let blindness stop
her from arming manually.**
