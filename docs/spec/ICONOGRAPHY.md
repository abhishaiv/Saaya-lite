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
| Optical size | matches the rendered px |
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
| Card hero icon | **40 px** (from iOS) |
| List row leading | 24 px |
| Inline with body text | 20 px |
| Button leading | 20 px |
| Map control | 24 px inside a 48 px target |
| Tier badge | 16 px |

## Rules

- An icon **never** carries meaning alone. Every icon that signals state has a text label
  beside it or a `contentDescription` that states the meaning, not the picture.
- Icons inherit the ladder accent. Never give an icon a colour outside the token set.
- No custom icons. If a needed concept has no Material Symbol, use a text label instead of
  drawing one, because one hand-drawn icon in a set of sixteen looks like a mistake.
- Decorative icons get `contentDescription = null`, never an empty string.

## App icon

**The source asset is real and committed: `assets/brand/saaya-icon-v2.svg`**, the 1024x1024
master from the Saaya brand bible v1.5 section 4. Do not draw a new mark, do not use a
placeholder, and do not use `saaya-icon.svg`, which is the superseded v1 with a checkmark
the bible removed.

The mark is *her position as a confident violet pin*, lit from one soft top light, casting a
Penumbra aura, with a short dashed breadcrumb trail fading beneath. The shadow that walks
beside her, drawn as light.

### Exporting it for the web

Same master, simpler job than the platform we came from. No foreground/background split.

| Output | From | Notes |
|---|---|---|
| `favicon.svg` | the whole master | browsers scale it; no raster favicon needed |
| `icon-192.png`, `icon-512.png` | rendered from the master | PWA manifest icons |
| `apple-touch-icon.png` 180 | rendered from the master | iOS home screen |
| `icon-maskable-512.png` | the master with the pin inside the **80% safe circle** | `purpose: "maskable"`. Android launchers crop aggressively; the aura may extend into the outer 20% but the pin must not. |

The aubergine ground stays part of the image rather than a separate layer. Do not ship a
transparent icon: the mark is designed on that ground and reads badly without it.

### Colours, all sourced from the asset

| Token | Hex |
|---|---|
| `color.icon.ground.in` | `#191230` |
| `color.icon.ground.mid` | `#120C24` |
| `color.icon.ground.out` | `#0C0918` |
| `color.icon.pin.hi` | `#A78BFA` |
| `color.icon.pin.mid` | `#7C3AED` |
| `color.icon.penumbra` | `#5A41AA` |

Note the icon ground is **not** the app background `#0B0B0F`. It is the brand's aubergine,
and they are deliberately different values.

Launcher label: **Saaya Lite** (founder decision).
