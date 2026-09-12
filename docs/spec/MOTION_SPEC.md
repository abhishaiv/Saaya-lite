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
library. Every piece of **UI chrome** - cards, sheets, banners, buttons, toasts, screens -
moves with CSS transitions on these curves, and nothing else.

**One exception, and it is bounded: the walk view's render loop.** A 3D view redraws every
frame, which CSS cannot express and which is not a spring solver. It is scoped to
`src/platform/walk/` and its rules are in **"The walk view"** at the foot of this file. It is
the only exception in the product, and it changes none of the rules above it.

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

---

## The walk view

**Amendment 2026-09-11.** The clause at the top of this file said "CSS transitions with these
curves, and nothing else", which a per-frame 3D renderer cannot satisfy. Rather than leave
that contradiction sitting in the spec, it is resolved here in the open.

**What is excepted, and only this.** `src/platform/walk/` drives a `requestAnimationFrame`
loop that redraws the 3D world. That loop is the **sole** exception in the product. It is not
a spring solver: no physics integration, no damping simulation, no animation library, and
`three`'s own animation helpers are not used. Camera easing, if any, is a plain lerp on the
clock, not a solver.

**What still holds, unchanged:**

| Rule | In the walk view |
|---|---|
| The escalation accent never animates | still true. The ladder's colour is static in the 3D view exactly as over the flat map. |
| SOS appears instantly | **the strongest form of it.** `SOS_ACTIVE` renders as a static overlay on the world, and the render loop is **paused** while any rung is live. The emergency surface is not merely un-animated; it is over a still frame. |
| Never animate the camera at the same time as a card entry | still true. Camera motion and card entry never overlap. |
| Never more than two simultaneous spring animations | still true. The 3D loop is not a spring, and it does not license extra UI animation. |
| Countdowns stay `linear` | still true. The check-in ring is a UI element over the world and is unchanged. |

### Reduced motion, which the global rule does not reach

The `@media (prefers-reduced-motion: reduce)` block above sets `animation-duration` and
`transition-duration`. It has **no effect on a WebGL canvas**, because nothing in a canvas is
a CSS transition. Left at that, a user who switched motion off would still get a full-motion
3D view - the exact thing the rule exists to prevent. So the walk view reads the same query in
JS, live rather than once, and under it:

1. **Ambient motion stops.** No idle bob, no sway, no drifting props, no camera easing.
2. **The world still renders**, because it is information rather than decoration - the same
   reason the countdown ring survives the global rule. It redraws on change, not on a loop.
3. **Her position still updates**, because that is the point of the view.
4. The `matchMedia` listener is attached on mount and removed on unmount.

### Performance

The walk view targets the same 60 fps and the same `perf.frame` 32 ms ceiling as everything
else. It is a lazy chunk (`perf.bundle.walk`, 190 KB gzipped). If it cannot hold the frame
budget, **draw distance drops before anything else does** - the same bias as the flat map,
where tiles drop before zones do.
