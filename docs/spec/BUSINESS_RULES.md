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
| Enter dwell before arming | **60 s** continuously inside an authoritative hotspot circle | Prevents arming when she drives past a localized hotspot. |
| Exit dwell before disarming | **180 s** continuously outside | Prevents disarming from one bad GPS fix on a narrow road. |
| Re-arm cooldown after a manual disarm in the same zone | **45 min** | If she disarmed here deliberately, do not immediately re-arm and nag her. |
| Re-arm cooldown after `RESOLVED_OK` in the same zone | **20 min** | She answered. Give her space. |
| Zone containment test | Haversine point-in-circle | A visible hotspot circle is authoritative: `distance(center, fix) <= radius`, with the boundary inside. The historical polygon is used only once at data load to classify a frozen anchor to its parent locality. |

## 4. Check-in cadence (F15, superseded 2026-09-06)

**Founder decision 2026-09-06:** the time from arming (or from the last `I'm OK`) until
check-in 1 appears is a flat **5 minutes** for every arm mode. The previous tier/band
interval table (5/8/10/12 min, MANUAL 10 min) is superseded; its facts carry
`superseded_by` in `graph/spec_graph.json`. The arming matrix in section 2 is unchanged.

`armedHourBand` is still captured and persisted for `AUTO_ZONE` sessions (it still governs
the arming matrix, the arm banner's frozen hour and the future civic record), but it no
longer governs a reschedule interval.

### The demo control freezes the hour, and freezes it everywhere

`demo.arm.hour` is **04:00 IST**. When a session is armed through the demo control in
`SCREENS.md` S12, that hour is the one the session believes it is: `NIGHT_DEEP`, inside
which a HIGH zone genuinely arms.

**One frozen hour, one source, used by everything that shows or derives an hour** for that
session: the arm banner's `%2$s`, `checkin1_reason`'s `%3$s`, and the hour band that
`FREEZE_AT_ARM` captures into `armedHourBand`. A future round-two SUS record would derive
from that same source; Lite writes no record. Browser QA found the banner reading "5 pm" while the session claimed `NIGHT_DEEP`, which is a state
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

## 5. The escalation ladder timings (superseded 2026-09-06)

**Founder decision 2026-09-06:** three check-ins, then SOS. The separate family-escalation
screen and its cancel window are gone; the first miss is the automatic family-alert trigger.

Normal profile:

| Step | Timer | Value | On expiry |
|---|---|---|---|
| cadence | arming / `I'm OK` -> check-in 1 | **5 min** | check-in 1 opens |
| 1 | Check-in 1 countdown, gentle | **2 min** | request the family alert, go to step 2 |
| 2 | Check-in 2 countdown, urgent | **1 min** | go to step 3 |
| 3 | Check-in 3 countdown, final | **60 s (provisional)** | go to SOS (`LADDER_LAPSE`) |
| SOS | no timer | runs until PIN | |

Total from check-in 1 appearing to SOS: **240 s (4 min)**. The 60 s final window is
provisional; the normal-mode final expiry remains pending until the founder specifies it.
`I'm OK` on any rung resets to the 5-minute cadence and cancels any still-pending family-alert
request. A provider-accepted message cannot be recalled.

Lite has no sound, haptic or system-notification performer. The historical sound and
vibration design is a round-two reference in `INTERACTION_SPEC.md`; it is not a current
user-visible claim.

## 6. Demo timing (D1, superseded 2026-09-06)

The demo uses the same shared ladder with an explicit demo profile instead of a divisor.
From Start Demo: check-in 1 opens **immediately** (0 s); each check-in window is **10 s**, so
the first miss fires the family alert at 10 s, check-in 3 opens at 20 s and SOS begins at
**30 s**. `I'm OK` in a demo run schedules the next check-in 1 after **10 s**. Every other
rule (PIN, SOS entry, recovery) is identical to normal mode.

`DEMO` is visibly labelled on screen while active and the label appears in every screenshot.
The old 6x divisor is superseded; the divisor mechanism survives only for dwell scaling and
is fixed at 1 in both profiles.

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

## 8. First-miss family alert (F19, superseded 2026-09-06)

**Founder decision 2026-09-06:** the first missed check-in triggers an **automatic** family
alert through a real messaging provider. A handoff link, local preview or simulated receipt
does not satisfy this. The old compose-and-handoff payload below is superseded; its copy
facts stay in the graph only as history.

The browser sends an **opaque operation handle** (a per-episode id) to a minimal server
route. The server alone owns the opted-in recipient (environment-configured allowlist), the
approved message template and the provider credentials (`WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, never `NEXT_PUBLIC_`). No arbitrary recipient or message body is
accepted. The route deduplicates per episode, bounds total sends, cancels still-pending
requests when `I'm OK` resolves the episode, and reports only truthful states: sending,
provider accepted, failed, unknown. Provider acceptance is **never** presented as delivered;
delivery is shown only from authenticated provider evidence or recorded as human-observed
test evidence. Messaging failure never stops or suppresses the ladder.

Approved demo alert text (opted-in test recipient): "Saaya Lite demo: a scheduled check-in
wasn't answered. This is a test alert; no emergency has been reported." A normal alert
calmly requests contact without diagnosing danger: "A scheduled Saaya Lite check-in wasn't
answered. Please try contacting them to check in." No name or location is inserted
automatically.

### Narrow privacy amendment (binding)

Automatic pre-SOS messaging exposes the destination number and message to the messaging
relay and provider. That supersedes the old absolute claim that all contacts and messages
stay on the phone. The exact boundary, which all copy must state:

- A selected opted-in recipient and the minimal approved alert message may be processed by
  the messaging relay/provider after the first miss.
- No full address book, raw contacts list, PIN, real cab GPS or unnecessary identity enters
  this path.
- The anonymous SUS civic record and police path remain separate and contain no family
  number, message or messaging operation identifier.
- The messaging request is not stored in public Firestore and is not sent to analytics.
- No claim of total anonymity from hosting/messaging providers, and no promise they retain
  no metadata.

Her favourites and PIN still never enter a Saaya backend and never ride in an engine command.

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

## 11. Remote delivery queue — cut in Lite (F22)

Lite has no writer, queue or retry behaviour. The local safety flow remains usable without
connectivity and does not claim a message or incident will be sent later. A queue belongs to
the future round-two state-view delivery path, not to this submission.

## 12. Location sampling

| State | Interval | Priority |
|---|---|---|
| Idle, page visible | 30 s | `enableHighAccuracy: false` |
| Page hidden | nothing. The watch stops and no arming can occur; see `WEB_PLATFORM.md`. | n/a |
| Pending dwell, before arm | **15 s** | `enableHighAccuracy: true` |
| Shadow armed | 15 s | `enableHighAccuracy: true` |
| SOS active | 5 s | `enableHighAccuracy: true` |

### Localized circle rule: no city-scale false positives

The authoritative live shape is one localized hotspot circle, not a police-jurisdiction
polygon and not the legacy `geofence_radius_m` field. The fixed radius comes from its parent
tier: HIGH **200 m**, MODERATE **150 m**, ELEVATED **100 m**. The Haversine test is
`distance(center, fix) <= radius`; a boundary point is inside.

The 104 frozen aggregate anchors are classified to their parent locality once at load using
the historical polygon. That classification is not live containment. It yields 70 visible
circles (10 HIGH, 41 MODERATE, 19 ELEVATED); anchors that are SAFE-only or unclassified are
excluded. A point inside the former broad polygon but outside every hotspot circle must not
start a dwell.

**Do not use `geofence_radius_m`.** It is a legacy Android field that does not describe a
localized hotspot. It stays parsed only because the historical asset is frozen and audited;
nothing reads it for rendering or containment.

Discard any fix with `accuracy > 100 m` for zone-containment decisions. SOS may still use a
current or last-known fix to choose a nearest **local dial action**, but Lite never sends a
payload or location to a console.

A pending dwell is private to the dwell evaluator and leaves `SessionEngine` in `IDLE`.
The containment proof requires at least **five** qualifying in-circle fixes spanning at
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

### Localized hotspot circle

Use the frozen IUGG-earth-radius Haversine implementation for live containment. A point on
the circle boundary counts as **inside**. The historical point-in-polygon implementation is
retained solely to associate an immutable aggregate source anchor with its parent locality at
load time; it must not return from that one-time source-classification path to the location
watch.

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
