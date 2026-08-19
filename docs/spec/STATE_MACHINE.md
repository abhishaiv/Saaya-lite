# Saaya Lite - Session State Machine
The heart of the app. Implemented as a **pure function** in `domain/engine/SessionEngine.kt`
with zero Android imports, so every rule here is unit-testable on the JVM.

`fun onEvent(state: SessionState, event: SessionEvent, ctx: EngineContext): EngineResult`

`EngineContext` carries `now: Instant`, `zone: Zone?`, `hourBand: HourBand`, `config: Rules`.

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

## Transition table

| From | Event | Guard | To | Commands |
|---|---|---|---|---|
| `IDLE` | `ZoneEntered` | arming matrix says yes AND no cooldown active | `SHADOW` | `ScheduleTimer(CHECKIN, interval)`, show arm banner, start FGS |
| `IDLE` | `ZoneEntered` | matrix says no, or cooldown | `IDLE` | none, and **do not notify her**. Silence is correct here. |
| `IDLE` | `ManualArm` | - | `SHADOW` | `ScheduleTimer(CHECKIN, 10 min)`, start FGS |
| `SHADOW` | `CheckInTimerFired` | - | `CHECKIN_1` | `ShowCheckIn(90, GENTLE)`, `ScheduleTimer(CD1, 90)` |
| `SHADOW` | `ZoneExited` | armMode = AUTO_ZONE | `RESOLVED(DISARMED)` | `CancelTimer(CHECKIN)`, stop FGS, log `ZONE_EXIT` |
| `SHADOW` | `ZoneExited` | armMode = MANUAL | `SHADOW` | none. Manual arming is not zone-bound. |
| `SHADOW` | `ManualDisarm` | - | `RESOLVED(DISARMED)` | cancel timers, stop FGS, start 45 min cooldown for this zone |
| `SHADOW` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry below |
| `CHECKIN_1` | `OkTapped` | - | `SHADOW` | `CancelTimer(CD1)`, `ScheduleTimer(CHECKIN, interval)`, 20 min cooldown |
| `CHECKIN_1` | `CountdownExpired(1)` | - | `CHECKIN_2` | `ShowCheckIn(60, URGENT)`, `PlayUrgentAlert`, `ScheduleTimer(CD2, 60)` |
| `CHECKIN_1` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `CHECKIN_2` | `OkTapped` | - | `SHADOW` | as above |
| `CHECKIN_2` | `CountdownExpired(2)` | - | `FAMILY_ESCALATED` | `WriteSusEvent(...)`, `NotifyFamily(...)`, `ScheduleTimer(CANCEL, 60)` |
| `CHECKIN_2` | `HelpNowTapped` | - | `SOS_ACTIVE` | see SOS entry |
| `FAMILY_ESCALATED` | `CancelTapped` | - | `RESOLVED(CANCELLED)` | `CancelTimer(CANCEL)`, patch SUS outcome to `CANCELLED_BY_USER`, notify contacts of the cancel |
| `FAMILY_ESCALATED` | `CountdownExpired(cancel)` | - | `SOS_ACTIVE` | `WriteSosIncident(trigger=LADDER_LAPSE)`, patch SUS outcome to `ESCALATED_TO_SOS`, `RequirePinToStop` |
| `FAMILY_ESCALATED` | `HelpNowTapped` | - | `SOS_ACTIVE` | as above but `trigger=MANUAL_HELP_BUTTON` |
| `SOS_ACTIVE` | `PinAccepted` | - | `RESOLVED(ESCALATED_SOS)` | patch incident `status=STOPPED, stoppedAt`, stop FGS |
| `SOS_ACTIVE` | anything else | - | `SOS_ACTIVE` | **ignore.** Only a correct PIN leaves SOS. |
| any | `AppKilledRestart` | - | see recovery | |

**Every other (state, event) pair is a no-op.** Log it at debug level and do not crash.

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
| `SHADOW` | re-register geofences, recompute the next check-in from `armedAt` + interval. If already overdue, fire `CheckInTimerFired` immediately. |
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

data class EngineContext(
    val now: Instant,
    val zone: Zone?,
    val hourBand: HourBand,
    val rules: Rules,
    val armMode: ArmMode,
    val armedAt: Instant?,
    val deadline: Instant?,
    val cooldowns: Map<String, Instant>,
    val hasFavourite: Boolean,
    val susEventWritten: Boolean
)

data class EngineResult(val state: SessionState, val commands: List<Command>)
```

`susEventWritten` exists so the SOS entry block knows whether to write a catch-up SUS event
when she skipped the ladder with Help Now. `hasFavourite` exists so the family step can
render `family_no_contact` without the engine touching a repository.

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
