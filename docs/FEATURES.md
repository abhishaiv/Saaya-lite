# Saaya Lite - Feature Specification
Verified with the founder 2026-08-18. This is the contract. Anything not in this file is
not being built. Changes need a line in progress.md.

Target user: **Meera, 22, Visakhapatnam, ~240 solo journeys a year, has never once
pressed an SOS button.**

---

## The escalation ladder

Four steps. The trust boundary sits between step 3 and step 4, and she is told where.

| Step | Mode | What runs | What leaves her phone | How she stops it |
|---|---|---|---|---|
| 1 | **Shadow** | Zone and hour arm it silently. Watching. | **Nothing** | One tap |
| 2 | **SUS** | Check-in prompt with a countdown | **Nothing** | "I'm OK", one tap |
| 3 | **Family escalation** | Contacts told, with context. Cancel window open. | **Contacts only** | Cancel, one tap |
| 4 | **SOS** | Full emergency. She is told the state has it. | **State view receives the incident** | **PIN** |

SOS is reached two ways: she taps *I need help now* at any point, or step 3's cancel
window lapses. That is what gives the cancel window weight, since it is the last thing
between her and an institutional record.

## What the state can and cannot see

| | Shadow | SUS | Family escalation | SOS |
|---|---|---|---|---|
| Precise location | never | never | never | **yes** |
| Identity | never | never | never | **yes** |
| Session history | never | never | never | **yes** |
| Anonymised record | no | no | **yes** | **yes** |
| Route reconstructable | **no** | **no** | **no** | within one incident only |

Nothing leaves the phone during Shadow or either SUS/check-in state. Entering family
escalation writes one anonymous zone/hour civic signal; despite its internal name,
`WriteSusEvent` is triggered there, not during either check-in. It contains no precise
location, identity, UID, device ID, session ID, favourites, minutes or seconds. A detailed
state-visible incident is created only when SOS begins.

**How the SUS record is actually anonymised**, not just labelled so:
- It snaps to its **zone** and integer hour, never a coordinate or fine time: "Zone 7,
  hour 4", not "17.71042, 83.30401 at 04:12".
- It carries **no session id**, so two events in the same zone cannot be linked as one
  woman's journey.
- It carries no name, no device id, no contact list.

SOS keeps full precision, because at that point she has crossed the line deliberately and
precision is the entire point.

---

## Stage 1: Onboarding, once, on a calm day

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F1 | Onboarding under 90 seconds | Four short screens, then done | She installs this on a calm day, not in a crisis. Ten minutes of setup and we lose her before the product ever runs. | Real |
| F2 | Add a trusted contact | Name and number, one is enough | The person who gets told at step 3. Deliberately not framed as "who will save you", since her mother at 4 a.m. is asleep. | Real |
| F3 | Location permission, explained first | Plain reason in her words, then the system dialog | A browser permission prompt fired before she understands why is where most web tools lose people. | Real |
| F4 | Language: English or Telugu | One tap | Vizag. An escalation her family reads slowly has failed. | Real |
| F5 | **PIN setup, four digits** | Set once, calmly | This is what stops a live SOS. Set on a calm day because she will need it on a bad one, possibly while someone else is holding the phone. | Real |

## Stage 2: The ordinary day, and the reason she installs it at all

Without this stage there is no product, only an engine. Nobody installs an engine.

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F6 | Visakhapatnam risk-zone map | 24 zones drawn over the city | She opens it to decide something, not because she is afraid. This is the habit that means the app is installed on the night it matters. | Real |
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
| F19 | Context-rich escalation | Her contact receives: which zone, what hour, that zone's reported history, her last known area, and that she did not answer a check | Compare with Shakthi, where 11,60,146 presses produced 3,193 FIRs because a press carries none of this. Context is not decoration, it is what makes someone act. | Real |
| F20 | Cancel window | A grace period with a visible timer | She fell asleep. Her phone was in her bag. False positives are what get a safety app deleted, and this is also the last gate before an institutional record. | Real |
| F21 | Mocked delivery, disclosed on screen | The message is composed and shown, marked as not dispatched | Real SMS needs India DLT registration, months of regulatory lead. The disclosure lives in the product, not only the write-up. | **MOCKED** |
| F22 | Offline queue | Nothing visible, it just survives | A dropped network on an unlit road is normal, not exceptional. Losing signal must never lose the escalation. | Real |

## Stage 6: SOS

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F23 | SOS trigger | Either she taps *I need help now*, or the cancel window lapses | Two routes in, because the whole premise is that she may not be able to take the first one. | Real |
| F24 | **PIN-protected stop** | Four digits to end a live SOS | Someone may be holding her phone. This is the one place friction is correct. | Real |
| F25 | She is told the state has it | Plain statement on screen when SOS opens | She knows the exact moment the line was crossed. No surprise institutional record. | Real |
| F26 | Full incident to the state view | Precise location, identity, the session history that led here | This is the acute channel, and it is the only time either crosses. | Real |

## Stage 7: What the state sees

| # | Feature | What she experiences | Why it helps her | Status |
|---|---|---|---|---|
| F27 | Anonymised SUS records reach the state | Nothing, by design | Her experience counts toward where patrols stand without her name, her route, or a complaint she was never going to file. This is the answer to NFHS-5's 14.2%. | Real |
| F28 | "What the police see", in-app | Three honest states: what they see right now (nothing), what a SUS record looks like, what SOS would send | The trust feature. She sees exactly what left her phone, rather than a privacy policy she will not read. | Real |
| F29 | Web console, time-filtered | Last 24 hours, 7 days, 30 days | A stretch that keeps waking the app at 4 a.m. becomes visible as a pattern without any density machinery. Also our live demo link: a URL, no install, no login. | Real |
| F30 | "Connected to no government system" | A permanent disclaimer, app and console | We are not AP Police, Shakthi, T-Safe, 112 or ERSS, and we never imply otherwise. | Real |

## Stage 8: The conditions she actually lives in

| # | Feature | Why it helps her | Status |
|---|---|---|---|
| F31 | Low-end phone, min SDK 24, small deployed site | The women most exposed are not on flagship phones. | Real |
| F32 | Works on 3G and through drops | See F22. | Real |
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
  becomes control in the Indian family context. Contacts receive an escalation, never a
  dot she cannot switch off.
- No evidence capture, no watch app, no fake call.
- No connection to any live government system, and no government logos or branding.
- No real personal data. Every demo contact, name and incident is synthetic.
