# Saaya Lite - Component Library
Every shared component, at exact px, in every state. Codex builds these first and screens
only compose them. **If a screen needs a control not in this file, stop and ask.**

Tokens referenced come from `DESIGN_SYSTEM.md`. Motion from `MOTION_SPEC.md`.

---

## C1. `SaayaButton`

| Variant | Fill | Text | Height | Radius | Type |
|---|---|---|---|---|---|
| `Primary` | `brand` | `#FFFFFF` | 56 px | 14 px | `body` SemiBold |
| `Accent(color)` | the ladder accent | `#FFFFFF` | **50 px** | 14 px | 16 px Bold |
| `Ghost` | transparent, 1 px `brand` border | `brand` | 56 px | 14 px | `body` SemiBold |
| `Destructive` | `danger` | `#FFFFFF` | 56 px | 14 px | `body` SemiBold |
| `TextOnly` | none | `danger` @ 90% | **34 px** | none | 13 px SemiBold |

`Accent` at 50 px and `TextOnly` at 34 px are the iOS check-in card values. Do not round
them to the 56 px default.

| State | Treatment |
|---|---|
| default | as above |
| pressed | scale 0.97 `spring`; fill darkens 8% (`brandDark` for Primary) |
| disabled | fill @ 30%, text @ 40%, no press feedback, `enabled = false` |
| focused | 2 px `brandLight` ring, 2 px offset. Required for keyboard and switch access. |
| loading | fill retained, label replaced by a 20 px indeterminate indicator in the text colour, button disabled, `contentDescription` becomes "Working" |

Full width by default. Horizontal padding 20 px. Minimum touch 48 px even when the visual
height is 34 px: pad the touch target, do not grow the visual.

---

## C2. `BigActionButton`

For actions pressed under stress: `I'm OK`, `Stop SOS`, `Cancel, I am fine`.

Height **72 px**, radius 14 px, `display` type at 20 px Bold, full width, fill is the
current ladder accent. Same state table as C1.

**Live countdown suffix**, taken from iOS: the label renders `I'm OK  ·  42s` while a
countdown runs, and drops the suffix at zero. The suffix uses `tnum` so it does not jitter.
Because the visible label changes every second, give it a **stable test tag**
(`checkin-imok`) exactly as iOS does with its accessibility identifier.

---

## C3. `LadderCard`

The single most important component. Used by check-in 1, check-in 2 and family escalation.
Geometry is lifted from `SUSCheckInCardView.swift` and must not be redesigned.

```
scrim: #000000 @ 40%, full screen, tap does NOT dismiss
card:
  fill            #1F1F1F
  radius          22 px
  padding         22 px
  horizontal margin 30 px
  border          accent @ 50%, stroke 1.0 / 1.5 / 2.0 px by rung
  content spacing 14 px
  vertical align  bottom, 44 px above the bottom inset
children, in order:
  icon        40 px, accent
  title       20 px Bold, textPrimary, centred
  message     14 px Regular, textOnCard (75%), centred
  primary     BigActionButton or Accent button, accent fill
  secondary   TextOnly, danger @ 90%, 34 px
```

| State | Treatment |
|---|---|
| entering | scrim fades 180 ms; card scale 0.94 to 1.0, translate up 16 px, `spring` |
| visible | **static.** No pulse, no flash, no accent tween. |
| answered | scale 0.96 + fade, 160 ms |
| deadline passed | card removes itself; the ladder continues underneath |

Back press is **consumed** on check-in 2 and family escalation. Never dismissible by
scrim tap or swipe.

---

## C4. `CountdownRing`

Circular progress plus a numeral.

| Property | Value |
|---|---|
| Diameter | 88 px (in card), 140 px (SOS full screen) |
| Track | `#FFFFFF` @ 12% |
| Progress | current ladder accent |
| Stroke | 6 px, round cap |
| Direction | clockwise, depleting |
| Numeral | `display` 34 px Bold, `tnum`, centred |
| Tick | `linear`, exactly 1000 ms. **Never eased.** |
| Announce | `LiveRegion` polite at 60 s, 30 s, 10 s, then every second under 5 s |

At zero, hold at zero. Do not animate past, do not wrap.

---

## C5. `StatusPill`

Floating over the map, top-left, 12 px below the status bar inset.

Height 36 px, radius 18 px, horizontal padding 14 px, fill `cardFill` @ 92%, 1 px border in
the current accent @ 40%. Leading icon 16 px in the accent, then `label` type text.

**Every label is a `COPY.md` key.** This table previously carried English literals, four of
which had no key at all and so could not be translated. `SCREENS.md` states that strings are
referenced by key and defined in `COPY.md`; where this file and `COPY.md` disagree, **COPY
wins**.

| Session state | Key | Accent |
|---|---|---|
| `IDLE` | `status_idle` | `textSecondary` |
| `SHADOW` auto | `status_shadow_auto` | `brand` |
| `SHADOW` manual | `status_shadow_manual` | `brand` |
| `CHECKIN_1` | `status_checkin1` | `brand` |
| `CHECKIN_2` | `status_checkin2` | `amber` |
| `FAMILY_ESCALATED` | `status_family` | `danger` |
| `SOS_ACTIVE` | `status_sos` | `danger` |

**No `text-transform: uppercase`.** The earlier literals were uppercase; Telugu is unicase,
so uppercasing would style one language and not the other. Render the strings as `COPY.md`
writes them.

Text changes are instant. The pill itself never animates.

---

## C6. `ZoneChip`

Tier badge. Height 24 px, radius 10 px, horizontal padding 10 px, `label` type.
Fill is the zone's own `color` at 20%, border 1 px at the same colour full strength, text
in that colour. `SAFE` uses `textSecondary`, since its data colour is transparent.

---

## C7. `DisclosureBanner`

**Every mock and every prototype limitation uses this.** Never a subtle grey note.

Fill `cardFill`, radius 14 px, 3 px left border in `amber`, padding 14 px, leading 20 px
`info` icon in `amber`, `caption` type in `textOnCard`. Full width minus 20 px screen
padding. Never dismissible when it discloses a mock.

---

## C8. `SaayaBottomSheet`

Peek 160 px, expanded 55% of screen height, top radius 22 px, fill `cardFill`, drag handle
32 x 4 px at `#FFFFFF` @ 30%, 8 px from the top. `springSoft`. Follows the finger while
dragging. Dismiss threshold 40% of the drag range.

---

## C9. `PinEntryBox`

Four boxes, each 56 x 64 px, radius 14 px, 12 px apart, fill `surfaceElevated`.
Empty shows nothing; filled shows a 12 px `brand` dot, never the digit.

| State | Treatment |
|---|---|
| active | 2 px `brand` border on the current box |
| error | 2 px `danger` border on all four, **no shake animation** (see motion rule 1) |
| locked | all four at 30% opacity, message below, countdown to unlock |

Numeric keyboard only. `onPaste` is prevented. Never log the PIN and never include it in
any error payload.

**Screenshots cannot be blocked.** There is no `FLAG_SECURE` equivalent on the web, so this
screen is capturable like any other. Disclosed in `INTERACTION_SPEC.md` rather than
silently ignored.

---

## C10. `StatRow`

Label above value. `label` type in `textSecondary`, value in `headline` with `tnum`.
Used in zone detail and the police view. Two or three across, evenly weighted.

---

## C11. `SectionHeader`

`label` type, `textSecondary`, 24 px top padding, 8 px bottom.

---

## C12. `EmptyState`

Centred, 32 px icon in `textTertiary`, `headline` title, `caption` body, optional Ghost
button. Vertically centred in the available space, never top-aligned.

---

## C13. `MapControlButton`

48 x 48 px, radius 14 px, fill `cardFill` @ 92%, 24 px icon in `textPrimary`.
Stacked vertically on the right with 12 px gaps.

Two stacks, both against the right edge at `--screen-padding`, in the order below. The
walk view toggle was added 2026-09-11, and it is **a control, not a mode switch with its
own screen** - the sheet, the ladder and the SOS button are unchanged around it.

| Stack | Icon | Label | Action |
|---|---|---|---|
| top | drawn `CharacterIcon` | `walk_edit_character` | opens the customiser. Walk view only - the flat map has no character in it. |
| top | `settings` | `cd_settings` | opens `SettingsScreen` |
| bottom | `map` / `3d_rotation` | `view_toggle` | toggles flat and walk. Icon shows the view she would switch **to**. |
| bottom | `my_location` | `cd_recentre` | recentre the map. Flat map only: the walk camera is pinned to her position, so here the same button would be a control that does nothing. |

`visibility` / "What the police see" was the second control in this stack and is **cut,
round two** with `PoliceView` (`SCREENS.md` S10). It is not in this build, and no rail row
claims it.

The toggle carries `view_toggle` as its accessible label and announces on change
(`ann_view_walk`, `ann_view_flat`). It is the only control whose icon changes with state.

**Amendment 2026-09-23: every control in these stacks is a mark.** The founder asked for
the chrome to stop competing with the scene - the branding down to just the mark, and the
controls down to marks on the right. All four rows above are icon-only, each keeps its
accessible name, and the icon-only posture is asserted by test rather than by eye. One row
is not a `MaterialSymbol` glyph: the pinned subset has no glyph that means "your character"
(`CharacterIcon.tsx` records why), so the character mark is drawn to the subset's own rules
- 24 px box, 2 px stroke, round caps and joins - and this library counts it as part of the
set rather than an exception to it.

---

## C14. `ArmBanner`

Slides down from the top on auto-arm. Fill `cardFill`, radius 22 px, 20 px margin, padding
16 px, 1 px `brand` border @ 40%. Leading 24 px `shield` in `brand`.
Title `headline`, body `caption` in `textOnCard`. Auto-hides after **6 s**, and the same
content stays available in the bottom sheet afterwards.

Copy comes from `COPY.md` `home_arm_banner_*`, and must name the zone and the hour and say
she did nothing.

---

## C15. `AxisPicker`

The character customiser's one control, used seven times, once per axis. Added 2026-09-11.

**A fixed list of options, horizontally scrollable. No sliders, no free colour picker, no
numeric stepper.** Every option in the list is one the art actually supports, so every
combination she can reach is one that renders correctly. A slider would let her build a
character the rig cannot draw.

| | |
|---|---|
| Row height | 56 px |
| Swatch | 44 x 44 px, radius 14 px |
| Gap | `dim.target.gap` 8 px, so adjacent targets stay separable |
| Selected | 2 px `brand` ring, `dim.pin.border.width` |
| Label | `cust_axis_*`, `caption`, above the row |
| Optional axes | carry a `cust_none` option. Accessories is the only one that needs it. |

Scrolls horizontally with snap. **The selected option is always scrolled into view on open**,
so the row never appears empty.

Keyboard and switch access: the row is a single tab stop, arrows move within it, and the
selection is announced. It is not seven tab stops per axis.

---

## C16. `CharacterPreview`

The character, rendered live, above the axis rows. Added 2026-09-11.

| | |
|---|---|
| Size | 180 px tall, centred |
| Render | the same rig the walk view uses, in `src/platform/walk/`: the glTF parts in `public/assets/character/`, assembled |
| Motion | a slow idle turn. **Stops under `prefers-reduced-motion`** - see `MOTION_SPEC.md`. |
| Option lists | **generated from the part files present**, not hand-written. An option with no file is a combination she could pick and the view could not draw. |
| Fallback | if WebGL is unavailable, a static 2D portrait per axis combination is **not** provided. Show `EmptyState` with `walk_loc_denied`-style copy and let her save anyway. |

The preview must be the **same** renderer as the walk view, not a second implementation. Two
renderers is two things to keep in sync, and the one she sees while choosing is the one that
has to be honest about what she will get.

**A change to an axis swaps one part and re-assembles.** It does not reload the whole
character, and it does not re-fetch a file already loaded for this session. Switching back to
a previously chosen option is instant, because the part is already in memory.

---

## C17. `HomeChrome` (added 2026-09-23)

The flat view's chrome, in one component so its rows are measured from one place:
`.home-chrome__search`, `.home-chrome__categories`, `.home-chrome__nav`. It renders no
mapping of its own - it takes the counts, the labels and the handlers.

| Row | Built from | Notes |
|---|---|---|
| Search pill | `walk_search_hint` | **A slot, not an input.** It opens the Search surface; there is never a live text field over the map. Full width, `--screen-padding` each side. |
| Category bar | the bake's own counts | One pill per category with a non-zero count, horizontally scrolling. A category with zero places cannot render. The active pill reads `aria-pressed="true"`. |
| Bottom nav | `nav_map`, `nav_feed`, `nav_search`, `nav_profile` | A white floating pill, Corner's shape. Map is the built surface; **the other three ship `disabled` until their surfaces exist** - a dead tab is worse than an absent one. |

**Every row is a touch target at least 48 x 48 px.** The visual pill is smaller than that
where the design wants it small, and the target is padded out to the floor the same way
C1's controls are - the documented "pad the touch target, do not grow the visual". The
category pills are the case that made this explicit: a 26 px pill is a 26 px pill.

**The chrome is measured, not assumed.** `HomeMap` and `WalkView` both read these rows'
boxes, convert them to the frame's own pixels and hand them to `placeLabels` as `reserved`,
so no place pin or zone name ever lands under a control. Measured on resize, not on every
settle.

---

## C18. `PlacePin` (added 2026-09-23)

One pill per place, drawn by the flat map (`leafletMap.ts`) and by the walk view
(`WalkView.tsx`) from the same bake, the same budget and the same placement pass.

| | |
|---|---|
| Shape | a white pill: a small violet dot, then the place's name, `--radius-control` |
| Width | `walk.places.pinWidth` (140 px), and the name ellipsises rather than the pill growing |
| Colour | white fill, dark text - the same dark-on-light treatment as C6, because it stands on a light raster |
| Budget | `walk.places.pinBudget` (12), the nearest N in the active category |
| Touch target | padded to 48 x 48 px behind the pill |
| Tap | opens `SaayaBottomSheet` with the place sheet (C8) |

**The name is a text node, never interpolated markup.** It is OSM's own text, and a string of
it in an `innerHTML` would be the one place external data becomes script.

