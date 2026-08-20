# Saaya Lite - Data Model

## Principle

**Anything that could identify her stays on the device.** Contacts, PIN, session history
and precise location live in Room and are never uploaded. Firestore receives exactly two
things: an anonymised SUS event, and a full SOS incident.

---

## Bundled assets (read-only, copied from the Saaya repo)

`app/src/main/assets/`

| File | Parse into |
|---|---|
| `vizag_heatmap.geojson` | `List<Zone>` |
| `zone_info_cards.json` | `Map<String, ZoneCard>` keyed by `station_id` |
| `vizag_police_points.json` | `List<PoliceStation>` |

### `Zone` (domain model)

```kotlin
data class Zone(
  val stationId: String,          // "dwaraka_police_station" - the primary key everywhere
  val stationName: String,        // "Dwaraka Police Station"
  val district: String,           // "Visakhapatnam"
  val polygon: List<LatLng>,      // geometry.coordinates[0], NOTE: GeoJSON is [lon, lat]
  val centroid: LatLng,           // properties.latitude / longitude
  val riskScore: Double,          // 0.0722 .. 1.0
  val riskTier: RiskTier,         // HIGH | ELEVATED | MODERATE | SAFE
  val colorHex: String,           // "#FF3B30" | "#FF9500" | "#FFCC00" | "#00000000"
  val opacity: Double,            // 0.35 etc
  val totalCases: Int,            // 478
  val womenSafetyCases: Int,      // 84
  val crimeBreakdown: Map<String, Int>,
  val geofenceRadiusM: Int,       // 2000 .. 5000, ALREADY COMPUTED, do not derive
  val areasCovered: String,
  val touristSpots: String?,
  val riskNotes: String?
)

enum class RiskTier { HIGH, ELEVATED, MODERATE, SAFE }
```

**GeoJSON gotcha:** coordinates are `[longitude, latitude]`. Getting this backwards puts
Vizag in the Indian Ocean. Assert every parsed coordinate — **centroids and polygon
vertices alike** — falls inside the Visakhapatnam district envelope:

```
lat in 17.4 .. 18.1     lon in 82.9 .. 83.7
```

**Why an envelope and not the measured extremes.** The check exists to catch a `[lon, lat]`
swap, and a swap is wrong by about 65 degrees, so the bound does not need to be tight. It
needs to be *meaningful*: "is this plausibly Visakhapatnam district" is a bound that survives
a data correction, where a box measured off the current asset does not.

Corrected 2026-08-19 at `T2.1`. The original `17.6..17.9 / 83.1..83.5` was written from
approximation and was **wrong against the frozen asset**: Sabbavaram's centroid is 83.0975,
and 34 of the 165 polygon vertices fall outside it entirely (vertices span
17.5700..17.9500, 83.0400..83.5400). Facts: `zone.coordinate.lat.min` and siblings.

**Tier counts, use as a parse assertion:** HIGH 6, MODERATE 9, ELEVATED 4, SAFE 5, total 24.

**Rendering:** SAFE zones have `color: "#00000000"` and **must not be drawn**. They also
have no entry in `zone_info_cards.json`, which is why that file has 19 entries and not 24.

### `ZoneCard`

```kotlin
data class ZoneCard(
  val stationId: String, val areaName: String, val fullAreas: String,
  val riskLevel: String,      // "High Risk" - display string, use as-is
  val riskTier: String, val incidentCount: Int, val womenSafetyCount: Int,
  val topCrimes: String,      // "Theft & Burglary: 125, Other IPC: 82, ..." pre-formatted
  val riskNotes: String, val touristSpots: String
)
```

### `PoliceStation`

```kotlin
data class PoliceStation(
  val id: String,             // "PS-001"
  val name: String, val category: String, val locality: String,
  val areaCovered: String, val latitude: Double, val longitude: Double,
  val coordPrecision: String, // "locality-approx" - surface this honestly in the UI
  val phone: String,          // "0891-2563632"
  val address: String
)
```

---

## Room (on device, never uploaded)

Database `saaya_lite.db`, version 1.

### `contact`
| Column | Type | Note |
|---|---|---|
| `id` | Int PK autoincrement | |
| `name` | String | |
| `phone` | String | E.164 normalised, `+91` default |
| `isPrimary` | Boolean | exactly one true |
| `createdAt` | Long | epoch millis |

### `session`
| Column | Type | Note |
|---|---|---|
| `id` | String PK | UUID, **device-local only, never uploaded** |
| `zoneId` | String? | null when manually armed outside a zone |
| `armedAt` | Long | |
| `armMode` | String | `AUTO_ZONE` \| `MANUAL` |
| `state` | String | see STATE_MACHINE.md |
| `endedAt` | Long? | |
| `outcome` | String? | `RESOLVED_OK` \| `CANCELLED` \| `ESCALATED_SOS` \| `DISARMED` |

### `session_event` (the local timeline, feeds the SOS payload)
| Column | Type | Note |
|---|---|---|
| `id` | Int PK autoincrement | |
| `sessionId` | String FK | |
| `at` | Long | |
| `type` | String | `ARMED`,`CHECKIN_1_SHOWN`,`CHECKIN_1_MISSED`,`CHECKIN_2_SHOWN`,`CHECKIN_2_MISSED`,`OK_TAPPED`,`FAMILY_NOTIFIED`,`CANCELLED`,`SOS_TRIGGERED`,`SOS_STOPPED`,`ZONE_EXIT`,`DISARMED` |
| `detail` | String? | JSON blob |

### `queued_event` (the offline queue, F22)
| Column | Type | Note |
|---|---|---|
| `id` | Int PK autoincrement | |
| `kind` | String | `SUS_EVENT` \| `SOS_INCIDENT` \| `SOS_UPDATE` |
| `payloadJson` | String | exactly what will be written to Firestore |
| `status` | String | `PENDING` \| `SENT` \| `FAILED_PERMANENT` |
| `attempts` | Int | |
| `createdAt` / `lastAttemptAt` | Long | |
| `remoteId` | String? | Firestore doc id once sent |

### Encrypted preferences (`androidx.security`, file `saaya_secure`)
| Key | Value |
|---|---|
| `pin_hash` | SHA-256 of (salt + pin) |
| `pin_salt` | 16 random bytes, base64 |
| `language` | `en` \| `te` |
| `onboarded` | Boolean |

**Never store the PIN in plaintext, never log it, never put it in a crash trace.**

---

## Firestore (the state view)

Project: a **NEW** Firebase project. Never Saaya production.
Auth: **anonymous only**. The UID is the pseudonymous identifier used in SOS incidents.

### `zones/{stationId}` - seeded once, read by the console
Mirror of the bundled zone properties so the console can draw the same map. No user data.

### `sus_events/{autoId}` - the anonymised civic signal (F27)

**Written when family escalation fires (ladder step 3), never at arming and never at
check-in.** A SUS event means: *a woman in this zone at this hour did not answer a safety
check.* That is the "felt unsafe, never reported" signal.

```json
{
  "zoneId": "dwaraka_police_station",
  "riskTier": "high",
  "hourBand": "NIGHT_DEEP",
  "hourLocal": 4,
  "dateLocal": "2026-08-22",
  "createdAt": "<serverTimestamp>",
  "outcome": "PENDING",
  "armMode": "AUTO_ZONE",
  "source": "APP",
  "appVersion": "1.0.0"
}
```

`source` is `"APP"` or `"CONSOLE_DEMO"`. The console's live journey trigger writes the
latter, and the console renders those rows with a DEMO chip. It identifies the writer, not
the person, so it does not weaken the anonymisation.

**Forbidden fields, and this is a correctness requirement not a preference:**
`latitude`, `longitude`, any coordinate, `sessionId`, `uid`, any device id, any
contact data, any free text she typed, any timestamp finer than the hour.

`outcome` is patched later to `CANCELLED_BY_USER`, `ESCALATED_TO_SOS` or `RESOLVED_LATE`.
Patching uses `remoteId` from the queue. The console defaults to **excluding**
`CANCELLED_BY_USER`, and shows the false-positive rate separately, because being honest
about it is stronger than hiding it.

**Why no session id:** with one, two events in the same zone can be linked as one
journey, and a route can be reassembled. Without it, they cannot. This is the difference
between anonymised and merely unnamed.

### `sos_incidents/{autoId}` - the acute channel

Written **only** at SOS. This is the one place precision and identity cross.

```json
{
  "uid": "<firebase anonymous uid>",
  "triggeredAt": "<serverTimestamp>",
  "trigger": "LADDER_LAPSE",
  "location": { "lat": 17.7242, "lon": 83.3024, "accuracyM": 12.4 },
  "zoneId": "dwaraka_police_station",
  "zoneName": "Dwaraka Police Station",
  "riskTier": "high",
  "hourLocal": 4,
  "nearestStation": { "id": "PS-004", "name": "...", "phone": "...", "distanceM": 298 },
  "timeline": [
    { "at": "04:05:12", "type": "ARMED", "detail": "auto, zone entry" },
    { "at": "04:10:12", "type": "CHECKIN_1_SHOWN" },
    { "at": "04:11:42", "type": "CHECKIN_1_MISSED" },
    { "at": "04:12:42", "type": "CHECKIN_2_MISSED" },
    { "at": "04:13:42", "type": "FAMILY_NOTIFIED" },
    { "at": "04:14:42", "type": "SOS_TRIGGERED" }
  ],
  "contactsNotified": 1,
  "status": "ACTIVE",
  "stoppedAt": null,
  "appVersion": "1.0.0"
}
```

`trigger` is `LADDER_LAPSE` or `MANUAL_HELP_BUTTON`.
`status` is `ACTIVE` then `STOPPED`.
**`contactsNotified` is a count. Never upload contact names or numbers.**

The `timeline` is what makes this an incident rather than a press, and it is the direct
answer to Shakthi's 0.28%. Do not trim it.

### Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /zones/{id} {
      allow read: if true;                  // public, static, non-personal
      allow write: if false;                // seeded by script only
    }
    match /sus_events/{id} {
      allow read: if true;                  // console. synthetic data only.
      allow create: if request.auth != null
        && !request.resource.data.keys().hasAny(['latitude','longitude','sessionId','uid']);
      allow update: if request.auth != null
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['outcome']);
      allow delete: if false;
    }
    match /sos_incidents/{id} {
      allow read: if true;                  // console. synthetic data only.
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && resource.data.uid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','stoppedAt']);
      allow delete: if false;
    }
  }
}
```

The `hasAny` guard on `sus_events` enforces the anonymisation rule **at the database**,
not only in app code. That is deliberate: a reviewer can read the rule and verify the
claim without trusting the client.

**Public read is a hackathon decision, and we disclose it.** Every record is synthetic and
carries no real identity. In production this becomes role-based access with an audit
trail, which is stated in `PROBLEM.md` under the scale question. Say this in the write-up
rather than letting a reviewer discover it.


---

## Room migration policy

Database version **1**. There is no version 2 in a nine-evening build.

```kotlin
Room.databaseBuilder(ctx, SaayaDb::class.java, "saaya_lite.db")
    .fallbackToDestructiveMigration()
    .build()
```

`fallbackToDestructiveMigration` is correct **here and only here**: no user has data worth
preserving across a prototype schema change, and a migration crash in front of a judge is
far worse than a wiped local database. **If this were the real Saaya, it would be wrong.**
Say so in the write-up rather than letting a reviewer assume we did not know.

If the schema changes mid-build, bump the version and let it wipe. Do not hand-write a
migration.

## Firestore composite indexes

Create these on **E8, not E9**. A missing index throws at runtime with a console link, and
finding that out an hour before submission is avoidable.

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "sus_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "outcome", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sus_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "zoneId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sos_incidents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "triggeredAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy with `firebase deploy --only firestore:indexes`. Verify each one resolves by running
the console's three filters before leaving E8.

## `session_event.detail` shapes

The column is nullable JSON. These are the only shapes it ever holds.

| `type` | `detail` |
|---|---|
| `ARMED` | `{"mode":"AUTO_ZONE","zoneId":"dwaraka_police_station","tier":"high","band":"NIGHT_DEEP"}` |
| `ARMED` (manual) | `{"mode":"MANUAL","zoneId":null}` |
| `CHECKIN_1_SHOWN` | `{"intervalMin":5,"deadlineEpochMs":1755835812000}` |
| `CHECKIN_1_MISSED` | `null` |
| `CHECKIN_2_SHOWN` | `{"deadlineEpochMs":1755835872000}` |
| `CHECKIN_2_MISSED` | `null` |
| `OK_TAPPED` | `{"step":1}` or `{"step":2}` |
| `FAMILY_NOTIFIED` | `{"contactCount":1,"queued":true}` |
| `CANCELLED` | `{"secondsRemaining":18}` |
| `SOS_TRIGGERED` | `{"trigger":"LADDER_LAPSE"}` or `{"trigger":"MANUAL_HELP_BUTTON"}` |
| `SOS_STOPPED` | `{"pinAttempts":1}` |
| `ZONE_EXIT` | `{"zoneId":"dwaraka_police_station"}` |
| `DISARMED` | `{"reason":"USER"}` or `{"reason":"PERMISSION_REVOKED"}` |

**`detail` never contains a coordinate, a name or a phone number**, because the SOS
timeline is built from these rows and uploaded.
