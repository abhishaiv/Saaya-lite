# Saaya Lite - Test Plan
A task is not done until its acceptance criteria pass. Codex writes the tests as part
of the task, not afterwards.

## Layer 1: unit tests (vitest, no browser)

These are possible because `src/domain/` has zero browser API, React or DOM. **These are the tests that
protect the submission's claims**, so they are not optional.

### `rules.test.ts`
| Test | Assertion |
|---|---|
| Hour band boundaries | 23:59 is `NIGHT_LATE`, 00:00 is `NIGHT_DEEP`, 04:59 is `NIGHT_DEEP`, 05:00 is `DAWN`, 19:59 is `DAY`, 20:00 is `NIGHT_EARLY` |
| Arming matrix, all 20 cells | matches the table exactly |
| `SAFE` never arms | all five bands return false |
| Interval selection | HIGH+NIGHT_DEEP = 5 min, MODERATE+NIGHT_DEEP = 12 min, MANUAL = 10 min regardless |
| Display risk | `risk_score 0.5` at `NIGHT_DEEP` = 0.65 and reads "Elevated"; clamps at 1.0 |
| PIN weakness | `0000`,`1234`,`1111`,`7777` rejected; `4062` accepted |

### `sessionEngine.test.ts` (fake clock, no sleeping)
| Test | Assertion |
|---|---|
| Happy path | `IDLE` + `ZoneEntered(high, 04:00)` -> `SHADOW`, one `ScheduleTimer` |
| No arm in a safe zone | stays `IDLE`, **emits zero commands and zero notifications** |
| Full ladder | `SHADOW` -> `CHECKIN_1` -> `CHECKIN_2` -> `FAMILY_ESCALATED` -> `SOS_ACTIVE` at exactly 90 / 60 / 60 s |
| `OK` at step 1 | returns to `SHADOW`, cancels CD1, reschedules, applies the 20 min cooldown |
| `OK` at step 2 | same |
| Manual disarm at step 1 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD1)`, `HideCheckIn`, `StopLocationWatch`, `ReleaseWakeLock`, `StartCooldown(45)`; no write, notification or PIN command |
| Manual disarm at step 2 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD2)`, `HideCheckIn`, `StopLocationWatch`, `ReleaseWakeLock`, `StartCooldown(45)`; no write, notification or PIN command |
| Cancel in the family window | `RESOLVED(CANCELLED)`, emits the SUS outcome patch to `CANCELLED_BY_USER` |
| Help Now from `SHADOW` | straight to `SOS_ACTIVE`, **and also emits a SUS event** so the civic layer is not blind |
| SOS is sticky | every event except `PinAccepted` leaves it in `SOS_ACTIVE` |
| Zone exit during `CHECKIN_2` | ladder continues, does not resolve |
| Zone exit while manually armed | stays `SHADOW` |
| Overlapping zones | picks the higher tier, then the higher score on a tie |
| Enter dwell | arming does not fire before 60 s continuous containment |
| Exit dwell | disarming does not fire before 180 s continuous non-containment |
| Cooldown after manual disarm | re-entry within 45 min does not re-arm |
| Demo divisor | with `DEMO`, ladder totals 35 s and the written payloads are byte-identical to `NORMAL` |
| Frozen band reschedule | MODERATE armed in `NIGHT_DEEP`, then `OkTapped` during `DAWN`, remains `SHADOW` and reschedules for 12 min |
| Active crossing | entering a current-band n/a cell does not disarm or interrupt an active session |
| Frozen-band recovery | process recovery retains persisted `armedHourBand` and uses the absolute `deadlineEpochMs` |
| Overdue SHADOW recovery | a passed persisted deadline immediately advances as `CheckInTimerFired` |
| Fresh n/a attempt | after resolution, a new MODERATE + `DAWN` arming attempt stays `IDLE` |
| Manual across bands | every band reschedules a MANUAL session at 10 min with `armedHourBand=null` |
| Hour change silence | changing the current band alone emits no backend command, notification or user interruption |

### `dwellEvaluator.test.ts` (pure, fake clock, no browser)

This replaces the Android `CandidateModeTest`. The dwell **proof** rules are unchanged and
still matter; what is gone is the background service that used to host them. On web every
fix arrives while the page is visible, so there is no service to start, no notification to
hand off and no background-permission branch. Do not test for those.

| Test | Assertion |
|---|---|
| Pending enter | a first qualifying inside fix starts a pending dwell; `SessionEngine`, Home and map remain `IDLE` |
| Sampling request | exactly 15 s at `enableHighAccuracy: true` |
| Successful proof | five qualifying inside fixes spanning at least 60 s emit exactly one `ZoneEntered` |
| Outside reset | any qualifying outside fix clears that zone's accumulated proof |
| Inaccurate fix | accuracy > 100 m cannot start, extend or complete dwell |
| Trust boundary | a pending dwell emits no backend write, family effect, product event or session persistence |
| Rejected arm | n/a and cooldown engine results return to quiet `IDLE` and discard the completed proof |
| Watch interrupted | hiding the page or a watch error discards all accumulated dwell fixes and timestamps. Evidence is never resumed, only restarted. |
| Exit | a qualifying outside fix past the exit dwell removes that zone's pending state |

### `anonymiser.test.ts` - **the trust boundary, and the most important test in the build**
| Test | Assertion |
|---|---|
| SUS payload keys | exactly the allowed set. Assert `latitude`, `longitude`, `sessionId`, `uid`, `deviceId` are **absent** |
| SUS carries no fine time | `dateLocal` is a date and `hourLocal` is an integer hour. No minutes, no seconds. |
| Two SUS events from one session | contain nothing that links them |
| Nothing writes before family escalation | drive `IDLE`->`SHADOW`->`CHECKIN_1`->`CHECKIN_2` and assert **zero** backend-write commands |
| Family boundary | entering `FAMILY_ESCALATED` emits exactly one anonymous `WriteSusEvent` intent and no `WriteSosIncident` |
| SOS boundary | entering `SOS_ACTIVE` emits `WriteSosIncident`; this is the first detailed state-visible incident |
| SOS payload | contains precise location and uid, and `contactsNotified` is an Int, never names |

### `queue.test.ts`
Backoff sequence is 5/15/60/300/900 s; `SOS_INCIDENT` is drained before any `SUS_EVENT`;
after 20 attempts the status is `FAILED_PERMANENT` and it surfaces in UI state.

### `zoneParsing.test.ts`
24 features parse; tier counts are HIGH 6, MODERATE 9, ELEVATED 4, SAFE 5; every centroid **and every polygon vertex**
falls inside the district envelope `lat 17.4..18.1, lon 82.9..83.7` (**catches the GeoJSON lon/lat swap**); all
19 non-safe zones join to a `zone_info_cards.json` entry; all 37 stations parse with a phone.

## Layer 2: browser integration tests - **three only**

Prototype posture: these are slower to write than unit tests. Write only the three that
protect a claim the submission makes.

| Test | Assertion | Why it survives the cut |
|---|---|---|
| `pinStorage.test.ts` | the plaintext PIN appears nowhere in IndexedDB, `localStorage`, `sessionStorage` or the console | we claim the PIN is never stored in the clear |
| `tabRecovery.test.ts` | hide the page mid-`CHECKIN_2`, restore, the remaining countdown is correct; hide during `FAMILY_ESCALATED` past the window, restore, it lands in `SOS_ACTIVE` | **a frozen tab must never rescue her from the ladder.** This is the web equivalent of process death and it cannot be unit-tested. |
| `queueOffline.test.ts` | with the network offline the ladder completes and every write flushes on reconnect | "works on a slow Indian network" is a claim we make |

## Layer 3: manual browser script (run before submitting, record the result)

Run on a **real mobile browser** at the Vercel preview URL, not a desktop devtools emulation.

| # | Step | Pass condition |
|---|---|---|
| M1 | open the URL cold on a phone | loads under 2.5 s on 3G, no console errors |
| M2 | complete onboarding | under 90 s, ends on the map |
| M3 | deny geolocation | continues, explains, never dead-ends |
| M4 | the map | 19 zones drawn, 5 SAFE zones absent, attribution visible |
| M5 | throttle to offline, reload | zones still render with the map-offline note |
| M6 | tap a high zone | counts, top crimes, nearest station, `tel:` link opens the dialer |
| M7 | tap a SAFE zone | `zone_safe_no_data`, not an empty card |
| M8 | demo panel, simulate entering a HIGH zone at NIGHT_DEEP | **arms with no tap**, banner names the zone and hour |
| M9 | wait for check-in 1 | correct interval, states why it checked now |
| M10 | tap I'm OK | returns to watching, reschedules |
| M11 | let both check-ins lapse | family screen shows the exact message and the mock disclosure |
| M12 | cancel | resolves, console shows the SUS event as cancelled |
| M13 | repeat and let it lapse | SOS appears instantly, states the state view has it |
| M14 | try to leave SOS | back, refresh and navigation do not exit; only the PIN stops it |
| M15 | **switch tabs mid-countdown for 30 s, return** | the countdown shows the CORRECT remaining time, not a reset one |
| M16 | **switch away past a deadline, return** | the ladder has advanced, not paused |
| M17 | airplane mode through the ladder | queued, UI says so, flushes on reconnect, nothing lost |
| M18 | police view in each state | IDLE, SHADOW and both check-ins all headline "nothing" |
| M19 | console in a signed-out private window on another network | loads, no prompt, shows the incident from M13 live |
| M20 | browser text zoom 200% | no clipping on any screen |
| M21 | Telugu | every screen translated, no untranslated key, no overflow |
| M22 | Lighthouse mobile | performance 85 or better |

**M15 and M16 are the ones to run twice.** Tab lifecycle is where a web build of this quietly
breaks, and a wrong countdown after a tab switch looks fine until it matters.

## Hardware, and what the browser cannot do

There is no emulator question on the web, but there is a sharper one.

**A browser cannot arm in the background.** No Service Worker geolocation, no equivalent of a
foreground service, and a hidden tab is throttled or frozen. Arming holds **while the page is
open**, and the manual script tests exactly that.

| Claim | How it is tested | Honest limit |
|---|---|---|
| arms with no tap | M8, on a real phone, page open | needs the page open |
| the ladder survives interruption | M15, M16 | a closed tab stops it; on reopen we detect and disclose |
| escalation survives a bad network | M17 | none |
| nothing crosses before SOS | `anonymiser.test.ts` + the network tab during M13 | none |

**Do not claim background arming.** It is disclosed in the product, in `WEB_PLATFORM.md`, and
in the 250 words. Saying exactly where the browser stops is the architecture answer.

## Layer 4: submission verification (E9, from a different network)

| # | Check |
|---|---|
| V1 | Console URL loads in a private window with no login |
| V2 | deployed site downloads and installs from the landing page |
| V3 | Video plays without sign-in |
| V4 | Repo link, if provided, opens without an access request |
| V5 | No screen anywhere shows a government logo or implies endorsement |
| V6 | Every mock is labelled in the product, not only in the write-up |
| V7 | `grep -ri "openai\|gpt\|claude\|ml\|model"` over the source returns nothing that contradicts the no-AI claim |
| V8 | The manifest contains no `RECORD_AUDIO`, `CAMERA` or `SEND_SMS` |

V7 and V8 are how we prove the honesty claims rather than assert them. Run them and paste
the output into the write-up.

---

## Gate G6's own regression test

The grounded checker is the mechanism behind a submission claim, so it gets a test like any
other load-bearing code. Run it whenever `grounded_check.py` changes:

```bash
python3 scripts/grounded_check.py test/grounded_fixture.ts   # must exit 1
python3 scripts/grounded_check.py --explain test/grounded_fixture.ts
```

The fixture covers every literal form real React code uses. It exists because the original
pattern required a non-word, non-dot character after a number, which matched **none** of
`16.px`, `0.75f`, `14.px` or `1_000` — so the gate was effectively inert against real TypeScript
and would have passed anything. Found on 2026-08-19 while self-testing a different fix.

| Form | Example | Must |
|---|---|---|
| React dimension | `16.px` | be read as 16 |
| React type size | `14.px` | be read as 14 |
| Decimal | `0.75`, `13` | be read as 0.75, 13 |
| Underscored | `6_371_008.8` | be read as 6371008.8 |
| ARGB colour | `0xffa78bfa` | normalise to `#A78BFA` |
| Invented | `0.37`, `#123456` | be **flagged** |
| Structural | `2` | be skipped |
| Exempted | `7 // GROUNDED-EXEMPT: stride` | be skipped |

---

## Gate G6's own regression test

The grounded checker is the mechanism behind a submission claim, so it gets a test like any
other load-bearing code. Run it whenever `grounded_check.py` changes:

```bash
python3 scripts/grounded_check.py test/grounded_fixture.ts   # must exit 1
python3 scripts/grounded_check.py --explain test/grounded_fixture.ts
```

The fixture covers every literal form real React code uses. It exists because the original
pattern required a non-word, non-dot character after a number, which matched **none** of
`16.px`, `0.75f`, `14.px` or `1_000` — so the gate was effectively inert against real TypeScript
and would have passed anything. Found on 2026-08-19 while self-testing a different fix.

| Form | Example | Must |
|---|---|---|
| React dimension | `16.px` | be read as 16 |
| React type size | `14.px` | be read as 14 |
| Decimal | `0.75`, `13` | be read as 0.75, 13 |
| Underscored | `6_371_008.8` | be read as 6371008.8 |
| ARGB colour | `0xffa78bfa` | normalise to `#A78BFA` |
| Invented | `0.37`, `#123456` | be **flagged** |
| Structural | `2` | be skipped |
| Exempted | `7 // GROUNDED-EXEMPT: stride` | be skipped |

---
