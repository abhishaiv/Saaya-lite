# Saaya Lite - Feature Specification
Verified with the founder 2026-08-18. This is the contract. Anything not in this file is
not being built. Changes need a line in progress.md.

Target user: **Meera, 22, Visakhapatnam, ~240 solo journeys a year, has never once
pressed an SOS button.**

---

## The escalation ladder

Four steps. They are all local in this Lite round, and the UI says so before a user chooses
an emergency dial action.

| Step | Mode | What runs | What leaves her phone | How she stops it |
|---|---|---|---|---|
| 1 | **Shadow** | Zone and hour arm it silently. Watching. | **Nothing** | One tap |
| 2 | **SUS** | Check-in prompt with a countdown | **Nothing** | "I'm OK", one tap |
| 3 | **Family escalation preview** | A context-rich local message preview. Cancel window open. | **Nothing** | Cancel, one tap |
| 4 | **SOS** | Full local-only SOS with user-controlled dial actions. | **No Saaya data; she may choose a dialler handoff** | **PIN** |

SOS is reached two ways: she taps *I need help now* at any point, or step 3's cancel
window lapses. That is what gives the cancel window weight, since it is the last thing
between her and the local-only SOS surface and its user-controlled dial actions.

## What the state can and cannot see

| | Shadow | SUS | Family escalation | SOS |
|---|---|---|---|---|
| Precise location | never | never | never | never |
| Identity | never | never | never | never |
| Session history | never | never | never | never |
| Anonymised record | no | no | no | no |
| Route reconstructable | **no** | **no** | **no** | **no** |

Nothing leaves the device during the ladder in this round-one build. Family escalation is a
local preview and SOS offers only user-controlled dialler handoffs. The proposed civic signal
and detailed incident are cut to round two and must not be claimed in the product, video or
submission.

**Round-two design only — how the proposed SUS record would be anonymised:**
- It snaps to its **zone** and integer hour, never a coordinate or fine time: "Zone 7,
  hour 4", not "17.71042, 83.30401 at 04:12".
- It carries **no session id**, so two events in the same zone cannot be linked as one
  woman's journey.
- It carries no name, no device id, no contact list.

The round-two SOS incident would keep full precision; Lite never writes one.

---

## Stage 1: Onboarding, once, on a calm day

**Status vocabulary.** `Real` means built and working. `Mocked` means composed and
shown but not dispatched, and labelled as such in the product. **`Cut`** means dropped from
scope and **not claimed anywhere** as delivered. A cut feature must not appear in the
submission write-up, the video or the console as though it exists.

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F1 | Onboarding under 90 seconds | Four short setup screens, then a safety-flow tour | She installs this on a calm day, not in a crisis. Ten minutes of setup and we lose her before the product ever runs. | Real |
| F2 | Add a trusted contact | Name and number, one is enough | The person whose context-rich message preview appears at step 3. Deliberately not framed as "who will save you", since her mother at 4 a.m. is asleep. | Real |
| F3 | Location permission, explained first | Plain reason in her words, then the system dialog | A browser permission prompt fired before she understands why is where most web tools lose people. | Real |
| F4 | Language: English or Telugu | One tap | Vizag. An escalation her family reads slowly has failed. | Real |
| F5 | **PIN setup, four digits** | Set once, calmly | This is what stops a live SOS. Set on a calm day because she will need it on a bad one, possibly while someone else is holding the phone. | Real |

## Stage 2: The ordinary day, and the reason she installs it at all

Without this stage there is no product, only an engine. Nobody installs an engine.

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F6 | Visakhapatnam risk-zone map | 19 risk zones drawn over the city; 5 SAFE zones remain picker-only | She opens it to decide something, not because she is afraid. This is the habit that means the app is installed on the night it matters. | Real |
| F7 | Tap a zone for detail | Risk level, total incidents, women-safety incidents | She can check a stretch before committing to it. Borker's study shows women already pay roughly Rs 18,800 a year making this decision blind. | Real |
| F8 | Nearest police station, distance, call | Station name, metres, a call button | Standing somewhere and wanting to know how far help actually is. | Real |
| F9 | Risk that moves with the hour | The same zone reads differently at 14:00 and 02:00 | A static hotspot table cannot say this, and the hour is most of the risk. | Real |

## Stage 3: Shadow mode, the one claim that matters

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F10 | **Automatic arming from zone and hour** | Nothing. She does nothing. | The whole product. She enters a flagged zone at a flagged hour and Saaya wakes by itself. This is the only reason a woman who has never pressed SOS in 240 rides is covered on ride 241, and it is the single difference from T-Safe. | Real |
| F11 | The "why it woke" banner | Quiet line: which zone, what hour, and that she did not start it | Without this it feels like surveillance. With it, she stays in charge of a thing she did not switch on. | Real |
| F12 | Quiet persistent status | A calm always-visible banner while armed | The page holds a wake lock and watches position, and she can always see that it is doing so. She is never watched secretly. | Real |
| F13 | Manual arm | A button, for a road not on our map | Coverage outside flagged zones. This is a press, and it is the fallback, never the path. | Real |
| F14 | One-tap disarm | "I am home" | She will do this constantly. Friction here gets the app uninstalled. Note this stops Shadow and SUS only, never a live SOS. | Real |

## Stage 4: SUS, the check-in ladder

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F15 | Adaptive check-in interval | Checks sooner in a high-risk zone at 4 a.m. than a moderate one at 9 p.m. | Not T-Safe's fixed 15-minute clock. She is not pestered on an ordinary evening, which is what makes her tolerate it on a bad one. | Real |
| F16 | Check-in prompt with a countdown | One question, visible timer | She knows exactly what happens if she ignores it. The opposite of a panic button whose consequences are unknown. | Real |
| F17 | "I'm OK" | One tap, back to quiet | The action she takes 95% of the time, so it is the cheapest action in the product. | Real |
| F18 | "I need help now" | Straight to SOS, skipping the ladder | Our thesis is that she will not press a button. This is here for the case where she can, and for the person who is not her. | Real |

## Stage 5: Family escalation

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F19 | Context-rich escalation preview | She sees the local message that a favourite would receive: which zone, what hour, that zone's reported history, her last known area, and that she did not answer a check | Context is not decoration. The prototype makes its proposed message legible without pretending to deliver it. | Real |
| F20 | Cancel window | A grace period with a visible timer | She fell asleep. Her phone was in her bag. False positives are what get a safety app deleted, and this is the last gate before local-only SOS. | Real |
| F21 | Mocked delivery, disclosed on screen | The message is composed and shown, marked as not dispatched | Real SMS needs India DLT registration, months of regulatory lead. The disclosure lives in the product, not only the write-up. | **MOCKED** |
| F22 | Offline queue | Nothing visible, it just survives | A dropped network on an unlit road is normal, not exceptional. Losing signal must never lose the escalation. | **Cut, round two** |

## Stage 6: SOS

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F23 | SOS trigger | Either she taps *I need help now*, or the cancel window lapses | Two routes in, because the whole premise is that she may not be able to take the first one. | Real |
| F24 | **PIN-protected stop** | Four digits to end a live SOS | Someone may be holding her phone. This is the one place friction is correct. | Real |
| F25 | Honest local-only SOS boundary | Plain statement on screen when SOS opens: this beta sends no report | It never creates false confidence that an institution has been notified. | Real |
| F26 | User-controlled emergency handoff | 112, 181 and nearest-station `tel:` actions when a location is known | The browser opens her dialler; Saaya never calls or sends anything automatically. | Real |

## Stage 7: What the state sees

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F27 | Anonymised SUS records reach the state | Nothing, by design | Her experience counts toward where patrols stand without her name, her route, or a complaint she was never going to file. This is the answer to NFHS-5's 14.2%. | **Cut, round two** |
| F28 | "What the police see", in-app | Three honest states: what they see right now (nothing), what a SUS record looks like, what SOS would send | The trust feature. She sees exactly what left her phone, rather than a privacy policy she will not read. | **Cut, round two** |
| F29 | Web console, time-filtered | Last 24 hours, 7 days, 30 days | A stretch that keeps waking the app at 4 a.m. becomes visible as a pattern without any density machinery. Also our live demo link: a URL, no install, no login. | **Cut, round two** |
| F30 | "Connected to no government system" | A permanent disclaimer, app and console | We are not AP Police, Shakthi, T-Safe, 112 or ERSS, and we never imply otherwise. | Real |

## Stage 8: The conditions she actually lives in

| # | Feature | Why it helps her | Status |
|---|---|---|---|
| F31 | Low-end phone, 320 px viewport floor, small deployed site | The women most exposed are not on flagship phones. | Real |
| F32 | Local ladder through drops | The local flow remains visible if connectivity drops; map tiles may stop arriving. | Real |
| F33 | Zero-tap primary path | The strongest accessibility property in the build. Low digital literacy stops being a barrier when correct usage is to do nothing. | Real |

## Dev affordance

| # | Item | Note |
|---|---|---|
| D1 | Demo trigger to simulate zone entry | Needed for a deterministic three-minute video. **Labelled on screen, never hidden.** |

---

## What is deliberately absent

- **No AI or model anywhere**, in the product or behind it. Every decision is a stated rule.
- No on-device audio, motion or threat detection. That is full Saaya.
- No live unsafe-roads display. Heat-zone markings only.
- No live location sharing to contacts. Safetipin built it and removed it because it
  becomes control in the Indian family context. Lite does not contact favourites at all: it
  only shows the local message preview that a future delivery system would use.
- No evidence capture, no watch app, no fake call.
- No connection to any live government system, and no government logos or branding.
- No real personal data. Every demo contact, name and incident is synthetic.
