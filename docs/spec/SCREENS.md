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
      CheckIn2 (full screen, over lock screen)
      FamilyEscalation (full screen)
      SosActive (full screen) ─> PinEntry
```

**Session overlays are driven by `SessionState`, never by user navigation.** She can never
navigate away from `CHECKIN_2`, `FAMILY_ESCALATED` or `SOS_ACTIVE`. Back is consumed.

---

## S1. Gate
No UI. Reads `onboarded`. Routes. Max 300 ms; show nothing rather than a flash.

## S2. Onboarding (F1, 4 steps, target under 90 s total)

Progress dots at top. No step is skippable except step 2's second contact.

### S2.1 Welcome
- Saaya wordmark, `onb_welcome_title`, `onb_welcome_body`.
- Language selector (F4): English / తెలుగు. Applies immediately, no restart.
- Primary: `cta_continue`.

### S2.2 Trusted contact (F2)
- `onb_contact_title`, `onb_contact_body`.
- Name field, phone field (prefix `+91` fixed, 10 digits).
- Contact picker button (needs `READ_CONTACTS`; if denied, manual entry still works and
  we never block on it).
- Validation: name non-empty, phone exactly 10 digits after prefix.
- `onb_contact_privacy` in a `DisclosureBanner`: this stays on your phone and is never uploaded.
- Primary: `cta_continue`. Secondary: `cta_add_another` (max 3).

### S2.3 Location (F3)
- **Rationale screen before the system dialog.** `onb_location_title`, `onb_location_body`.
- Primary requests `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`.
- On grant, a second rationale for background, then `ACCESS_BACKGROUND_LOCATION`.
- If background is denied: **continue anyway.** Show `onb_location_partial` explaining
  auto-arm only works with the app open. Never dead-end her.
- States: `default`, `requesting`, `denied_once`, `denied_permanently` (deep link to settings).

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
| Floating | "What the police see" entry point. |

### States
| State | Home shows |
|---|---|
| `IDLE` | `StatusPill` = `status_idle`. Button = `cta_arm_manually`. |
| `SHADOW`, auto | `StatusPill` = `status_shadow_auto`. **Arm banner (F11)**: which zone, what hour, and that she did not start it. Button = `cta_im_home`. |
| `SHADOW`, manual | `StatusPill` = `status_shadow_manual`. Button = `cta_im_home`. |
| location denied | Persistent `DisclosureBanner`, `warn_location_denied`, deep link to settings. |
| queue has `FAILED_PERMANENT` | Persistent banner, `warn_queue_failed`. |
| demo mode on | Persistent labelled banner, `demo_mode_active`. Never hidden. |

Map must render usably on a 720x1280 device at 2 GB RAM. Cap polygon redraw; do not
re-tessellate on every frame.

## S4. Zone detail sheet (F7, F8)

Opens on zone tap. Bottom sheet, 14 px radius, drag to dismiss.

- Header: `area_name`, `ZoneChip` with `risk_level`.
- Stat row: `incident_count` total, `women_safety_count` women-safety. Label the second
  clearly; it is the number she actually cares about.
- Hour-aware line: current display risk band per `BUSINESS_RULES.md` §10.
- `top_crimes` string, rendered as-is from `zone_info_cards.json`.
- `risk_notes` as body text.
- Nearest station block: name, distance, **Call** button (`ACTION_DIAL`, never
  `ACTION_CALL`, so she confirms). If `coordPrecision == "locality-approx"`, show
  `zone_station_approx`.
- Footer: `zone_data_source` crediting NCRB 2023 calibration.

**A `SAFE` zone has no card.** Tapping one shows `zone_safe_no_data`, and we say honestly
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
- Alarm-stream sound, long vibration, high-importance channel that bypasses DND.
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
Contacts (add, edit, delete, min 0 allowed), language, change PIN (requires current PIN),
"What the police see", about + disclaimers, **Demo panel**.

## S12. DemoPanel (D1)
Reachable from Settings, and clearly labelled, in both build types.

- Toggle `DEMO` speed (divisor 6). Shows resulting ladder timings live.
- "Simulate entering zone" with a zone picker over all 24.
- "Simulate check-in miss", "Jump to family escalation", "Trigger SOS".
- Reset session.
- Permanent header: `demo_panel_header` stating this is a prototype control, not a
  product feature.

While `DEMO` is active, the Home banner is visible so it appears in **every** screenshot
and in the video. We never demo something that looks like production behaviour.

---

## S13. About

Reached from Settings. Static, scrollable, no interaction beyond links.

| Section | Content |
|---|---|
| Header | Saaya Lite wordmark, `versionName` and `versionCode` |
| What this is | Two sentences: a prototype built for Build What Moves India, showing the missing tier below India's emergency apps. |
| **What is real** | Bullet list, from `SCOPE.md`: map, zones, auto-arm, check-in ladder, escalation timing, PIN, both state writes, the console. |
| **What is mocked** | Bullet list: SMS and WhatsApp delivery are composed and shown, not sent, because real delivery needs India DLT registration. |
| **What this is not** | `police_no_govt_link`, in full. Not AP Police, Shakthi, T-Safe, 112 or ERSS. Not a government product. |
| **No AI** | One line: every decision this app makes is a fixed rule, and there is no model in it. |
| Data | Visakhapatnam records calibrated against NCRB 2023 city data. All demo records are synthetic. |
| Attribution | `© OpenStreetMap contributors © CARTO`. Poppins and Noto Sans Telugu under the SIL Open Font License. Material Symbols under Apache 2.0. |
| Contact | founder email |

**This screen is a submission asset, not filler.** The brief scores Honesty explicitly, and
a judge who opens About and finds the mock list already there will trust the rest.
