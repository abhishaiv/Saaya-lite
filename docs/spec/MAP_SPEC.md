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
| Heading | **none on this map.** No compass cone. It adds jitter and we never navigate. The walk view's camera does turn to the device's compass, by its own amendment in "The camera, and the frame it composes"; this row governs the flat map and is unchanged by it. |
| Pulse | **none while idle.** While `SHADOW`, a single slow 2 s breathing halo at 8% opacity. This is the only ambient animation in the product, and it is what makes "watching" legible without a word. |

Never auto-centre while she is panning. Offer a `MapControlButton` to recentre instead.

## Police stations

**Map station markers are not in this build**, though the zone sheet's nearest-station block
is. The markers were a separate map layer needing a `local_police` glyph that is not in the
frozen 17-icon subset, and nothing in `DEMO_SCRIPT.md` taps one. Do not add the glyph.

The nearest-station block inside the zone sheet stays: it uses `call`, which is in the
subset, and the same nearest-station computation the SOS payload already needs.

## Controls

Floating, per `COMPONENT_LIBRARY.md` C13. Bottom right, 12 px gaps, above the bottom sheet.

1. **View** (`3d_rotation`) - toggles flat and walk
2. Recentre (`my_location`)

Recentre is the flat map's alone. The 2D map can be panned off her; the walk camera is pinned
to her position, so the same button there would do nothing, and it is dropped rather than left
dead. The walk view's own top-right rail is its own section below.

**What the police see (`visibility`) is not in this stack.** It was the second control here and
is cut to round two with F28. `SCREENS.md` S14 says why the walk view does not render a row for
it either: a dead entry point would be worse than an absent one.

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

A `MapControlButton` at the top of the bottom-right stack, above recentre:

1. **View** (`map` / `3d_rotation`) - toggles flat and walk
2. Recentre (`my_location`) - flat only

The glyph is the view she would arrive at, which is also what the announcement says. It is a
control, not a mode switch with its own screen. The sheet, the ladder, the countdown and the SOS
button are all still there in the walk view, unchanged. She is never in a different app.

The walk view also carries a rail at the top right - the character customiser's mark plus
`settings` - which is `COMPONENT_LIBRARY.md` C13's second stack rather than part of this one.

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

## The camera, and the frame it composes

**Amendment 2026-09-22, and its correction the same day.** Founder ruling: *"We need perfection
in-terms of User experience and look and feel. We want a smooth and aesthetic experince which
matches or even does better than the Pokemon Go version. Do what ever it takes to acheive the
same."* This section is that ruling applied. It amended frozen facts - `walk.camera.pitch`
(52 -> 31.4 -> 32.4), `walk.camera.dist` (27 -> 13.2 -> 13.0), `walk.camera.look_at`
(new, 3.18 -> 3.21), five walk-view colours - and added four. Each amendment is recorded in
`graph/spec_graph.json`, in the fact's own `sourced_from`, rather than worked around in code.

The composition is not a matter of taste, so it is not stated as one. The reference video was
measured frame by frame, and the facts are what that measurement came to:

| | Value | Reference frames |
|---|---|---|
| Vertical field of view | `walk.camera.fov` 54 deg | unchanged |
| Camera angle above the horizon | `walk.camera.pitch` 32.4 deg | elevation 33.0 deg |
| Camera distance behind her | `walk.camera.dist` 12.58 m | 10.62 m of ground back, 6.74 m up |
| Where the axis crosses her vertical | `walk.camera.look_at` 3.11 m | 1.83x her height |
| Horizon, as a fraction of frame height | 0.1646 | 0.164 |
| Her feet, and her head | 0.7361 / 0.6121 | 0.736 / 0.612 |
| Her height on screen | 0.124 | 0.124 |

**Amendment 2026-09-23: she was drawn too small, and the number for it is 0.124.** The founder
opened the view on his phone and ruled: *"The character size is too small for the scree[n], take
inspiration from the Pokemon go game and replicate the size used for the character there."* The
reference video was measured again, frame by frame across the whole clip rather than at three
walk frames, and her height on screen while walking is a **median 0.124 of the frame height**
(range 0.117-0.129) - where the 2026-09-22 reading, from a smaller sample, was 0.120. So the
complaint and the measurement agree, and the amendment is to match the measurement rather than to
flatter the complaint: **0.124, not more.**

What moved is `walk.camera.dist` 13.0 -> 12.58 and `walk.camera.look_at` 3.21 -> 3.11. The
field of view and the angle did not move, and cannot: the horizon row pins the axis depression and
the angle together with the feet row, so the only free parameters left were the distance along the
axis and where the axis crosses her line. The camera slides **0.42 m nearer along the same aim
line**, and the aim point drops 0.10 m with it, which is what keeps the horizon where the frames
have it. The rows it produces: horizon **0.1646**, feet **0.7361**, head **0.6121** - every one of
them inside 0.0004 of its measured row. On a 390x844 viewport she goes from 101.1 px to 104.7 px
of height.

**What this amendment is not.** It is not the whole of "too small". Our avatar is a
realistic-proportioned figure - a small head and long legs - while the reference's is a stylised
one whose head is nearly twice as wide for its height (measured head width 0.039 of the frame
width against a body height of 0.124, a head-to-height ratio near 0.18, against about 0.09 for
this rig). At the same 0.124 of the frame the reference therefore reads considerably larger, and a
camera fact cannot be the whole answer to a silhouette difference. The camera now matches the
measurement; the rig's proportions are recorded in progress.md as a separate, unsettled question.

**The correction: a row is not an angle.** The first solve of these facts derived the frame with
a row taken as `(depression - axis) / fov`, an angle-linear reading. A perspective camera does
not project that way. Three.js projects `NDC_y = tan(angle above the axis) / tan(vFOV / 2)`, and
a row is `0.5 - NDC_y / 2`; the angle-linear form is the small-angle limit of it, so the two
agree near the frame centre and diverge with distance. On the first rig they agreed at her feet
(the model said 0.7451, the render draws 0.7307) and disagreed at the horizon, where the model
said **0.164** and the camera renders **0.178**.

The frames settle which of the two the view was actually composing, and the measurement is what
found this rather than the algebra. Painting the ground plane magenta and turning the fog off
puts the ground plane's own far edge - 2571 m from the camera, where the 5120 m plane ends - at
row **0.1808**, and the projection puts that edge at 0.1809 while the angle-linear reading puts
it at 0.1664. Her own silhouette measures head 0.6137, feet 0.730 against the projection's
0.6119 and 0.7307. The render was drawing the true projection all along; the facts, the spec and
the test were reading the wrong one, which is why the horizon would not move however the fog was
set - **no fog distance can put the haze's own top edge above the horizon row**, so a camera
1.4% of a frame too high could not be corrected in the fog at all.

**The correction: two of the four reference rows were not her.** Re-measured at 3x and 6x
magnification against row rulers, the rows the first solve used turn out to be things adjacent
to her rather than parts of her. **0.746** is the reference's thin **unfilled ground ring**, the
marker it draws around its avatar, which spans 0.694-0.755 and sits *below* her shoes in every
walk frame. **0.621** is the dark underside of her hair, not its lit top. Re-measured: her shoes'
lowest pixel sits at 0.735-0.737 across the three walk frames - a stable measurement - and her
hair top bobs between 0.613 and 0.622 with the walk cycle, so her height on screen is the target
and the head row is the middle of its bob. The horizon row was confirmed numerically rather than
by eye: in all three frames the row's modal colour drops to the haze at y=316 of 1920, 0.1646.

**Why the axis is above her head.** Aiming at the character centres her and loses the ground
she is walking on, which is the whole subject of the view. The reference aims well above its
avatar and lets the street fill the frame; so does this.

**Why the distance came down from 27 m.** At 27 m the camera sat 21 m up and 16.6 m back, and
the composition that distance produced is not the reference's. The reference measures 10.98 m of
ground back and 6.97 m up, and no other distance puts her feet at 0.736 of the frame height with
the horizon at 0.164. The composition is the amendment's whole reason.

The reason this section **used to** give - that 27 m sat *behind* a 16 m building while the
shorter boom "passes under the rooflines instead of looking over them" - is **falsified**, and
the measurement is recorded here so the claim is not repeated. Over the bake's own roads, sampled
every 2 m: 416,608 positions.

| | 13.2 m boom | 27 m boom |
|---|---|---|
| Camera inside a building tall enough to enclose it | **5.54%** | 1.27% |
| Building between the camera and her eye | **6.30%** | 7.78% |
| Camera inside a building, her outside it | **5.58%** | - |

The shorter boom is inside a building **4.4x as often**, not less often: 11 m of ground back from
a road centreline lands in the building on the near side of that street. It improves the
sightline only modestly. So the amendment stands on the composition it was measured for, and not
on a claim about rooflines it does not have. The table is the 13.2 m boom's own measurement; the
correction moved the boom to 13.0 m and 0.7 deg steeper, which is 2.6% less ground back and
changes these rates by well under a percentage point - not re-measured, and not relied on. The
2026-09-23 amendment took the boom to 12.58 m, which is a further 3.2% of ground back; these three
rates are the same order and carry the same caveat.

**The camera-inside-a-building population, and what decides whether the frame survives.** Of the
road positions where the camera is genuinely inside a building ring (5.58%), its **depth past
that ring's boundary** is what matters:

| Camera's depth inside the ring | Share of those positions |
|---|---|
| under 0.25 m | 7.7% |
| 0.25 - 1 m | 21.9% |
| 1 - 3 m | 43.0% |
| 3 - 6 m | 24.1% |
| 6 - 12 m | 3.2% |
| over 12 m | none |

At the shallow end the camera is on the facade plane and the wall is nearly edge-on, so the
frame is a street either way. At the deep end the box's own interior was the entire frame. This
is what the wall-facing rule below exists for, and it is measured there.

### Walls face outward, and the building and roof materials are one-sided

**Amendment 2026-09-22, under the same ruling.**

`appendBuilding` normalises each ring's winding before it extrudes: a ring whose signed area is
positive is reversed, so every wall faces **outward** whichever way its footprint was written.
The bake's rings disagree with each other - of 12,690 building rings, **81.0%** are positive and
**18.9%** negative - and that disagreement is why the building material had to be `DoubleSide`.

With every wall facing outward, the building and roof materials are `FrontSide`:

- From **outside**, the same wall faces the camera it always did, so the frame is unchanged.
- From **inside**, the walls are culled and the world beyond shows through, instead of the box's
  interior being drawn as the nearest surface.

Measured stationary, one variable changed (the two materials), same camera position:

| Camera depth inside its ring | Enclosing ring | Pixels differing |
|---|---|---|
| 0.0 m | 57.6 m | **138** of 1,316,640 (0.01%) |
| 9.2 m | 12.8 m | **986,454** (74.9%) |
| 10.4 m | 8 m | **948,101** (72.0%) |

At the deep positions the `DoubleSide` frame is the inside of the building - a flat wall filling
the view, with the character not visible at all - and the one-sided frame is the street, with her
on it. At the shallow position the two are the same frame to 138 pixels: the fix acts exactly
where it says it acts, and nowhere else.

**What the rule does not do.** It does not fix occlusion. Where a building genuinely stands
between the camera and her, the wall is still drawn, and rightly so - **99.0%** of blocked road
positions clear at a boom of 3 m or less, and **0.97%** clear at no boom at all. Camera
collision is a different change and is not made here.

**All other layers stay `DoubleSide`.** `appendRingFill` is winding-agnostic by construction - it
swaps each triangle's last two vertices so every fill faces up - and leaving the other layers
double-sided means a second guarantee cannot silently fight the first. The building and roof are
the only layers that are extruded, and so the only ones with an inside.

**The dense-tile frame that prompted this was not a double-sidedness defect.** With `DoubleSide`
restored, that frame is pixel-identical: it is an honest occlusion in a half-metre slit between
two eight-metre buildings, and she is not inside a building there at all.

### The palette, and the one inversion that matters

The walk view is a night scene and the reference is daylight, so the amendment takes the
reference's **luminance structure** rather than its colours: every surface keeps Saaya's own
indigo key, at the relations the reference frames measure.

| Surface | Fact | Relation measured from the reference |
|---|---|---|
| Sky | `color.walk.sky` | the dark half of the frame |
| Ground (land) | `color.walk.ground` | **1.8x the sky** - the contrast the old all-black scene could not have (1.0) |
| Road | `color.tile.road` | 0.56 of the ground |
| Green | `color.tile.green` | 0.85 of the ground |
| Water | `color.tile.water` | the road's own luma - a river and a road both read dark |
| Building wall | `color.tile.building` | below the ground: at night a block reads as a mass against a lit plane |
| Building roof | `color.tile.building.roof` | at the reference's lit-block luma, and **lighter than the ground** |
| Distance haze | `color.walk.haze` | the reference's horizon, which is a **dark seam** - see below |

**The inversion is the point.** In the reference the ground is brighter than the sky, and the
roads and buildings are darker than the ground. A scene where everything is one near-black
renders as a void however correct its geometry is - that is what the flat captures showed, and
what this amendment fixes.

### The hue family, and the second amendment to the same five colours

**Amendment 2026-09-22, second ruling.** The luminance ladder above was necessary and not
sufficient: a correct ladder in the wrong hue family is still not the reference's picture, and
the frames said so.

| | 180-210 deg | 210-240 deg | 150-180 deg | every other bin |
|---|---|---|---|---|
| Reference map area | 43.4% | 34.6% | 12.8% | under 3% each |

**78% of the reference's map area is in the blue/cyan family, and it holds no magenta
anywhere.** Our ground did. Under the highest-risk zone's own tint at its scaled alpha, the old
`color.walk.ground` rendered rgb(110,90,117) - **hue 284, and half the frame** - because
`color.zone.high` at 0.14 over `#565F80` crushes green to 90 and flips the ground's own B>G>R
ordering. Two of the three drawn tier tints took the land off-family.

**The fix is in the scenery, never in the frozen data.** The tier colours, the thresholds and
the dataset's own per-zone opacities are untouched; what moved is the land they are cast over,
so that *every* tint the dataset carries leaves it in the reference's own family. That is the
rule this row is here to state, because it is the one a future colour change must not break:
**the ground must stay blue/cyan under all three tier tints.**

**The relation the old scene could not have.** The ladder lands on the reference's own ratios -
ground/sky 2.32 against the reference's 2.33, road/ground 0.56, road/sky 1.31 against 1.25,
green/ground 0.85 against 0.89 - and the render matches the arithmetic: ground rgb(111,128,156)
luma 126.1, sky rgb(24,52,152) luma 55.0, road luma 71.9.

**The haze fact's own rationale was measurably wrong, and is recorded as such.** It claimed the
reference's horizon band "measures luma 124-135 and is the brightest large area". Measuring rows
around the horizon gives sky 56-64, then **a dark seam at 46-48**, then map 124-156. The
reference's horizon is darker than the sky above it and the land below it. `color.walk.haze` is
`#192F6B` for that reason, and the fact's `sourced_from` records the measurement that displaced
the old one rather than quietly replacing it.

### Distance, and what the haze may not touch

`color.walk.haze` is the scene's fog colour, and the scenery fades into it with distance, which
is what produces the seam at the horizon. **It is a dark seam, not a bright band**: the
reference measures sky 56-64 above it, the seam at 46-48, and the map at 124-156 behind it, so
the haze reads as distance closing down rather than as light gathering.

**The haze is applied to scenery only.** Zone tints, zone boundaries and road risk bands keep
their frozen colour at every distance - the fog is switched off for those materials, not merely
tuned down for them. A distant road band faded into haze would be the risk information
degrading with draw distance, which the Performance section below forbids in its own words.

#### Amendment: the fog's range, measured (2026-09-22)

The section above states the seam's colour but not its range, and the range was wrong: the scene
fogged from 45 m out to 800 m, which left the seam too thin to read. The far plane is now
**200 m** (`FOG_FAR_M`, beside `FOG_NEAR_M = 45`; both carry `GROUNDED-EXEMPT` because they are
rendering ranges, not product values).

The measurement is `hazemetric.py` over a 780x1688 capture at the bake origin, and over the
reference's own frames for the target. It reports the minimum luma in the band 0.150-0.190 of
the frame, how many rows sit within 3 of it, and the luma of the far field at 0.192:

| fog far | sky @ 0.152 | min luma | min at | rows <= min+3 | far @ 0.192 |
|---|---|---|---|---|---|
| 800 (before) | - | - | - | 0.080% | - |
| 410 | 53.7 | 51.2 | 0.1559 | 0.474% | 60.3 |
| 300 | 51.9 | 49.6 | 0.1559 | 0.474% | 56.6 |
| 250 | 50.2 | 48.2 | 0.1559 | 0.474% | 53.9 |
| 225 | 49.4 | 47.5 | 0.1559 | 0.474% | 52.9 |
| **200** | 48.2 | **46.50** | 0.1559 | **1.896%** | 50.7 |
| reference | 66.4-72.1 | 45.0-45.9 | 0.1672-0.1755 | 0.625-1.250% | 62.1-82.3 |

`color.walk.haze` is `#192F6B`, luma 46.6, so at 200 m the seam's own minimum measures 46.2 -
the frozen colour, reached. The audit that raised this set the target at the reference's
1.99-2.01% of frame; 200 gives **1.955%**, settled, once the world is resident.

**The band fills in as the world streams, and this is why it is stated as a settled number.**
The visible ground reaches about as far as the tiles resident around her, so the width of the
hazed strip grows while the far tiles are still arriving: measured on one page, the band is 8 rows
a few seconds after the walk view opens and 33 rows by nine seconds, then holds at 33 rows for
every sample through 38 seconds. A capture taken early in a run therefore measures the seam as
0.47%, and one taken after the world has settled measures 1.955% - the same build, the same
fog, different amounts of world. The settled figure is the one that describes the product, and
every number in the table above was taken with the world resident.

**The transition is a threshold, not a dial.** Every value from 225 m up (250, 300, 410) returns
the identical 0.474% band, and 200 almost quadruples it; no value between 200 and 225 yields an
intermediate width. The band appears when the far plane crosses the edge of what is resident and
hazes the last strip of it flat, so 200 is the only value on its plateau, not a midpoint chosen
by eye.

**The near field is untouched by it.** A row-by-row difference of the 410 m and 200 m captures
reports changes confined to 0.1600-0.4408 of the frame, with a luma difference of 0.0 for every
row below 0.44 - that is, everything within about 25 m of her renders identically at either
setting. Nothing in the walkable near field is dimmed to buy the seam.

**Still owed a ruling.** The reference's seam is plain haze; ours carries the zone tint, which at
the horizon reads violet at luma 57 against the reference's 45-46. The rule above is why: zone
tints take `fog: false`, so the largest ground fill at the horizon keeps its frozen colour. The
rule exists to stop risk information degrading with distance, and a zone's *fill* carries tier
colour no more than its boundary does - but the tint is the zone's whole visible area, so
fogging it is a change to what a zone looks like, and it is left for the founder rather than
taken here. Fogging the fill alone would restore the dark seam at no cost to the near field
(fog begins at 45 m; boundaries, glows and labels stay unfogged), and it is recorded as the
cheapest way to close the remaining gap if the ruling is to close it.

### The camera turns to her compass, and the frame does not move with it

**Amendment 2026-09-23, under the same ruling.** Founder finding, from the same phone session as
the size above: *"It is not turning in the direction I am facing."* True at the time: the walk
camera had no heading at all and always looked south. It now turns to the device's compass.

| | |
|---|---|
| Heading source | `deviceorientation`'s `webkitCompassHeading` (iOS), or `deviceorientationabsolute`'s `alpha` with `absolute: true` (Android) |
| Refused | a reading that cannot place north (`absolute: false`), a missing value, and **any** reading while `screen.orientation.angle` is non-zero |
| Permission | `DeviceOrientationEvent.requestPermission()`, asked inside the tap that opens the view, because iOS only answers inside a gesture |
| With no permission, or no compass | the recorded camera: heading 180, looking south, which is the frame the facts above were solved for |
| What it moves | the camera's direction of view, the key light that rides over its shoulder, and **her own turn while she is standing still** |
| What it does not move | distance, angle, aim point, field of view - see below - and any row of the sampled, recorded or escalated state |

**The composition cannot move with the heading, by construction.** The aim point is her own
position at `walk.camera.look_at`, not a point ahead of her, so the camera's axis crosses her line
wherever it is turned: the horizon, feet and head rows are yaw-invariant, and
`walkComposition.test.ts` still pins them from the same three facts. A heading changes one thing,
the direction the camera and the light look along.

**Why a rotated screen is refused rather than corrected.** Both platforms report their heading for
the device's own top edge, which stops being the way she is facing the moment the phone is on its
side, and the sign of the correction depends on a convention this build cannot verify without a
device in hand. Holding still is worse than turning; turning the wrong way is worse than both. The
walk view is portrait.

**The heading is not evidence.** It reaches the camera and nothing else: no dwell, no arming, no
ladder and no record, which is why it can be read at the sensor's own rate while the recorded
sampling interval stays exactly where `BUSINESS_RULES.md` §12 puts it. Her position does not change
because the phone turned.

**This row of the flat map is unchanged.** "Her location" above says **no compass cone** on the
map, and that still stands: a compass cone on the flat map would add jitter to a view that never
navigates. This amendment is to the walk view's camera.

## Streaming

Tiles load around her, not all at once. She is in exactly one tile; keep that tile and the
ring around it resident, and drop the rest.

| | |
|---|---|
| Resident window | her tile plus the 2-tile ring around it |
| Drop | anything outside it, with a short grace period so a boundary walk does not thrash |
| Decode | off the render thread where the browser allows it |
| Budget | never more than one tile decoded per frame |

A tile that has not arrived is **not** a hole in the world. The ground plane renders in
`color.walk.ground` underneath, which is the walk view's own land rather than the app's
`background`. **Amendment 2026-09-22** replaced the `background` colour here, because from a
camera at this height the far plane of the world *is* the ground: a missing tile has to read
as ground that has not been detailed yet, not as sky showing through a hole. The flat map is
untouched and still renders zones over `#0B0B0F` with no tiles. The same rule as
`map.tile.timeout`: **the walk view never blocks on geometry.**

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
`highway`, so a trunk road reads as a trunk road. Each road is edged by a **casing**: a ribbon a
little wider than the surface and a little lighter than it, in a lightness derived from
`color.tile.road` itself rather than a colour of its own. Its purpose is legibility - a road in
this palette is a dark ribbon on a lit ground, and the rim is what lets a low camera see where
the street's edges are. **Amendment 2026-09-22.** The casing carries no claim: it is a rendering
width and a rendering multiplier, and it travels with the road rather than counting as scenery
the degradation ladder may drop.

### What the band is drawn on, and how wide

**Amendment 2026-09-22, second ruling.** The founder's words were the same ones the camera
amendment was made under. This is that ruling applied to what the frames showed once the camera
was right: three changes, each a rendering rather than a claim.

**1. The band is a spine down the middle of the road, not the road's whole width.** It covers
`ROAD_BAND_WIDTH_FRACTION` (0.55) of the road's own half-width, at the band layer's height. The
tier colour is still on the road surface at every point the risk applies to, still a fact
(`color.zone.*`) rather than a choice, and still drawn over what the risk layer outranks. What
changes is that the surface, the casing and the junctions stay visible on both sides of it.
Before this every banded road - and in the dense tiles every road carries a band - rendered as a
slab of tier colour from the horizon down. The street network, which is the thing this view
exists to show her walking on, was one flat colour, and the risk could not be read as *applying
to a road* because there was no road under it to apply to.

**2. Roads are drawn at widths measured from the reference.** `ROAD_HALF_WIDTH_M` 1.5 m, times a
per-class multiplier table (`ROAD_CLASS_WIDTH_MULTIPLIER`: primary 2, secondary 1.6, tertiary 1.3,
residential / living_street / unclassified 1, service 0.8). The reference's own road ribbons
measure 2.5-3.2 m across at the depths this camera reads them at - per-row profiles of the
reference frames at rows 0.62 and 0.85 of frame height. The 4 m residential half-width these
replace, with the class multipliers on top of it, drew a `primary` road 24 m wide. At her
distance the frame shows about 6 m of ground across - 5.76 m at the row of her feet since the
2026-09-23 amendment, solved from the `walk.camera.*` facts and `walk.camera.fov` 54 on a 390x844
viewport, and 6.05 m before it, which is why the number moved - so a single road was four frames'
worth of width and the picture was that road. A rendering width, carrying no claim, and no product
claim depends on how wide a street is drawn.

**3. The casing's lightness is applied in the colour's own space.** `Color.multiplyScalar` works
in the renderer's linear working space, where a factor of 2.2 renders `#2E3450` as rgb(69,78,117)
- a factor of about 1.5 to the eye, and a rim too faint for the street capture's own column
profile to find. The casing lightens the road colour's own bytes instead, so the factor is the
factor the number reads as. Nothing about the casing's intent changes: it is the same rim
derived a little lighter than the road it edges.

## Zones in 3D

The same 19 non-`SAFE` polygons, the same colours, the same rule that `SAFE` zones are never
drawn. The existing facts are reused rather than re-chosen: `map.zone.stroke` 1.5,
`map.zone.stroke.sel` 3, `map.zone.glow` 6, `alpha.map.zone.glow` 0.15.

| Layer | Treatment |
|---|---|
| Fill | the zone's own colour at its own opacity, **scaled for this view** by `ZONE_FILL_ALPHA_SCALE`, laid on the ground plane |
| Boundary | a line at the zone edge, so the boundary is legible from a low camera |
| Selected | stroke to `map.zone.stroke.sel`, fill opacity raised by `alpha.map.zone.selected.raise`, scaled with the fill it raises |
| Label | `area_name` from `zone_info_cards.json`, joined on `station_id`. **Never `station_name`** - the same rule as the flat map, for the same reason. |

**Amendment 2026-09-22: why the fill's alpha is scaled here and not on the flat map.** The
dataset's per-zone opacities were tuned against the flat map's near-black sheet, where 0.35 of
`color.zone.high` renders as rgb(96,28,27): a dark red *area* on a dark sheet. This view
composites in sRGB over a **lit** ground, so the same 0.35 renders as rgb(145,82,100), and the
street capture's column profile found that one colour covering 35% of the frame - the ground's
own colour, the roads on it and the blocks beside them all reading as the tint rather than as
ground. The same *contrast* is what the tint is for, not the same number.
`ZONE_FILL_ALPHA_SCALE` (0.4) brings it to a shade **cast over** the ground, so the map
underneath stays the picture. What is scaled is the rendering of the opacity, never the data:
each zone's own opacity, the order across the 19 zones, the tier colour, and the selected raise
are the frozen values still. The flat map is untouched and still draws the data's own alphas.

**No vertical extrusion of zones.** A translucent wall rising out of the ground would read as
a fence, which is a different and worse claim than "this area is higher risk". The zone is a
tint on the ground and a line at its edge.

### Where a zone's name is drawn, and the rail

**Amendment 2026-09-22.** The scene projects each zone's centroid to a point and reports it.
The view drew the name centred on that point and did nothing else with it. A capture of the
origin position measured what that costs:

| Defect | What the capture measured |
|---|---|
| The legend card's closing sentence | buried under the action dock - card bottom at 824 px against a dock top at 784 px |
| Two zone names | printed over each other - Old Town and Soldierpet overlapping 33.9 x 24.7 px |
| A name at the frame edge | cut in half - Soldierpet 10.7 px past the right edge |

A point is not a name. `labelPlacement.ts` places the box, in four rules: centred on its
anchor; pulled back inside the frame if centring would push it out; stepped clear of any name
already placed, below first then above; and, if nothing fits, the clamped centre - because a
name overlapping another is still a tap target, and the risk reading must not disappear.

**This is not the label system the flat map refuses.** "No hotspot-label collision system"
above is about the flat map's circles, where a dense ring of locality names would obscure the
hotspots themselves. This view draws a name for a zone only while that zone's own anchor is
inside the frame, so its problem is the opposite one: two names landing on each other, which
is illegible rather than dense. Nothing here decides *which* names are worth showing - the
scene's projection decides that, and this decides only where a name that is already showing
sits.

**The same amendment gives the view a rail.** The frame's right edge belongs to the home
screen's own rail: the settings button above, the control stack below, a fixed 48 px column
at `--screen-padding` that stays put whichever view is showing. This view fills the whole
frame, so its top row and its legend card stop short of that column by `--walk-view-rail`,
and the legend clears the action dock by `--home-action-dock-clearance`. Before this the
control stack sat on the legend's last line and "Change your character" was cut to "Change
your cha".

### Amendment 2026-09-23: the legend is a chip, not a card

The founder opened the view on his phone and ruled on the legend before anything else:
*"The street shading rectangle is taking up all the space."* The amendment above had already
stopped the card colliding with the dock, but it was still a card - a panel across the
lower-left of the frame, sitting over the streets it was describing, and on a 390 x 844
phone it read as the largest object in a view whose subject is a person walking.

It is now a chip in the bottom-left corner, `walk.legend.width` (224 px) wide, anchored to
the left edge at `--screen-padding` and still clear of the action dock by
`--home-action-dock-clearance`. What renders as the view opens, and what the fold takes away:

| Rendered as the view opens | Folded away on a tap |
|---|---|
| the title, the colour ramp, both of the ramp's end labels, and the derivation sentence (`walk_risk_note`) | the derivation sentence, and only it |

**Why the sentence still renders by default, and why the fold exists at all.** FEATURES.md
Amendment 1 clause 1 requires the walk view to *state* that per-road risk is derived from zone
data. A sentence behind a tap states it only on request, and `SCREENS.md`'s own sentence on
this - "Neither is a tooltip she has to find" - was written about exactly this risk. So the
chip opens whole. The fold answers the founder's space complaint instead: one tap clears the
chip down to the ramp without a build ever hiding the statement by default. Clause 2 requires
a band to be a band, so the ramp and both of its end labels render in **both** states - the
fold never takes those, and no state of this chip is a legend without its picture.

**This is the one place the compaction deliberately gives space back.** The card was measured
at 824 px against a dock top at 784 px, and the founder read it as "taking up all the space".
The chip is 224 px wide against a 390 px frame, sits in one corner rather than across the
frame, and loses its taller half in a single tap. Its own captured height belongs with the
other walk-view measurements rather than being asserted here unmeasured.

**The rail no longer reaches the legend.** It is anchored to the left edge now, so the
right-edge column cannot overlap it; `--walk-view-rail` still holds the view's top row off
that column. The width is a chosen design value, recorded as its own fact rather than left as
a literal in the CSS, because a width the layout depends on is a product value like any
other - see `walk.legend.width`.

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

### What she wears

**The pack has no violet in it, and that was a defect on the frame.** Every garment ships
grey: `top_hoodie`'s material is `(0.36, 0.31, 0.28)` linear, about `#A19790` on screen, and
`bottom_jeans` `(0.22, 0.25, 0.36)`, about `#828AA1`. Each garment mesh is a copy of the body's
own surface - that is why the 14 mm stand-off exists at all - so a grey garment over the body's
nude base texture keeps the anatomy's silhouette *and* sits in the skin's own colour range.
Measured on the frame the founder opened on his phone: torso `(145, 137, 133)`, legs
`(122, 131, 157)`, which is the two grey materials lit. She read as unclothed, and no part of
that was a missing mesh.

| | |
|---|---|
| Painted | the `top` and `bottom` axes, at load, in `src/platform/walk/walkCharacter.ts` |
| Top | `color.brand` `#A78BFA`, the lavender |
| Bottom | `color.brandDark` `#8566D1`, the darker violet |
| Not painted | the hair, the eyes, the brows, the accessories and the body - their materials are their own |

**Reused tokens, not new hexes.** The palette the founder ruled for this view is white and
violet, and the two violets already in it are the ones the interface uses beside her, so she is
painted with those rather than with two colours invented for her. `DESIGN_SYSTEM.md` carries the
same note on the palette table.

**Written through to the materials, never to the glTF.** The shipped files are untouched: each
part file carries exactly one mesh and one material and no two part ids share a file, so setting
the colour at load is this part's own material and cannot repaint another part. Both garment
materials ship `baseColorTexture: none`, so the colour set is the drawn colour rather than a
tint over an atlas.

**What this does not fix, and is owed to the asset work.** The garments are copies of the body,
so the silhouette stays anatomical: she reads as wearing a close-fitting top and trousers rather
than a loose hoodie. There is also **no footwear axis in the pack** - her feet are the body's
own and stay bare. Verified on the frame after the change: top `(165, 140, 252)` against the
`#A78BFA` it is set to, trousers `(127, 100, 204)` against `#8566D1`.

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
