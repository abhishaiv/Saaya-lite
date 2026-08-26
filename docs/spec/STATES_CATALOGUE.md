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
| notifications denied | continue. Banner on Home explaining check-ins may be missed, with a settings link. |
| location denied once | rationale again, softer. Continue button stays enabled. |
| location denied permanently | `onb_location_partial`, plus a line on re-enabling it in the browser's site settings, plus a working Continue. **Never dead-end.** |
| PIN weak | `err_pin_weak` inline, boxes clear |
| PIN mismatch | `err_pin_mismatch`, both entries clear, focus returns to the first box |

## S3 Home
| State | Treatment |
|---|---|
| map tiles loading | zones and location render immediately over `background`. **Never a blocking spinner.** |
| tiles failed | dark background, zones drawn, small "Map offline, zones still work" note |
| location unavailable | no dot, `StatusPill` unchanged, `caption` in the sheet: "Finding you" |
| location permission revoked while running | persistent `DisclosureBanner`, `warn_location_denied`, session moves to `RESOLVED(DISARMED)` |
| position unavailable | banner explaining location is on but no fix is arriving, with the browser's site-settings route. No dead end. |
| zone data failed to parse | **fatal, and say so.** "Saaya Lite could not load Visakhapatnam data." No silent empty map, because an empty map looks like a safe city. |
| queue has `FAILED_PERMANENT` | persistent banner, `warn_queue_failed`, tap to retry |
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
| tab was hidden or closed | the Notification API carries it if permission was granted. On resume, re-present with the **correct remaining time** recomputed from `deadlineEpochMs`, never a reset countdown. |
| notification permission denied | in-app card only, plus a Home banner warning she may miss a check-in when the app is closed |
| the page is hidden at check-in 2 | a browser cannot wake a locked phone and has no full-screen intent. Fire the notification with `requireInteraction: true`, play the urgent sound if the page is audible, and disclose this limit in the write-up. Never claim the screen will turn on. |

## S7 Family escalation
| State | Treatment |
|---|---|
| no favourite configured | `family_no_contact`. **Ladder continues to SOS.** Never blocks. |
| composing | instant, local |
| offline | message still shown, `DisclosureBanner` says it is queued. Cancel still works. |
| cancelled | confirmation, return to Home, SUS outcome patched |

## S8 SOS
| State | Treatment |
|---|---|
| entering | **no animation** |
| location unavailable | send the last known fix with its age stated on screen: "Last known, 40 s ago". Never send nothing, never claim it is current. |
| offline | `sos_queued`, prominent. Everything else works. |
| Firestore write failed | queued and retried at priority. UI shows queued, never "sent". |
| dialer unavailable | show numbers as selectable text |
| stopped | confirmation, return Home, incident patched to `STOPPED` |

## S9 PIN entry
| State | Treatment |
|---|---|
| wrong | `err_pin_wrong` with attempts remaining, boxes go `danger`, **no shake** |
| locked | boxes at 30%, `err_pin_locked` with a live countdown |
| forgot | `pin_no_recovery`, calm, stated once, no recovery offered |

## S10 Police view
| State | Treatment |
|---|---|
| `IDLE`, `SHADOW`, both check-ins | section 1 headlines **"Right now: nothing."** This is the point of the screen. |
| `FAMILY_ESCALATED` | section 1 shows the real anonymised SUS record just written |
| `SOS_ACTIVE` | section 1 shows the real incident just written |
| sample generation failed | fall back to a stated example clearly labelled "example", never a blank section |

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
