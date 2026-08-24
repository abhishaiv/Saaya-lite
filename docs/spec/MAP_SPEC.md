# Saaya Lite - Map
The hero surface. She opens the app to look at this, and the whole "a map she actually
opens" argument depends on it looking deliberate rather than default.

## Engine: Leaflet. No key, no billing, no quota.

Founder decision 2026-08-18, replacing an earlier Google Maps choice, so that **nothing in
the build depends on a credential that could fail on submission day.**

| | |
|---|---|
| Library | `org.Leaflet:Leaflet-android:6.1.20` |
| API key | **none required** |
| Billing | **none** |
| Quota risk | **none** |
| Offline behaviour | zones render without tiles, see below |

## Tiles: CARTO Dark Matter

```
https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{scale}.png
```

Near-black land `#0E0E10`, muted grey roads, deep navy water, dimmed labels. It is the
closest free match to the Apple Maps dark basemap in the Saaya deck screenshots, and its
low contrast is exactly what we want: the basemap is context, the zones are the content.

| Setting | Value |
|---|---|
| Tile source | CARTO Dark Matter, `dark_all` (labels retained, she needs to orient) |
| Retina | append `@2x` when `devicePixelRatio > 1` |
| User agent | not applicable. The browser sends its own, and CARTO's tile CDN serves it. Nothing to configure. |
| Cache | the browser HTTP cache, governed by CARTO's own headers. There is no tile cache to configure and no cap to set. Do not add a Service Worker tile cache for the prototype. |
| Min zoom | 10 |
| Max zoom | 17 |
| Default | zoom 12.5, centred on `17.7100, 83.3000` |

### Attribution, non-negotiable

`© OpenStreetMap contributors © CARTO`, 10 px, `textTertiary`, bottom-left, above the
navigation inset, always visible. This is a licence condition, not a design choice. Do not
hide it behind a sheet and do not shorten it.

## Zone rendering

19 non-`SAFE` polygons. `SAFE` zones carry `color: "#00000000"` and are **never drawn**.

| Layer | Treatment |
|---|---|
| Fill | the zone's own `color` at its own `opacity` (typically 0.35) |
| Stroke | same `color` at full strength, **1.5 px** |
| Stroke, selected | **3 px**, plus fill opacity raised by 0.1 |
| Glow | a second stroke beneath at 6 px, same colour, 15% opacity, giving the soft bloom the deck screenshots have |
| Label | zone `area_name`, `label` type, `textPrimary` at 80%, centred on the centroid, **hidden below zoom 12** |
| Draw order | glow, fill, stroke, label. Higher `risk_score` draws on top so a high zone is never buried under a moderate one. |

Precompute the polygon paths once at load. **Never re-tessellate per frame.**

## Her location

| Element | Treatment |
|---|---|
| Dot | 14 px, `brand` `#A78BFA`, 2 px `#FFFFFF` ring at 90% |
| Accuracy circle | `brand` at 12% fill, no stroke, only when accuracy is worse than 30 m |
| Heading | **none.** No compass cone. It adds jitter and we never navigate. |
| Pulse | **none while idle.** While `SHADOW`, a single slow 2 s breathing halo at 8% opacity. This is the only ambient animation in the product, and it is what makes "watching" legible without a word. |

Never auto-centre while she is panning. Offer a `MapControlButton` to recentre instead.

## Police stations

Only within the visible bounds, and only above zoom 13. 20 px `local_police` glyph in
`textSecondary` at 70%, inside a 28 px `cardFill` circle. Tap opens the station row from
the zone sheet. Never more than 12 on screen: rank by distance from centre and drop the rest.

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

## Performance

| Budget | Value |
|---|---|
| First zone paint | under 400 ms after Home composes, independent of tiles |
| Frame rate while panning | 60 fps on a 2 GB device |
| Tile cache | 64 MB |
| Polygon paths | computed once at load, cached |

If panning cannot hold 60 fps, drop tile detail first. **The zones are the product, the
streets are context.**

## Why not the alternatives

Recorded so this is not relitigated mid-build.

| Option | Why not |
|---|---|
| Google Maps SDK | Needs an API key and a billing account. A key or quota problem on submission day kills the live demo, and the brief requires everything to work without requesting access. |
| MapLibre GL + OpenFreeMap | Genuinely good, vector, free, no key. Rejected on weight: the GL bundle is several times Leaflet's, and `perf.bundle` is 200 KB gzipped for the whole app. |
| No basemap, bundled vectors only | Cleanest and fully offline, but she cannot orient against real streets, which undercuts "check a stretch before you commit to it". |

---

## Zone label collision

19 labels over Vizag will overlap at low zoom. Deterministic rules, no clever layout engine:

1. Hidden entirely **below zoom 12**.
2. At zoom 12 to 13, draw **HIGH tier only**.
3. At zoom 14 and above, draw HIGH, ELEVATED and MODERATE.
4. Sort candidates by `risk_score` descending. Walk the list, measure each label's bounding
   box, and **skip any label whose box intersects one already placed**, plus 4 px padding.
5. Placement is centroid-anchored, centred, single line. **Never wrap, never rotate, never
   draw a leader line.** If it does not fit, it is skipped.

The ordering means a high-risk zone always wins a collision, which is the correct bias:
the label she most needs is the one that survives.

Recompute only on zoom change, never per frame.
