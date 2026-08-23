# Saaya Lite - Android Platform
The evening most likely to consume the whole build is E4. This file exists so it does not.

## Manifest permissions

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.READ_CONTACTS"/>
```

**Deliberately absent:** `RECORD_AUDIO`, `CAMERA`, `SEND_SMS`, `CALL_PHONE`, `READ_SMS`.
Their absence is a feature. A reviewer can read the manifest and verify that Saaya Lite
cannot listen, cannot watch, and cannot send anything on her behalf. Say this in the
write-up. **Never add them, including "just for testing".**

We use `ACTION_DIAL` and not `CALL_PHONE`, so she always confirms a call herself.

## Permission request order

Requesting background location too early is why safety apps die at install.

1. `POST_NOTIFICATIONS` (API 33+), during onboarding step 3, before location.
2. Rationale screen, then `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`.
3. **Only after foreground is granted**, a second rationale, then
   `ACCESS_BACKGROUND_LOCATION` as a separate request. Android requires this separation
   from API 30, and bundling them silently fails.
4. If background is denied, continue. Degrade to foreground-only arming and say so
   (`onb_location_partial`). Never dead-end.

On permanent denial, deep link:
`Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", pkg, null))`

## Foreground service

```xml
<service android:name=".service.SaayaForegroundService"
    android:foregroundServiceType="location"
    android:exported="false" />
```

- Start with `startForegroundService`, then call `startForeground` **within 5 seconds** or
  the process is killed with `ForegroundServiceDidNotStartInTimeException`.
- API 34 requires `FOREGROUND_SERVICE_LOCATION` and the `location` type.
- `START_STICKY`, plus the recovery table in `STATE_MACHINE.md`.
- Notification uses channel `saaya_shadow`, `setOngoing(true)`, `setSilent(true)`.
- The service is started when a session arms, and stopped when it resolves. It does not
  run while `IDLE`. Running permanently would be both a battery problem and a bad answer
  to "is this surveillance".

## Geofencing, and why the polygon is authoritative

`GeofencingClient` takes circles, and our zones are polygons. Both are used:

1. Register a `Geofence` per zone using `centroid` and the pre-computed
   `geofence_radius_m` (2000-5000 m). This is the cheap, battery-friendly wake-up.
2. On `GEOFENCE_TRANSITION_ENTER`, start high-accuracy sampling and run the **real
   point-in-polygon test** before arming.
3. Apply the 60 s enter dwell from `BUSINESS_RULES.md` §3 before transitioning to `SHADOW`.

**Android caps geofences at 100 per app.** We have 24 and only 19 that can ever arm, so
register the 19 non-`SAFE` zones and stay well clear of the limit.

Use `setInitialTriggerBehavior(INITIAL_TRIGGER_ENTER)` so a session arms if she is already
standing inside a zone when the app starts. Missing that case would be a visible bug in
the demo.

### Pre-arm `CANDIDATE` service mode

`CANDIDATE` is a private execution mode inside `SaayaForegroundService`, not a
`SessionState`. The engine and every user-facing screen remain `IDLE` until the polygon
dwell succeeds and the engine accepts `ZoneEntered(zoneId)`.

1. A circular `GEOFENCE_TRANSITION_ENTER` starts the service in `CANDIDATE` mode. A
   background trigger requires `ACCESS_BACKGROUND_LOCATION`; when that permission is
   denied, retain the existing foreground-only arming fallback.
2. Call `startForeground` within 5 seconds and request `HIGH_ACCURACY` location every
   15 seconds. Overlapping candidate geofences share one service, one location stream and
   one notification.
3. A qualifying fix has accuracy <= 100 m. The first qualifying fix inside the
   authoritative polygon begins a monotonic 60-second proof. Require at least five
   qualifying in-polygon fixes spanning at least 60 seconds before emitting exactly one
   `ZoneEntered(zoneId)` to `SessionEngine`.
4. Any qualifying fix outside a candidate's polygon resets that candidate's dwell
   evidence, but sampling continues while its circular geofence remains active. A fix with
   accuracy > 100 m is ignored: it neither proves containment nor completes the dwell.
5. If the engine arms, update the same running service and notification from `CANDIDATE`
   to `SHADOW` without restarting it. `armedHourBand` is captured only on that accepted
   engine transition. If the matrix says n/a or a cooldown applies, keep the engine and UI
   `IDLE`, remove the completed candidate, and stop candidate mode when no other candidate
   geofence remains.
6. On circular `GEOFENCE_TRANSITION_EXIT`, remove that candidate. Stop the service when no
   candidates remain and no real session is active.
7. Candidate mode creates no Saaya session, SUS event, SOS incident, timeline event,
   cooldown or family notification. It performs no local or remote product write. Private
   operational candidate IDs may be retained only so service recovery knows what to
   re-check.
8. If the process dies during candidate dwell, discard all dwell evidence. A recovered
   candidate restarts the full proof from its first new qualifying fix; never infer
   continuous containment across process death.

Candidate notification, on the existing `saaya_shadow` channel:

- `LOW`, silent and ongoing; reuse `NotifId.SHADOW_ONGOING` so successful arming updates it
  in place.
- Tap opens Home/map. It has no check-in, disarm or help actions.
- Title: `notif_candidate_title`. Text: `notif_candidate_text` from `COPY.md`.
- It must never say or imply that Saaya is watching or armed.

Catch both `SecurityException` and `ForegroundServiceStartNotAllowedException` around a
background candidate start. On failure, never emit `ZoneEntered`, never claim to be
watching, and record the operational failure for the existing honest warning on the next
foreground launch.

## Timers

`AlarmManager.setExactAndAllowWhileIdle(RTC_WAKEUP, ...)` with a `PendingIntent` per timer
id. **Never `delay()` in a coroutine for ladder timing.** Doze will suspend it and the
ladder will silently stall, which is the single worst bug this app could ship.

API 31+ needs `SCHEDULE_EXACT_ALARM`. Check `AlarmManager.canScheduleExactAlarms()`, and
if false, send the user to `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` with an honest
explanation. Fall back to `setAndAllowWhileIdle` (inexact) rather than failing, and note
the degradation in the UI.

Persist every timer deadline as an absolute epoch value so the recovery table can
recompute it after process death.

## Battery optimisation

This is where a real device silently kills the ladder, and it varies by OEM.

- Detect with `PowerManager.isIgnoringBatteryOptimizations(packageName)`. If already
  exempt, show nothing and continue.
- If not exempt, show the existing one-time Saaya explanation using `warn_battery_title`,
  `warn_battery_body` and `cta_battery_allow`. Record that the explanation was shown so the
  system dialog is never reopened automatically.
- Only when Meera deliberately taps Allow, launch
  `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` with
  `Uri.parse("package:$packageName")`. The manifest permission
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is required for this action. Direct exemption is
  justified here because uninterrupted background execution is core safety functionality;
  the Android dialog remains user-controlled and Saaya never implies approval is automatic.
- Declining or dismissing is a supported degraded condition, not an onboarding failure. It
  blocks neither onboarding, manual arming, map use nor the safety ladder. Keep the existing
  non-blocking battery warning visible while the app remains non-exempt, and let Meera retry
  only through a deliberate action.
- If the direct action has no handler or throws, fall back to
  `Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`. This choice writes no analytics or
  personal data.
- **Xiaomi, Oppo, Vivo, Realme and OnePlus** additionally need Autostart enabled in their
  own settings, which no standard API can request. Detect the manufacturer and show a
  short, specific instruction. This affects a large share of Indian devices and ignoring
  it means the app appears broken to exactly our target user.
- Record a heartbeat timestamp each time the service runs. On next launch, if a session
  was armed and the heartbeat is stale, show the honest "Saaya was stopped by the system"
  notice from `STATE_MACHINE.md`.

## Boot

`RECEIVE_BOOT_COMPLETED` re-registers geofences after reboot. Geofence registrations do
not survive a reboot and Android will not tell you.

## Notifications

| Channel | Importance | Behaviour |
|---|---|---|
| `saaya_shadow` | LOW | silent, ongoing, the FGS notification |
| `saaya_checkin` | HIGH | sound, heads-up, auto-cancel false |
| `saaya_urgent` | HIGH | alarm stream, long vibration, `setBypassDnd(true)`, full-screen intent |
| `saaya_sos` | HIGH | ongoing, `setOngoing(true)`, not dismissible |

Check-in 2 uses `setFullScreenIntent` plus `setShowWhenLocked(true)` and
`setTurnScreenOn(true)` on the Activity, so it appears over the lock screen. API 34
requires the `USE_FULL_SCREEN_INTENT` permission for this; declare it and handle refusal
by falling back to a high-importance heads-up notification.

## Testing on a real device

`adb shell am broadcast` cannot fake geofences reliably. Use:
- Mock location via a developer-options mock provider app, or
- The D1 demo panel, which is the supported path and the one used in the video.

Test matrix for E9: one flagship, one 2 GB mid-range, one with battery saver on, and one
Xiaomi or Realme if available, since that is the most common Indian failure mode.

---

## Notification IDs and PendingIntent request codes

**Collisions here cause silent, maddening bugs.** Two `PendingIntent`s created with the
same request code and an equal `Intent` are the *same* object, so scheduling the cancel
timer would overwrite the check-in timer and the ladder would stall with no error. Pin
them all in one file, `service/Ids.kt`, and never derive one at a call site.

```kotlin
object NotifId {
    const val SHADOW_ONGOING = 1001   // FGS notification, saaya_shadow
    const val CHECKIN_1      = 1002   // saaya_checkin
    const val CHECKIN_2      = 1003   // saaya_urgent, full-screen intent
    const val FAMILY         = 1004   // saaya_urgent
    const val SOS_ONGOING    = 1005   // saaya_sos, not dismissible
    const val QUEUE_FAILED   = 1006   // saaya_shadow, W-permanent queue failure
    const val SERVICE_KILLED = 1007   // saaya_shadow, honest "system stopped Saaya"
}

object ReqCode {
    const val TIMER_CHECKIN   = 2001  // AlarmManager, next check-in due
    const val TIMER_CD1       = 2002  // check-in 1 countdown expiry
    const val TIMER_CD2       = 2003  // check-in 2 countdown expiry
    const val TIMER_CANCEL    = 2004  // family cancel window expiry
    const val GEOFENCE        = 2005  // GeofencingClient pending intent
    const val BOOT            = 2006  // BOOT_COMPLETED
    const val ACTION_IM_OK    = 2101  // notification action
    const val ACTION_HELP_NOW = 2102  // notification action
    const val ACTION_CANCEL   = 2103  // notification action
    const val OPEN_APP        = 2201  // content intent
}
```

Rules:
- Every `PendingIntent` uses `FLAG_IMMUTABLE or FLAG_UPDATE_CURRENT`.
- **One geofence PendingIntent for all 19 zones.** Read the triggering zone from the
  `GeofencingEvent`, do not create nineteen intents.
- Cancel a timer by rebuilding the identical `PendingIntent` and calling
  `AlarmManager.cancel`, never by tracking the object.
- Notification actions route to a `BroadcastReceiver`, never to an Activity, so answering
  a check-in from the shade does not launch the app.

## Notification action buttons

Carried from the iOS app, where the notification actions and the in-app card route through
the identical code path. Do the same here: **one handler, two entry points.**

| Notification | Actions |
|---|---|
| `CHECKIN_1` | `I'm OK`, `I need help now` |
| `CHECKIN_2` | `I'm OK`, `I need help now` |
| `FAMILY` | `Cancel, I am fine`, `I need help now` |
| `SOS_ONGOING` | none. Stopping requires the PIN, which requires the app. |
| `SHADOW_ONGOING` | `I am home` |
