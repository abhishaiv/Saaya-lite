# Saaya Lite - Map
The hero surface. She opens the app to look at this, and the whole "a map she actually
opens" argument depends on it looking deliberate rather than default.

## Engine: Leaflet. No key, no billing.

Founder decision 2026-08-18, replacing an earlier Google Maps choice, so that **nothing in
the build depends on a credential that could fail on submission day.**

| | |
|---|---|
| Library | `leaflet` 1.9.4 from npm, pinned in `BUILD_CONFIG.md` |
| API key | **none required** |
| Billing | **none** |
| Tile failure | an honest offline state; bundled zones and detail continue to work |
| Offline behaviour | localized bundled hotspot circles render with no tiles, see below |

## Tiles: OpenStreetMap Standard

```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

OpenStreetMap provides the street context needed to orient a route without a credential or
billing account. On 2026-08-28, the former CARTO endpoint began returning a 200-image
watermark reading “API KEY REQUIRED”; it is rejected because that failure is invisible to a
normal tile-error handler and would ship into the demo.

| Setting | Value |
|---|---|
| Tile source | OpenStreetMap Standard (labels retained, she needs to orient) |
| Credential | none |
| User agent | not applicable. The browser sends its own; nothing to configure. |
| Cache | the browser HTTP cache only, governed by OpenStreetMap's headers. Nothing to configure, no cap to set, and no Service Worker tile cache in the prototype. |
| Min zoom | 10 |
| Max zoom | 17 |
| Default | zoom 14, centred on `17.7100, 83.3000` so a 100–200 m hotspot is visible as a local area rather than a city-wide warning |
| Fractional zoom | `zoomSnap: 0.5` (`map.zoom.snap`). Set it on the map, not per call, so Leaflet honours deliberate fractional camera changes. |

### Attribution, non-negotiable

`© OpenStreetMap contributors`, `type.map.attribution`, `textTertiary`, bottom-left, above the
navigation inset, always visible. This is a licence condition, not a design choice. Do not
hide it behind a sheet and do not shorten it.

**It is type, so it is emitted in `rem`** like every other string: `calc(10 / 16 * 1rem)`
per `DESIGN_SYSTEM.md`, not a flat `10px`. It is small text that a reader who has enlarged
their browser font most needs to be able to read, and a licence condition is the last thing
to pin at a fixed size.

## Localized hotspot rendering

The map renders **70 localized, translucent hotspot circles** derived at load from the 104
immutable aggregate locality anchors in `vizag_heatmap_points.json`. They are not individual
incident locations and their names, counts and weights never appear in the UI.

Every visible anchor joins once to one of the 19 non-`SAFE` parent localities. HIGH anchors
are **200 m red**, MODERATE anchors are **150 m orange**, and ELEVATED anchors are **100 m
yellow**. The 18 anchors that land only in a `SAFE` parent and the 16 that belong to no
parent locality draw nothing. There is **no green layer** and no city-scale polygon fill.

| Layer | Treatment |
|---|---|
| Base | localized translucent circle at the parent zone's frozen opacity |
| Stroke | same `color` at full strength, **1.5 px** |
| Stroke, selected | **3 px**, with the parent zone's fill opacity raised by 0.1 for every one of its circles |
| Glow, selected | a second circle beneath at 6 px, same colour, 15% opacity |
| Label | none. A dense ring of locality labels would make the circles unreadable. |
| Draw order | lower `risk_score` first; a high-risk circle is never buried below a moderate one. |

A circle tap selects its parent locality and opens the existing zone-detail sheet. The 19
parent zones still join 1:1 to `zone_info_cards.json` on `station_id`; its `area_name` is
used by the sheet and accessibility label, never as a dense map label. `station_name` and
`areas_covered` remain unsuitable labels because they are a jurisdiction and a long list,
respectively.

The historical polygons are used only once at data load to classify an immutable aggregate
anchor to its parent locality. They are never drawn and are not the live containment shape.
Precompute the circles once at load. **Never regenerate or tessellate them per frame.**

## Her location

| Element | Treatment |
|---|---|
| Dot | 14 px, `brand` `#A78BFA`, 2 px `#FFFFFF` ring at 90% |
| Accuracy circle | `brand` at 12% fill, no stroke, only when accuracy is worse than 30 m |
| Heading | **none.** No compass cone. It adds jitter and we never navigate. |
| Pulse | **none while idle.** While `SHADOW`, a single slow 2 s breathing halo at 8% opacity. This is the only ambient animation in the product, and it is what makes "watching" legible without a word. |

Never auto-centre while she is panning. Offer a `MapControlButton` to recentre instead.

## Police stations

**Map station markers are not in this build**, though the zone sheet's nearest-station block
is. The markers were a separate map layer needing a `local_police` glyph that is not in the
frozen 17-icon subset, and nothing in `DEMO_SCRIPT.md` taps one. Do not add the glyph.

The nearest-station block inside the zone sheet stays: it uses `call`, which is in the
subset, and the same nearest-station computation the SOS payload already needs.

## Controls

Floating, per `COMPONENT_LIBRARY.md` C13. Right edge, 12 px gaps, above the bottom sheet.

1. Recentre (`my_location`)
2. What the police see (`visibility`)

Zoom buttons are **not** shown. Pinch is enough and two extra buttons on a full-bleed map
is clutter. Rotation and tilt are **disabled**.

## Tiles unavailable

Already required by `STATES_CATALOGUE.md` S3 and `RESPONSIVE_SPEC.md`. Restating because it
is the single most likely thing to go wrong in a live demo on venue wifi:

**The map never blocks on tiles.** Zones, stations and her dot render immediately over
`background` `#0B0B0F`. If no tile arrives within 4 s, show a small `caption` note reading
"Map offline, zones still work" and carry on. A tileless Saaya Lite is fully usable, which
is a genuine resilience story worth mentioning in the write-up rather than hiding.

**Precisely what that claims.** The page is already open and the network then drops. It does
**not** claim the app opens with no network: there is no cached shell and no offline first
launch. See `WEB_PLATFORM.md`.

**Offline is a state, not a load-time verdict.** The 4 s rule above is only how it is first
entered. Tiles that loaded once are no guarantee the next ones will, and venue wifi is
exactly where this breaks.

| Enter offline | on `tileerror`, on the browser's `offline` event, or when no tile arrives within `map.tile.timeout` |
| Leave offline | **only on a subsequent successful `tileload`.** Not on the `online` event: a network that says it is back has not yet proved a tile will arrive. |
| Teardown | remove both the Leaflet and window listeners when the map unmounts |

The note is the only thing that changes. Zones, her dot and the whole ladder carry on
untouched in either state, which is the point being claimed.

## Performance

| Budget | Value |
|---|---|
| First zone paint | under 400 ms after Home composes, independent of tiles |
| Frame rate while panning | 60 fps on a 2 GB device |
| Tile caching | browser HTTP cache only. Nothing to configure, no cap, no Service Worker cache. See `WEB_PLATFORM.md`. |
| Hotspot circles | derived once at load, kept in memory |

If panning cannot hold 60 fps, drop tile detail first. **The zones are the product, the
streets are context.**

## Why not the alternatives

Recorded so this is not relitigated mid-build.

| Option | Why not |
|---|---|
| Google Maps SDK | Needs an API key and a billing account. A key or quota problem on submission day kills the live demo, and the brief requires everything to work without requesting access. |
| CARTO Dark Matter | Its formerly public endpoint now serves an API-key watermark as a successful image response, so browser error handling cannot protect the demo. |
| MapLibre GL + OpenFreeMap | Genuinely good, vector, free, no key. Rejected on weight: the GL bundle is several times Leaflet's, and `perf.bundle` is 200 KB gzipped for the whole app. |
| No basemap, bundled vectors only | Cleanest and fully offline, but she cannot orient against real streets, which undercuts "check a stretch before you commit to it". |

---

## No hotspot-label collision system

There are deliberately no map labels over the localized circles. The map’s street labels
remain the orientation layer; tapping a circle reveals its parent locality in the existing
detail sheet. This keeps the safety surface legible at city scale without inventing a label
placement system that would obscure the actual hotspots.

---

# The walk view

**Amendment 2026-09-11.** A second view of the same surface, toggled from the first. The
flat map stays the default and stays the reference; this is an alternative she can switch to
and switch back from at any time. Founder direction: as close as possible to a
location-based game's feel, "maybe even better looking and feeling".

**This is a second view, not a second product.** Every rule below exists to keep it that way.

## The toggle

A third `MapControlButton` in the right-edge stack, above recentre:

1. Recentre (`my_location`)
2. What the police see (`visibility`)
3. **View** (`map` / `3d_rotation`) - toggles flat and walk

It is a control, not a mode switch with its own screen. The sheet, the ladder, the countdown
and the SOS button are all still there in the walk view, unchanged. She is never in a
different app.

**State is not persisted as a preference across sessions beyond the current one.** The flat
map is what opens. See `SCREENS.md`.

## Engine: three.js, lazy, one directory

| | |
|---|---|
| Library | `three` 0.185.0, pinned in `BUILD_CONFIG.md` |
| Types | `@types/three` 0.185.4 |
| API key | **none** |
| Billing | **none** |
| Imported in | `src/platform/walk/` **only** |
| Loading | `next/dynamic`, `ssr: false`, never in the initial chunk |
| Ceiling | `perf.bundle.walk`, 190 KB gzipped |

`three` is a browser API consumer, so it lives in `src/platform/`, which is already the only
place a browser API may be called outside `app/`. The React screen holds a canvas ref and
hands it to the platform module. **Do not import `three` from `src/ui/`.**

The measured tree-shaken chunk for this import surface is 140 KB gzipped on 0.185.0, so the
ceiling has real headroom for the runtime and the customiser. If it is exceeded, the fix is
to import less of `three`, not to raise the fact.

## The world asset

`public/assets/world/world_tiled.json`, built by the bake in `/Users/abhishai/saaya-lite-world/`
(`fetch.py` -> `bake2.py` -> `tile.py`). It is **derived from the same OSM extract and the
same frozen `vizag_heatmap.geojson`** as the flat map. It is not a second dataset, which is
what makes the per-road risk lawful - see `FEATURES.md` Amendment 1.

```
70 tiles, 13 x 10 grid, 1024 m per tile
  roads      5682 fragments   (751 roads split across seams, 0 lost)
  buildings 12690 fragments   (406 split, 0 lost)
  green       220 fragments
  water        28 fragments
whole world  1,146 KB raw / 277 KB gzipped
sum of per-tile gzip  296 KB   <- what she actually downloads, streamed
median tile  1.6 KB gzipped
```

Coordinates are projected metres relative to `17.7217 N, 83.3071 E`, quantised to 0.25 m
inside each tile's own origin and stored as signed deltas. **The tile size is read from
`meta.tileM`, never hardcoded.** Every feature is clipped to each tile it touches, so
fragments join seamlessly and no road ends at a seam.

Building heights are the stated storey rule at **3.2 m per storey**, from real
`building:levels` where OSM has it and a type table where it does not. Heights are therefore
honest, not invented, and the character at `walk.character.height` scales against them
correctly.

## Streaming

Tiles load around her, not all at once. She is in exactly one tile; keep that tile and the
ring around it resident, and drop the rest.

| | |
|---|---|
| Resident window | her tile plus the 2-tile ring around it |
| Drop | anything outside it, with a short grace period so a boundary walk does not thrash |
| Decode | off the render thread where the browser allows it |
| Budget | never more than one tile decoded per frame |

A tile that has not arrived is **not** a hole in the world. The ground plane renders in the
`background` colour underneath, exactly as the flat map renders zones over `#0B0B0F` with no
tiles. The same rule as `map.tile.timeout`: **the walk view never blocks on geometry.**

## Roads, and the one thing that must not drift

Road risk is the feature the founder asked for - "all the crime hotspots and unsafe roads are
shown to us intuitively" - and it is the feature `FEATURES.md` cut. Amendment 1 restored it
with a bound. The bound is binding here:

| | |
|---|---|
| Source | the road's own zone: `total_cases / area_km2`, the same density the flat map colours zones with |
| Falloff | risk fades from the zone's incident centre over `walk.risk.falloff_m` (1400 m) |
| Floor | never below `walk.risk.falloff_floor` (0.35) of the zone's value, so no road is drawn safer than its zone |
| Which zone | the **worst** zone the road touches - `walk.risk.zone_rule` |
| Rendered as | a band on the road surface. **A band, never a count, never a rate, never a number of incidents.** |
| Labelled | the view states in the UI that per-road risk is derived from zone data |

**What this must never become.** No road-level claim enters `STATE_MACHINE.md`, the escalation
ladder, or any SUS record. A SUS record still snaps to its zone and carries no session id.
This is `FEATURES.md` Amendment 1 clause 3 and it is not negotiable in implementation.

Roads are drawn as flat ribbons on the ground plane at the tile's own resolution. Class from
`highway`, so a trunk road reads as a trunk road.

## Zones in 3D

The same 19 non-`SAFE` polygons, the same colours, the same rule that `SAFE` zones are never
drawn. The existing facts are reused rather than re-chosen: `map.zone.stroke` 1.5,
`map.zone.stroke.sel` 3, `map.zone.glow` 6, `alpha.map.zone.glow` 0.15.

| Layer | Treatment |
|---|---|
| Fill | the zone's own colour at its own opacity, laid on the ground plane |
| Boundary | a line at the zone edge, so the boundary is legible from a low camera |
| Selected | stroke to `map.zone.stroke.sel`, fill opacity raised by `alpha.map.zone.selected.raise` |
| Label | `area_name` from `zone_info_cards.json`, joined on `station_id`. **Never `station_name`** - the same rule as the flat map, for the same reason. |

**No vertical extrusion of zones.** A translucent wall rising out of the ground would read as
a fence, which is a different and worse claim than "this area is higher risk". The zone is a
tint on the ground and a line at its edge.

## The character

She is the subject of the view. Height `walk.character.height` (1.7 m), walking at
`walk.speed` (1.4 m/s), driven by live GPS at the rate `SetLocationSampling` already sets.

**Her position is real; her motion is interpolated.** GPS arrives at intervals, so the
character eases between fixes rather than teleporting. Under `prefers-reduced-motion` she
snaps to the fix instead - see `MOTION_SPEC.md`.

### How the character is built

**Decision 2026-09-11: Blender-authored parts, assembled at runtime.** The character is not
one mesh with a morph target per option, and it is not built from Three.js primitives. It is
a small set of glTF files, one per option, loaded and assembled into a single rig when a
character is created or loaded.

**Why parts and not morph targets.** A morph target per option means every phone downloads
every option, whether or not she chose it. With parts, a choice costs nothing to the phones
that did not make it, and the axis lists can grow without the asset growing for anyone who
did not use the new entry.

**Why Blender and not primitives.** The reference's character reads as *cute* because of its
proportions and its face, and that is modelling work. Primitives produce something stylised
and legible, but "as close as possible" is the standing direction, and it is not reachable
from spheres and capsules.

**The axis option id is the part id.** `DATA_MODEL.md` records seven selections as **fixed
option ids**, and an id resolves to a file. This is why the record stores ids rather than
values: an id either names a part that exists or it does not, so a selection from a stale
list is rejected instead of rendering as a silent default.

| | |
|---|---|
| Parts | Blender, exported glTF, one file per option |
| Loader | three's `GLTFLoader`, imported in `src/platform/walk/` only |
| Assembly | swap the part, keep the rig. No skinning per combination, no morph targets. |
| Shared with | the customiser's `CharacterPreview` (`COMPONENT_LIBRARY.md` C16) - **the same assembled rig**, never a second implementation |
| Cost | data assets, not JS. They fall under `perf.site.size` alongside the world tiles, not under `perf.bundle.walk`. |
| Bundle | the loader is **the reason `perf.bundle.walk`'s measurement includes it**: 159 KB gzip / 132 KB brotli with it, against the 190 KB ceiling. Measured 2026-09-11, recorded in `graph/spec_graph.json`. |

**Every option in an axis list must have a part that exists.** An axis option with no
corresponding file is a combination the customiser would offer and the view could not draw,
which is exactly what the fixed-list rule in `COMPONENT_LIBRARY.md` C15 exists to prevent.
The customiser's option lists are generated from the parts present, so the two cannot drift.

### The customiser, and the first switch

**The first time she switches to the walk view, and only if no character exists yet, she is
asked to make one.** Not a modal she cannot dismiss into a broken view: if she skips, a
default character is created and she can edit it later.

Seven axes. Each is a fixed list of options, no sliders and no free colour picker, so every
combination is one the art actually supports:

| Axis | Notes |
|---|---|
| Body | build and height within the stated range |
| Skin | a fixed set of tones |
| Hair | style, and its own colour axis |
| Eyes | shape and colour |
| Outfit | top and bottom |
| Accessories | glasses, bag, scarf - optional, skippable |
| Colours | the palette applied to outfit and accessories |

**Character data lives in the `settings` record, not its own object store.** `DATA_MODEL.md`
is version 1 and its upgrade handler **deletes every object store on a version mismatch**, so
a `character` store would wipe favourites, the PIN hash and any in-flight session. There is no
version bump for this feature.

**The customiser is a screen, not a game shop.** No currency, no unlocks, no rarity, no
progression. Every option is available immediately.

## Anti-gamification, stated because it is the risk

The reference is a location-based game. **The mechanics are not.** The founder's own brand
rules are the reason, and they survive this amendment:

- **No points, no streaks, no rewards, no levels.** Nothing accumulates.
- **No collectibles and no discoverables.** There is nothing to find in a high-risk zone.
- **No other players.** No avatars, no leaderboards, no sharing a position. `FEATURES.md`:
  no live location sharing exists, absent rather than disabled.
- **No "safe route" scoring.** We do not rate a journey as good or bad. We show where risk
  is and she decides.
- **The character is a representation of her**, not a game avatar. Nothing about it is
  earned or improved.

If a mechanic would make a safety view rewarding to spend time in, it is out. **This is the
line between a view she opens and a game she plays**, and the product is the former.

## SOS over the world

The strongest statement in the motion spec, restated here because this is where it could
break:

**While any rung of the ladder is live, the render loop is paused.** `SOS_ACTIVE` renders as
a static overlay on a still frame. Not a dimmed world, not a slow-motion world, not a world
still ticking behind a scrim. A still image under an instant, static emergency surface.

The escalation accent never animates here either.

## Performance

| Budget | Value |
|---|---|
| Frame rate | `perf.fps` 60 on a 2 GB device |
| No frame over | `perf.frame` 32 ms |
| Lazy chunk | `perf.bundle.walk` 190 KB gzipped |
| World, streamed | 296 KB gzipped across the whole world; a handful of tiles in flight at once |

**Degradation order, and it is fixed:** draw distance drops first, then tile detail, then
ambient motion. **The risk bands and her position never degrade**, for the same reason the
flat map drops tiles before zones: the safety information is the product, the scenery is
context.

## Why not the alternatives

| Option | Why not |
|---|---|
| Unity or Godot via WebGL export | The reference is built on Unity, but the export is tens of megabytes before any content and needs a different build pipeline. `perf.bundle.walk` and the whole nine-evening window rule it out. |
| A 2D top-down sprite view | Much cheaper and would run anywhere, but it is a map with a sprite on it. It does not deliver the thing that was asked for. |
| Pre-baked 3D tiles from Blender | Considered and dropped: baking every tile to a mesh makes the asset far larger and freezes the styling, while runtime extrusion from the same quantised vertices costs a fraction and lets the palette stay in code where it is testable. |
| MapLibre GL with a 3D extrusion layer | Free and vector, and it does extrusion well. Rejected because it cannot carry a character, a walk loop or the ground-level framing that makes this a different view rather than a different renderer. |
| One rig with a morph target per option | Every phone would download every option, chosen or not, and the asset grows with the axis lists. Parts cost nothing to the phones that did not make the choice. See "How the character is built". |
| A fully procedural character from primitives | No Blender, smallest bundle, one renderer. Rejected because it cannot reach the reference's proportions or face, and "as close as possible" is the standing direction. |
| Baking the world to meshes in Blender | Superseded on the same reasoning as the row above: the world is extruded at runtime from the tiled vertices, so there is no Blender mesh pipeline for the world. Blender is used for the character, where modelling is the point, and not for the world, where it is not. |
