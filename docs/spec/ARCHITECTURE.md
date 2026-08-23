# Saaya Lite - Architecture

## Shape

Single npm module, clean-ish layering. **Do not build a multi-module project.** At this
size it costs more than it returns and the build window is nine evenings.

```
app/
  di/                 React context providers
  data/
    local/            IndexedDB: entities, store accessors, database, EncryptedSharedPreferences
    remote/           Firestore writers
    zone/             Zone loading from bundled assets
    repository/       The only thing ViewModels touch
  domain/
    model/            Pure TypeScript models, no framework imports
    engine/           SessionEngine, ArmingEvaluator, IntervalCalculator, Anonymiser
  service/            SaayaForegroundService, geofencing, notifications, alarms
  ui/
    theme/            Colours, type, spacing from DESIGN_SYSTEM.md
    components/       Shared components
    screens/          One package per screen
    navigation/       NavGraph, routes
  util/               Clock, formatters, locale
```

## Layer rules

| Rule | Why |
|---|---|
| `src/domain/` has **zero browser API, React or DOM** | The engine and the rules must be unit-testable under vitest with no browser. This is what lets us verify the trust boundary in `TEST_PLAN.md`. Grep it for `window`, `document`, `navigator`, `localStorage`: nothing. |
| ViewModels talk to repositories only, never to IndexedDB or Firestore | One seam to fake in tests. |
| `SessionEngine` is a pure state machine | Input: events. Output: state plus a list of side-effect commands. It does **not** fire notifications, write Firestore or start services itself. |
| The service executes commands, the engine decides them | Keeps every timing rule testable without a browser. |

## The core decision: engine emits commands, service performs them

```typescript
// domain/engine
data class EngineResult(val state: SessionState, val commands: List<Command>)

// CANONICAL DEFINITION LIVES IN STATE_MACHINE.md, which is the type-contract document
// and is what T4.1 reads. This copy is illustrative; if they ever differ, that one wins.
sealed interface Command {
  data class ShowCheckIn(val countdownSec: Int, val urgency: Urgency) : Command
  data class NotifyFamily(val payload: FamilyPayload) : Command
  data class WriteSusEvent(val event: SusEvent) : Command
  data class WriteSosIncident(val incident: SosIncident) : Command
  data class ScheduleTimer(val id: TimerId, val delaySec: Int) : Command
  data class CancelTimer(val id: TimerId) : Command
  data object PlayUrgentAlert : Command
  data object RequirePinToStop : Command
}
```

`SessionEngine.onEvent(event): EngineResult` is a **pure function of (currentState, event,
clock, config)**. No IO, no async, no browser API. Every rule in `BUSINESS_RULES.md` is
tested against this function directly.

## Threading

| Concern | Choice |
|---|---|
| Location updates | `navigator.geolocation.watchPosition` inside the wake lock plus a visible page |
| Timers | `an absolute deadline in IndexedDB` with `setExactAndAllowWhileIdle`. **Not** coroutine `delay`, which does not survive Doze. |
| Persistence | IndexedDB with suspend store accessors on `Dispatchers.IO` |
| Firestore writes | Enqueued to IndexedDB first, then flushed. See the offline queue below. |
| UI | `StateFlow` exposed by ViewModels, collected with `collectAsStateWithLifecycle` |

## The offline queue is not optional

F22 and F32. Every outbound write goes to IndexedDB `queued_event` first, then a flusher drains it.

```
Engine emits WriteSusEvent
  -> insert into queued_event (status = PENDING)
  -> QueueFlusher attempts Firestore write
     -> success: status = SENT
     -> failure: status stays PENDING, retry with backoff 5s, 15s, 60s, 5min, then on
        next connectivity change
```

Rationale: an unlit road in Vizag at 4 a.m. is where connectivity is worst and where the
escalation matters most. **Losing signal must never lose the escalation.** This is a
submission claim, so it must actually be true.

## Dependency list, and nothing else

| Dependency | Purpose |
|---|---|
| React (BOM) + Material 3 | UI |
| dependency wiring | DI |
| IndexedDB | local persistence and the offline queue |
| `androidx.security:security-crypto` | EncryptedSharedPreferences for the PIN hash |
| `play-services-location` | fused location and geofencing |
| Firebase BOM: Firestore, Auth (anonymous only) | the state view writes |
| `org.Leaflet:Leaflet-android:6.1.20` | map rendering. **Decided, see `MAP_SPEC.md`.** |
| _(none: `JSON.parse` is native)_ | asset parsing |
| `androidx.core:core-splashscreen:1.0.1` | the platform splash API. Added 2026-08-19 by founder decision when T1.1 blocked on it. |
| `com.android.tools:desugar_jdk_libs:2.0.4` | core library desugaring, so `java.time` works on the 320 px viewport floor. Added 2026-08-19 when T4.1 blocked on it. |

**Map choice is decided: Leaflet with CARTO Dark Matter tiles.** Founder decision
2026-08-18. No API key, no billing account, no quota, so nothing in the build depends on a
credential that could fail on submission day. Full specification in `MAP_SPEC.md`.
Do not substitute Google Maps.

Do not add: Retrofit (no REST API), WorkManager (an absolute deadline in IndexedDB is more precise for this),
any analytics SDK, any crash reporter that phones home, any AI or ML library.

## Build config

| Setting | Value |
|---|---|
| `target floor` | 24 |
| `targetSdk` | 34 |
| `compileSdk` | 34 |
| `applicationId` | `com.nexaflow.saayalite` |
| TypeScript target | ES2020 |
| Build types | `debug` (demo trigger visible), `release` (demo trigger visible **and labelled**, since judges install the deployed site) |

**Note on the demo trigger.** Unlike full Saaya, the demo affordance ships in release here,
because a judge installing the deployed site must be able to reproduce the journey without walking
into a Vizag zone at 4 a.m. It is labelled on screen as a demo control. This is the
opposite of the Saaya de-demo rule and it is deliberate, because the audience is different.

---

## Dependency injection: the complete module list

Four React context providers. **Do not create a fifth without asking.**

```typescript
@Module @InstallIn(SingletonComponent::class)
object AppModule {          // Clock, CoroutineScope, Dispatchers, Context-derived helpers
    @Provides fun clock(): Clock = Clock.system(ZoneId.of("Asia/Kolkata"))
    @Provides fun rules(): Rules = Rules.DEFAULT
    @Provides @IoDispatcher fun io(): CoroutineDispatcher = Dispatchers.IO
}

@Module @InstallIn(SingletonComponent::class)
object DataModule {         // IndexedDB store, all store accessors, EncryptedSharedPreferences
}

@Module @InstallIn(SingletonComponent::class)
object RemoteModule {       // FirebaseFirestore, FirebaseAuth
}

@Module @InstallIn(SingletonComponent::class)
abstract class RepositoryModule {   // @Binds every interface below to its impl
}
```

`Clock` is injected, never `System.currentTimeMillis()` at a call site. That single rule is
what makes the entire ladder testable with a fake clock.

## Repository interfaces

Six. ViewModels and the service touch **only** these, never IndexedDB or Firestore directly.

| Interface | Responsibility |
|---|---|
| `ZoneRepository` | zones, cards, stations from bundled assets; nearest station; point-in-polygon |
| `SessionRepository` | current session, session events, cooldowns, persisted deadlines |
| `FavouriteRepository` | CRUD over `contact`. **Never uploads.** |
| `SettingsRepository` | PIN hash and verify, language, onboarded flag, demo speed |
| `QueueRepository` | enqueue, drain, backoff, status; the only path to Firestore |
| `StateViewRepository` | builds SUS and SOS payloads via `Anonymiser`, hands them to the queue |

Each has a `Fake` in `src/test` used by the engine and ViewModel tests. Write the fake in
the same task as the interface, never later.
