# Saaya Lite - Problem Statement
For: Build What Moves India. Deadline 2026-08-27. Written 2026-08-18.
Structured against the six questions the brief says a strong build makes obvious.
Every number traces to a row in EVIDENCE.md.

---

## The one-line problem

**India's emergency intake accepts exactly one event type: a crime that has already
happened. There is no state channel that accepts "I am not safe right now, and nothing
has happened yet."**

The government has built apps for this. Two of them, in the two states we know best,
fail in opposite directions. That gap is the whole submission.

---

## 1. Who is facing the problem

**Meera. 22. Visakhapatnam. Travels alone by choice, not by compulsion.**

She takes roughly 240 solo rides a year. Night shift, late class, early airport run.
She is not fragile and she is not asking to be rescued. She wants to be witnessed.

Grounding: we interviewed 12 solo women travellers. Every one already had a safety app
installed. **Not one had ever pressed SOS**, including in moments they described as
feeling unsafe. Safetipin, an organisation a decade deep in this category, told us their
own staff have never pressed a panic button either.

She is not a hypothetical. Andhra Pradesh registered **19,952 crimes against women in
2024**, 55 a day, and every single one was recorded after it happened.

## 2. What is difficult about the current experience

Take the specific fifteen minutes this product exists for. 4 a.m. Auto ride. Narrow,
unlit road. Halfway through, the driver takes a turn she does not know. **Nothing has
happened.** She feels threatened anyway.

Every door the state gives her is already shut:

| Door | Why it is shut at 4:05 a.m. |
|---|---|
| **Shakthi / T-Safe SOS button** | SOS is for after. Nothing has happened yet. In 240 rides she has never pressed it, and neither had any of the 12 women we interviewed. |
| **Dial 112 / 100** | An emergency line, for an emergency. She does not have one yet. |
| **File a complaint** | Over a feeling? Her name in a register and her route on file, every day. |
| **Call her mother** | Asleep. A live dot on a sleeping phone holds nothing until six. |

So she does nothing. She watches the mirror and bears it. **240 mornings out of 240.**

### The government has tried, and the numbers say how it went

**Shakthi (AP Police).** 1.52 crore downloads. **11,60,146 SOS presses.** Of those,
**34,192 registered for immediate response (2.9%)** and **3,193 became FIRs (0.28%)**.

Read it either way and the same defect appears. If most presses were accidental, the
button is generating noise that buries the genuine ones. If many were genuine, they went
unserved. The control room cannot tell which, **because a press carries no context**.
It is a bare alert on a map. Response time is not the problem. Legibility is.

**T-Safe (Telangana Police).** Closer to the right idea: it monitors a ride, sends a
safety check 15 minutes in, and escalates to police if she does not respond. It proves
the pattern is already government-sanctioned. It was downloaded about **1,300 times in
30 days**. Because she still has to start the trip herself, and starting it is a press.

**And the response layer behind both is thinner than advertised.** CAG Report No. 7 of
2025 found Dial 112 running **258 emergency response vehicles against a requirement of
1,866**, with Women's Helpline 181 still not integrated. A Delhi ACB audit physically
tested 14 buses and found **zero working panic buttons**; drivers said the control room
never once responded.

**The result at national scale:** NFHS-5 finds **14.2%** of women facing violence sought
any help at all, and about **7%** went to police. The state's entire picture of women's
safety is built from the ~7% who knock, after the fact.

## 3. What we changed

**We added a second event type to the intake.**

Not a faster SOS. Not a prettier map. A new class of signal that the current system has
no schema for: *at risk, nothing has happened yet*, submitted **without a press** and
**without a name**.

Four concrete changes:

1. **She never starts it.** The zone and the hour arm the session. Her hands never touch
   the phone. This is the difference between us and T-Safe, and it is the whole reason
   the 12 women who never pressed SOS would be covered anyway.
2. **The check-in adapts instead of ticking.** Not a fixed 15-minute timer. The interval
   responds to where she is and when.
3. **The signal carries context by construction, not by classification.** A press tells
   the control room nothing, which is why 11,60,146 of them produced 3,193 FIRs. Our
   signal is not a press. It is produced by circumstance, so it arrives already carrying
   where she was, at what hour, inside which flagged zone, with what reported history,
   and the fact that she did not answer a check. Nothing classifies it after the fact.
   How it is generated is what makes it legible. That is the fix for the 0.28%.
4. **The signal outlives the ride.** A zone that keeps flagging, from women who never
   filed a complaint, becomes a place on the state's map. Presence is the intervention.
   Then the zone comes off the map.

## 4. Why our version is better

| | Shakthi / T-Safe today | Saaya Lite |
|---|---|---|
| Who acts first | she does, she presses | nothing to press, the engine decides |
| When it starts | after it has begun | in the fifteen minutes before |
| What the state receives | an alert and a location | an incident carrying its own context: zone, hour, reported history, non-response |
| What the state learns | where crimes were reported | where women feel unsafe and never report |
| Coverage | one state, cab rides | any journey |

The deeper argument: **prevention scales, response does not.** A state cannot add patrols
as fast as it adds streets. It can add the intelligence that says which street.

## 5. What works today, and what is mocked

Decided before building, not after. Full detail in SCOPE.md.

**Real and functional:** the Visakhapatnam risk-zone map, GPS and zone entry detection,
automatic arming with no press, the adaptive check-in ladder, escalation timing, the
escalation to family with its cancel window, the PIN-protected SOS, and both writes into
the state view. All of it deterministic. Full detail in FEATURES.md.

**Mocked — SMS and WhatsApp device handoff are implemented, but Chrome real-phone verification
is pending:** at family escalation Saaya prepares
the local message, then she can deliberately attempt a handoff to her own SMS or WhatsApp app
to review and send it herself. Saaya never sends it, observes delivery or uploads the favourite
or message. The state side is a real screen reading real data from our own backend, but it has
**no connection to AP Police, Shakthi, T-Safe, 112 or ERSS**, and carries that disclaimer in
the product.

**Not built in the lite version at all, and present in full Saaya:** the on-device AI
engine (audio, motion, threat detection), the live unsafe-roads display, evidence
capture, and the watch app. Saaya Lite contains **no AI model, in the product or behind
it.** Every decision it makes is a stated rule. We say so plainly rather than implying
intelligence we did not build.

## 6. How this works safely at larger scale

The privacy design is what makes this a public system rather than a surveillance one,
and it is enforced by the data we do not collect rather than by a policy we publish.

**What Lite enforces today, and a reviewer can verify in the code:**

- **The trust boundary is a step, not a promise.** Shadow and SUS send the state nothing
  identifying. Precise location and identity cross **only at SOS**, and she is told on
  screen the moment it happens.
- **A SUS record snaps to its zone, never a coordinate.** "Zone 7, 04:12", not a lat-long.
  This is what stops a series of records being reassembled into one woman's route.
- **A SUS record carries no session id**, so two events in the same zone cannot be linked
  as the same journey, the same phone or the same person.
- **No names, no device ids, no contact lists** ever reach the state view before SOS.
- **Nothing is armed permanently.** Shadow wakes per journey and she can stop it in one tap.
- **No audio and no continuous tracking exist in the product at all**, so neither can leak.

**What full scale would additionally need, stated honestly because we have not built it:**

- **H3 cell coarsening computed on device** rather than zone-snapping, once coverage grows
  past a curated zone set to a whole state.
- **k-anonymity gating**, so a cell reports nothing until enough distinct sources have
  contributed and a thinly-populated area can never expose one woman.
- **Aggregate sketches rather than event rows**, so a database breach yields counts and
  not records.
- **Retention limits and an audit trail** on every state-side read.
- **DPDP Act compliance in writing** in any partnership agreement, not only in the code.

**The stalking risk is designed against, not managed.** Safetipin built live location
sharing and removed it, because in the Indian family context it becomes control: a parent
or husband who will not permit her to go out unless she can be watched. Saaya Lite
therefore has no live tracking to give anyone. Contacts receive an escalation, never a
dot she cannot switch off.

---

## What we are not claiming

- This is not an official government product and uses no government logos or branding.
- No live government system was accessed, tested or interfered with.
- No real Aadhaar, PAN, OTP, payment or personal data. All demo data is synthetic.
- The Shakthi and T-Safe figures are the governments' own published numbers, cited as
  evidence of the gap, not as criticism of the officers running them.
