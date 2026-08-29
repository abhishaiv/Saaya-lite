# Saaya Lite - States Catalogue
Loading, empty, error, offline and permission-denied for every screen.
**A screen is not done until every row here is implemented.** Missing states are the most
common way a demo breaks in front of a judge.

## Global rules

- **Never show a spinner alone.** Use a skeleton that matches the final layout, or nothing.
- **Never show a raw exception**, a stack trace, or an error code without plain language.
- **Every error offers an action.** If there is genuinely no action, say what happens next.
- **Never block the ladder on any error state.** The escalation is local and must run
  regardless of what any screen is showing.
- Errors appear inline, in `caption` `danger`. Never a toast, never a dialog, except where
  this table says otherwise.

---

## S1 Gate
| State | Treatment |
|---|---|
| loading | Blank `background`. Max 300 ms. No logo flash, no spinner. |
| storage corrupt | Route to onboarding, wipe and start clean. Never a crash dialog. |

## S2 Onboarding
| State | Treatment |
|---|---|
| step loading | none, all local |
| contact name empty | inline "Add a name" under the field on blur |
| phone wrong length | inline "10 digits, without the country code" |
| notifications | Lite does not request notification permission. Check-ins are in-page while the page is open; never promise a system alert. |
| location denied once | rationale again, softer. Continue button stays enabled. |
| location denied permanently | the shared `loc_help_*` recovery sheet and `cta_retry`. It never claims to open browser settings; if the browser silently denies again, leave the instructions visible. **Never dead-end.** |
| PIN weak | `err_pin_weak` inline, boxes clear |
| PIN mismatch | `err_pin_mismatch`, both entries clear, focus returns to the first box |

## S3 Home
| State | Treatment |
|---|---|
| map tiles loading | zones and location render immediately over `background`. **Never a blocking spinner.** |
| tiles failed | dark background, zones drawn, small "Map offline, zones still work" note |
| location unavailable | no dot, `StatusPill` unchanged, `caption` in the sheet: "Finding you" |
| location permission revoked while running | persistent `DisclosureBanner`, `warn_location_denied`. `AUTO_ZONE` resolves `DISARMED`; `MANUAL` continues its timer-only ladder. |
| position unavailable | banner explaining location is on but no fix is arriving, with the browser's site-settings route. No dead end. |
| zone data failed to parse | **fatal, and say so.** "Saaya Lite could not load Visakhapatnam data." No silent empty map, because an empty map looks like a safe city. |
| remote delivery | not applicable in Lite: it has no writer, queue or retry banner |
| tab was closed or frozen mid-session | on next load, `warn_page_stopped`, then the recovery table in `STATE_MACHINE.md` runs. Never silently restart a countdown. |
| demo mode active | permanent labelled banner. **Never hidden.** |

## S4 Zone detail
| State | Treatment |
|---|---|
| loading | none, all local and instant |
| `SAFE` zone, no card | `zone_safe_no_data`, and say low records is not the same as safe |
| no station within 20 km | `err_no_station`, and the station block is not rendered. The Call button never appears without a number behind it. |
| dialer availability | not detectable on the web; always show the selectable number and `tel:` Call action, then let the browser and user control the handoff |
| `coordPrecision` approximate | `zone_station_approx` always shown, never suppressed |

## S5 / S6 Check-in cards
| State | Treatment |
|---|---|
| entering | per `MOTION_SPEC.md` |
| countdown running | ring `linear`, numeral `tnum`, no other animation |
| deadline passed | card removes itself, ladder advances underneath |
| answered | 160 ms exit |
| tab was hidden or closed | On resume, re-present with the **correct remaining time** recomputed from `deadlineEpochMs`, never a reset countdown. The browser does not deliver an OS alert in Lite. |
| the page is hidden at check-in 2 | a browser cannot wake a locked phone or show a full-screen intent. Re-present the in-page card on return and disclose the limit. Never claim the screen will turn on. |

## S7 Family escalation
| State | Treatment |
|---|---|
| no favourite configured | `family_no_contact`. **Ladder continues to SOS.** Never blocks. |
| composing | instant, local |
| offline | local message preview and cancel window remain usable. Nothing is queued or promised for later delivery. |
| cancelled | confirmation, return to Home; no remote outcome exists in Lite |

## S8 SOS
| State | Treatment |
|---|---|
| entering | **no animation** |
| location unavailable | SOS remains local. Show the available emergency dial actions without claiming a location was sent. |
| offline | `sos_local_offline`, prominent. No network is needed for the local-only SOS. |
| remote delivery | not applicable in Lite: no Firestore write is attempted, queued or retried |
| dialer unavailable | show numbers as selectable text |
| stopped | confirmation, return Home; no incident is patched in Lite |

## S9 PIN entry
| State | Treatment |
|---|---|
| wrong | `err_pin_wrong` with attempts remaining, boxes go `danger`, **no shake** |
| locked | boxes at 30%, `err_pin_locked` with a live countdown |
| forgot | `pin_no_recovery`, calm, stated once, no recovery offered |

## S10 Police view — cut, round two

Lite does not render a state-view screen, write an anonymised record or write an SOS incident.
Do not add a dead entry point for it to Home, Settings or the demo.

## S11 Settings
| State | Treatment |
|---|---|
| no favourites | `EmptyState` with an add button. Allowed and not an error. |
| deleting the last favourite | confirm, and state that escalation will proceed straight to SOS |
| PIN change, wrong current PIN | inline error, same lockout schedule |

## S12 Demo panel
| State | Treatment |
|---|---|
| always | `demo_panel_header` visible at the top, never scrolled away |
| demo speed on | Home banner appears immediately and stays |
| simulate while a session is live | disabled, with `demo_session_live_reason` stated beside the control. A disabled control that does not say why is a dead end. |
