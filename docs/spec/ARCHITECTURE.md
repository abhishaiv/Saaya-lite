# Saaya Lite - Architecture

Web. Next.js App Router, TypeScript. The Android architecture this replaces is archived on
branch `archive/android-kotlin` and nothing from it is required.

## Shape

Single npm package, clean-ish layering. **Do not build a monorepo or a workspace.** At this
size it costs more than it returns and the build window is nine evenings.

```
app/                      Next.js routes
  page.tsx                the map. the entry point. no login.
  layout.tsx              fonts, theme tokens, the providers
  api/                    server-only Firestore writes
console/                  the state view, its own route
src/
  domain/                 THE PURE ENGINE. zero DOM, zero React, zero browser API.
    model/                SessionState, SessionEvent, Command, PersistedSession, Rules
    engine/               SessionEngine, ArmingEvaluator, IntervalCalculator, Anonymiser
  data/
    db/                   IndexedDB via idb: schema, stores, migrations
    remote/               Firestore writers
    zone/                 zone loading from public/assets
    repository/           the only thing the UI touches
  ui/
    theme/                colour, type and spacing tokens from DESIGN_SYSTEM.md
    components/           shared components
    screens/              one directory per screen
  platform/               the browser edge: geolocation, wake lock, timers, visibility
  util/                   clock, formatters, locale
public/assets/            the three Vizag files, fonts, icons
```

`src/platform/` is the only place a browser API may be called outside `app/`. It exists so
the rest of the app can be tested without a browser, and so the tab-lifecycle rules in
`WEB_PLATFORM.md` live in one auditable place rather than scattered through components.

## Layer rules

| Rule | Why |
|---|---|
| `src/domain/` has **zero browser API, React or DOM** | The engine and the rules must be unit-testable under vitest with no browser. This is what lets us verify the trust boundary in `TEST_PLAN.md`. Grep it for `window`, `document`, `navigator`, `localStorage`, `fetch`, `Date.now`: nothing. |
| The UI talks to repositories only, never to IndexedDB or Firestore | One seam to fake in tests. |
| `SessionEngine` is a pure state machine | Input: events. Output: state plus a list of side-effect commands. It does **not** fire notifications, write Firestore or touch the network itself. |
| `src/platform/` performs commands, the engine decides them | Keeps every timing rule testable without a browser. |

## The core decision: engine emits commands, the app performs them

```typescript
// src/domain/engine
export function onEvent(
  state: SessionState,
  event: SessionEvent,
  ctx: EngineContext,
): EngineResult;   // { state, commands: Command[] }
```

`onEvent` is a **pure function of (state, event, ctx)**. No IO, no async, no browser API.
Time enters as `ctx.nowEpochMs`; the engine never calls `Date.now()`. Every rule in
`BUSINESS_RULES.md` is tested against this function directly.

**Commands are intent only.** `NotifyFamily` carries no phone number and no message.
`WriteSusEvent` carries no zone name. The performer builds any payload from its own store
at the moment it acts. The full command list is frozen in `STATE_MACHINE.md`; do not add a
command that carries personal data.

## Timing, location and the tab

Full detail and the honest limitation are in `WEB_PLATFORM.md`. The architectural rules:

| Concern | Choice |
|---|---|
| Location | `navigator.geolocation.watchPosition`, `enableHighAccuracy: true` while armed. Sampling from `SetLocationSampling`. |
| Timers | An **absolute `deadlineEpochMs`** in IndexedDB. `setTimeout` is only ever a hint for the visible tab. |
| Resuming | On `visibilitychange` and on load, **recompute** from `deadlineEpochMs`. Never resume a countdown from where it paused. A frozen tab is the normal case, not the edge case. |
| Staying awake | `navigator.wakeLock.request("screen")` while armed, re-acquired on `visibilitychange` because the browser drops it. |
| Persistence | IndexedDB via `idb`, async everywhere. |
| Firestore writes | Enqueued to IndexedDB first, then flushed. See below. |
| UI state | React state driven by a reducer that wraps the pure engine. |

## The offline queue is not optional

F22 and F32. Every outbound write goes to IndexedDB `queued_event` first, then a flusher
drains it.

```
Engine emits WriteSusEvent
  -> insert into queued_event (status = PENDING)
  -> QueueFlusher attempts the Firestore write
     -> success: status = SENT
     -> failure: status stays PENDING, retry with backoff 5s, 15s, 60s, 5min, then on
        the next `online` event
```

Rationale: an unlit road in Vizag at 4 a.m. is where connectivity is worst and where the
escalation matters most. **Losing signal must never lose the escalation.** This is a
submission claim, so it must actually be true.

## Dependency list, and nothing else

Runtime, pinned in `BUILD_CONFIG.md`:

| Dependency | Purpose |
|---|---|
| `next`, `react`, `react-dom` | framework and UI |
| `typescript` | language |
| `leaflet` | map rendering with OpenStreetMap Standard tiles. **Decided, see `MAP_SPEC.md`.** |
| `firebase` | Firestore and anonymous Auth, for the state view writes |
| `idb` | IndexedDB wrapper: local persistence and the offline queue |

Dev only: `@types/node`, `@types/react`, `@types/react-dom`, `@types/leaflet`, `vitest`,
`eslint`, `eslint-config-next`. These are required by gates G2 and G3 and by
`strict: true`; they ship nothing to the browser.

**Map choice is decided: Leaflet with OpenStreetMap Standard tiles.** The CARTO endpoint
was retired on 2026-08-28 after it served a visible API-key watermark as a successful tile.
The replacement needs no API key or billing account; tile unavailability remains an honest
offline state with bundled zones still usable. Full specification in `MAP_SPEC.md`.
Do not substitute Google Maps.

**Do not add:** any CSS or UI framework, any state library, any component library, any
analytics SDK, any crash reporter that phones home, any AI or ML library, any HTTP client
(`fetch` is native), any date library (epoch millis and `Intl` are enough). If a thing
seems to need one, it probably needs less code.

**The one Service Worker** exists solely to post notifications, because Chrome on Android
has no `Notification` constructor. It has no `fetch` handler and caches nothing. Do not give
it one, and do not add a second. `WEB_PLATFORM.md` is the authority on this.

## DI: four providers, no container

There is no Hilt and no DI container. Four React context providers, created in
`app/layout.tsx`. **Do not create a fifth without asking.**

| Provider | Supplies |
|---|---|
| `AppProvider` | `Clock`, `Rules.DEFAULT`, locale |
| `DataProvider` | the IndexedDB handle and every store accessor |
| `RemoteProvider` | the Firestore and Auth clients |
| `RepositoryProvider` | the six repositories below, wired to the two above |

`Clock` is injected, never `Date.now()` at a call site. That single rule is what makes the
entire ladder testable with a fake clock.

## Repository interfaces

Six. The UI and `src/platform/` touch **only** these, never IndexedDB or Firestore directly.

| Interface | Responsibility |
|---|---|
| `ZoneRepository` | zones, cards, stations from bundled assets; nearest station; point-in-polygon |
| `SessionRepository` | current session, session events, cooldowns, persisted deadlines |
| `FavouriteRepository` | CRUD over `contact`. **Never uploads.** |
| `SettingsRepository` | PIN hash and verify via Web Crypto, language, onboarded flag, demo speed |
| `QueueRepository` | enqueue, drain, backoff, status; the only path to Firestore |
| `StateViewRepository` | builds SUS and SOS payloads via `Anonymiser`, hands them to the queue |

Each has a `Fake` in `src/test` used by the engine and UI tests. Write the fake in the same
node as the interface, never later.

## Build and deploy

| Setting | Value |
|---|---|
| Framework | Next.js App Router |
| TypeScript | `strict: true` |
| Target | ES2020, modern evergreen browsers |
| Viewport floor | 320 px |
| Package manager | npm, lockfile committed |
| Node | 20 LTS |
| Host | Vercel |

**Note on the demo trigger.** Unlike full Saaya, the demo affordance ships in the deployed
build, because a judge opening the live link must be able to reproduce the journey without
walking into a Vizag zone at 4 a.m. It is labelled on screen as a demo control. This is the
opposite of the Saaya de-demo rule and it is deliberate, because the audience is different.
