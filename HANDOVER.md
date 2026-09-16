# Handover: the Saaya Lite walk view

Written 2026-09-16 so this can be picked up cold. Read `progress.md` alongside it:
that file is the build log, this one is the resume sheet.

---

## 1. What this is

Saaya Lite is the field app. It has one flat map (Leaflet, CARTO tiles). The founder
asked for a second, toggleable view in the shape of Pokemon GO: a customisable
character you walk around a town, with crime hotspots and unsafe roads shown
intuitively in the world itself.

Locked intents, all still in force:

- A toggle between the flat map and the walk view, on Home.
- Fidelity is king. The reference is the Pokemon GO screen recording.
- Live GPS drives the character. She walks as you walk.
- The character is user-built, prompted on first switch to the walk view.
- Seven axes: body, eyebrows, hair, eyes, top, bottom, accessories.
- Character construction is "Blender parts, runtime assembly".
- The frozen spec is amended properly, not worked around.

---

## 2. Where the work lives

| Thing | Where |
| --- | --- |
| Remote | `https://github.com/abhishaiv/Saaya-lite.git` |
| Branch | `m4-walk-view` at `5884cf1` (pushed) |
| `main` | `e34d32e`, untouched. Do not push to it |
| Canonical checkout | `/Users/abhishai/Desktop/Personal Projects/Submission - Varun Maaya/Saaya Lite` (note: **Maaya**, no n) |
| Working clone | `/tmp/saaya-land` |
| World bake toolkit | `/Users/abhishai/saaya-lite-world` (not a git repo) |
| Preview | `https://saaya-lite-git-m4-walk-view-abhishai-vardhans-projects.vercel.app` |

**The canonical checkout is on iCloud Desktop, and git stalls there.** `git status`,
`git add` and `git commit` hang indefinitely on that path. That is why every session
has worked in a `/tmp` clone. `/tmp` is volatile and will be gone after a reboot.
Everything that matters is pushed to `m4-walk-view`, so nothing is actually at risk,
but do not treat `/tmp/saaya-land` as the source of truth.

### Resuming

```bash
git clone https://github.com/abhishaiv/Saaya-lite.git /tmp/saaya-land
cd /tmp/saaya-land && git checkout m4-walk-view
npm ci
SAAYA_VERSION_NAME=m4 SAAYA_VERSION_CODE=1 npx next build
npx next start -p 3120
```

`next.config.mjs` shells out to `git rev-parse` unless `SAAYA_VERSION_NAME` and
`SAAYA_VERSION_CODE` are set. Setting them avoids the call.

### Branch contents

61 files, 5,947 insertions. The walk work in full:

- `src/platform/walk/` — `walkScene.ts` (the renderer, camera and frame loop),
  `walkTiles.ts` (road/building/green/water meshes), `walkProjection.ts` (geodesy),
  `walkZones.ts` (risk zones and labels), `walkWorld.ts`, `walkGeometry.ts`,
  `walkFacts.ts` (every tunable constant), `walkCharacter.ts`, `characterParts.ts`,
  `characterStore.ts`. Seven test files beside them.
- `src/ui/screens/walk/` — `WalkView.tsx` (DOM owner around the canvas),
  `CharacterCustomiser.tsx`, `walkScreen.test.tsx`.
- `public/assets/character/` — 19 `.glb` parts plus `anims.glb`.
- `public/assets/world/world_tiled.json` — the baked world, 70 tiles.
- Spec: `docs/FEATURES.md` (Amendment 1), `docs/spec/MAP_SPEC.md` (walk section),
  plus walk rows in ten other docs and 31 strings in `COPY.md` with a Telugu pass.

---

## 3. The one real bug found, and its fix

The founder opened the preview, switched to the walk view, and saw a black rectangle
with a single band of colour. It read as a crash. It was a race.

`mountWalkScene` resolves as soon as the `WebGLRenderer` exists, while the world
loads behind a floating promise. `WalkView` sends exactly one `update()` when the
mount promise resolves, and after that only when the `location` prop changes
identity. That first fix arrived before `meta` was set, hit the `meta === null`
guard, and was discarded. Nothing re-sent it. So `current` stayed null, `step()`
returned every frame, no tiles were requested, and the camera never left the origin.
**The view only ever worked for someone who was moving.**

Fixed in `walkScene.ts` by keeping `lastView` and applying it when the world lands
(`applyLocation`). Six lines. Commit `5884cf1`.

Measured before and after, by frame colour histogram:

| | colours | background | dominant |
| --- | --- | --- | --- |
| before | 7 | 90.5% | `#601C1B`, 9.2% |
| after | 448 | 54.8% | `#FF9500`, 38.4% |

**No test covers this class of bug.** `walkScreen.test.tsx` uses
`renderToStaticMarkup`, so no effect ever runs. If you touch the mount path, verify
in a browser, not by running vitest.

---

## 4. Where it stands against the reference

Full comparison in `progress.md` under 2026-09-16. The verdict: roughly a fifth of
the way there on the map, close on the character builder.

The five gaps, in the order they matter:

1. **Camera.** 27 m out at 52 degrees shows about 40 m of city. The reference shows
   150 to 300 m. This one constant is why the view feels empty.
2. **No lighting.** Every material is `MeshBasicMaterial`, so nothing has form.
   The reference is lit, with colour, shadow and depth.
3. **Road width.** `ROAD_HALF_WIDTH_M = 4` times the `primary` multiplier of 3 gives
   a 24 m slab that fills 38% of the frame. The reference draws ~8 m ribbons with a
   lighter casing.
4. **The character.** ~35 px unlit black silhouette, no shadow, no heading marker.
   The reference is a lit ~70 px model with a walk cycle.
5. **Zone labels can never appear.** Zones are 2000 m discs anchored at their police
   station. The nearest anchor is 169 m away. The frame is 40 m. Raising the camera
   is not enough on its own; this is structural.

Cheapest real win, in order: camera and road width together (four constants in two
files, invents no new facts), then the lighting rework, which is the actual jump.
Zone readability needs a ruling before anyone touches it.

---

## 5. Open rulings, waiting on the founder

Listed in `progress.md` under "What needs a ruling" (around line 1553).

1. **`progress.md` has three divergent copies.** The repo's stops at 2026-08-19.
   The live worktree's ran to 2026-09-12 at 2,483 lines. A build mirror's was 2,758
   lines and carried the walk sections. Which is canonical is a ruling, not a merge.
2. **`FEATURES.md` Amendment 1.** The frozen line "No live unsafe-roads display.
   Heat-zone markings only." was changed to "...from a separate dataset", with an
   amendment bounding per-road risk to arithmetic on the zone the road sits in. It is
   recorded as a founder amendment because the file requires one. **If that ruling
   was never given, this is the first line to revert.**
3. **`MAP_SPEC.md` walk "Zones in 3D" describes 19 zone polygons.** That is the model
   the walk engine reads, but no longer the model the flat map draws, which is 70
   hotspot circles over 19 parent localities. Needs a ruling.

One more, unresolved and unverifiable: an earlier session also flagged the SCREENS.md
S14/S15 numbering. Both entries exist (lines 332 and 367, added 2026-09-11) and the
exact objection could not be reconstructed from the repo. Treat it as needing
re-derivation, not as a standing item.

There is one known gap that is asserted on purpose: the customiser shows part names
in English in both languages, because `COPY.md` has a row per axis and none per part.
The screen test asserts the gap deliberately, so adding the 16 per-part rows breaks
the test before it can quietly regress.

---

## 6. Commands

```bash
cd /tmp/saaya-land
npx vitest run                        # 43 files, 265 tests
npx eslint src app
python3 scripts/grounded_check.py $(git diff --name-only main..HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
python3 scripts/reads_check.py        # 17 types, 0 unresolved
python3 scripts/kg.py check           # 403 entities, 687 edges
python3 scripts/render_build_state.py
```

`scripts/font_check.py` cannot run here. It needs a pinned upstream font directory
with specific sha256s that is not in the repo.

**`grounded_check.py` needs explicit paths, and zsh does not word-split unquoted
variables.** Use `$(cat file)` or `find -print0 | xargs -0`, or the one-liner above.

---

## 7. Constraints that are not negotiable

From `AGENTS.md`:

- No AI, no ML, no model calls in the product. Every decision is a stated rule.
- Never invent a value.
- The trust boundary is at SOS.
- A SUS record snaps to its zone and carries no session id. No coordinate, ever.
- Favourites never leave the device. No live location sharing exists. Absent, not
  disabled.
- Every mock is labelled in the UI.
- The escalation accent never animates. SOS appears instantly.
- No government branding or implied endorsement. All data synthetic.
- Never touch the Saaya production Firebase project. Never regenerate the Vizag
  dataset.

From `MAP_SPEC.md`:

- No road-level claim may enter `STATE_MACHINE.md`, the escalation ladder, or any SUS
  record.
- The render loop pauses while any rung of the SOS ladder is live. `isLadderLive()`
  in `walkScene.ts` implements this. It deliberately excludes SHADOW.
- No vertical extrusion of zones.
- Zone labels use `area_name` and never `station_name`.
- Do not import `three` from `src/ui/`.

From `SPEC_README.md`: they are called favourites, never contacts. iOS-verbatim
strings are copied character for character.

Frozen and unmodifiable: the three Vizag data files, the iOS-verbatim strings, the
trust boundary, and every fact in `graph/spec_graph.json`.

---

## 8. Environment gotchas that cost time

- **Headless Chromium here has no WebGL by default.** Launch with
  `args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']`
  or every WebGL context is null and the app correctly reports itself offline. A
  reproduction without those flags is invalid.
- **Playwright** is at `~/.claude/skills/gstack/node_modules/playwright`, browsers
  under `~/Library/Caches/ms-playwright`.
- **`graph/spec_graph.json` uses a one-space indent** and hand-mixes literal and
  escaped non-ASCII. Splice it textually. Never regenerate it.
- **`page.goto` with `waitUntil: 'networkidle'` times out.** Use `waitUntil: 'load'`
  with a 45 s timeout.
- The app is behind `AppGate` (IndexedDB `loadOnboarded`), so served HTML never
  contains Home or walk markers. To reach the walk view you must drive onboarding, or
  seed IndexedDB. Harness scripts from previous sessions are in `/tmp/walkrepro/`
  (`drive.mjs` walks onboarding, `move.mjs` nudges GPS, `verify.mjs` checks the
  scene). `/tmp` again, so they may be gone.
- The demo bottom sheet covers the view toggle. Close it first
  (`button[aria-label="Close"]`) or clicks land on `DIV.demo-panel__field`. The
  toggle's aria-label is exactly `View`.
- `canvas.getContext('webgl').readPixels` returns zeros because the drawing buffer
  is not preserved. Use full-page screenshots and a colour histogram instead.
- The world bake toolkit is `/Users/abhishai/saaya-lite-world` (`fetch.py`, `tile.py`,
  `bake.py`, `bake2.py`) if the world ever needs re-baking at different detail.

---

## 9. Next steps

1. Get the ruling on zone-label anchoring, since it decides the camera height.
2. Land the cheap win: camera to ~80 m at 62 degrees, road ribbons to ~8 m with a
   casing. Four constants in `walkFacts.ts` and `walkTiles.ts`. No new facts.
3. Verify in a real browser with the SwiftShader flags. Do not trust vitest here.
4. Do the lighting rework: hemisphere plus directional light, `MeshLambertMaterial`
   instead of `MeshBasicMaterial`, palette lifted off black.
5. Give the character a shadow and a heading marker.
6. Adjudicate the three open rulings.
7. Keep `progress.md` current after every step. That is a standing instruction.

Never push to `main`. Branch and preview only.
