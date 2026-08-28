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
| Offline behaviour | zone polygons render from the bundled asset with no tiles, see below |

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
| Default | zoom 12.5, centred on `17.7100, 83.3000` |
| Fractional zoom | `zoomSnap: 0.5` (`map.zoom.snap`). **Leaflet defaults to 1 and silently rounds 12.5 to 12**, so the default-zoom fact is unreachable without this. Set it on the map, not per call. |

### Attribution, non-negotiable

`© OpenStreetMap contributors`, `type.map.attribution`, `textTertiary`, bottom-left, above the
navigation inset, always visible. This is a licence condition, not a design choice. Do not
hide it behind a sheet and do not shorten it.

**It is type, so it is emitted in `rem`** like every other string: `calc(10 / 16 * 1rem)`
per `DESIGN_SYSTEM.md`, not a flat `10px`. It is small text that a reader who has enlarged
their browser font most needs to be able to read, and a licence condition is the last thing
to pin at a fixed size.

## Zone rendering

19 non-`SAFE` polygons. `SAFE` zones carry `color: "#00000000"` and are **never drawn**.

| Layer | Treatment |
|---|---|
| Base | **outline only.** No fill and no glow until she selects a zone; the map stays useful on a calm day instead of reading as a warning wall. |
| Stroke | same `color` at full strength, **1.5 px** |
| Stroke, selected | **3 px**, with the zone's own fill opacity raised by 0.1 |
| Glow, selected | a second stroke beneath at 6 px, same colour, 15% opacity; it marks the one stretch she is inspecting |
| Label | `area_name`, `label` type, `textPrimary` at 80%, centred on the centroid, **hidden below zoom 12**. See below for where the field lives. |
| Draw order | selected glow and fill (when present), stroke, label. Higher `risk_score` draws on top so a high zone is never buried under a moderate one. |

Precompute the polygon paths once at load. **Never re-tessellate per frame.**

### `area_name` lives in the cards asset, not the geojson

`vizag_heatmap.geojson` carries `station_name` and `areas_covered` and **no `area_name`**.
The field is in `zone_info_cards.json`, on all 19 entries. Join on `station_id`:

```
zoneCard(zone.stationId).areaName
```

The join is exactly 1:1 with the drawn set. 19 non-safe zones, 19 cards, no zone without a
card and no card without a zone. It is already parsed: `ZoneCard.areaName` exists from T2.1.

**Do not label with `station_name`.** It is a jurisdiction, not a place: it would put
"II Town Police Station" over Soldierpet and "IV Town Police Station" over Asilmetta. She
is checking a stretch she recognises, and she recognises the locality. Labelling the map
with police boundaries would be a different product.

**Do not label with `areas_covered` either.** It is a full list, far too long for a
centroid-anchored single line that may never wrap.

The 5 safe zones have no card and are not drawn, so they need no label. If a future zone
were ever drawn without a card, that is a data defect: stop and report it rather than
falling back to the station name.

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
| Polygon paths | computed once at load, kept in memory |

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
