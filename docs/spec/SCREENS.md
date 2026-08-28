# Saaya Lite - Screens
Every screen, every state. Strings are referenced by key and defined in `COPY.md`.

## Navigation graph

```
Gate (no UI)
 ├─ not onboarded ─> Onboarding (4 steps) ─> Home
 └─ onboarded ─────> Home
Home
 ├─ ZoneDetailSheet (bottom sheet)
 ├─ Settings ─> ContactEdit | PinChange | DemoPanel
 ├─ PoliceView ("What the police see")
 └─ session overlays, driven by state, not by navigation:
      CheckIn1 (heads-up + in-app card)
      CheckIn2 (full screen, in page)
      FamilyEscalation (full screen)
      SosActive (full screen) ─> PinEntry
```

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

## S2. Onboarding (F1, 4 steps, target under 90 s total)

Progress dots at top. No step is skippable except step 2's second contact.

### S2.1 Welcome
- Saaya wordmark, `onb_welcome_title`, `onb_welcome_body`.
- Language selector (F4): English / తెలుగు. Applies immediately, no restart.
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
- Primary: `cta_continue`. Secondary: `cta_add_another` (max 3).

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
- 4-digit entry, then confirm entry.
- Reject `0000`, `1234`, `1111`, all-identical (`err_pin_weak`).
- Mismatch: `err_pin_mismatch`, clear both.
- Primary: `cta_finish` -> writes `onboarded = true` -> Home.

## S3. Home (F6, F9, F11, F12, F13, F14)

Full-bleed dark map, controls floating over it.

| Region | Contents |
|---|---|
| Top | `StatusPill` showing session state. Settings icon. |
| Map | Vizag, 19 rendered zone polygons (5 safe zones not drawn), fill from zone data. Current location dot. |
| Bottom sheet, collapsed | Current-hour context line, `home_hour_context`. Arm/Disarm button. |
| Floating | "What the police see" entry point (S10). |

### States
| State | Home shows |
|---|---|
| `IDLE` | `StatusPill` = `status_idle`. Button = `cta_arm_manually`. |
| `SHADOW`, auto | `StatusPill` = `status_shadow_auto`. **Arm banner (F11)**: which zone, what hour, and that she did not start it. Button = `cta_im_home`. |
| `SHADOW`, manual | `StatusPill` = `status_shadow_manual`. Button = `cta_im_home`. |
| location denied | Persistent `DisclosureBanner`, `warn_location_denied`, opening the location help sheet below. **No deep link:** a page cannot open browser site settings, and a button that claims to is a dead end. |
| queue has `FAILED_PERMANENT` | Persistent banner, `warn_queue_failed`. |
| demo mode on | Persistent labelled banner, `demo_mode_active`. Never hidden. |

Map must render usably on a 720x1280 device at 2 GB RAM. Cap polygon redraw; do not
re-tessellate on every frame.

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

Heads-up notification plus, if foregrounded, an in-app card.

- `CountdownRing`, 90 s, **`brand` lavender `#A78BFA`**, card border 1.0 px.
- `checkin1_title`, and `checkin1_reason` stating **why it checked now** (zone, tier,
  hour). This is the visible proof of adaptive timing versus T-Safe's fixed clock.
- `BigActionButton` = `cta_im_ok`.
- Text button = `cta_help_now`, danger colour.
- Dismissing the notification does **not** cancel the countdown. Say so: `checkin_persist_note`.

## S6. CheckIn2

Full screen, in page. **A browser cannot show over the lock screen or turn the screen on.**
The overlay covers the viewport, the notification is posted with `requireInteraction: true`,
and the state is re-presented on the next `visibilitychange`. Disclosed, never implied.

- `CountdownRing`, 60 s, **`amber` `#F09921`**, card border 1.5 px.
- `checkin2_title`, `checkin2_body` stating exactly what happens at zero.
- Urgent sound and the long `navigator.vibrate` pattern where it exists. **Nothing here
  bypasses Do Not Disturb or the silent switch**, and the notification is dismissible. The
  in-page overlay is the channel that always works. See `INTERACTION_SPEC.md`.
- Same two actions. Back is consumed.

## S7. FamilyEscalation

- **`danger` red `#FF3B30`**, card border 2.0 px. This is the iOS L3 grading, where the copy is "Your favourites are being notified". `family_title`, `family_body`.
- **The exact message that would be sent**, rendered in a card, per `BUSINESS_RULES.md` §8.
- `DisclosureBanner`: `family_mock_disclosure` (F21), not removable.
- `CountdownRing`, 60 s, **`danger`** (F20). `family_cancel_note` stating SOS follows.
- `BigActionButton` = `cta_cancel_im_fine`.
- Text button = `cta_help_now`.
- If no contact: `family_no_contact`, ladder continues regardless.

## S8. SosActive (F23, F25, F26)

- Danger red. No animation on entry.
- `sos_title`, elapsed timer.
- `sos_state_notified` (F25): the state now has this, stated plainly, with what was sent.
- What was sent, itemised: precise location, the session timeline, nearest station.
  Contacts notified as a **count**, never names.
- Quick dial row: 112, 181, nearest station. All `ACTION_DIAL`.
- `BigActionButton` = `cta_stop_sos` -> S9.
- Queue state if offline: `sos_queued`.

## S9. PinEntry (F24)

- `pin_title`, 4-digit entry, obscured.
- Wrong: `err_pin_wrong` with attempts remaining. After 5, lock 60 s doubling to 15 min,
  `err_pin_locked`.
- **No forgot-PIN path.** `pin_no_recovery` explains why, once, calmly.
- Correct: SOS stops, incident patched to `STOPPED`, return Home.

## S10. PoliceView (F28)

Three honest sections, in this order.

1. **Right now** — what the state can see about her at this moment. In `IDLE` and
   `SHADOW` and both check-ins this is literally **nothing**, and we show that as the
   headline, not as fine print.
2. **If you miss two check-ins** — a rendered sample SUS record: zone, tier, hour band,
   date. Annotated to show no coordinate, no session id, no name.
3. **If SOS triggers** — a rendered sample SOS incident: precise location, the timeline,
   nearest station, pseudonymous id. Annotated as the only moment identity crosses.

Footer: `police_no_govt_link` (F30), permanent.
This is the trust screen. It is worth more than a privacy policy she will not read.

## S11. Settings

Title `set_title`. Rows, in this order, each a `COPY.md` key:

| Row | Key | Sub-label |
|---|---|---|
| Favourites (add, edit, delete, min 0 allowed) | `set_favourites` | `set_favourites_sub` |
| Language | `set_language` | |
| Change PIN (requires current PIN) | `set_pin` | `set_pin_sub` |
| What the police see | `set_police` | |
| About | `set_about` | |
| Demo panel | `set_demo` | `set_demo_sub` |

**Settings is a shell three nodes fill.** It had no owning node at all, which is why the
demo panel was unreachable. Ownership:

| Section | Built by |
|---|---|
| The shell itself, about + disclaimers, **Demo panel** entry | `M4` |
| Contacts, change PIN, language | `M1` |
| "What the police see" entry, and the screen behind it (S10) | `M2` |

**A section appears when its screen exists.** `M4` does not render a "What the police see"
row that leads nowhere: `M2` adds the row when it builds S10. A dead entry point at the
`M4` checkpoint would be worse than an absent one, since that checkpoint is the first thing
shown to anyone.

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
| **What is real** | `about_real_title`, then the eight bullets `about_real_map`, `about_real_detail`, `about_real_arm`, `about_real_ladder`, `about_real_family`, `about_real_sos`, `about_real_writes`, `about_real_console` |
| **What is mocked** | `about_mock_title`, `about_mock_delivery`, `about_mock_console` |
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
| `about_real_writes` | `M2` |
| `about_real_console` | `M3` |

`M4` builds the About screen and ships **two** bullets. It does not print the other six
against work that does not exist yet. Each later node adds its own line as it lands, so
About is honest at every checkpoint rather than only after the last one.

If a node is cut or reinstated, its bullets go with it. A judge who opens About and finds a
claim the app does not honour learns more from that than from the feature itself.

**This screen is a submission asset, not filler.** The brief scores Honesty explicitly, and
a judge who opens About and finds the mock list already there will trust the rest.
