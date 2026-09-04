# Saaya Lite - State View Console
**DEMOTED 2026-08-19.** The brief now says *"reviewers will test the citizen experience,
not an admin panel."* This is no longer the submission's live link. The citizen app is.

The console remains, and it still matters: it is the End-to-end-thinking evidence, shown in
the video's second minute, and it is what makes "the state finally receives a signal it never
had" demonstrable rather than asserted. But it is a supporting route, not the front door. It must load in a logged-out
private window, on a phone, with no install and no access request.

A route in the same Next.js app on Vercel, reading Firestore directly with the web SDK in
read-only mode. Keep it plain: no extra dependency, no chart library, no framework beyond
what the app already carries. It has to work on
submission day and it has to be trivially reviewable.

## Route

`/` is the console. There is no login and no other route.

## Layout

```
┌─────────────────────────────────────────────────────┐
│ SAAYA LITE - STATE VIEW          [PROTOTYPE] badge  │
│ Not connected to AP Police, Shakthi, T-Safe, 112    │
│ or ERSS. All records are synthetic.                 │
├──────────────┬──────────────────────────────────────┤
│ Filters      │  Map: Vizag, 19 zones                │
│ 24h 7d 30d   │  SUS markers, SOS markers            │
│ [SUS] [SOS]  │                                      │
│ [x] hide     ├──────────────────────────────────────┤
│   cancelled  │  Stat strip                          │
│              │  SUS events | SOS | zones flagged |  │
│ Zone list    │  false-positive rate                 │
│ ranked by    ├──────────────────────────────────────┤
│ SUS count    │  Record list, newest first           │
└──────────────┴──────────────────────────────────────┘
```

## The three panels

### 1. Map
Draws the same 19 zones from `zones/{stationId}`, using the same `color` and `opacity`,
so it is visually identical to the phone. Two marker types:

- **SUS**: placed at the **zone centroid**, never at a coordinate, because we do not have
  one. Size scales with the count of SUS events in that zone for the active window.
  Colour amber.
- **SOS**: placed at its **precise coordinate**. Colour `#FF3B30`. Always on top.

The visual difference is the argument. A reviewer sees at a glance that the pre-incident
layer is zone-level and the acute layer is precise, which is the trust boundary made
visible.

### 2. Stat strip
| Stat | Source |
|---|---|
| SUS events in window | count of `sus_events` |
| SOS incidents in window | count of `sos_incidents` |
| Zones flagged | distinct `zoneId` in `sus_events` |
| Repeat zones | zones with 2 or more SUS events |
| **False-positive rate** | `CANCELLED_BY_USER / total SUS` |

**Show the false-positive rate prominently.** Hiding it would be the dishonest choice, and
disclosing it is exactly what the brief's Honesty criterion rewards. It also demonstrates
we understand that a safety system's credibility is set by its false alarms.

### 3. Record list
SUS row: zone name, tier chip, hour band, date, outcome chip.
SOS row: zone name, precise coords, time, pseudonymous uid (truncated), status, and an
expandable **timeline**.

**The expandable timeline is the single most important element on this page.** It is the
visible answer to Shakthi's 0.28%: a control room sees a sequence, not a dot. Make sure it
is open in the demo video.

## Filters (F29)
- Time window: **Last 24 hours** (default), **7 days**, **30 days**.
- Type: SUS, SOS, or both.
- Hide cancelled: **on by default**, with the count of what is hidden shown, never silent.

## Firestore queries
```js
query(collection(db,'sus_events'),
      where('createdAt','>=', windowStart), orderBy('createdAt','desc'), limit(500))
query(collection(db,'sos_incidents'),
      where('triggeredAt','>=', windowStart), orderBy('triggeredAt','desc'), limit(200))
```
Composite indexes are required for both. **Create them on E8, not on E9.** A missing index
throws at runtime with a console link, and discovering that an hour before submission is
avoidable.

Use `onSnapshot` for the live feed, so an incident raised on the phone appears on the
console during the video without a refresh. That moment is the demo.

## Non-negotiable page elements
1. `PROTOTYPE` badge in the header, always visible.
2. The no-government-connection disclaimer in the header, not the footer.
3. "All records are synthetic" adjacent to the record list.
4. A short "what this data is and is not" note: SUS is zone-level with no coordinate and
   no session link; SOS is precise and pseudonymous.

## Performance and reach (F32)
Under 100 KB excluding map tiles. Must render on a mid-range phone browser android browser on 3G.
No web fonts. System font stack. Same dark palette as the app.

## Verification before submission
Open in a **private window, signed out, on a phone**, from a different network. If it
prompts for anything, the submission fails the brief's "works without requesting access"
requirement. Do this on E8 and again on E9.

---

## The live journey trigger

**This is how a judge completes the main journey without installing anything.** The brief
scores "let us complete the main journey from start to finish", and our live link is the
state side. This closes most of that gap for about 1.5 hours of work.

### The control

A single prominent button in the console header:

> **▶ Watch a journey happen** — replays one synthetic session in real time

Below it, one line of `caption`: *"Nothing is installed and nobody is in danger. This
writes a synthetic session and shows you what a control room would receive."*

### What it does

On press, the console signs in anonymously (the Firestore rules already require
`request.auth != null` to create) and writes a scripted session over about 30 seconds.
**Real writes, real reads, real latency.** Nothing is faked in the UI.

| t | What is written | What the narration strip says |
|---|---|---|
| 0 s | nothing yet | "04:05. She gets into an auto in Dwaraka Nagar. High-risk area, deep night. Saaya arms itself. She pressed nothing." |
| +4 s | nothing yet | "04:10. Saaya checks in. It tells her why it checked now. She does not answer." |
| +10 s | nothing yet | "04:12. It asks again, louder. Still nothing. Until this moment the state has seen **nothing about her at all**." |
| +14 s | **`sus_events` doc** | "04:13. She sees a prepared local message and may attempt to open it in her own messaging app. And this is the first thing a station receives: an area, an hour, a date. No coordinate. No name. Nothing linking it to any other trip she has taken." |
| +22 s | nothing yet | "She has 60 seconds to cancel. She does not." |
| +28 s | **`sos_incidents` doc** | "04:14. SOS. Now, and only now, her precise location and the last few minutes cross. Open the timeline below: a control room gets a sequence, not a dot." |

The narration strip sits above the record list and advances with the writes. Both records
appear through the **normal `onSnapshot` listener**, exactly as a phone-raised incident
does, so the judge is watching the real pipeline rather than an animation.

At the end, auto-expand the SOS timeline. That row is the whole argument and it should not
require a click to find.

### Honesty requirements, non-negotiable

- Every record written this way carries **`source: "CONSOLE_DEMO"`**, and the console
  renders those rows with a small `DEMO` chip.
- The narration strip ends with: *"That was synthetic. The same thing happens from the
  app, and the video shows it from her side."*
- The button is **disabled for 90 seconds** after a press, with a countdown, so repeated
  presses do not flood the console for the next judge.
- **Never claim a real incident occurred.** The header disclaimer stays visible throughout.

### Why real writes rather than a UI animation

A judge can open the Firestore reads in devtools and see that these are genuine documents
arriving over a genuine listener. An animation would be indistinguishable from a mockup,
and being checkable is the entire posture of this submission.
