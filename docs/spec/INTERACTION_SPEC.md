# Saaya Lite - Interaction, Haptics and Sound

## Sound policy

Founder decision: **escalating haptics, sound only from check-in 2.**

Reasoning to preserve: on a HIGH zone at 4 a.m. the check-in interval is 5 minutes. A chime
every 5 minutes trains her to mute the app, and a muted safety app is a deleted one.

| Moment | Haptic | Sound | Channel |
|---|---|---|---|
| Auto-arm | soft double tap | **none** | `saaya_shadow` |
| Manual arm | light tick | none | n/a |
| Check-in 1 appears | `EFFECT_TICK` x2, 120 ms apart | **none** | `saaya_checkin` |
| Check-in 1, 10 s left | single medium tick | none | n/a |
| Check-in 2 appears | long pattern `0,400,200,400,200,600` | **alarm-stream tone** | `saaya_urgent` |
| Family escalation | double long `0,600,300,600` | alarm-stream tone, louder | `saaya_urgent` |
| SOS trigger | `EFFECT_HEAVY_CLICK` x3 | continuous alert until acknowledged on screen | `saaya_sos` |
| I'm OK tapped | light confirm tick | none | n/a |
| Cancel tapped | light confirm tick | none | n/a |
| Wrong PIN | double sharp tick | none | n/a |
| Button press, general | `EFFECT_TICK` | none | n/a |

### Two rules carried from the iOS app

1. **Escalation sound ignores the silent switch.** iOS routes the chime through a
   `.playback` session deliberately, with the reasoning that a check-in must be perceivable
   to be answerable. On Android: use `STREAM_ALARM` for check-in 2, family and SOS, which
   plays through silent and Do Not Disturb. **Check-in 1 stays silent**, so this only ever
   fires when something is genuinely wrong.
2. **Never disturb a live SOS with another sound.** Suppress all other audio and haptics
   while `SOS_ACTIVE`.

Respect `Settings.System.HAPTIC_FEEDBACK_ENABLED`. If haptics are off system-wide, do not
force them, but **do** still play the escalation sounds, because those are safety-critical
and the user did not switch off sound by switching off haptics.

## Gestures

| Screen | Gesture | Result |
|---|---|---|
| Map | pan, pinch, rotate disabled | pan and zoom only. Rotation is disorienting and adds nothing. |
| Map | tap a zone | opens zone sheet, stroke thickens 150 ms |
| Map | tap empty space | dismisses zone sheet |
| Map | long press | **nothing.** No hidden actions. |
| Map | double tap | zoom in one step |
| Bottom sheet | drag up or down | expand or collapse, follows the finger |
| Bottom sheet | swipe down past 40% | collapse to peek. **Never fully dismissible**, it holds the primary action. |
| Zone sheet | swipe down | dismiss |
| `LadderCard` | tap scrim | **nothing.** Deliberately not dismissible. |
| `LadderCard` | swipe | **nothing.** |
| Check-in 1 notification | swipe away | dismisses the notification, **not the countdown**. `checkin_persist_note` says so on the card. |
| Any list | pull to refresh | **not used anywhere.** Data is local or live. |

## Back button, per screen

| Screen | Back |
|---|---|
| Onboarding step 1 | exits the app |
| Onboarding steps 2 to 4 | previous step |
| Home | exits the app (single press, standard) |
| Zone sheet | dismisses the sheet |
| Settings and children | pops normally |
| Police view | pops to Home |
| `CHECKIN_1` | dismisses the card, countdown continues, returns to Home |
| **`CHECKIN_2`** | **consumed. Nothing happens.** |
| **`FAMILY_ESCALATED`** | **consumed.** |
| **`SOS_ACTIVE`** | **consumed. Only the PIN exits.** |
| PIN entry | returns to SOS screen, never out of SOS |

Use `BackHandler(enabled = true) { }` for the consumed cases. Also block `HOME` escape
where possible by using `setShowWhenLocked` and re-presenting on resume: if she leaves
`SOS_ACTIVE` via the home button, the app **re-presents it on next resume**, and the
ongoing notification is not dismissible.

## Touch targets

Minimum 48 x 48 dp everywhere. Where a visual element is smaller (the 34 dp TextOnly
button, the 24 dp chip), expand the touch target with padding rather than growing the
visual. Adjacent targets keep 8 dp of separation.

The `I'm OK` and `Stop SOS` buttons are the two most important targets in the product.
Both are 72 dp tall and full width, positioned in the bottom third.

## Input

| Field | Keyboard | Rules |
|---|---|---|
| Favourite name | text, `capWords` | non-empty, max 40 chars |
| Favourite phone | phone | `+91` fixed prefix, exactly 10 digits, digits only, auto-advance |
| PIN | numberPassword | 4 digits, auto-advance, no paste, `FLAG_SECURE` |

Validate on blur, never per keystroke. Errors appear below the field in `caption` `danger`,
never as a toast, never as a dialog.

## System integration

| Case | Behaviour |
|---|---|
| Incoming call during check-in | check-in continues underneath, countdown unaffected, re-presents when the call ends |
| Incoming call during SOS | SOS continues, notification stays |
| App backgrounded during ladder | everything continues; the service and AlarmManager own the timing |
| Screen off during check-in 2 | full-screen intent turns the screen on |
| Battery saver enabled | detect and warn per `ANDROID_PLATFORM.md`. Never fail silently. |
| Airplane mode | ladder unaffected, writes queue, UI states it is queued |
