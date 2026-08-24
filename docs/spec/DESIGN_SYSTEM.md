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
| The stack | **one** stack everywhere, Poppins first: `font-family: "Poppins", "Noto Sans Telugu", sans-serif`. Do not switch stacks by language. |
| Subsetting | Subset Poppins to **Latin basic**. The Google Fonts build carries Latin-Ext and Devanagari we never use, and dropping them cuts roughly 40 percent. |
| Budget | All font assets combined under **250 KB**. Verify in the deployed site on E9. |
| Telugu weights | **400, 600, 700**, matching English so the scale below holds in both languages |
| Numerals | `font-feature-settings: "tnum"` on every countdown and stat, so digits do not jitter as they tick. |

### Where the font files come from

**Self-hosted and committed. The build never fetches a font.** This is the same reasoning
that chose Leaflet and CARTO over Google Maps: nothing in the build may depend on a third
party being reachable on submission day. It also rules out `next/font/google`, which
downloads at build time and cannot subset Material Symbols by icon name.

All three paths below were checked against the live repositories on 2026-08-24, because a
plausible-looking path is not a verified one: an earlier draft of this table sent Material
Symbols to `google/fonts`, where it does not exist.

| Family | Repository and path | Upstream file | Shipped as |
|---|---|---|---|
| Poppins | `google/fonts`, `ofl/poppins` | `Poppins-Regular.ttf`, `Poppins-SemiBold.ttf`, `Poppins-Bold.ttf` | three subset `woff2` |
| Noto Sans Telugu | `google/fonts`, `ofl/notosanstelugu` | `NotoSansTelugu[wdth,wght].ttf` | one subset `woff2` |
| Material Symbols Rounded | **`google/material-design-icons`**, `variablefont/` | `MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf` and the matching `.codepoints` | one subset `woff2`, see `ICONOGRAPHY.md` |

**Material Symbols is not in `google/fonts`.** There is no `ofl/materialsymbolsrounded`; it
returns 404. It lives in `google/material-design-icons` under `variablefont/`, which is also
the only place the matching `.codepoints` file exists, and that file is what makes
subsetting by icon possible at all.

**Noto Sans Telugu carries two axes, `wdth` and `wght`**, not just weight. Pin `wdth` to its
default of 100 and keep `wght` at 400 to 700:
`--instancer wdth=100` (or the equivalent `varLib.instancer` step) before subsetting.

Procedure, once, and recorded in `CODEX_LOG.md`:

1. Download each upstream file. **Record its `sha256` in `CODEX_LOG.md`** before touching it.
   That hash is the pin: a future rebuild that produces a different hash is a different font
   and must be flagged, not absorbed.
2. Subset with `pyftsubset` (fontTools). It is a build-time tool run once, not a project
   dependency, and it does not enter `package.json`.
   - Poppins: `--unicodes=U+0020-00FF,U+2018,U+2019,U+201C,U+201D,U+2026,U+00B7`
     (Latin basic plus the punctuation the copy actually uses, including the `·` in
     "I'm OK · 42s"). Drop Latin-Ext and Devanagari.
   - Noto Sans Telugu: `--unicodes=U+0020,U+00A0,U+0C00-0C7F,U+0964,U+0965,U+200C,U+200D`
     with `--layout-features='*'`.
   - Poppins and Noto Sans Telugu both also take **`--retain-gids`**. Without it `pyftsubset`
     renumbers glyph ids and the shaping comparison in step 3 cannot compare them at all.
     It applies to the shipped font, not a throwaway copy, so the artefact tested is the
     artefact served. Material Symbols does **not** take it: nothing shapes there, the check
     is glyph presence by codepoint, and retaining ids in a font of that size costs `loca`
     space for no benefit.
   - Keep `--flavor=woff2` and `--desubroutinize` off for variable fonts.

   **Latin inside Telugu strings is Poppins's job, not Noto's.** The Telugu column contains
   `SOS`, `PIN`, `%1$s`, digits and punctuation: about thirty codepoints outside the Telugu
   block. Do **not** widen the Noto subset to cover them. With Poppins first in the stack
   they resolve to Poppins by ordinary per-character fallback, which is the design intent:
   "SOS" reads in the same typeface in both languages. Widening Noto instead would put
   Noto's Latin on those words and change the typeface silently, and it would spend budget
   duplicating glyphs Poppins already ships.

   This is why the shaping check in step 3 compares **runs**, not whole strings.

   **`U+0020` is not optional and is easy to lose.** A Telugu range alone omits the space,
   the subset then has no cmap entry for it, and the space either shapes as `.notdef` at the
   wrong advance or falls through to Poppins. Both change Telugu spacing metrics, and both
   look plausible enough to ship.

   **Do not enumerate layout feature tags.** An earlier version of this file listed
   `half` and `pres`, which **do not exist in this font**, and omitted `haln` and `rphf`,
   which do. `pyftsubset` accepts nonexistent feature names in silence, so the wrong list
   produces a subset that builds cleanly and shapes Telugu wrongly. `--layout-features='*'`
   retains whatever the font actually has; the features apply to glyphs we are keeping
   anyway, so the size cost is negligible against the risk.

3. **Prove the subset shapes identically before accepting it.** This is the gate, not the
   feature list, because the feature list is exactly what nobody can verify by reading.

   Take **every keyed bilingual row in `COPY.md`**. Count them at run time and report the
   number found; do not hard-code a count. An earlier version of this file froze "104",
   which was a count of lines containing Telugu rather than of rows, and was wrong.

   For each string, **segment it into runs the way the browser does**: walk it character by
   character and assign each character to the first font in the declared stack whose cmap
   covers it. Then shape each run through HarfBuzz against that font twice, once upstream
   and once subset, and compare **glyph ids and advances**. Every run must match exactly.

   Comparing whole strings against a single font is wrong and will report false failures:
   a Telugu string containing `SOS` shaped against Noto alone emits `.notdef`, which is
   correct behaviour for that font and not a subsetting defect.

   Record in `CODEX_LOG.md`: the feature tags each upstream font actually contains, read off
   the font rather than assumed; the number of rows found; the number of runs compared per
   font; and the result. If the copy gains a string, this check must be re-run.

   Material Symbols does not shape, so a glyph-presence check over the subset codepoints is
   enough.
4. Commit the outputs to `public/fonts/` with their licences beside them. `COMPLIANCE.md`
   records the licences but the files were not actually shipping, which is the part that
   matters legally:
   - `public/fonts/OFL-poppins.txt` from `ofl/poppins/OFL.txt`
   - `public/fonts/OFL-notosanstelugu.txt` from `ofl/notosanstelugu/OFL.txt`
   - `public/fonts/LICENSE-material-symbols.txt` from the **root `LICENSE`** of
     `google/material-design-icons` (Apache 2.0), which is the licence `COMPLIANCE.md`
     already names for this family.
5. Declare with `font-display: swap` and preload only the two faces above the fold:
   Poppins 400 and Poppins 600.
6. **Verify the budget:** the sum of everything in `public/fonts/` must be under
   `font.budget` (250 KB). Record the actual total in `CODEX_LOG.md`. If it is over, the
   fix is a tighter subset, never a fourth weight or a dropped language.

### How these reach CSS

Every dimension fact is **px**. The Android `dp` and `sp` units are gone: 88 facts carried
them after the pivot, and the values were always right while the labels were not.

Spacing, radii, borders and icon sizes are emitted as `px` directly. **Type is emitted as
`rem`** so it follows the browser's text-size setting, derived from the same frozen px
value rather than restated:

Write every one as a `calc`, not as a precomputed `1.25rem`. The px number stays visible and
traceable to its fact, `type.rem.base` is itself a fact, and nothing in the type scale is an
invented literal.

**The whole scale, so nothing has to be extrapolated from an example.** These are generated
from the facts, not typed:

```css
:root {
  --type-display-size:        calc(34 / 16 * 1rem);   /* type.display */
  --type-display-line-height: calc(40 / 16 * 1rem);   /* type.display.lineheight */
  --type-title-size:        calc(24 / 16 * 1rem);   /* type.title */
  --type-title-line-height: calc(30 / 16 * 1rem);   /* type.title.lineheight */
  --type-card-title-size:        calc(20 / 16 * 1rem);   /* type.cardTitle */
  --type-card-title-line-height: calc(26 / 16 * 1rem);   /* type.cardTitle.lineheight */
  --type-headline-size:        calc(18 / 16 * 1rem);   /* type.headline */
  --type-headline-line-height: calc(24 / 16 * 1rem);   /* type.headline.lineheight */
  --type-body-size:        calc(16 / 16 * 1rem);   /* type.body */
  --type-body-line-height: calc(24 / 16 * 1rem);   /* type.body.lineheight */
  --type-card-body-size:        calc(14 / 16 * 1rem);   /* type.cardBody */
  --type-card-body-line-height: calc(20 / 16 * 1rem);   /* type.cardBody.lineheight */
  --type-caption-size:        calc(13 / 16 * 1rem);   /* type.caption */
  --type-caption-line-height: calc(18 / 16 * 1rem);   /* type.caption.lineheight */
  --type-label-size:        calc(11 / 16 * 1rem);   /* type.label */
  --type-label-line-height: calc(14 / 16 * 1rem);   /* type.label.lineheight */
  --type-label-tracking:   calc(0.5 / 16 * 1rem);   /* type.label.tracking */
}
```

Note `type.title` is **24 px** and `type.cardTitle` is **20 px**. An earlier draft of this
section showed `--type-title` at 20, which is `cardTitle`'s value, and would have shrunk
every screen title had it been copied. Take the number from the fact whose name matches the
token, never from a neighbouring example.

### Scale

| Style | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `display` | 34 px | Bold | 40 px | SOS state, countdown numerals |
| `title` | 24 px | Bold | 30 px | Screen titles |
| `cardTitle` | 20 px | Bold | 26 px | Check-in card title. **From iOS, do not change.** |
| `headline` | 18 px | SemiBold | 24 px | Zone name, section heads |
| `body` | 16 px | Regular | 24 px | Default |
| `cardBody` | 14 px | Regular | 20 px | Check-in card message. **From iOS.** |
| `caption` | 13 px | Regular | 18 px | Secondary detail, the iOS secondary-button size |
| `label` | 11 px | SemiBold, +0.5 px tracking, uppercase | 14 px | Section labels, tier badges |

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
| `CHECKIN_1` | `brand` `#A78BFA` | **1.0 px** | `verified_user` (filled shield with check) |
| `CHECKIN_2` | `amber` `#F09921` | **1.5 px** | `verified_user` |
| `FAMILY_ESCALATED` | `danger` `#FF3B30` | **2.0 px** | `gpp_maybe` (shield with exclamation) |
| `SOS_ACTIVE` | `danger` `#FF3B30` | full-bleed, no card | `sos` |

Border colour always equals the accent at **50% opacity**. Icon, border and primary button
read as one colour at every rung. `FAMILY_ESCALATED` and `SOS_ACTIVE` share red
deliberately: family is a **card on a scrim**, SOS is **full-bleed**, and the difference in
surface is what separates them.

**Never animate the accent transition.** No pulse, no flash, no colour tween.

## Shape

| Element | Radius |
|---|---|
| Card, sheet, dialog | **22 px** (from iOS `SUSCheckInCardView`) |
| Button, chip, input | **14 px** (iOS `AppTheme.cornerRadius`) |
| Small control, badge | **10 px** (iOS `cornerRadiusSmall`) |
| Bottom sheet top corners | 22 px, bottom square |

Warm direction means we favour the larger radius when in doubt. Never square a corner
except the bottom edge of a sheet.

## Spacing

4 px scale: 4, 8, 12, 14, 16, 20, 22, 24, 30, 32, 48.
The 14, 22 and 30 values exist because iOS uses them: card content spacing 14, card padding
22, card horizontal margin 30. **Use those three exactly for the check-in card.**

Screen horizontal padding 20 px. Minimum touch target **48 x 48 px**, no exceptions.

## Elevation

No Material elevation shadows. Dark UI, so depth comes from **fill lightness and border**,
matching iOS. A card is `cardFill` over `scrim`. That is the entire depth model.

## Density and reach

Full-bleed map with floating controls (founder decision). Therefore:
- Every primary action sits in the **bottom third**, reachable one-handed on a 6.7 inch phone.
- Settings and secondary entry points may sit top-right, since they are never urgent.
- The bottom sheet peek height is **160 px**, expanded **55%** of screen height.
