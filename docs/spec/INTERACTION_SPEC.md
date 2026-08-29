# Saaya Lite - Interaction, Haptics and Sound

**Lite current behaviour:** check-ins are in-page only. It has no sound or haptic performer
and does not post system notifications. The detailed haptic and sound material below is a
round-two design reference, not a shipped claim.

## Round-two sound policy - not implemented in Lite

Founder decision: **escalating haptics, sound only from check-in 2.**

Reasoning to preserve: on a HIGH zone at 4 a.m. the check-in interval is 5 minutes. A chime
every 5 minutes trains her to mute the app, and a muted safety app is a deleted one.

Haptics use `navigator.vibrate(pattern)`. **It does not exist in iOS Safari**, so every
haptic below is a progressive enhancement and nothing may depend on it. Feature-detect once
and treat absence as normal, not as an error. Sound is the fallback that carries the
escalation, and the visible card is the fallback under that.

| Moment | `navigator.vibrate` | Sound |
|---|---|---|
| Auto-arm | `[40, 60, 40]` | **none** |
| Manual arm | `[20]` | none |
| Check-in 1 appears | `[30, 120, 30]` | **none** |
| Check-in 1, 10 s left | `[50]` | none |
| Check-in 2 appears | `[0, 400, 200, 400, 200, 600]` | **urgent tone** |
| Family escalation | `[0, 600, 300, 600]` | urgent tone, louder |
| SOS trigger | `[80, 60, 80, 60, 80]` | continuous alert until acknowledged on screen |
| I'm OK tapped | `[20]` | none |
| Cancel tapped | `[20]` | none |
| Wrong PIN | `[30, 80, 30]` | none |
| Button press, general | `[15]` | none |

### Two rules carried from the iOS app

1. **The intent carries over, the capability does not.** iOS Saaya routes the escalation
   chime through a `.playback` session so it sounds through the silent switch, because a
   check-in must be perceivable to be answerable. **A web page cannot do this.** An
   `<audio>` element respects the device silent switch and Do Not Disturb, and there is no
   API to override either. Do not claim otherwise in the UI, the write-up or the demo.
   What we do instead: unlock an `<audio>` element on her first gesture, keep check-in 1
   silent so sound only ever fires when something is genuinely wrong, and lean on the
   full-screen in-page overlay, which is the one channel that does not depend on the
   ringer. State the limit in the write-up beside the background-arming limit.
2. **Never disturb a live SOS with another sound.** Suppress all other audio and haptics
   while `SOS_ACTIVE`.

There is no system haptics setting to read on the web. Lite carries on silently: it has no
sound or haptic performer. A future round-two implementation must feature-detect before using
either capability.

## Gestures

| Screen | Gesture | Result |
|---|---|---|
| Map | pan, pinch, rotate disabled | pan and zoom only. Rotation is disorienting and adds nothing. |
| Map | tap a zone | opens the zone sheet; stroke 1.5 to 3 px and fill +0.1 over 150 ms |
| Map | tap empty space | dismisses the zone sheet |
| Map | long press | **nothing.** No hidden actions. |
| Map | double tap | zoom in one step |
| Bottom sheet | drag up or down | expand or collapse, follows the finger |
| Bottom sheet | swipe down past 40% | collapse to peek. **Never fully dismissible**, it holds the primary action. |
| Zone sheet | swipe down | dismiss |
| `LadderCard` | tap scrim | **nothing.** Deliberately not dismissible. |
| `LadderCard` | swipe | **nothing.** |
| Check-in 1 card | swipe away | **nothing.** The in-page card is deliberately not dismissible; its countdown continues. |
| Any list | pull to refresh | **not used anywhere.** Lite uses frozen local data. |

## Back button, per screen

| Screen | Back |
|---|---|
| Onboarding step 1 | exits the app |
| Onboarding steps 2 to 4 | previous step |
| Home | exits the app (single press, standard) |
| Zone sheet | dismisses the sheet |
| Settings and children | pops normally |
| State view | not present in Lite |
| `CHECKIN_1` | stays on Home; the in-page card remains visible and the countdown continues |
| **`CHECKIN_2`** | **consumed. Nothing happens.** |
| **`FAMILY_ESCALATED`** | **consumed.** |
| **`SOS_ACTIVE`** | **consumed. Only the PIN exits.** |
| PIN entry | returns to SOS screen, never out of SOS |

"Back" is the browser back gesture. Trap the consumed cases by pushing a history entry
when the state is entered and calling `history.pushState` again inside `popstate`, so back
becomes a no-op without leaving the page. Never call `preventDefault` on navigation; it
does not work and the attempt will mislead the next reader.

**What we cannot do, and must not claim:** a web page cannot show over the lock screen,
cannot turn the screen on, and cannot make a notification undismissable. If she leaves the
tab during `SOS_ACTIVE`, the app **re-presents SOS on the next `visibilitychange`** and the
SOS state survives in IndexedDB. That is the honest ceiling; put it in the write-up.

## Touch targets

Minimum 48 x 48 px everywhere. Where a visual element is smaller (the 34 px TextOnly
button, the 24 px chip), expand the touch target with padding rather than growing the
visual. Adjacent targets keep 8 px of separation.

The `I'm OK` and `Stop SOS` buttons are the two most important targets in the product.
Both are 72 px tall and full width, positioned in the bottom third.

## Input

| Field | Keyboard | Rules |
|---|---|---|
| Favourite name | `type="text"`, `autocapitalize="words"` | non-empty, max 40 chars |
| Favourite phone | `type="tel"`, `inputmode="numeric"` | `+91` fixed prefix, exactly 10 digits, digits only, auto-advance |
| PIN | `type="password"`, `inputmode="numeric"` | 4 digits, auto-advance, `onPaste` prevented. **There is no `FLAG_SECURE` on the web:** screenshots and screen recording cannot be blocked. Accepted, and disclosed. |

Validate on blur, never per keystroke. Errors appear below the field in `caption` `danger`,
never as a toast, never as a dialog.

## System integration

| Case | Behaviour |
|---|---|
| Incoming call during check-in | check-in continues underneath, countdown unaffected, re-presents when the call ends |
| Incoming call during SOS | SOS remains active; the in-page overlay re-presents when the page returns to the foreground |
| Tab hidden during ladder | the absolute deadline in IndexedDB owns the timing. Timers do not run reliably while hidden, so the ladder is reconciled on `visibilitychange` and on load, never resumed. |
| Screen off during check-in 2 | a browser cannot turn the screen on or guarantee an alert. The ladder reconciles against its absolute deadline when the page becomes visible. Disclosed as a platform limit. |
| Battery saver enabled | browsers expose no reliable battery-saver signal. Lite makes no detection or warning claim. |
| Airplane mode | ladder unaffected; no report is queued or claimed because this round-one build has no writer |
