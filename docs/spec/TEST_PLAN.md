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
| No arm in a safe zone | stays `IDLE`, **emits zero commands and no visible alert** |
| Full ladder | `SHADOW` -> `CHECKIN_1` -> `CHECKIN_2` -> `FAMILY_ESCALATED` -> `SOS_ACTIVE` at exactly 90 / 60 / 60 s |
| Civic-record arm-mode boundary | an `AUTO_ZONE` family escalation emits one `WriteSusEvent`; a `MANUAL` family escalation remains local and emits none. Either mode can create the detailed incident only at `SOS_ACTIVE`. |
| `OK` at step 1 | returns to `SHADOW`, cancels CD1, reschedules, applies the 20 min cooldown |
| `OK` at step 2 | same |
| Manual disarm at step 1 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD1)`, `HideCheckIn`, `StopLocationWatch`, `ReleaseWakeLock`, `StartCooldown(45)`; no write, notification or PIN command |
| Manual disarm at step 2 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD2)`, `HideCheckIn`, `StopLocationWatch`, `ReleaseWakeLock`, `StartCooldown(45)`; no write, notification or PIN command |
| Cancel in the family window | `RESOLVED(CANCELLED)`, local cleanup. The frozen future SUS-outcome intent has no Lite performer. |
| Help Now from `SHADOW` | straight to `SOS_ACTIVE`, with no application safety-data delivery |
| SOS is sticky | every event except `PinAccepted` leaves it in `SOS_ACTIVE` |
| Zone exit during `CHECKIN_2` | ladder continues, does not resolve |
| Zone exit while manually armed | stays `SHADOW` |
| Overlapping zones | picks the higher tier, then the higher score on a tie |
| Enter dwell | arming does not fire before 60 s continuous containment |
| Exit dwell | disarming does not fire before 180 s continuous non-containment |
| Cooldown after manual disarm | re-entry within 45 min does not re-arm |
| Demo divisor | with `DEMO`, ladder totals 35 s without changing the local-only delivery boundary |
| Frozen band reschedule | MODERATE armed in `NIGHT_DEEP`, then `OkTapped` during `DAWN`, remains `SHADOW` and reschedules for 12 min |
| Active crossing | entering a current-band n/a cell does not disarm or interrupt an active session |
| Frozen-band recovery | process recovery retains persisted `armedHourBand` and uses the absolute `deadlineEpochMs` |
| Overdue SHADOW recovery | a passed persisted deadline immediately advances as `CheckInTimerFired` |
| Fresh n/a attempt | after resolution, a new MODERATE + `DAWN` arming attempt stays `IDLE` |
| Manual across bands | every band reschedules a MANUAL session at 10 min with `armedHourBand=null` |
| Hour change silence | changing the current band alone emits no delivery, system alert or user interruption |

### `dwellEvaluator.test.ts` (pure, fake clock, no browser)

This replaces the Android `CandidateModeTest`. The dwell **proof** rules are unchanged and
still matter; what is gone is the background service that used to host them. On web every
fix arrives while the page is visible, so there is no service to start, no notification to
hand off and no background-permission branch. Do not test for those.

| Test | Assertion |
|---|---|
| Pending enter | a first qualifying inside fix starts a pending dwell; `SessionEngine`, Home and map remain `IDLE` |
| Sampling request | exactly 15 s at `enableHighAccuracy: true` |
| Successful proof | five qualifying inside-circle fixes spanning at least 60 s emit exactly one `ZoneEntered` |
| Outside reset | any qualifying outside fix clears that zone's accumulated proof |
| Inaccurate fix | accuracy > 100 m cannot start, extend or complete dwell |
| Trust boundary | a pending dwell emits no backend write, family effect, product event or session persistence |
| Rejected arm | n/a and cooldown engine results return to quiet `IDLE` and discard the completed proof |
| Watch interrupted | hiding the page or a watch error discards all accumulated dwell fixes and timestamps. Evidence is never resumed, only restarted. |
| Exit | a qualifying outside fix past the exit dwell removes that zone's pending state |

### `containment.test.ts`

| Test | Assertion |
|---|---|
| Frozen hotspot parse | 104 aggregate anchors parse within the district envelope; all three shipped copies are byte-identical to SHA-256 `c35870b194851f5ed2d25840c17bb0669781c439bbad1b246e8c366118c4f5ec` |
| Visible hotspot join | exactly 70 derived circles: HIGH 10, MODERATE 41, ELEVATED 19; every one has exactly one non-SAFE parent zone |
| Excluded anchors | 18 SAFE-only and 16 unclassified anchors yield no circle, no colour and no containment candidate |
| Circle boundary | the center and an exact-radius boundary point are contained; a point beyond the radius is not |
| Circle is authoritative | a point inside a former broad parent polygon but outside every localized circle is not contained and cannot begin dwell |
| Radius is unread | `geofenceRadiusM` appears in no hotspot build or live-containment code path |

### `anonymiser.test.ts` and `queue.test.ts` — **Cut, round two**
Lite ships no Firestore writer, delivery queue or payload builder. The pure engine retains
future delivery intents, but the round-one runtime ignores them. M2 returns only when those
writers and their adversarial payload tests can ship together.

### `zoneParsing.test.ts`
24 parent features parse; tier counts are HIGH 6, MODERATE 9, ELEVATED 4, SAFE 5; every centroid, every polygon
vertex and all 104 aggregate anchors fall inside the district envelope `lat 17.4..18.1, lon 82.9..83.7`
(**catches the GeoJSON lon/lat swap**); all 19 non-safe parents join to a `zone_info_cards.json` entry; all 37
stations parse with a phone.

### Phase 1B reachability
| Test | Assertion |
|---|---|
| `localePreference.test.ts` | resolve persisted `language` before `?lang`, retain the URL locale when no preference exists, and leave a live engine session plus its persisted deadline unchanged when only the presentation preference changes. |
| `demoPanel.test.tsx` | use the fast and normal parameterised speed notes in English and Telugu; neither path freezes a ladder timing. |
| `onboardingRules.test.ts` | her `user_name` is optional while a real favourite name and exactly ten phone digits remain required. |
| `familyEscalationOverlay.test.ts`, `homeSessionSurface.test.tsx`, `zoneDetailSheet.test.tsx` | render the one copy-table family-message template, compact countdown action and static risk category in English and Telugu; replace every shared placeholder and source category without a hard-coded English preview or suffix. |

## Layer 2: browser integration tests - **two only**

Prototype posture: these are slower to write than unit tests. Write only the three that
protect a claim the submission makes.

| Test | Assertion | Why it survives the cut |
|---|---|---|
| `pinStorage.test.ts` | the plaintext PIN appears nowhere in IndexedDB, `localStorage`, `sessionStorage` or the console | we claim the PIN is never stored in the clear |
| `tabRecovery.test.ts` | hide the page mid-`CHECKIN_2`, restore, the remaining countdown is correct; hide during `FAMILY_ESCALATED` past the window, restore, it lands in `SOS_ACTIVE` | **a frozen tab must never rescue her from the ladder.** This is the web equivalent of process death and it cannot be unit-tested. |

## Layer 3: manual browser script (run before submitting, record the result)

Run on a **real mobile browser** at the Vercel preview URL, not a desktop devtools emulation.

| # | Step | Pass condition |
|---|---|---|
| M1 | open the URL cold on a phone | loads under 2.5 s on 3G, no console errors |
| M2 | complete onboarding | setup completes under 90 s, then the Saaya v2 lockup, Vizag-only beta note and safety-flow tour appear before the map's labelled DemoPanel opens |
| M3 | deny geolocation | continues, explains, never dead-ends |
| M4 | the map | 70 localized red/orange/yellow circles, no green or broad polygon layer, 5 SAFE parents absent, attribution visible |
| M5 | throttle to offline, reload | zones still render with the map-offline note |
| M6 | tap a high zone | counts, top crimes, nearest station, `tel:` link opens the dialer |
| M7 | select a SAFE zone **from the DemoPanel picker** | `zone_safe_no_data`, not an empty card, and **no session arms**. SAFE zones are not drawn, so there is no map tap to test. |
| M8 | demo panel, simulate entering a HIGH zone at NIGHT_DEEP | **arms with no tap**, banner names the zone and hour |
| M8a | from idle, tap the floating SOS control | SOS opens immediately, offers user-controlled `tel:112`, `tel:181`, and nearest-station dial actions when a location is known; the local-only and no-government-link disclosures stay visible, and no application request carries personal, session or precise-location data |
| M9 | wait for check-in 1 | correct interval, states why it checked now |
| M10 | tap I'm OK | returns to watching, reschedules |
| M11 | let both check-ins lapse | family screen shows the exact local message preview and the mock disclosure |
| M12 | cancel | resolves locally; ordinary map-tile reads aside, no application request carries personal, session or precise-location data |
| M13 | repeat and let it lapse | SOS appears instantly, states that this beta sent no report, and offers the user-controlled dial actions |
| M14 | try to leave SOS | back, refresh and navigation do not exit; only the PIN stops it |
| M15 | **switch tabs mid-countdown for 30 s, return** | the countdown shows the CORRECT remaining time, not a reset one |
| M16 | **switch away past a deadline, return** | the ladder has advanced, not paused |
| M17 | airplane mode through the ladder | local ladder remains visible; it does not queue or claim a future send |
| M18 | police view in each state | **Cut, round two.** No state-view route ships in this build. |
| M19 | console in a signed-out private window on another network | **Cut, round two.** No console or live incident ships in Lite. |
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
| local ladder survives a bad network | M17 | no delivery or queue is claimed |
| no safety data crosses | M8a + the network tab through M13 | ordinary map-tile reads can occur, but no application request carries personal, session or precise-location safety data |

**Do not claim background arming.** It is disclosed in the product, in `WEB_PLATFORM.md`, and
in the 250 words. Saying exactly where the browser stops is the architecture answer.

## Layer 4: submission verification (E9, from a different network)

| # | Check |
|---|---|
| V1 | **Cut, round two.** No console URL ships in Lite. |
| V2 | the deployed site loads on a real phone from the submission link, in a private window, with no sign-in |
| V3 | Video plays without sign-in |
| V4 | Repo link, if provided, opens without an access request |
| V5 | No screen anywhere shows a government logo or implies endorsement |
| V6 | Every mock is labelled in the product, not only in the write-up |
| V7 | `grep -ri "openai\|gpt\|claude\|ml\|model"` over the source returns nothing that contradicts the no-AI claim |
| V8 | `grep -rn "getUserMedia\|MediaRecorder\|navigator.contacts\|ContactsManager" src app` returns nothing, and a full run of the ladder in devtools prompts for **geolocation only** |
| V9 | Every font in `public/fonts` shapes identically to its upstream source: glyph ids and advances match per shaping run over every keyed bilingual row of `COPY.md`, segmented by the declared font stack. Licence files present beside them. Total under `font.budget`. |

V7, V8 and V9 are how we prove the honesty claims rather than assert them. V8 replaces an
Android manifest check: a web app has no manifest to inspect, so the equivalent evidence is
the absent API calls plus the prompts a reviewer can watch for themselves. Run them and paste
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
