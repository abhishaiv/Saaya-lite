# Saaya Lite - Design System
Every value here is either taken from the real Saaya iOS app
(`WomenSafetyApp/Theme/AppTheme.swift`, `Views/SUSCheckInCardView.swift`) or decided by
the founder on 2026-08-18. **Do not invent a colour, a radius or a weight.**

## Direction: warm and human

Founder decision. Rounded geometry, generous radii, conversational copy, lavender washes,
soft filled controls. It should feel like something a person made for another person, not
like an alarm system. Warmth comes from **shape, type, colour and copy**, not from
illustration, because we have no licensed illustration set.

The counterweight, so warm never becomes unserious: **SOS is instant and unmistakable**,
and nothing in the escalation ladder ever flashes.

## Typeface: Poppins

Confirmed by extracting embedded fonts from `Saaya_AP_Police_Deck_v6_1.pdf`. The deck uses
Poppins Regular, Medium, SemiBold and Bold.

| Rule | Value |
|---|---|
| English | **Poppins**, ship **Regular 400, SemiBold 600, Bold 700** only |
| Map Medium 500 to | SemiBold 600. Do not ship a fourth weight. |
| Telugu | **Noto Sans Telugu**. Poppins has no Telugu coverage and will tofu. |
| Subsetting | Subset Poppins to **Latin basic**. The Google Fonts build carries Latin-Ext and Devanagari we never use, and dropping them cuts roughly 40 percent. |
| Budget | All font assets combined under **250 KB**. Verify in the APK on E9. |
| Numerals | `fontFeatureSettings = "tnum"` on every countdown and stat, so digits do not jitter as they tick. |

### Scale

| Style | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `display` | 34 sp | Bold | 40 sp | SOS state, countdown numerals |
| `title` | 24 sp | Bold | 30 sp | Screen titles |
| `cardTitle` | 20 sp | Bold | 26 sp | Check-in card title. **From iOS, do not change.** |
| `headline` | 18 sp | SemiBold | 24 sp | Zone name, section heads |
| `body` | 16 sp | Regular | 24 sp | Default |
| `cardBody` | 14 sp | Regular | 20 sp | Check-in card message. **From iOS.** |
| `caption` | 13 sp | Regular | 18 sp | Secondary detail, the iOS secondary-button size |
| `label` | 11 sp | SemiBold, +0.5 sp tracking, uppercase | 14 sp | Section labels, tier badges |

## Colour

Dark only. There is no light theme. The product is used at night, and the real app has no
light theme either.

| Token | Hex | Notes |
|---|---|---|
| `brand` | `#A78BFA` | Lavender. From iOS `AppTheme.brand`. |
| `brandLight` | `#C2ADFD` | |
| `brandDark` | `#8566D1` | Pressed on brand surfaces. |
| `background` | `#0B0B0F` | App background. |
| `cardFill` | `#1F1F1F` | iOS `Color(white: 0.12)`. **Card fill is this, not a white overlay.** |
| `surface` | `#FFFFFF` @ 6% | Secondary surfaces over the map. |
| `surfaceElevated` | `#FFFFFF` @ 10% | |
| `scrim` | `#000000` @ 40% | Backdrop behind any card. From iOS. |
| `textPrimary` | `#FFFFFF` | |
| `textOnCard` | `#FFFFFF` @ 75% | Card body. From iOS. |
| `textSecondary` | `#FFFFFF` @ 60% | |
| `textTertiary` | `#FFFFFF` @ 40% | Decorative only, never carries meaning alone. |
| `safe` | `#34C759` | |
| `amber` | `#F09921` | iOS `AppTheme.amber`. |
| `danger` | `#FF3B30` | |

**Zone fills come from the data, never from these tokens.** `vizag_heatmap.geojson` carries
`color` and `opacity` per zone: high `#FF3B30`, moderate `#FF9500`, elevated `#FFCC00`,
safe `#00000000` which is not drawn.

## The escalation grading

**This is a founder contract carried over from the iOS app verbatim.** The comment in
`SUSCheckInCardView.swift` is explicit: the accent rises across the rungs, and it is
**static, never flashing, no animation. The colour alone carries the urgency.**

| Ladder step | Accent | Border stroke | Icon |
|---|---|---|---|
| `SHADOW` | `brand` `#A78BFA` | n/a, no card | `shield` |
| `CHECKIN_1` | `brand` `#A78BFA` | **1.0 dp** | `verified_user` (filled shield with check) |
| `CHECKIN_2` | `amber` `#F09921` | **1.5 dp** | `verified_user` |
| `FAMILY_ESCALATED` | `danger` `#FF3B30` | **2.0 dp** | `gpp_maybe` (shield with exclamation) |
| `SOS_ACTIVE` | `danger` `#FF3B30` | full-bleed, no card | `sos` |

Border colour always equals the accent at **50% opacity**. Icon, border and primary button
read as one colour at every rung. `FAMILY_ESCALATED` and `SOS_ACTIVE` share red
deliberately: family is a **card on a scrim**, SOS is **full-bleed**, and the difference in
surface is what separates them.

**Never animate the accent transition.** No pulse, no flash, no colour tween.

## Shape

| Element | Radius |
|---|---|
| Card, sheet, dialog | **22 dp** (from iOS `SUSCheckInCardView`) |
| Button, chip, input | **14 dp** (iOS `AppTheme.cornerRadius`) |
| Small control, badge | **10 dp** (iOS `cornerRadiusSmall`) |
| Bottom sheet top corners | 22 dp, bottom square |

Warm direction means we favour the larger radius when in doubt. Never square a corner
except the bottom edge of a sheet.

## Spacing

4 dp scale: 4, 8, 12, 14, 16, 20, 22, 24, 30, 32, 48.
The 14, 22 and 30 values exist because iOS uses them: card content spacing 14, card padding
22, card horizontal margin 30. **Use those three exactly for the check-in card.**

Screen horizontal padding 20 dp. Minimum touch target **48 x 48 dp**, no exceptions.

## Elevation

No Material elevation shadows. Dark UI, so depth comes from **fill lightness and border**,
matching iOS. A card is `cardFill` over `scrim`. That is the entire depth model.

## Density and reach

Full-bleed map with floating controls (founder decision). Therefore:
- Every primary action sits in the **bottom third**, reachable one-handed on a 6.7 inch phone.
- Settings and secondary entry points may sit top-right, since they are never urgent.
- The bottom sheet peek height is **160 dp**, expanded **55%** of screen height.
