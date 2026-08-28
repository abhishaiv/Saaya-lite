# Saaya Lite - Submission Pack
Built on E9. Every claim traces to `../EVIDENCE.md` or to a verification output.

## What the brief requires (fetched 2026-08-19, authoritative)

| Required | Ours |
|---|---|
| **A live public link that opens in a browser without requesting access** | the Vercel URL. The app IS the link. |
| *"Reviewers will not download a mobile app"* | we pivoted off the previous platform for Android for exactly this |
| *"Reviewers will test the citizen experience, not an admin panel"* | the citizen journey IS the deliverable. The console is cut to round two and is claimed nowhere. |
| Mock consumer login credentials **if required** | **not required.** No account, no OTP, no password. Say so; do not leave them hunting for a login box. |
| **One video, max 2:00** | 1:00 citizen demo, 1:00 how and why. Both teammates may present. |
| **Summary under 250 words** | template below. Under, not near. |
| Partner's registered email | James registers separately; each enters the other's email |
| Deadline **2026-08-28 20:00 IST** | **no grace period after the form closes** |

A source repository is **no longer a submission item.** It stays valuable as Codex evidence
and for our own honesty, but nobody is required to open it.

## The 250 words

Ruthless. Every sentence earns its place. Draft, then cut to fit.

```
India's emergency apps accept exactly one thing: a crime that already happened.

Andhra Pradesh's Shakthi has 1.52 crore downloads. Its own published numbers: 11,60,146 SOS
presses produced 3,193 FIRs. 0.28%. Telangana's T-Safe already checks in during a ride and
escalates on no-response, and was downloaded 1,300 times in a month, because she still has
to start it herself. We interviewed 12 solo women travellers: every one had a safety app,
none had ever pressed SOS.

Saaya Lite adds the missing input: "at risk, nothing has happened yet", with no press and no
name.

She opens a map of Visakhapatnam's 24 police-jurisdiction risk zones to check a route. Enter
a flagged zone at a flagged hour and it arms itself. An adaptive check-in follows, not a
fixed timer. Miss two and her chosen favourites are told, with context: the area, the hour,
that zone's record, the missed checks. Only if she still does not answer does SOS fire, and
only then does anything identifying leave her phone. She is told the moment that line is
crossed.

Real: the map, zone detection, arming, the ladder, escalation, the PIN-protected SOS, both
the four-step ladder. Mocked and labelled in the product: SMS delivery, which needs
Indian DLT registration. Connected to no government system. No AI: every decision is a
stated rule.

Background arming needs a native runtime. In a browser it runs while the page is open, and
we say so.
```

That is 249 words. Count before submitting.

## The 2-minute video

| Time | Content |
|---|---|
| 0:00-0:12 | 4 a.m., the four shut doors. No product yet. |
| 0:12-0:25 | Shakthi's 0.28% and T-Safe's 1,300, on screen, cited |
| 0:25-0:40 | the map: zones, tap one, nearest station |
| 0:40-0:52 | **it arms with no press.** Hands visibly off. |
| 0:52-1:00 | check-in, missed, family told with context, SOS |
| 1:00-1:20 | architecture: the trust boundary, what crosses and when |
| 1:20-1:40 | About: what is real, what is mocked, what this is not. The honesty is the claim. |
| 1:40-1:55 | how it was built: spec frozen first, Codex against 300+ facts, adversarial verifiers |
| 1:55-2:00 | disclosures: no government link, synthetic data, no AI, browser limits |

**Hard cap 2:00.** Nothing after it is watched.

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
**Saaya Lite is not a port of it.** It is a new web codebase written for this hackathon.
What is reused: the problem statement, the 12 interviews, the audited Visakhapatnam dataset,
the colour tokens and some check-in strings. What is new and does not exist in the iOS app:
auto-arming from zone crossed with hour, the four-step ladder with the trust boundary as a
visible step, and the
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
- There is no backend in this build. Nothing leaves the device at all, which is stronger
  than the privacy claim we set out to make. **Connected to no government system.**
- There is no Firestore in this build. In round two the state view returns with role-based access and
  an audit trail.
- IndexedDB uses destructive migration, correct for a prototype and wrong for a real product.

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
| Nothing leaves the device at all | there is no network call in the build. Open devtools, run the whole ladder, watch the network tab stay empty. Stronger than the claim we set out to make. |
| Nothing sent before SOS | `SessionEngineTest`: zero write commands across IDLE → SHADOW → CHECKIN_1 → CHECKIN_2 |

### Known limitations
- One city. Visakhapatnam only, because that is where the audited data is.
- Auto-arming needs background location. Denied, it degrades to foreground-only and says so.
- **A browser cannot arm in the background.** Arming holds while the page is open. This is
  disclosed in the product and in the 250 words rather than glossed.
- The zone data is calibrated against NCRB 2023 and is a proxy for risk, not a measurement
  of it. Low recorded crime can mean low reporting, and the app says so.
- Nine evenings, one person. This is a prototype and it is presented as one.

---

## Pre-submission checklist

| # | Check | Done |
|---|---|---|
| 1 | Console loads, logged out, private window, phone, different network | |
| 2 | the deployed site loads on a clean phone from the submission link, private window, no sign-in | |
| 3 | Video plays with no sign-in, under 3:00 | |
| 4 | Repo opens with no access request | |
| 5 | No government logo anywhere, no implied endorsement | |
| 6 | Every mock labelled **in the product**, not only the write-up | |
| 7 | V7 and V8 outputs pasted into the write-up | |
| 8 | Every number traces to `../EVIDENCE.md` | |
| 9 | No real personal data anywhere, including fixtures | |
| 10 | `CODEX_LOG.md` complete, including corrections | |
