# Saaya Lite - Screens
Every screen, every state. Strings are referenced by key and defined in `COPY.md`.

## Navigation graph

```
Gate (no UI)
 ├─ not onboarded ─> Onboarding setup + safety-flow tour ─> Home + DemoPanel
 └─ onboarded ─────> Home
Home
 ├─ ZoneDetailSheet (bottom sheet)
 ├─ Settings ─> About | DemoPanel
 ├─ WalkView (a view of Home, not a route) ─> CharacterCustomiser
 └─ session overlays, driven by state, not by navigation:
      CheckIn1 (heads-up + in-app card)
      CheckIn2 (full screen, in page)
      FamilyEscalation (full screen)
      SosActive (full screen) ─> PinEntry
```

**`WalkView` is a view, not a route.** It replaces the map surface inside Home and keeps the
same `StatusPill`, the same bottom sheet, the same ladder and the same SOS button. It is
toggled by a `MapControlButton`, not navigated to, so there is no back stack to get wrong and
no way for her to end up in a view with no way out. `CharacterCustomiser` **is** a route,
because it is a form.

**Session overlays are driven by `SessionState`, never by user navigation.** She can never
navigate away from `CHECKIN_2`, `FAMILY_ESCALATED` or `SOS_ACTIVE`. Back is consumed.

**The `StatusPill` belongs to the app shell, not to Home.** Whenever `SessionState` is
anything but `IDLE`, it renders above every route: Home, Settings, About, the zone sheet,
the location help sheet. The product's promise is that she always knows whether it is
watching, and routing to Settings is not a reason to stop telling her. `CHECKIN_2`,
`FAMILY_ESCALATED` and `SOS_ACTIVE` already force themselves over any route, so the gap
this closes is `SHADOW` and `CHECKIN_1`.

---

## S1. Gate
No UI. Reads `onboarded`. Routes. Max 300 ms; show nothing rather than a flash.

Built by `M1`, which owns the `onboarded` flag. Before `M1` lands the app opens Home
directly; that is correct at the `M4` checkpoint, not a gap.

## S2. Onboarding (F1, target under 90 s before the tour)

Minimal first-run setup. The required safety-flow tour follows PIN setup; no progress dots,
language selector or extra-contact flow ships in Lite.

### S2.1 Welcome
- The current v2 small Saaya icon beside the live-text Saaya Lite lockup, `onb_welcome_title`, `onb_welcome_body`.
- `onb_beta_vizag` is always visible here in the existing `caption` type: the beta is tuned only to Vizag data. This is scope disclosure, not a claim of citywide coverage.
- Primary: `cta_continue`.

### S2.2 Trusted contact (F2)
- **Her own name first**, one field: `onb_name_label`, helper `onb_name_hint`. The frozen
  family message in `BUSINESS_RULES.md` §8 opens "Saaya alert - {name} may need help", and
  that `{name}` is **hers**, not the contact's. Without it the message cannot say who it is
  about, which is the one thing its recipient needs.
- **Optional.** If she skips it the ladder still runs and the message substitutes
  `family_subject_fallback`. Never block onboarding on it.
- `onb_contact_title`, `onb_contact_body`.
- `onb_favourite_name_label` name field, `onb_favourite_phone_label` phone field (prefix `+91` fixed, 10 digits).
- **Manual entry only. There is no contact picker.** `SECRETS_AND_ACCESS.md` states that
  contacts access is never requested, and its absence is verifiable in devtools, which is
  part of the argument. The Contact Picker API is also Chrome-Android-only, so a picker
  would work for some users and silently vanish for others.
- Validation: name non-empty, phone exactly 10 digits after prefix.
- `onb_contact_privacy` in a `DisclosureBanner`: this stays on your phone and is never uploaded.
- Primary: `cta_continue`. Lite captures one favourite in this flow; additional-contact
  management is deferred rather than showing an unfinished control.

### S2.3 Location (F3)
- **Rationale screen before the system dialog.** `onb_location_title`, `onb_location_body`.
- Primary calls `navigator.geolocation.getCurrentPosition`, which is what triggers the
  browser's own permission prompt. There is one location permission on the web and **no
  background permission to request**: `WEB_PLATFORM.md` explains why there cannot be one.
- On grant, show `onb_location_partial`: Saaya watches while this page is open. This is not
  a degraded fallback, it is the only mode, so state it plainly rather than as a limitation
  she failed to avoid.
- States: `default`, `requesting`, `denied_once`, `denied_permanently`. On permanent denial
  offer the same location help sheet Home uses, so there is one recovery path, not two.

### S2.4 PIN (F5)
- `onb_pin_title`, `onb_pin_body` explaining it stops a live SOS.
- One 4-digit entry. Do not require a confirmation row: onboarding is a calm-day setup flow, and two masked rows read as an eight-digit PIN.
- Reject `0000`, `1234`, `1111`, all-identical (`err_pin_weak`).
- Primary: `cta_finish` saves the PIN -> safety-flow tour. `onboarded = true` is written only when she opens the demo, so every new user reaches the tour.

### S2.5 Safety-flow tour
- Required for every newly onboarded user. It introduces the exact consumer journey, not internal "SUS" terminology: `onb_tour_title`, `onb_tour_body`, `onb_tour_shadow`, `onb_tour_checkins`, `onb_tour_sos`.
- Primary `cta_open_demo` lands on Home with the existing labelled `DemoPanel` already open. The panel remains replayable from Home and Settings.
- The tour tells her which control begins Shadow, how a missed check-in reaches the family stage, and where the direct SOS control leads. It never claims anything is sent by the prototype.

### Amendment 2026-09-23: the onboarding is rebuilt on the reference's craft, and she sees her own street on the way in

Founder's order, relayed 2026-09-23 with the reference recording (`ScreenRecording_09-22-2026
23-35-50_1.mov`, 150.8 s): *"WE also want on-boarding like this. Also the building around us
should be in 3D view."* The recording is craft to reproduce, not a spec to copy: the moments
were read off it frame by frame and rebuilt in Saaya's own voice.

**The five spec'd moments are unchanged in substance and in order.** Welcome, favourite,
location, PIN and tour still say what S2.1 to S2.5 says they say, and `onboarded = true` is
still written only when she opens the demo. The ruling added the craft around them and four
moments of its own.

| Beat | What it is | Why it is there |
|---|---|---|
| Splash | the mark, then three promises in her own voice, 2.4 s each (`onb_promise_watch_title`, `onb_promise_favourites_title`, and the welcome line), ending on a question with one button (`onb_promise_ready_title`) | the reference's opening calm, and the last thing on screen is a question she answers |
| Splash, reduced motion | the same promises as a static list, rotation stopped | the rotation is a JS timer, which the global reduced-motion rule cannot reach, so it stops itself - the walk view's precedent |
| Street | the walk view of her own neighbourhood, drawn from the fix the permission ask just produced (`onb_street_caption`) | the founder's second clause, in the only 3D render the product has; `FEATURES.md` Amendment 1 clause 1 binds it, so the legend chip is present and states the derivation |
| Street, no fix | no street beat: the flow continues straight to PIN | never draw her standing somewhere she is not. The flat map sets the precedent: no fix means no marker |
| Loading | `walk_loading`, the walk view's own line, held over the walk view's sky colour (`color.walk.sky`) | the world arrives into a sky already on screen; the loading copy is not duplicated |
| Tour | the ladder's four ideas, one per card, over the rows S2.5 lists, with a dot row showing position within the tour | one idea per screen, per the ruling |
| Celebration | `onb_celebrate_title`, `onb_celebrate_body`, one button that opens the demo | the flow ends on what she has, not on a form |

**Not copied from the reference:** phone-number auth, "here from" attribution, friends and
vibe-check, contact import, photo-library access, "import your places", the age gate,
invite-only parties, and invented stats. Every Lite constraint holds unchanged: no AI calls,
no analytics, no government branding, nothing invented, every mock labelled.

**Budget.** About 55 to 60 s from opening the app to the first tour card on the happy path:
splash ~8 s, favourite ~20 s, location ~10 s, street ~8 to 12 s, PIN ~10 s. Under the 90 s
target in the heading above.

**Three facts carry the new numbers.** `onboarding.fix.max_age` (60 s): the age of the
position the street moment accepts, because the browser may answer the permission ask from
its own cache rather than making her wait for a cold acquisition. `onboarding.fix.read_timeout`
(10 s): the deadline on that one-shot read, after which the flow continues without the street
moment; the browser's own default is no deadline at all, and setup is never held on a
position. `motion.2400ms`: the promise dwell, in `MOTION_SPEC.md`'s catalogue. The sheets take
`--sheet-expanded-height` and the heading's body takes `--color-text-secondary`, so neither
needs a number of its own.

**One question left open for the founder.** The dots in the tour mark position inside the
tour. "No progress dots" above means no setup-wide progress indicator, and the flow still has
none. Confirm the in-tour dots or strip them.

## S3. Home (F6, F9, F11, F12, F13, F14)

Full-bleed dark map, controls floating over it.

| Region | Contents |
|---|---|
| Top | `StatusPill` showing session state. Settings icon. |
| Map | Vizag, 70 localized red/orange/yellow hotspot circles joined to 19 parent localities (5 SAFE parents absent), plus current location dot. No broad polygon layer or green circles. |
| Bottom sheet, collapsed | Current-hour context line, `home_hour_context`. Watch, Demo panel and direct SOS entry. |
| Floating | The always-visible red direct-SOS control. There is no state-view entry point in Lite. |

### States
| State | Home shows |
|---|---|
| `IDLE` | `StatusPill` = `status_idle`. Buttons = `cta_arm_manually`, `set_demo`, `cta_help_now`. The floating red `sos` control is an always-visible equivalent of `cta_help_now`. |
| `SHADOW`, auto | `StatusPill` = `status_shadow_auto`. **Arm banner (F11)**: which zone, what hour, and that she did not start it. Button = `cta_im_home`. |
| `SHADOW`, manual | `StatusPill` = `status_shadow_manual`. Button = `cta_im_home`. |
| location denied | Persistent `DisclosureBanner`, `warn_location_denied`, opening the location help sheet below. **No deep link:** a page cannot open browser site settings, and a button that claims to is a dead end. |
| remote delivery | **Not applicable in Lite.** This round has no writer or offline delivery queue, so Home never claims a send is pending or failed. |
| demo mode on | Persistent labelled banner, `demo_mode_active`. Never hidden. |

Map must render usably on a 720x1280 device at 2 GB RAM. Derive circles once at load; do not
rebuild map geometry on every frame.

### Amendment 2026-09-23: the layout is Corner's, and the places are Vizag's

Founder direction: *"Let's copy the layout. We want to highlight the restaurants and cafes from
Vizag in a similar way. The unsafe places will be violet highlighted roads. We are not trying to
be a safety app, we are going with the vibe of a friend on your phone who helps you go everywhere
in the city with confidence."* On where that layout lives: *"These are the reference screens I
have provided. This is for normal view not the 3D view."* This is the **flat** view's chrome.

| Region | What it is |
|---|---|
| Search pill | Top of the ground. A **slot, not an input**: `walk_search_hint` renders as placeholder copy inside a control that opens the Search surface. Never a live text input over the map - a keyboard over the streets is the map gone. |
| Category bar | Horizontally scrolling pills above the nav. Categories derive strictly from the bake's own counts, so a category with zero places never renders. Selection filters the pins. |
| Place pins | Small white pills, the place's name and a violet accent, and a tap opens the place sheet. Budget: the nearest N by active category, N = `walk.places.pinBudget` (12). |
| Bottom nav | map / feed / search / profile, white floating pill, Corner's shape. Map is this screen. Feed, Search and Profile are surfaces of their own and **ship disabled until they exist** - a dead tab is worse than an absent one, the same rule as S10's missing row. |
| SOS + SUS dock | Floating above the nav, right side. SOS starts an SOS instantly, is never buried in the nav, and no safety control animates. The SUS mark arms SUS and reads **End SUS**, exactly as `M1` built it. |
| Licence chip | `© OpenStreetMap contributors`, white chip, bottom-left, so the licence reads over any tile. While the place sheet is up the chip stands down and the sheet's footer carries it: the licence reads once, never twice. |

**A pin is placement, not decoration.** Twenty names on one block of Old Town will not all fit,
so where each pill stands is decided by `src/domain/labels/labelPlacement.ts` - one pass, shared
with the walk view, so a cluster of places reads the same in both. It steps a box clear of what is
already placed, then of the chrome, and when the frame is dense it takes the least covered spot
rather than printing one name over another. `MAP_SPEC.md` carries the pass and its two 2026-09-23
amendments.

**The place sheet** (`SaayaBottomSheet`, opened by a pin tap). Rows, in this order, each present
only when the bake carries it:

| Row | Source |
|---|---|
| Name | `name`, or the category's own word when OSM has none (91% of the bake is named) |
| Category chip | the bake's `cat`, through the chrome's own category copy |
| Open state and hours | only when OSM carries `opening_hours`; the open/closed line only when that string is readable as times, otherwise OSM's words verbatim |
| Area | `area_name` - never `station_name`, which is an approximation of the locality |
| Distance | haversine from her fix, the same reading the zone sheet takes |
| Directions | an external maps link on the place's own lat/lon |
| Call | only when OSM carries a phone |
| Share | always |

**An absent field is an absent row.** No placeholder, no invented value, no ratings, no reviews,
no photos. The bake is 1444 rows and only 17 carry hours and 42 a phone, so most sheets show
neither and that is the correct sheet.

## S4. Zone detail sheet (F7, F8)

Opens on zone tap, **at C8's expanded state (55% of screen height), not the 160 px peek.**
The details are the reason the sheet exists, so it opens showing them. Swipe down dismisses;
there is no intermediate peek for this sheet. Bottom sheet, top radius per C8, drag to dismiss.

- Header: `area_name`, `ZoneChip` with `risk_level`.
- Stat row: `incident_count` labelled `zone_stat_incidents`, `women_safety_count` labelled
  `zone_stat_women`. Label the second clearly; it is the number she actually cares about.
- Hour-aware line: reuse `home_hour_context` ("Right now, %1$s reads %2$s") with the band
  name from `risk_band_low` / `_moderate` / `_elevated` / `_high`, thresholds per
  `BUSINESS_RULES.md` §10. **Display only.** It never changes the arming matrix, and the
  static `risk_level` chip in the header is a different value: do not reconcile them.
- `top_crimes` under the label `zone_top_crimes`, string rendered as-is from `zone_info_cards.json`.
- `risk_notes` as body text.
- Nearest station block under `zone_station`: name, distance formatted per
  `BUSINESS_RULES.md` (`zone_distance_m` under 1000 m, `zone_distance_km` at or above),
  and a `cta_call` button that is a plain `tel:` link.

  **Always show the number as selectable text, and always show Call.** A browser cannot
  reliably detect whether a `tel:` handler exists, so hiding the button on that basis is
  not implementable. `tel:` is already the web equivalent of the Android `ACTION_DIAL` rule
  this line used to carry: it hands off with the number filled in and she confirms the call
  herself. Nothing dials without her.

  If `coordPrecision == "locality-approx"`, show `zone_station_approx`.
  If nothing is within 20 km, show `err_no_station` and drop the block.
- Footer: `zone_data_source` crediting NCRB 2023 calibration.

**A `SAFE` zone has no card, and is not on the map to tap.** The 5 SAFE zones are not
drawn (`zones.safe`), so there is no map gesture that reaches one. They are reachable from
the DemoPanel zone picker, which covers all 24: selecting a SAFE zone there opens the sheet
with `zone_safe_no_data` and **does not arm**, because the arming matrix has no SAFE row.

That path exists rather than being cut because the message matters: choosing one shows
that low recorded crime is not the same as safe.

## S5. CheckIn1 (F15, F16, F17, F18)

Built from `C3 LadderCard` + `C4 CountdownRing` + `C2 BigActionButton`. Geometry, states
and motion come from `COMPONENT_LIBRARY.md` and `MOTION_SPEC.md`, not from this file.

In-page card while the page is open. Lite does not request notification permission or claim
an operating-system notification will arrive.

- `CountdownRing`, 90 s, **`brand` lavender `#A78BFA`**, card border 1.0 px.
- `checkin1_title`, and `checkin1_reason` stating **why it checked now** (zone, tier,
  hour). This is the visible proof of adaptive timing versus T-Safe's fixed clock.
- `BigActionButton` = `cta_im_ok`.
- Text button = `cta_help_now`, danger colour.
- The countdown is absolute and stays active until she answers or it expires.

## S6. CheckIn2

Full screen, in page. **A browser cannot show over the lock screen or turn the screen on.**
The overlay covers the viewport while the page is open and is re-presented on the next
`visibilitychange`. Disclosed, never implied.

- `CountdownRing`, 60 s, **`amber` `#F09921`**, card border 1.5 px.
- `checkin2_title`, `checkin2_body` stating exactly what happens at zero.
- The in-page overlay is the only Lite channel. It never claims to bypass Do Not Disturb,
  the silent switch or a locked screen. See `INTERACTION_SPEC.md`.
- Same two actions. Back is consumed.

## S7. FamilyEscalation

- **`danger` red `#FF3B30`**, card border 2.0 px. This is the iOS L3 grading, where the copy is the local preview `family_title`, `family_body`.
- **The local message preview**, rendered in a card, per `BUSINESS_RULES.md` §8. It never leaves this phone and does not claim that a favourite was contacted.
- `DisclosureBanner`: `family_mock_disclosure` (F21), not removable.
- `CountdownRing`, 60 s, **`danger`** (F20). `family_cancel_note` stating SOS follows.
- `BigActionButton` = `cta_cancel_im_fine`.
- Text button = `cta_help_now`.
- If no contact: `family_no_contact`, ladder continues regardless.

## S8. SosActive (F23, F25, F26)

- Danger red. No animation on entry.
- `sos_title`, elapsed timer.
- `sos_local_only` (F25): this round-one beta sends no report. The permanent `police_no_govt_link` disclosure remains visible, so neither the SOS title nor a dial action implies a state or police connection.
- Quick dial row: 112, 181, nearest station when a current fix or active-zone centroid makes one meaningful. Every action is a user-controlled `tel:` handoff to the browser's dialler; Saaya does not call or send anything automatically.
- `BigActionButton` = `cta_stop_sos` -> S9.
- No queue state: there is no round-one writer or offline delivery queue.

## S9. PinEntry (F24)

- `pin_title`, 4-digit entry, obscured.
- Wrong: `err_pin_wrong` with attempts remaining. After 5, lock 60 s doubling to 15 min,
  `err_pin_locked`.
- **No forgot-PIN path.** `pin_no_recovery` explains why, once, calmly.
- Correct: SOS stops locally and returns Home. Lite patches no remote incident.

## S10. PoliceView (F28) — cut, round two

Lite has no state-view screen or state record. Do not render an entry point or a fabricated
sample: its absence is part of the local-only promise.

Footer: `police_no_govt_link` (F30), permanent.
This is the trust screen. It is worth more than a privacy policy she will not read.

## S11. Settings

Title `set_title`. Rows, in this order, each a `COPY.md` key:

| Row | Key | Sub-label |
|---|---|---|
| About | `set_about` | |
| Replay onboarding | `set_replay` | `set_replay_sub` |
| Demo panel | `set_demo` | `set_demo_sub` |

**Replay onboarding (added 2026-09-23).** Runs the first-run flow again over the session she is
in: the flow mounts over Home, the watch stops for its duration, and on completion she returns to
the surface she came from. It keeps her data - favourites, PIN, name, character - and never
touches the `AppGate` first-run path, which only fires when no onboarding record exists. The row
ships **disabled while the engine is not quiet**, because a replay is a screen change and no rung
of the ladder takes one.

**Settings is a shell three nodes fill.** It had no owning node at all, which is why the
demo panel was unreachable. Ownership:

| Section | Built by |
|---|---|
| The shell itself, about + disclaimers, **Demo panel** entry | `M4` |
| Contact editing, PIN changes, language | cut from this Lite checkpoint |

**A section appears when its screen exists.** S10 is cut in Lite, so Settings must not
render a "What the police see" row. A dead entry point would be worse than an absent one.

`M4` is complete when it has built its own rows. It does not wait for `M1` or `M2`.

## S11b. Location help sheet

The single recovery path for a denied location permission, opened from the Home banner and
from onboarding's `denied_permanently`. A `SaayaBottomSheet`, not a route: she is recovering
from a dead end, not navigating somewhere.

| Element | Key |
|---|---|
| Title | `loc_help_title` |
| Body | `loc_help_body` |
| Note | `loc_help_note` |
| Primary | `cta_retry`, which re-requests the permission |

**It never claims to open browser settings.** No web page can. The body tells her what to
change and the note says the exact path depends on her browser, because it does and guessing
wrongly is worse than saying so. `cta_retry` re-requests: if she has already allowed it in
another tab or since the denial, that alone recovers her without any instructions at all.

If the re-request is refused without a prompt, the browser has remembered the denial. Leave
the sheet open with the instructions still visible rather than closing it on a silent
failure.

## S12. DemoPanel (D1)
Reachable from Settings, and clearly labelled, in both build types.

**Every label is a `COPY.md` key.** These controls are on the judged path: a reviewer uses
them to reproduce the journey without walking into a Vizag zone at 4 a.m. English-only
labels would break the demo for exactly the Telugu-speaking reviewer this is built for.

| Control | Key |
|---|---|
| Speed toggle, divisor `demo.divisor` | `demo_speed_toggle`, with `demo_speed_note` showing the resulting ladder timings live |
| Zone picker over all 24 | `demo_pick_zone`, hint `demo_pick_zone_hint`, a11y `cd_demo_zone_picker`. Arming through this control pins the hour to `demo.arm.hour`, 04:00 IST, per `BUSINESS_RULES.md`. Picking a HIGH zone at the real 5 pm must not produce an armed session: `DAY` is not in the arming matrix. |
| Simulate a missed check-in | `demo_miss_checkin` |
| Jump to family escalation | `demo_jump_family` |
| Trigger SOS | `demo_trigger_sos` |
| Reset session | `demo_reset`, confirmation `demo_reset_done`, a11y `cd_demo_reset` |

- Permanent header: `demo_panel_header` stating this is a prototype control, not a
  product feature.

While `DEMO` is active, the Home banner is visible so it appears in **every** screenshot
and in the video. We never demo something that looks like production behaviour.

---

## S13. About

Reached from Settings via `set_about`. Static, scrollable, no interaction beyond links.
Title `about_title`. **Every line is a `COPY.md` key**; this screen is bilingual like the
rest, and it is the screen most likely to be read closely by a judge.

| Section | Keys |
|---|---|
| Header | Saaya Lite wordmark, then `about_version` with `versionName` and `versionCode` |
| What this is | `about_what_title`, `about_what_body` |
| **What is real** | `about_real_title`, then only the claims the current node has passed to the screen. Lite currently supplies map, detail, ladder, family preview and SOS. |
| **What is mocked** | `about_mock_title` and `about_mock_delivery` only when a mock is currently rendered. The console is cut and never listed. |
| **What this is not** | `about_not_title`, then `police_no_govt_link` in full |
| **No AI** | `about_noai_title`, `about_noai_body` |
| Data | `about_data_title`, `about_data_body` |
| Attribution | `about_attrib_title`, `about_attrib_map`, `about_attrib_fonts` |
| Contact | `about_contact_title`, then the founder's address |

**The contact address is a founder input.** It is deliberately not in `COPY.md`: it is a
real personal address, it is not a translatable string, and nobody but the founder decides
whether it is published. Read it from configuration. If it is absent, render the section
without it rather than guessing or inserting a placeholder.

**The bullet lists must match what is actually built, at every checkpoint, not only at the
end.** Each node renders the bullets it owns and no others:

| Bullet | Owned by |
|---|---|
| `about_real_map`, `about_real_detail` | `M4` |
| `about_real_arm` | `T4.2` |
| `about_real_ladder`, `about_real_family`, `about_real_sos` | `M1` |
| `about_real_writes` | cut, round two — do not render |
| `about_real_console` | cut, round two — do not render |

`M4` builds the About screen and ships **two** bullets. It does not print the other six
against work that does not exist yet. Each later node adds its own line as it lands, so
About is honest at every checkpoint rather than only after the last one.

If a node is cut or reinstated, its bullets go with it. A judge who opens About and finds a
claim the app does not honour learns more from that than from the feature itself.

**This screen is a submission asset, not filler.** The brief scores Honesty explicitly, and
a judge who opens About and finds the mock list already there will trust the rest.

---

## S14. WalkView (added 2026-09-11)

**Not a route.** It replaces the map surface inside Home, keeping the `StatusPill`, the
bottom sheet, the ladder and the SOS button exactly where they are. Full spec in
`MAP_SPEC.md` ("The walk view").

| | |
|---|---|
| Enter | the third `MapControlButton` (C13), or a deep link on first run only |
| Exit | the same control. The flat map is what opens next time. |
| Engine | `three` 0.185.0, lazy chunk, `src/platform/walk/` only |
| Asset | `public/assets/world/world_tiled.json`, streamed per tile |

**States, and each one has a way out:**

| State | What she sees | Way out |
|---|---|---|
| loading | the ground plane in `background`, `walk_loading` | resolves on first tile, never blocks |
| ready | the streets around her, her character, the zone tint | - |
| no location | `walk_loc_denied`, world still renders around her last known area | turn location on and come back |
| offline | `walk_offline`, her area still shows, streets do not stream | reconnects on its own |
| no WebGL | `EmptyState`, and the control is **disabled rather than hidden** so the view is not a mystery | stays on the flat map |

**The legend and the derivation note are part of the view, not an optional extra.**

> Superseded 2026-09-23: *"`walk_legend_title`, the ramp, both of its end labels and the
> derivation sentence, `walk_risk_note`, all render as the view opens; on a phone they are the
> whole of the chip... a sentence behind a tap states it only on request, so the chip opens whole
> rather than folded."*

The founder read that on his own phone and asked twice for the bar to stop taking the space:
*"make the street shading bar collapsible or something, because it is taking too much space."*
The chip now **opens folded** - title, ramp and both ends - and one tap states the derivation.

`walk_legend_title`, the ramp and both of its end labels render in both of the chip's states,
which is what `FEATURES.md` Amendment 1 clause 2 requires: a band is a band, so no state of the
chip is a legend without its picture. `walk_risk_note` renders when the chip is open, which is
where clause 1's statement lives now - in the UI, one tap away, never implied. Clause 1's rule is
that the derivation is stated rather than implied; the founder's instruction decides where on the
screen that statement sits, and the chip states it on the tap. `MAP_SPEC.md`'s 2026-09-23
amendment, "the legend is a chip, not a card", carries the full reasoning.

**Session overlays render over the walk view unchanged.** While any rung is live the render
loop is paused, so `SOS_ACTIVE` sits on a still frame. See `MOTION_SPEC.md`.

**About gains no bullet for this.** The walk view adds no mock: the streets are real OSM
geometry from the same extract, the risk is the same zone data, and the character is hers.
Nothing in it is fabricated, so nothing is claimed in the mock list.

### Amendment 2026-09-23: the chrome became marks

The founder opened the view on his phone and asked for the chrome to stop competing with the
scene: the branding reduced to just the mark, and the controls reduced to marks on the right.

| Element | Was | Is |
|---|---|---|
| Branding | the mark with the wordmark beside it, across the top | the mark alone (`saaya-icon-v2-small.svg`, 30 px), the name carried as its alt text |
| Way into the customiser | a worded chip across the top | the drawn `CharacterIcon` mark in the top-right rail, present only while the walk view shows |
| Demo, SUS, SOS | worded chips in the action dock | icon marks in the bottom-right dock (`visibility`, `gpp_maybe`, `sos`) |
| Risk legend | a card across the lower-left | a chip, bottom-left, that opens whole and folds to its ramp - full record in `MAP_SPEC.md`, "the legend is a chip, not a card" |

**A mark is still a name.** Every one of these keeps its accessible name, and the idle dock is
asserted by test to contain no visible `SUS`, `Demo` or `SOS` word at all - the mark carries
the meaning for the eye and the label carries it for assistive tech.

**Where a word survives, and why.** Two controls stay words, both mid session rather than mid
walk: `resume`, coming back to a minimised ladder, and `End SUS` while SUS is armed. In both,
the next action has to be unmistakable rather than compact, and neither is part of the frame
the founder was looking at when he asked for marks.

## S15. CharacterCustomiser (added 2026-09-11)

A route, because it is a form. Reached from the first switch, or from `walk_edit_character`
in Settings afterwards.

| | |
|---|---|
| First switch | opened automatically, **only if no character exists**. Skippable. |
| Skipping | creates the default character and takes her into the walk view. Never leaves her in a broken view. |
| Axes | seven: body, skin, hair, eyes, outfit, accessories, colours. **Deliberately not a fact**: the count is the length of the axis list in code, never a literal, so it needs no grounding. |
| Control | `AxisPicker` (C15), one per axis. `CharacterPreview` (C16) above them. |
| Save | writes to the **`settings` record**. No new object store, no IndexedDB version bump. |
| Cancel | discards. On the first switch, cancel is `walk_first_skip` instead. |

**No currency, no unlocks, no rarity, no progression.** Every option is available
immediately. This is a form, not a shop, and the difference is the product.

**`cust_stays_local` renders with the save button**, the same posture as favourites: this
never leaves the device, and saying so costs one line.

Reached from Settings, it is a normal screen with a back affordance. Reached on the first
switch, it has no back - only `cust_save` and `walk_first_skip` - because there is nothing
behind it to go back to.
