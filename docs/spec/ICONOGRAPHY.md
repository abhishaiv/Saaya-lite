# Saaya Lite - Iconography

## Set: Material Symbols Rounded

Chosen because rounded terminals match the warm direction, it ships as a **variable font**
so weight and fill are axes rather than separate assets, and it carries the shield family
the iOS check-in card depends on.

| Setting | Value |
|---|---|
| Family | Material Symbols Rounded |
| Weight axis | 400 default, **500** for icons inside filled buttons |
| Fill axis | **1 (filled)** for state and status icons, **0 (outlined)** for navigation and utility |
| Optical size | matches the rendered dp |
| Grade | 0 |

Subset to the icons listed below. The full variable font is roughly 4 MB and shipping it
whole would blow the F31 size goal on its own.

## Mapping from the iOS SF Symbols

| iOS SF Symbol | Material Symbols Rounded | Used for |
|---|---|---|
| `checkmark.shield.fill` | `verified_user` (fill 1) | Check-in 1 and 2 |
| `exclamationmark.shield.fill` | `gpp_maybe` (fill 1) | Family escalation |
| `shield.fill` | `shield` (fill 1) | Shadow status |
| `sos` | `sos` (fill 1) | SOS |
| `location.fill` | `my_location` | Her position |
| `phone.fill` | `call` | Call station |
| `gearshape.fill` | `settings` | Settings |
| `eye.fill` | `visibility` | What the police see |
| `house.fill` | `home` | I am home |
| `person.2.fill` | `group` | Favourites |
| `chevron.right` | `chevron_right` | Navigation |
| `xmark` | `close` | Dismiss |
| `checkmark.circle.fill` | `check_circle` | Resolved, OK |
| `exclamationmark.triangle.fill` | `warning` | Warnings, permission denied |
| `wifi.slash` | `cloud_off` | Queued offline |
| `lock.fill` | `lock` | PIN |

## Sizes

| Context | Size |
|---|---|
| Card hero icon | **40 dp** (from iOS) |
| List row leading | 24 dp |
| Inline with body text | 20 dp |
| Button leading | 20 dp |
| Map control | 24 dp inside a 48 dp target |
| Tier badge | 16 dp |

## Rules

- An icon **never** carries meaning alone. Every icon that signals state has a text label
  beside it or a `contentDescription` that states the meaning, not the picture.
- Icons inherit the ladder accent. Never give an icon a colour outside the token set.
- No custom icons. If a needed concept has no Material Symbol, use a text label instead of
  drawing one, because one hand-drawn icon in a set of sixteen looks like a mistake.
- Decorative icons get `contentDescription = null`, never an empty string.

## App icon

Foreground: the Saaya wordmark mark in `brand` `#A78BFA` on `background` `#0B0B0F`.
Adaptive icon, 108 dp canvas, 72 dp safe zone. Provide `ic_launcher_foreground` and
`ic_launcher_background` as vectors. Monochrome layer for Android 13 themed icons.

Launcher label: **Saaya Lite** (founder decision).
