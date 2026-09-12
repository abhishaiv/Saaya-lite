# Saaya Lite - Build Configuration (web)
Replaces the Android build config, archived as `the git history and branch archive/android-kotlin`.

## Stack, pinned

Runtime dependencies:

```json
{
  "next": "14.2.15",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "leaflet": "1.9.4",
  "three": "0.185.0",
  "firebase": "10.14.1",
  "idb": "8.0.0"
}
```

**`three` is an amendment, recorded 2026-09-11.** It is the only addition to this list since
the web pivot, and it is narrowly scoped: the walk view, lazy-loaded, never in the initial
chunk. Full reasoning in `MAP_SPEC.md` ("The walk view") and the row in `ARCHITECTURE.md`.
`perf.bundle` (200 KB, the initial chunk) is **unchanged**; the walk chunk has its own
ceiling, `perf.bundle.walk` (190 KB gzipped), and is loaded with `next/dynamic` and
`ssr: false`.

**Why 0.185.0 and not the newest.** `three` ships **no type definitions**, so `strict: true`
needs `@types/three`. The newest `@types/three` is **0.185.4**, one minor behind `three`'s
newest (0.186.0). Pinning the runtime a minor ahead of its types is exactly the drift that
produces type errors against APIs that do not exist. Both are pinned on the **0.185** line so
the types and the runtime agree. `perf.bundle.walk` was measured against 0.185.0, so the
stated number and the pinned version are the same build.

Dev dependencies. Not a widening of scope: `strict: true` cannot typecheck without these
typings, G2 cannot run without ESLint, and G3 cannot run without vitest. None ship to the
browser.

```json
{
  "typescript": "5.6.3",
  "@types/node": "20.17.0",
  "@types/react": "18.3.11",
  "@types/react-dom": "18.3.1",
  "@types/leaflet": "1.9.14",
  "@types/three": "0.185.4",
  "vitest": "2.1.3",
  "eslint": "8.57.1",
  "eslint-config-next": "14.2.15"
}
```

`eslint` stays on **8.x**: `eslint-config-next@14.2.15` does not accept ESLint 9.

**Resolution rule, unchanged:** if a version fails to resolve, move to the latest stable in
the same **major** line, record it in `CODEX_LOG.md`, and update this file. A major bump is
not your call: stop and report. This rule already caught `core-ktx` on the Android build.

**Closed dependency list.** Exactly the two blocks above plus their transitive deps.
Nothing else without an explicit amendment recorded here and in `CODEX_LOG.md`. **No**
analytics, no UI kit, no CSS framework, no state library, no component library, no HTTP
client, no date library.

**No component-test tooling, deliberately.** There is no jsdom, no happy-dom and no
Testing Library. `vitest` tests the pure engine in `src/domain/`, which needs no DOM. UI
correctness is verified in a real mobile browser under **G8**, because that is where the
tab-lifecycle bugs in `WEB_PLATFORM.md` actually appear and a simulated DOM would hide
them. Do not add a DOM test environment to make a UI unit test possible.

If a thing seems to need a dependency, it probably needs less code instead.

## Project

| Setting | Value |
|---|---|
| Framework | Next.js **App Router** |
| Language | TypeScript, `strict: true` |
| Rendering | client components for the journey; API routes for Firestore writes |
| Target | ES2020, modern evergreen browsers |
| Package manager | npm (lockfile committed) |
| Node | 20 LTS |

```
app/                      routes
  page.tsx                the map. the entry point. no login.
  api/                    server-only Firestore writes
console/                  the state view (its own route)
src/domain/               THE PURE ENGINE. zero DOM, zero React, zero browser API.
src/data/                 IndexedDB, Firestore client, the queue
src/ui/                   components, theme tokens
src/platform/             the browser edge, and the ONLY place WebGL may be touched
  walk/                   the walk renderer: three.js lives here and nowhere else
public/assets/            the three Vizag files, fonts
public/assets/world/      world_tiled.json, the walk view's geometry
public/assets/character/  the Blender-authored glTF parts, one file per axis option
```

**Where `three` is allowed to appear.** `three` is imported in **`src/platform/walk/` only**.
That directory is the single place a browser API may be called outside `app/`, and a
`WebGLRenderer` is a browser API. React components in `src/ui/screens/walk/` hold a canvas
ref and hand it to the platform module; they never import `three` themselves. This keeps the
existing rule intact rather than carving an exception through it, and it is the same seam
that makes the renderer's input handling testable without a GPU.

**`GLTFLoader` is part of `three` for this rule, not a separate dependency.** It ships inside
the `three` package at `three/examples/jsm/loaders/GLTFLoader.js`, it is imported only in
`src/platform/walk/`, and it lives in the same lazy chunk. It is why `perf.bundle.walk`'s
recorded measurement is **159 KB gzip / 132 KB brotli** rather than the 140 KB measured
without it - both figures and the 190 KB ceiling are recorded in `graph/spec_graph.json`
under `perf.bundle.walk`. Do not add a second glTF or model-loading package.

**The character's parts are assets, not code.** They are fetched from
`public/assets/character/` at runtime and count against `perf.site.size` alongside the world
tiles. An axis option id in the `settings.character` record resolves to a file in that
directory; a build that offers an option with no file is a broken combination, so the
customiser's option lists are generated from the files present (`MAP_SPEC.md`).

`src/domain/` keeps the same rule the TypeScript had: **no platform imports.** It is plain
TypeScript so `SessionEngine` stays a pure function testable under `vitest` with a fake
clock, exactly as specified in `STATE_MACHINE.md`.

## No login

The brief asks for *"mock consumer login credentials if the project requires them."* **Ours
does not.** There is no account, no OTP, no password anywhere in this product, which is a
deliberate part of the design and not a gap: an emergency tool that asks you to sign in
first has already failed.

Say this in the submission rather than leaving a reviewer hunting for a login box.

## Privacy posture, carried over

The Android build's `allowBackup="false"` has no direct web equivalent, but the property it
protected does:

- Favourites and the PIN hash live in **IndexedDB only** and are never uploaded. There is no
  code path that sends them.
- **No cookies** beyond a single session flag. No analytics. No third-party script.
- The Service Worker has no `fetch` handler and **caches nothing**. It exists only to post
  notifications, which Chrome on Android cannot do without one. See `WEB_PLATFORM.md`.
- A reviewer can open devtools, watch the network tab through the whole ladder, and see that
  nothing identifying leaves the device before SOS.

That last line replaces the manifest check the previous platform relied on, and it is a
better demo: a reviewer can run it themselves while the video is playing.

## Deploy

Vercel, connected to the GitHub repo, deploying `main`. Preview deploys per branch.
Environment: only the public Firebase web config, which is public by design
(`SECRETS_AND_ACCESS.md`).

## Quality gates, mapped to the web toolchain

| Gate | Command |
|---|---|
| G1 compiles | `npm run build` |
| G2 lint | `npx tsc --noEmit && npm run lint` |
| G3 tests | `npx vitest run` |
| G6 grounded | `python3 scripts/grounded_check.py <changed .ts/.tsx>` |
| G8 runs | loads on a real mobile browser at the Vercel preview URL |
| G10 reads | `python3 scripts/reads_check.py` |

`grounded_check.py` already scans `.js`/`.mjs`; extend its extension list to `.ts` and
`.tsx`. The **spacing and size facts in `spec_graph` are already px**, so the fact table transfers
unchanged.
