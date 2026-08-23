# Saaya Lite - Responsive Behaviour
F31 says low-end phones and F32 says slow connections. Our user is not on a flagship.

## Target range

| Class | Width px | Example | Priority |
|---|---|---|---|
| Compact small | **320 - 359** | Redmi 9A, older Realme | **must work, do not break** |
| Compact | 360 - 411 | most Indian Android phones | **primary target** |
| Compact large | 412 - 479 | Galaxy A-series, Pixel | must work |
| Medium | 480 - 599 | large phones, small foldables unfolded | must work |
| Expanded | 600+ | tablets | must not crash, layout may be plain |

**Design at 360 px.** Verify at 320 px before calling any screen done.

## Rules by breakpoint

| Element | 320 - 359 | 360 - 479 | 480+ |
|---|---|---|---|
| Screen padding | 16 px | 20 px | 24 px |
| `LadderCard` horizontal margin | **20 px** | 30 px | max width 420 px, centred |
| Card padding | 18 px | 22 px | 22 px |
| `CountdownRing` in card | 72 px | 88 px | 88 px |
| `BigActionButton` height | 64 px | 72 px | 72 px |
| `display` type | 30 px | 34 px | 34 px |
| Bottom sheet peek | 148 px | 160 px | 160 px |
| `StatRow` per row | 2 | 3 | 3 |

Below 360 px, if the check-in card would exceed 70% of screen height, drop the 40 px hero
icon first, then reduce the message to two lines with an ellipsis. **Never shrink the
primary button and never shrink the countdown numeral**, because those are what she uses.

## Orientation

**Portrait only.** `screenOrientation="portrait"` in the manifest for every activity.

Reasoning, and put it in the write-up: this is used one-handed, in a moving vehicle, at
night. Landscape adds a layout matrix we cannot test properly in nine evenings, and a
half-tested emergency screen is worse than one that does not rotate. Tablets get the
portrait layout centred at a 480 px max content width.

## Font scale

Must survive `fontScale` **1.0 to 2.0**. Test at 1.0, 1.3, 1.5 and 2.0.

| Rule | Detail |
|---|---|
| Use `px` for all text | never `px` for type |
| Use `px` for icons and spacing | so layout does not explode with type |
| Never set `maxLines = 1` on a meaningful string | truncating "I need help now" is unacceptable |
| Buttons | grow in height with the text, never clip |
| `LadderCard` | becomes scrollable above 1.5x rather than clipping |
| `display` numerals | cap at 1.5x, since a countdown at 2.0x on a 320 px screen has nowhere to go |

At 2.0x on a 320 px screen, the check-in card is allowed to scroll internally. The primary
button must remain visible without scrolling. **Pin it to the bottom of the card.**

## Insets

Full-bleed map means edge-to-edge. Handle `WindowInsets` properly:
- Status bar: `StatusPill` sits 12 px below the top inset.
- Navigation bar: bottom sheet and every primary button sit above the bottom inset.
- Gesture navigation: keep 16 px clear of the bottom edge so the sheet drag does not fight
  the system back gesture.
- Display cutout: `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`, and no control within the
  cutout area.

## Foldables

**Not supported and not tested.** Prototype posture. An unfolded device gets the medium
layout by width, which is adequate, and we do not verify it.

The one thing that must hold regardless: **the session survives any configuration change**,
because it lives in the wake lock plus a visible page and not in the activity. That is already true if
`ARCHITECTURE.md` is followed, and it is covered by the rotation-free portrait lock.

## Performance on low-end devices

| Budget | Value |
|---|---|
| Cold start to Home | under 2.5 s on a 2 GB device |
| deployed site size | under 25 MB. Reasonable, not tuned. |
| Map polygons | 19, drawn once, never re-tessellated per frame |
| Memory | under 150 MB resident |
| Frame rate | 60 fps on Home, no frame over 32 ms during the ladder |

If the map cannot hold 60 fps on the test device, reduce tile detail before reducing
polygon fidelity. The zones are the product; the streets are context.

**Hit these budgets, then stop.** Do not micro-optimise. If Home opens in 2.4 s, that is
done, not an invitation to get it to 1.8 s.

## Slow connections

| Case | Behaviour |
|---|---|
| Map tiles slow | zones and her dot render immediately over the dark background. **Never block the UI on tiles.** |
| Tiles unavailable | dark background plus zones plus a small "map offline" note. Fully usable. |
| Firestore unreachable | everything queues per `BUSINESS_RULES.md` §11. The ladder is unaffected. |
| First launch offline | full onboarding works. Zone data is bundled in assets, not fetched. |

**Nothing in the escalation path may depend on the network.** The ladder is local. The
network only carries the record afterwards.
