# Saaya Lite - Motion
Founder decision: **warm and springy, but SOS is instant.**

## The two rules that override everything

1. **The escalation accent never animates.** No pulse, no flash, no colour tween between
   rungs. This is a founder contract from the iOS app: the colour alone carries urgency,
   statically. A flashing safety UI reads as a toy and raises stress.
2. **SOS appears instantly.** Zero duration, no transition, no fade. Animating an
   emergency is wrong.

## Curves

CSS `transition-timing-function` values. A spring is not expressible as a cubic bezier, so
these are **derived** from the frozen physics rather than replacing it: each curve's
first-peak overshoot is matched to the damping ratio it comes from. Durations stay as the
catalogue below states them.

| Name | CSS | Derived from | Overshoot |
|---|---|---|---|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Material fast-out-slow-in, 200 ms | none |
| `spring` | `cubic-bezier(0.34, 1.3, 0.64, 1)` | `motion.spring.damping` 0.75 | 2.99% vs 2.84% theoretical |
| `springSoft` | `cubic-bezier(0.22, 1, 0.36, 1)` | `motion.springsoft.damping` 0.85 | 0% vs 0.63% theoretical |
| `linear` | `linear` | | **Countdowns only.** Never ease a clock. |
| `none` | `0ms`, no transition | SOS entry, accent changes | |

**Why not a bouncier curve.** `cubic-bezier(0.34, 1.56, 0.64, 1)` is the common "springy"
preset and it overshoots **9.78%**, three and a half times the 0.75 damping ratio this
product froze. The founder's direction is warm and springy, not bouncy, and an emergency
surface that visibly wobbles reads as a toy. If the overshoot is ever retuned, retune
`motion.spring.damping` first and re-derive, so the two cannot drift apart.

**Do not implement a JS spring solver.** No WAAPI physics integration, no animation
library. CSS transitions with these curves, and nothing else.

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
| Hotspot tap | tap | every selected-parent circle stroke **1.5 to 3 px** and fill opacity +0.1, `standard` | 150 ms |
| Zone sheet | tap | as bottom sheet | ~340 ms |
| Map camera to zone | tap | ease-in-out camera | 400 ms |
| Ladder accent change | rung change | **none** | **0** |
| **SOS entry** | trigger | **none. The screen is simply there.** | **0** |
| SOS exit | correct PIN | fade `standard` | 200 ms |
| Toast or snackbar | any | slide up + fade, `spring` | ~250 ms |
| Skeleton shimmer | loading | 1200 ms loop, `linear`, opacity 0.06 to 0.12 | loop |

## Reduced motion

Honour `@media (prefers-reduced-motion: reduce)`. Under it, disable **every** entry in the
table above except the countdown ring, which is information rather than decoration, and
replace transitions with instant state changes. Never keep a "nice" animation the user
switched off.

Implement it once, as a global rule, not per component:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The countdown ring is driven by its own `linear` animation and must be exempted explicitly,
because losing it would remove information rather than decoration.

## Performance

Target 60 fps on a 2 GB device. Never animate the map camera at the same time as a card
entry. Never run more than two simultaneous spring animations. If a frame budget is at
risk, drop the animation, never the countdown accuracy.
