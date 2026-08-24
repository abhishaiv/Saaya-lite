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
| Zone containment test | point-in-polygon on the real polygon | `geofence_radius_m` is used **only** as a cheap circular pre-filter before the polygon test, so we do not run point-in-polygon against all 19 zones on every fix. The authoritative test is the polygon. |

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

Check-in 2 differs from check-in 1: full-screen, sound at alarm stream volume, long
vibration pattern, and it bypasses Do Not Disturb via a high-importance notification
channel. Check-in 1 is gentle: heads-up notification plus a short vibration.

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
| Idle, app foreground | 30 s | `BALANCED` |
| Idle, app background | geofence callbacks only | n/a |
| Candidate, after circular enter and before arm | **15 s** | `HIGH_ACCURACY` |
| Shadow armed | 15 s | `HIGH_ACCURACY` |
| SOS active | 5 s | `HIGH_ACCURACY` |

Discard any fix with `accuracy > 100 m` for zone-containment decisions. Never discard for
SOS, where a poor fix beats no fix, but do send `accuracyM` so the console can show it.

`CANDIDATE` is service-private and leaves `SessionEngine` in `IDLE`. The containment proof
requires at least **five** qualifying in-polygon fixes spanning at least the existing
**60 s** enter dwell on a monotonic clock. A qualifying outside fix resets the proof;
accuracy worse than **100 m** is ignored. Process death resets the proof completely.

---

## 13. Constants and formats

### Haversine

```typescript
const val EARTH_RADIUS_M = 6_371_008.8   // IUGG mean radius
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
