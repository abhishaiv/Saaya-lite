# Saaya Lite - Business Rules
**Every number in the product lives here.** Codex must not invent a threshold, an interval
or a formula. If a value is needed and absent, stop and ask.

All values are `const` in one file: `src/domain/engine/rules.ts`. Nothing hardcoded elsewhere.

---

## 1. Hour bands

Local time, Asia/Kolkata. Use the device clock but resolve the band through `Clock` so
tests can inject time.

| Band | Range (inclusive start, inclusive end) |
|---|---|
| `NIGHT_DEEP` | 00:00 - 04:59 |
| `DAWN` | 05:00 - 06:59 |
| `DAY` | 07:00 - 19:59 |
| `NIGHT_EARLY` | 20:00 - 21:59 |
| `NIGHT_LATE` | 22:00 - 23:59 |

## 2. The arming matrix (F10)

Does entering this zone at this hour arm a Shadow session automatically?

| Risk tier | DAY | NIGHT_EARLY | NIGHT_LATE | NIGHT_DEEP | DAWN |
|---|---|---|---|---|---|
| **HIGH** | no | **yes** | **yes** | **yes** | **yes** |
| **ELEVATED** | no | no | **yes** | **yes** | **yes** |
| **MODERATE** | no | no | no | **yes** | no |
| **SAFE** | no | no | no | no | no |

Reading: the higher the tier, the earlier in the evening it starts caring. `SAFE` never
auto-arms, which is why those 5 zones are also not drawn.

**Manual arm (F13)** ignores this matrix entirely and works anywhere, including outside
every zone.

## 3. Arming hysteresis, so it does not flap at a boundary

| Rule | Value | Why |
|---|---|---|
| Enter dwell before arming | **60 s** continuously inside the polygon | Prevents arming when she drives past the edge of a zone. |
| Exit dwell before disarming | **180 s** continuously outside | Prevents disarming from one bad GPS fix on a narrow road. |
| Re-arm cooldown after a manual disarm in the same zone | **45 min** | If she disarmed here deliberately, do not immediately re-arm and nag her. |
| Re-arm cooldown after `RESOLVED_OK` in the same zone | **20 min** | She answered. Give her space. |
| Zone containment test | point-in-polygon on the real polygon | The pre-filter is each polygon's own **bounding box**, computed once at load. `geofence_radius_m` is **not used for containment**: see the rule below. The authoritative test is the polygon. |

## 4. Check-in intervals (F15)

Time from arming (or from the last `OK`) until check-in 1 appears.

| Risk tier | NIGHT_DEEP | NIGHT_LATE / DAWN | NIGHT_EARLY |
|---|---|---|---|
| **HIGH** | **5 min** | 8 min | 10 min |
| **ELEVATED** | **8 min** | 10 min | n/a |
| **MODERATE** | **12 min** | n/a | n/a |
| **MANUAL** (any zone or none) | **10 min**, always | | |

Cells marked n/a cannot start a new `AUTO_ZONE` session, because the arming matrix does not
arm there. An already-active `AUTO_ZONE` session freezes the hour band captured when it
armed as `armedHourBand`, and uses that band for every later check-in reschedule until the
session reaches `RESOLVED`. Crossing into a current-band n/a cell never disarms or interrupts
that session. After resolution, a new arming attempt evaluates the current hour band normally.
`MANUAL` sessions never use `armedHourBand` and remain fixed at 10 minutes in every band.

**Note there is no `DAY` column.** `DAY` runs 07:00 to 20:00 and never arms an `AUTO_ZONE`
session in any tier. This is the rule the demo control has to respect.

### The demo control freezes the hour, and freezes it everywhere

`demo.arm.hour` is **04:00 IST**. When a session is armed through the demo control in
`SCREENS.md` S12, that hour is the one the session believes it is: `NIGHT_DEEP`, inside
which a HIGH zone genuinely arms.

**One frozen hour, one source, used by everything that shows or derives an hour** for that
session: the arm banner's `%2$s`, `checkin1_reason`'s `%3$s`, the hour band that
`FREEZE_AT_ARM` captures into `armedHourBand`, and the `hourBand` on the SUS record. Browser
QA found the banner reading "5 pm" while the session claimed `NIGHT_DEEP`, which is a state
the matrix above forbids; that happened because the band was forced and the displayed hour
was not. Deriving both from one value is what stops it recurring.

**The clock itself is not frozen.** `ctx.nowEpochMs` stays real, so every countdown, deadline
and recovery behaves exactly as in a live session. Only the hour-of-day used for band
derivation and display is pinned.

`demo_mode_active` stays on screen throughout, so nobody watching mistakes 4 a.m. for the
real time.

**The frozen hour has to survive a reload, and it does not belong in `PersistedSession`.**
Toggling demo speed and reloading otherwise drops the session back to the real clock, which
reintroduces exactly the mismatch this rule exists to prevent.

Persist a private marker **keyed by `sessionId` in the demo metadata store**, alongside the
demo-speed flag. On recovery, a session whose id carries that marker restores
`demo.arm.hour` as its displayed hour.

**Do not add a demo field to `PersistedSession`.** That interface is the engine's contract
and the trust-boundary type; a demo-only field there would leak the harness into the
product's persisted shape and duplicate a value that is already frozen as a fact.
`armedHourBand` is already persisted and already carries `NIGHT_DEEP` through recovery, so
the band survives on its own. What the marker restores is the **displayed** hour, which is
presentation, which is where it belongs.

This is the concrete difference from T-Safe's fixed 15-minute timer, so it must be
visible in the UI: the check-in screen states why it checked when it did.

## 5. The escalation ladder timings

| Step | Timer | Value | On expiry |
|---|---|---|---|
| 1 | Check-in 1 countdown | **90 s** | go to step 2 |
| 2 | Check-in 2 countdown, urgent | **60 s** | go to step 3 |
| 3 | Family cancel window (F20) | **60 s** | go to step 4 (SOS) |
| 4 | SOS | no timer, runs until PIN | |

Total from check-in 1 appearing to SOS: **210 s (3 min 30 s)**.

Check-in 2 differs from check-in 1: a full-screen in-page overlay, the urgent sound, and
the long vibration pattern where `navigator.vibrate` exists. Check-in 1 is gentle: a plain
notification and a short vibration. **Nothing here bypasses Do Not Disturb or the silent
switch.** A web page cannot, and `INTERACTION_SPEC.md` states the limit rather than
claiming otherwise.

## 6. Demo speed (D1)

A 210-second ladder does not fit a 3-minute video. A single global divisor scales **only**
the four timers above and the two dwell values.

| Mode | Divisor | Ladder total |
|---|---|---|
| `NORMAL` | 1 | 210 s |
| `DEMO` | **6** | 35 s (15 / 10 / 10) |

`DEMO` is toggled from the demo panel, is **visibly labelled on screen while active**, and
the label appears in every screenshot. It never changes any rule other than these timers,
and it never changes what is written to Firestore.

## 7. PIN (F5, F24)

| Rule | Value |
|---|---|
| Length | exactly 4 digits |
| Rejected values | `0000`, `1234`, `1111`, and any 4 identical digits |
| Storage | Web Crypto `SHA-256` of (16-byte random salt + pin); salt and hash in IndexedDB, never uploaded |
| Wrong attempts before lockout | **5** |
| Lockout | **60 s**, doubling to a max of 15 min |
| What the PIN protects | **stopping a live SOS only** |
| What it does not protect | disarming Shadow, answering a check-in, cancelling family escalation |
| Forgot PIN during active SOS | no recovery path by design. SOS continues. Recovery would defeat the purpose. |

The last row matters: someone holding her phone must not be able to reset their way out.

## 8. Escalation payload to family (F19)

Composed on device. Never sent, per F21. Displayed exactly as it would be sent.

```
Saaya alert - {name} may need help.

{name} did not answer two safety check-ins.

Where: {zoneName} area, Visakhapatnam
When: {HH:mm}, {day}
Area risk: {riskLevel} - {womenSafetyCases} women-safety cases on record here
Last seen: near {areasCoveredFirstItem}

Nearest police station: {stationName}, {phone} ({distanceM} m away)

She has {cancelWindowSec} seconds to cancel this. If she does not, Saaya raises a full
SOS and her precise location is shared.

Sent by Saaya Lite. This is a prototype and this message was not actually delivered.
```

The last line is F21's disclosure and is **not removable**.

`{name}` is **her** name, from `user_name` in the settings store, not the contact's. If it
is unset, substitute `family_subject_fallback` rather than leaving a gap or omitting the
line: the recipient still needs to know the alert is about a person and not a test.

**Her name never leaves the device.** It appears only in this message, which is composed
and displayed and never sent. It is not in the SUS event, which is anonymous, and not in
the SOS incident, which carries a pseudonymous id. Do not add it to either.

## 9. Nearest station (F8)

Haversine from her current point to each of the 37 entries in `vizag_police_points.json`.
Return the closest. Display distance rounded: `<1000 m` as `"{n} m"`, otherwise
`"{n.n} km"`. Always show `coordPrecision` honestly when it is `locality-approx`, with the
string in `COPY.md`. Do not present an approximate coordinate as exact.

## 10. Hour-aware risk display (F9)

The zone's `risk_score` is static. Display risk is modulated for the current band only,
for **display and copy**. It never changes the arming matrix, which is authoritative.

| Band | Display multiplier |
|---|---|
| `DAY` | 0.6 |
| `NIGHT_EARLY` | 0.9 |
| `DAWN` | 1.0 |
| `NIGHT_LATE` | 1.15 |
| `NIGHT_DEEP` | **1.3** |

`displayRisk = clamp(risk_score * multiplier, 0.0, 1.0)`. Display band labels:
`< 0.25` Low, `< 0.50` Moderate, `< 0.75` Elevated, `>= 0.75` High.

## 11. Offline queue backoff (F22)

Attempts at **5 s, 15 s, 60 s, 5 min, 15 min**, then only on a connectivity-regained
broadcast. After **20** total attempts mark `FAILED_PERMANENT` and surface it in the UI,
because silently dropping an escalation is the worst failure this app can have.

`SOS_INCIDENT` always jumps the queue ahead of any `SUS_EVENT`.

## 12. Location sampling

| State | Interval | Priority |
|---|---|---|
| Idle, page visible | 30 s | `enableHighAccuracy: false` |
| Page hidden | nothing. The watch stops and no arming can occur; see `WEB_PLATFORM.md`. | n/a |
| Pending dwell, before arm | **15 s** | `enableHighAccuracy: true` |
| Shadow armed | 15 s | `enableHighAccuracy: true` |
| SOS active | 5 s | `enableHighAccuracy: true` |

### The prefilter rule: never a false negative

A prefilter exists to avoid running point-in-polygon against all 19 non-safe zones on every
fix. It may return extra candidates; it may **never** exclude a point the polygon would have
accepted. A prefilter that produces a false negative silently prevents arming, which is the
one failure this product cannot have.

**Use each polygon's bounding box.** It is computed once at load from the frozen asset, it is
two comparisons per axis, and it provably contains every point of its polygon.

**Do not use `geofence_radius_m`.** It is a legacy parameter from the Android Geofencing
API, which could only register circles; it was never an approximation of polygon extent.
Measured against the frozen asset, **126 of 165 polygon vertices lie outside their own
declared radius, across 23 of the 24 zones**, the worst being Bheemili at 21,535 m from its
centroid against a declared 2,000 m. Since a boundary point counts as inside, using these
radii would have refused to arm across most of Vizag. The field stays in the asset because
the asset is frozen and audited; nothing reads it.

Discard any fix with `accuracy > 100 m` for zone-containment decisions. Never discard for
SOS, where a poor fix beats no fix, but do send `accuracyM` so the console can show it.

A pending dwell is private to the dwell evaluator and leaves `SessionEngine` in `IDLE`.
The containment proof requires at least **five** qualifying in-polygon fixes spanning at
least the existing **60 s** enter dwell. A qualifying outside fix resets the proof;
accuracy worse than **100 m** is ignored. Any interruption of the position watch, which
includes the page being hidden, discards the proof completely and it restarts from zero:
`dwell.recovery.policy = RESET_ON_WATCH_INTERRUPTION`.

---

## 13. Constants and formats

### Haversine

```typescript
export const EARTH_RADIUS_M = 6_371_008.8;   // IUGG mean radius
```

Standard haversine on that radius. At Vizag's scale the error against a geodesic is under
a metre, which is well inside the `locality-approx` precision the station data already
declares. Do not add a geodesic library.

### Point in polygon

Ray casting (even-odd rule). A point exactly on an edge counts as **inside**, so a boundary
never leaves her unwatched. Test the vertical ray to avoid the horizontal-edge degenerate
case.

### Distance display

| Range | Format | Example |
|---|---|---|
| under 1000 m | whole metres | `298 m` |
| 1000 m and over | one decimal km | `2.4 km` |
| over 20 km | treat as no station in range | see `STATES_CATALOGUE.md` S4 |

### Time and date

| Use | Format | Example |
|---|---|---|
| Clock in UI | `HH:mm` 24-hour | `04:05` |
| Clock in the family message | `h:mm a` | `4:05 AM` |
| Day in the family message | `EEEE` | `Friday` |
| Date in a SUS record | `yyyy-MM-dd` | `2026-08-22` |
| Elapsed on SOS | `mm:ss`, then `H:mm:ss` past an hour | `03:42` |

Locale for formatting is **always `Locale.ENGLISH` for the record fields** (`dateLocal`)
so the stored value never varies by device locale. UI display uses the app locale.

Timezone is **`Asia/Kolkata`, hardcoded**. This product is Visakhapatnam-only. A device set
to another timezone must still band hours by Indian local time, otherwise a traveller's
phone would arm at the wrong hour.

### Numerals

Always **Western Arabic digits (0-9)**, in both languages, everywhere: countdowns, counts,
distances, times. Telugu numerals are correct Telugu but are unfamiliar to most readers
under a countdown, and a misread countdown is a safety failure. Set
`NumberFormat.getInstance(Locale.ENGLISH)` for every numeric render, and `tnum` for figures.

### Phone numbers

Stored and displayed E.164: `+91XXXXXXXXXX`. Validation is exactly 10 digits after `+91`,
first digit in 6 to 9. Station numbers from `vizag_police_points.json` are landlines
(`0891-XXXXXXX`) and are passed to `ACTION_DIAL` **verbatim**, never normalised.
