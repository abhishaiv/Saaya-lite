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
src/
  domain/                 THE PURE ENGINE. zero DOM, zero React, zero browser API.
    model/                SessionState, SessionEvent, Command, PersistedSession, Rules
    engine/               SessionEngine, ArmingEvaluator, IntervalCalculator
  data/
    db/                   IndexedDB via idb: schema, stores, migrations
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
| The UI talks to local repositories only, never directly to IndexedDB | One seam to fake in tests. Lite has no remote data layer. |
| `SessionEngine` is a pure state machine | Input: events. Output: state plus a list of side-effect commands. It does **not** fire notifications, write remote data or touch the network itself. |
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

**Commands are intent only.** The frozen union retains remote-delivery intents for the
round-two design, but Lite installs no performer for them. `NotifyFamily` carries no phone
number and no message; `WriteSusEvent` carries no zone name. The full command list is frozen
in `STATE_MACHINE.md`; do not add a command that carries personal data.

## Timing, location and the tab

Full detail and the honest limitation are in `WEB_PLATFORM.md`. The architectural rules:

| Concern | Choice |
|---|---|
| Location | `navigator.geolocation.watchPosition`, `enableHighAccuracy: true` while armed. Sampling from `SetLocationSampling`. |
| Timers | An **absolute `deadlineEpochMs`** in IndexedDB. `setTimeout` is only ever a hint for the visible tab. |
| Resuming | On `visibilitychange` and on load, **recompute** from `deadlineEpochMs`. Never resume a countdown from where it paused. A frozen tab is the normal case, not the edge case. |
| Staying awake | `navigator.wakeLock.request("screen")` while armed, re-acquired on `visibilitychange` because the browser drops it. |
| Persistence | IndexedDB via `idb`, async everywhere. |
| Remote delivery | **Absent in Lite.** No Firestore client, queue or flusher is constructed. |
| UI state | React state driven by a reducer that wraps the pure engine. |

## Lite has no outbound queue

F22, remote writers and the console are cut to round two. Ordinary map tiles are the only
off-origin product requests; the safety ladder carries no personal, session or precise
location data and never queues or claims a later send. This keeps the privacy claim
executable rather than aspirational.

## Dependency list, and nothing else

Runtime, pinned in `BUILD_CONFIG.md`:

| Dependency | Purpose |
|---|---|
| `next`, `react`, `react-dom` | framework and UI |
| `typescript` | language |
| `leaflet` | map rendering with OpenStreetMap Standard tiles. **Decided, see `MAP_SPEC.md`.** |
| `idb` | IndexedDB wrapper: local persistence |

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

**The one Service Worker** is a narrowly retained round-two notification capability, because
Chrome on Android has no `Notification` constructor. Lite does not request notification
permission or post notifications. The worker has no `fetch` handler and caches nothing. Do
not give it one, and do not add a second. `WEB_PLATFORM.md` is the authority on this.

## DI: four providers, no container

There is no Hilt and no DI container. Lite uses the local providers it needs in
`app/layout.tsx`. Do not add a remote provider without the round-two decision.

| Provider | Supplies |
|---|---|
| `AppProvider` | `Clock`, `Rules.DEFAULT`, locale |
| `DataProvider` | the IndexedDB handle and every store accessor |
| `RepositoryProvider` | the local repositories below, wired to the local stores |

`Clock` is injected, never `Date.now()` at a call site. That single rule is what makes the
entire ladder testable with a fake clock.

## Repository interfaces

Four. The UI and `src/platform/` touch **only** these local interfaces, never IndexedDB
directly.

| Interface | Responsibility |
|---|---|
| `ZoneRepository` | parent zones, localized aggregate hotspots, cards and stations from bundled assets; nearest station; point-in-hotspot-circle |
| `SessionRepository` | current session, cooldowns and persisted deadlines. Lite has no local session-event timeline. |
| `FavouriteRepository` | CRUD over `contact`. **Never uploads.** |
| `SettingsRepository` | PIN hash and verify via Web Crypto, language, onboarded flag, demo speed |
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
