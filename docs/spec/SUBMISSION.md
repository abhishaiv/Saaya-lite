# Saaya Lite - Submission Pack
Built on E9. Every claim traces to `../EVIDENCE.md` or to a verification output.

## What the brief requires

| Required | Ours | Where |
|---|---|---|
| A live demo link | the state view console, **with a one-press live journey replay** so the main journey is completable with no install | Firebase Hosting, `saaya-lite.web.app` |
| A demo video, under 3 min | per `DEMO_SCRIPT.md` | unlisted YouTube, **no sign-in** |
| A short write-up | template below | the landing page and the submission form |
| Source repo, optional | **https://github.com/abhishaiv/Saaya-lite** | public; opens with no access request |

**Every link must work without requesting access.** Verified by `TEST_PLAN.md` V1 to V4,
from a logged-out private window, on a phone, on a different network.

## Landing page

One static page, hosted alongside the console at `/build`. Same dark palette, Poppins,
under 100 KB.

| Section | Content |
|---|---|
| Hero | Saaya Lite. One line: "India's emergency apps only accept a crime that already happened. This accepts the fifteen minutes before." |
| Three buttons | **Open the live console** (with a line saying: press *Watch a journey happen* and you can see the whole thing without installing anything), **Download the APK**, **Watch the 3-minute demo** |
| The problem | Shakthi's 0.28% and T-Safe's 1,300 downloads, cited to their sources |
| What works, what is mocked | the two lists from `SCOPE.md`, side by side, equally prominent |
| Disclaimers | not a government product, no live system connection, synthetic data, no AI |
| Install note | "Android 7 and above. You will need to allow install from unknown sources, because this is a prototype and not a Play Store release." |

**Put the mocked list next to the working list, at the same size.** Burying it costs more
than it saves, and Honesty is scored.

## Write-up template

Fill this in, do not rewrite it. Every bracket is a real value, never an estimate.

---

### Where this came from, stated plainly
I am a man. I have not faced this problem. I am from Visakhapatnam and I built Saaya for my
sisters, my cousins and my friends, and then I went and interviewed **12 solo women
travellers** about it. Every one already had a safety app on her phone. **Not one had ever
pressed SOS.** That finding is the entire product, and it is not something I would have
guessed.

### Is this an old project?
Saaya is an existing iOS product, and I am not going to let you discover that on your own.
**Saaya Lite is not a port of it.** It is a new Android codebase written for this hackathon.
What is reused: the problem statement, the 12 interviews, the audited Visakhapatnam dataset,
the colour tokens and some check-in strings. What is new and does not exist in the iOS app:
auto-arming from zone crossed with hour, the four-step ladder with the trust boundary as a
visible step, the anonymised zone-level civic signal, the state view console, and the
entire public-service framing. The repository contains no Swift and every commit falls
inside the hackathon window. [full table in `../COMPLIANCE.md`]

### The problem
India's emergency intake accepts exactly one event type: a crime that has already
happened. 112, Dial 100, Shakthi, T-Safe, the FIR register. There is no state channel
anywhere that accepts *"I am not safe right now, and nothing has happened yet."*

### Who it affects
Women travelling alone. We interviewed 12 solo women travellers: every one already had a
safety app installed, and **not one had ever pressed SOS**. NFHS-5 finds **14.2%** of women
facing violence sought any help, and about **7%** went to police.

### What is already there, and how it does
- **Shakthi (AP Police):** 1.52 crore downloads, **11,60,146 SOS presses**, 34,192
  registered for immediate response (**2.9%**), **3,193 FIRs (0.28%)**. A press carries no
  context, so a control room cannot tell a real emergency from a pocket press.
- **T-Safe (Telangana Police):** already does check-in-and-escalate, and was downloaded
  about **1,300 times in 30 days**, because she still has to start the trip herself.
- **CAG Report No. 7 of 2025:** Dial 112 had **258 response vehicles against a requirement
  of 1,866**. Women's Helpline 181 is still not integrated.

### What we changed
1. **She never starts it.** Zone and hour arm the session. No press.
2. **The check-in adapts** to area and hour instead of a fixed timer.
3. **The signal carries context by construction.** It is produced by circumstance, so it
   arrives already carrying the area, the hour, that area's record, and the missed check.
4. **The trust boundary is a step she can see.** Nothing identifying leaves the phone
   before SOS, and she is told the moment it does.

### Why it is better
[the comparison table from `SCOPE.md`]

### What works today
[the REAL list from `SCOPE.md`, verbatim]

### What is mocked
[the MOCKED list from `SCOPE.md`, verbatim]
- SMS and WhatsApp delivery: composed and shown, not sent. Real delivery needs India DLT
  registration, a months-long regulatory process.
- The state view is our own backend. **It is connected to no government system.**
- Firestore read is public for the demo. In production this becomes role-based access with
  an audit trail.
- Room uses destructive migration, correct for a prototype and wrong for a real product.

### How it works safely at scale
[section 6 of `../PROBLEM.md`, which separates what Lite enforces today from what full
scale would additionally need]

### The process, not just the backend
[`../OPERATING_MODEL.md`]. The short version: the civic signal and the acute incident are
two channels with different urgency, different consumers and different privacy. A SUS
signal is **never** dispatched on. It enters a shift briefing, at a threshold the receiving
officer owns, and the intervention is a patrol car parked on that stretch during that hour
band. The loop closes when the zone stops flagging. A large share of what makes a stretch
unsafe is lighting and footpaths, which is the municipal corporation and not the police, so
the real design needs two-department routing from one signal, which is a memorandum and not
a feature. Every zone is already a police station jurisdiction, so routing needs no
geocoder. And the false-positive rate is **shown to the receiving officer**, because a
safety system's credibility is set by its false alarms.

### What we did not do
[`../COMPLIANCE.md` §5]. No government API, portal, database or endpoint was accessed,
called, tested or probed. Nothing was reverse-engineered. No personal or restricted
information was scraped: the dataset holds aggregate counts per police jurisdiction and
contains no victim, no accused, no address and no FIR number. No government logo appears
anywhere. Every figure we quote about Shakthi, T-Safe, 112 and the Nirbhaya Fund is the
government's own published number, cited.

### Tools, and how Codex contributed
[from `CODEX_LOG.md`: tasks run, accepted with no correction, needing correction, hours
saved, where Codex was clearly better, **where it was clearly worse**]

There is **no OpenAI model inside the product**. Every decision Saaya Lite makes is a fixed
rule. Codex built it, and the log is honest about where it was wrong.

### Verifiable claims
We would rather be checked than believed.

| Claim | How to verify |
|---|---|
| No AI anywhere | `grep -ri "openai\|gpt\|ml\|model" app/src` → [paste V7 output] |
| Cannot listen, watch or send | manifest has no `RECORD_AUDIO`, `CAMERA`, `SEND_SMS` → [paste V8 output] |
| Favourites never leave the device | `allowBackup="false"`, no upload path, `FavouriteRepository` has no remote |
| No coordinate in a SUS record | `AnonymiserTest`, plus the Firestore rule rejecting `latitude`/`longitude`/`sessionId`/`uid` |
| Nothing sent before SOS | `SessionEngineTest`: zero write commands across IDLE → SHADOW → CHECKIN_1 → CHECKIN_2 |

### Known limitations
- One city. Visakhapatnam only, because that is where the audited data is.
- Auto-arming needs background location. Denied, it degrades to foreground-only and says so.
- Some Android OEMs kill background services. We detect it and tell her honestly rather
  than pretending to watch.
- The zone data is calibrated against NCRB 2023 and is a proxy for risk, not a measurement
  of it. Low recorded crime can mean low reporting, and the app says so.
- Nine evenings, one person. This is a prototype and it is presented as one.

---

## Pre-submission checklist

| # | Check | Done |
|---|---|---|
| 1 | Console loads, logged out, private window, phone, different network | |
| 2 | APK downloads and installs on a clean device | |
| 3 | Video plays with no sign-in, under 3:00 | |
| 4 | Repo opens with no access request | |
| 5 | No government logo anywhere, no implied endorsement | |
| 6 | Every mock labelled **in the product**, not only the write-up | |
| 7 | V7 and V8 outputs pasted into the write-up | |
| 8 | Every number traces to `../EVIDENCE.md` | |
| 9 | No real personal data anywhere, including fixtures | |
| 10 | `CODEX_LOG.md` complete, including corrections | |
