# Saaya Lite - Component Library
Every shared composable, at exact dp, in every state. Codex builds these first and screens
only compose them. **If a screen needs a control not in this file, stop and ask.**

Tokens referenced come from `DESIGN_SYSTEM.md`. Motion from `MOTION_SPEC.md`.

---

## C1. `SaayaButton`

| Variant | Fill | Text | Height | Radius | Type |
|---|---|---|---|---|---|
| `Primary` | `brand` | `#FFFFFF` | 56 dp | 14 dp | `body` SemiBold |
| `Accent(color)` | the ladder accent | `#FFFFFF` | **50 dp** | 14 dp | 16 sp Bold |
| `Ghost` | transparent, 1 dp `brand` border | `brand` | 56 dp | 14 dp | `body` SemiBold |
| `Destructive` | `danger` | `#FFFFFF` | 56 dp | 14 dp | `body` SemiBold |
| `TextOnly` | none | `danger` @ 90% | **34 dp** | none | 13 sp SemiBold |

`Accent` at 50 dp and `TextOnly` at 34 dp are the iOS check-in card values. Do not round
them to the 56 dp default.

| State | Treatment |
|---|---|
| default | as above |
| pressed | scale 0.97 `spring`; fill darkens 8% (`brandDark` for Primary) |
| disabled | fill @ 30%, text @ 40%, no press feedback, `enabled = false` |
| focused | 2 dp `brandLight` ring, 2 dp offset. Required for keyboard and switch access. |
| loading | fill retained, label replaced by a 20 dp indeterminate indicator in the text colour, button disabled, `contentDescription` becomes "Working" |

Full width by default. Horizontal padding 20 dp. Minimum touch 48 dp even when the visual
height is 34 dp: pad the touch target, do not grow the visual.

---

## C2. `BigActionButton`

For actions pressed under stress: `I'm OK`, `Stop SOS`, `Cancel, I am fine`.

Height **72 dp**, radius 14 dp, `display` type at 20 sp Bold, full width, fill is the
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
  radius          22 dp
  padding         22 dp
  horizontal margin 30 dp
  border          accent @ 50%, stroke 1.0 / 1.5 / 2.0 dp by rung
  content spacing 14 dp
  vertical align  bottom, 44 dp above the bottom inset
children, in order:
  icon        40 dp, accent
  title       20 sp Bold, textPrimary, centred
  message     14 sp Regular, textOnCard (75%), centred
  primary     BigActionButton or Accent button, accent fill
  secondary   TextOnly, danger @ 90%, 34 dp
```

| State | Treatment |
|---|---|
| entering | scrim fades 180 ms; card scale 0.94 to 1.0, translate up 16 dp, `spring` |
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
| Diameter | 88 dp (in card), 140 dp (SOS full screen) |
| Track | `#FFFFFF` @ 12% |
| Progress | current ladder accent |
| Stroke | 6 dp, round cap |
| Direction | clockwise, depleting |
| Numeral | `display` 34 sp Bold, `tnum`, centred |
| Tick | `linear`, exactly 1000 ms. **Never eased.** |
| Announce | `LiveRegion` polite at 60 s, 30 s, 10 s, then every second under 5 s |

At zero, hold at zero. Do not animate past, do not wrap.

---

## C5. `StatusPill`

Floating over the map, top-left, 12 dp below the status bar inset.

Height 36 dp, radius 18 dp, horizontal padding 14 dp, fill `cardFill` @ 92%, 1 dp border in
the current accent @ 40%. Leading icon 16 dp in the accent, then `label` type text.

| Session state | Text | Accent |
|---|---|---|
| `IDLE` | NOT WATCHING | `textSecondary` |
| `SHADOW` auto | WATCHING THIS STRETCH | `brand` |
| `SHADOW` manual | WATCHING | `brand` |
| `CHECKIN_1` | CHECKING IN | `brand` |
| `CHECKIN_2` | STILL THERE? | `amber` |
| `FAMILY_ESCALATED` | TELLING YOUR FAVOURITES | `danger` |
| `SOS_ACTIVE` | SOS ACTIVE | `danger` |

Text changes are instant. The pill itself never animates.

---

## C6. `ZoneChip`

Tier badge. Height 24 dp, radius 10 dp, horizontal padding 10 dp, `label` type.
Fill is the zone's own `color` at 20%, border 1 dp at the same colour full strength, text
in that colour. `SAFE` uses `textSecondary`, since its data colour is transparent.

---

## C7. `DisclosureBanner`

**Every mock and every prototype limitation uses this.** Never a subtle grey note.

Fill `cardFill`, radius 14 dp, 3 dp left border in `amber`, padding 14 dp, leading 20 dp
`info` icon in `amber`, `caption` type in `textOnCard`. Full width minus 20 dp screen
padding. Never dismissible when it discloses a mock.

---

## C8. `SaayaBottomSheet`

Peek 160 dp, expanded 55% of screen height, top radius 22 dp, fill `cardFill`, drag handle
32 x 4 dp at `#FFFFFF` @ 30%, 8 dp from the top. `springSoft`. Follows the finger while
dragging. Dismiss threshold 40% of the drag range.

---

## C9. `PinEntryBox`

Four boxes, each 56 x 64 dp, radius 14 dp, 12 dp apart, fill `surfaceElevated`.
Empty shows nothing; filled shows a 12 dp `brand` dot, never the digit.

| State | Treatment |
|---|---|
| active | 2 dp `brand` border on the current box |
| error | 2 dp `danger` border on all four, **no shake animation** (see motion rule 1) |
| locked | all four at 30% opacity, message below, countdown to unlock |

Numeric keyboard only. No system clipboard paste. Never log, never screenshot: set
`FLAG_SECURE` on this screen.

---

## C10. `StatRow`

Label above value. `label` type in `textSecondary`, value in `headline` with `tnum`.
Used in zone detail and the police view. Two or three across, evenly weighted.

---

## C11. `SectionHeader`

`label` type, `textSecondary`, 24 dp top padding, 8 dp bottom.

---

## C12. `EmptyState`

Centred, 32 dp icon in `textTertiary`, `headline` title, `caption` body, optional Ghost
button. Vertically centred in the available space, never top-aligned.

---

## C13. `MapControlButton`

48 x 48 dp, radius 14 dp, fill `cardFill` @ 92%, 24 dp icon in `textPrimary`.
Stacked vertically on the right with 12 dp gaps.

---

## C14. `ArmBanner`

Slides down from the top on auto-arm. Fill `cardFill`, radius 22 dp, 20 dp margin, padding
16 dp, 1 dp `brand` border @ 40%. Leading 24 dp `shield` in `brand`.
Title `headline`, body `caption` in `textOnCard`. Auto-hides after **6 s**, and the same
content stays available in the bottom sheet afterwards.

Copy comes from `COPY.md` `home_arm_banner_*`, and must name the zone and the hour and say
she did nothing.
