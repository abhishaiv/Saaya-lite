# Saaya Lite - Test Plan
A task is not done until its acceptance criteria pass. Codex writes the JVM tests as part
of the task, not afterwards.

## Layer 1: JVM unit tests (no device, no Android)

These are possible because `domain/` has zero Android imports. **These are the tests that
protect the submission's claims**, so they are not optional.

### `RulesTest`
| Test | Assertion |
|---|---|
| Hour band boundaries | 23:59 is `NIGHT_LATE`, 00:00 is `NIGHT_DEEP`, 04:59 is `NIGHT_DEEP`, 05:00 is `DAWN`, 19:59 is `DAY`, 20:00 is `NIGHT_EARLY` |
| Arming matrix, all 20 cells | matches the table exactly |
| `SAFE` never arms | all five bands return false |
| Interval selection | HIGH+NIGHT_DEEP = 5 min, MODERATE+NIGHT_DEEP = 12 min, MANUAL = 10 min regardless |
| Display risk | `risk_score 0.5` at `NIGHT_DEEP` = 0.65 and reads "Elevated"; clamps at 1.0 |
| PIN weakness | `0000`,`1234`,`1111`,`7777` rejected; `4062` accepted |

### `SessionEngineTest` (fake clock, no sleeping)
| Test | Assertion |
|---|---|
| Happy path | `IDLE` + `ZoneEntered(high, 04:00)` -> `SHADOW`, one `ScheduleTimer` |
| No arm in a safe zone | stays `IDLE`, **emits zero commands and zero notifications** |
| Full ladder | `SHADOW` -> `CHECKIN_1` -> `CHECKIN_2` -> `FAMILY_ESCALATED` -> `SOS_ACTIVE` at exactly 90 / 60 / 60 s |
| `OK` at step 1 | returns to `SHADOW`, cancels CD1, reschedules, applies the 20 min cooldown |
| `OK` at step 2 | same |
| Manual disarm at step 1 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD1)`, `HideCheckIn`, `StopForegroundService`, `StartZoneCooldown(45)`; no write, notification or PIN command |
| Manual disarm at step 2 | `RESOLVED(DISARMED)`; exact commands are `CancelTimer(CD2)`, `HideCheckIn`, `StopForegroundService`, `StartZoneCooldown(45)`; no write, notification or PIN command |
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

### `CandidateModeTest` (pure coordinator with fake monotonic clock)
| Test | Assertion |
|---|---|
| Circular enter | starts service-private `CANDIDATE`; `SessionEngine`, Home and map remain `IDLE` |
| Sampling request | exactly 15 s at `HIGH_ACCURACY` |
| Successful proof | five qualifying inside fixes spanning at least 60 s emit exactly one `ZoneEntered` |
| Outside reset | any qualifying outside fix clears that candidate's accumulated proof |
| Inaccurate fix | accuracy > 100 m cannot start, extend or complete dwell |
| Trust boundary | candidate emits no backend write, family effect, product event or session persistence |
| Rejected arm | n/a and cooldown engine results return to quiet `IDLE` and remove the completed candidate |
| Notification handoff | accepted arm updates `SHADOW_ONGOING` in place from candidate to Shadow; it does not restart the service |
| Circular exit | removes that candidate and stops the service when it is the last candidate and no session is active |
| Process death | candidate IDs may recover, but all dwell fixes and timestamps reset |
| Background denial | no candidate starts without background permission; foreground-only arming remains available and no `ZoneEntered` is emitted |

### `AnonymiserTest` - **the trust boundary, and the most important test in the build**
| Test | Assertion |
|---|---|
| SUS payload keys | exactly the allowed set. Assert `latitude`, `longitude`, `sessionId`, `uid`, `deviceId` are **absent** |
| SUS carries no fine time | `dateLocal` is a date and `hourLocal` is an integer hour. No minutes, no seconds. |
| Two SUS events from one session | contain nothing that links them |
| Nothing writes before family escalation | drive `IDLE`->`SHADOW`->`CHECKIN_1`->`CHECKIN_2` and assert **zero** backend-write commands |
| Family boundary | entering `FAMILY_ESCALATED` emits exactly one anonymous `WriteSusEvent` intent and no `WriteSosIncident` |
| SOS boundary | entering `SOS_ACTIVE` emits `WriteSosIncident`; this is the first detailed state-visible incident |
| SOS payload | contains precise location and uid, and `contactsNotified` is an Int, never names |

### `QueueTest`
Backoff sequence is 5/15/60/300/900 s; `SOS_INCIDENT` is drained before any `SUS_EVENT`;
after 20 attempts the status is `FAILED_PERMANENT` and it surfaces in UI state.

### `ZoneParsingTest`
24 features parse; tier counts are HIGH 6, MODERATE 9, ELEVATED 4, SAFE 5; every centroid **and every polygon vertex**
falls inside the district envelope `lat 17.4..18.1, lon 82.9..83.7` (**catches the GeoJSON lon/lat swap**); all
19 non-safe zones join to a `zone_info_cards.json` entry; all 37 stations parse with a phone.

## Layer 2: instrumented tests (device) - **two only**

Prototype posture: instrumented tests are slow to write and need a device. Write **only**
the two that protect a claim we make in the submission. Everything else that used to be
here moves to the manual script in layer 3.

| Test | Assertion | Why it survives the cut |
|---|---|---|
| `PinStorageTest` | the plaintext PIN appears nowhere in prefs, the database or logcat | we claim the PIN is never stored in the clear |
| `RecoveryTest` | kill the process mid-`CHECKIN_2`, restart, the remaining countdown is correct; kill during `FAMILY_ESCALATED` past the window, restart, lands in `SOS_ACTIVE` | "process death must never rescue her from the ladder" is the behaviour most likely to be silently broken, and it cannot be tested on the JVM |

Room round trips and notification channels are covered by the manual script instead.

## Layer 3: manual device script (run on E9, record the result)

| # | Step | Pass condition |
|---|---|---|
| M1 | Fresh install, complete onboarding | under 90 s, ends on Home |
| M2 | Deny background location | app continues, `onb_location_partial` shown, never dead-ends |
| M3 | Open the map | 19 zones drawn, 5 safe zones absent |
| M4 | Tap a high zone | card shows counts, top crimes, nearest station, call opens the dialer pre-filled |
| M5 | Tap a safe zone | `zone_safe_no_data`, not an empty card |
| M6 | Demo panel, simulate entering a HIGH zone at NIGHT_DEEP | **arms with no tap**, banner names the zone and the hour |
| M7 | Wait for check-in 1 | appears at the right interval, states why it checked now |
| M8 | Tap I'm OK | returns to watching, reschedules |
| M9 | Let both check-ins lapse | family screen shows the exact message and the mock disclosure |
| M10 | Cancel | resolves, console shows the SUS event as cancelled |
| M11 | Repeat and let it lapse | SOS opens with no animation, states the state view has it |
| M12 | Try to leave SOS | back and home do not exit; only the PIN stops it |
| M13 | Wrong PIN 5 times | lockout with a countdown |
| M14 | Correct PIN | SOS stops, console shows `STOPPED` |
| M15 | Airplane mode, run the ladder | queued, UI says so, sends on reconnect, nothing lost |
| M16 | Police view in each state | `IDLE`/`SHADOW`/check-ins all headline "nothing" |
| M17 | Console in a signed-out private window on a phone | loads, no prompt, shows the incident from M11 live |
| M18 | Font scale 1.3x | no clipping on any screen |
| M19 | Telugu | every screen translated, no untranslated key, no overflow |
| M20 | 2 GB device on throttled 3G | map usable, ladder unaffected |

## Layer 4: submission verification (E9, from a different network)

| # | Check |
|---|---|
| V1 | Console URL loads in a private window with no login |
| V2 | APK downloads and installs from the landing page |
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
python3 scripts/grounded_check.py test/grounded_fixture.kt   # must exit 1
python3 scripts/grounded_check.py --explain test/grounded_fixture.kt
```

The fixture covers every literal form real Compose code uses. It exists because the original
pattern required a non-word, non-dot character after a number, which matched **none** of
`16.dp`, `0.75f`, `14.sp` or `1_000` — so the gate was effectively inert against real Kotlin
and would have passed anything. Found on 2026-08-19 while self-testing a different fix.

| Form | Example | Must |
|---|---|---|
| Compose dimension | `16.dp` | be read as 16 |
| Compose type size | `14.sp` | be read as 14 |
| Float suffix | `0.75f`, `13f` | be read as 0.75, 13 |
| Underscored | `6_371_008.8` | be read as 6371008.8 |
| ARGB colour | `0xFFA78BFA` | normalise to `#A78BFA` |
| Invented | `0.37f`, `#FF123456` | be **flagged** |
| Structural | `2` | be skipped |
| Exempted | `7 // GROUNDED-EXEMPT: stride` | be skipped |

---

## Emulator or real hardware: which gate accepts which

`G5` and `G8` say "runs on device". That was ambiguous, and it would have had every UI gate
blocking for hardware when an emulator would do. Resolved 2026-08-19 at `T1.1`.

**An emulator is sufficient** for anything that only exercises app logic and rendering:

| Gate / node | Why an emulator is enough |
|---|---|
| `T1.1` G5, G8 | it installs and the themed screen renders |
| `T2.2`, `T3.1`, `T3.2` | map, sheets, onboarding are pure UI |
| `T5.1` | notification channels and the lock-screen full-screen intent behave correctly on an emulator |
| `T6.1`, `T7.1`, `T7.3` | screens and state transitions |
| `T6.2` | airplane mode is faithfully simulated |
| `T9.1` | font scale, locale and layout |

**Real hardware is required** where the emulator does not model the thing being tested:

| Anchor | Why hardware |
|---|---|
| **`T4.2` — arms with no tap** | real geofence delivery under Doze, real background-location behaviour, real OEM battery management. An emulator will report success where a Xiaomi will not. **This is the product's central claim; an emulator pass here is worth nothing.** |
| `T9.2` low-end pass | the emulator does not model a 2 GB device's actual thermal and memory behaviour |
| OEM autostart check | only reproducible on Xiaomi, Oppo, Vivo, Realme, OnePlus |

**The rule:** if the gate tests *what the app draws or decides*, an emulator is fine. If it
tests *what Android does to the app*, it needs hardware.

An AVD named `saaya_api35` (android-35) is already installed. Note the founder's machine has
8 GB, and an emulator wants roughly 2 GB, so stop the Gradle daemon before booting it:

```bash
./gradlew --stop
$HOME/Library/Android/sdk/emulator/emulator -avd saaya_api35 -no-snapshot-load &
$HOME/Library/Android/sdk/platform-tools/adb wait-for-device
```

`adb` and `emulator` are **not on PATH**. Use the full paths above or export them.
