# Saaya Lite - Motion
Founder decision: **warm and springy, but SOS is instant.**

## The two rules that override everything

1. **The escalation accent never animates.** No pulse, no flash, no colour tween between
   rungs. This is a founder contract from the iOS app: the colour alone carries urgency,
   statically. A flashing safety UI reads as a toy and raises stress.
2. **SOS appears instantly.** Zero duration, no transition, no fade. Animating an
   emergency is wrong.

## Curves

| Name | Definition | Use |
|---|---|---|
| `standard` | `FastOutSlowIn`, 200 ms | Default fades, colour of non-accent elements |
| `spring` | `spring(dampingRatio = 0.75f, stiffness = 380f)` | Sheets, cards, buttons. The warm feel lives here. |
| `springSoft` | `spring(dampingRatio = 0.85f, stiffness = 240f)` | Large surfaces, bottom sheet |
| `linear` | `LinearEasing` | **Countdowns only.** Never ease a clock. |
| `none` | 0 ms | SOS entry, accent changes |

## Catalogue

| Element | Trigger | Motion | Duration |
|---|---|---|---|
| Screen push | navigation | slide in from end 24 px + fade, `spring` | ~300 ms |
| Screen pop | back | reverse | ~300 ms |
| Bottom sheet peek to expanded | drag or tap | `springSoft` translate | ~340 ms |
| Bottom sheet dismiss | drag down past 40% | `springSoft`, follows the finger | tracks input |
| Check-in card entry | state change | scrim fades `standard` 180 ms; card scales 0.94 to 1.0 and translates up 16 px on `spring` | ~320 ms |
| Check-in card exit | answered | scale to 0.96 + fade, `standard` | 160 ms |
| Arm banner entry | auto-arm | slide down from top + fade, `spring` | ~300 ms |
| Arm banner auto-hide | 6 s later | fade `standard` | 200 ms |
| Countdown ring | every tick | **`linear`**, 1000 ms per second | 1000 ms |
| Countdown numeral | every tick | **no animation.** `tnum` figures, straight swap | 0 |
| Button press | touch down | scale to 0.97, `spring` | ~120 ms |
| Button release | touch up | back to 1.0, `spring` | ~180 ms |
| Zone tap | tap | polygon stroke 1 to 2 px, `standard` | 150 ms |
| Zone sheet | tap | as bottom sheet | ~340 ms |
| Map camera to zone | tap | ease-in-out camera | 400 ms |
| Ladder accent change | rung change | **none** | **0** |
| **SOS entry** | trigger | **none. The screen is simply there.** | **0** |
| SOS exit | correct PIN | fade `standard` | 200 ms |
| Toast or snackbar | any | slide up + fade, `spring` | ~250 ms |
| Skeleton shimmer | loading | 1200 ms loop, `linear`, opacity 0.06 to 0.12 | loop |

## Reduced motion

Read `Settings.Global.ANIMATOR_DURATION_SCALE`. If it is `0`, disable **every** entry in the
table above except the countdown ring, which is information rather than decoration, and
replace transitions with instant state changes. Never keep a "nice" animation the user
switched off.

## Performance

Target 60 fps on a 2 GB device. Never animate the map camera at the same time as a card
entry. Never run more than two simultaneous spring animations. If a frame budget is at
risk, drop the animation, never the countdown accuracy.
