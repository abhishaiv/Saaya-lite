# Saaya Lite - The Operating Model
The brief says: *"account for the backend, infrastructure and processes required to make
the solution work"* and *"a cleaner screen over the same broken process is not a fix."*

The backend and infrastructure are specified in `spec/DATA_MODEL.md` and
`spec/ARCHITECTURE.md`. **This document is the third one: the process.** Who receives what,
who decides, who acts, and what closes the loop.

Nothing here is built in the prototype. It is the answer to how the idea works at scale,
and it is stated as design, not as a claim.

---

## The routing key we got for free

Every one of the 24 zones **is a police station jurisdiction**. The dataset was built that
way. That means a signal does not need a routing engine, a geocoder or a lookup table: a
SUS event carries `zoneId = dwaraka_police_station`, and the station it belongs to is the
station whose beat it is.

This matters more than it sounds. Most civic reporting systems die at routing, because a
citizen's description of a place does not map to any department's jurisdiction. Ours is
jurisdictional by construction.

## Two channels, two completely different processes

**Do not let these blur.** They have different urgency, different consumers, different
privacy, and different definitions of success.

| | Channel A: the civic signal | Channel B: the acute incident |
|---|---|---|
| Trigger | family escalation, ladder step 3 | SOS, ladder step 4 |
| Contains | zone, hour, date. No name, no coordinate, no link between records. | precise location, pseudonymous id, session timeline |
| Urgency | **none.** Never dispatch on this. | immediate |
| Consumer | station SHO, shift briefing | control room, existing 112 or Dial 100 dispatch |
| Cadence | per shift, three times a day | seconds |
| Success | the zone stops flagging | she is reached |

### Channel A: what a station actually does with it

1. **Nothing, immediately.** A SUS event is not an emergency and must never be treated as
   one. If it triggers a dispatch, we have built a worse panic button.
2. **Threshold.** A zone enters the shift briefing when it crosses N events in a rolling
   7 days for a given hour band. N is set per city, not by us, and the receiving officer
   sets it.
3. **Shift briefing.** The SHO's briefing list carries the top zones by recent flag count,
   with the hour band attached, because *Dwaraka Nagar between 2 and 5 a.m.* is an
   actionable instruction and *Dwaraka Nagar* is not.
4. **The intervention is presence, not response.** A beat car parked on that stretch during
   that band. This is the deck's argument: the state is not being asked to respond faster,
   only to be told where standing still is worth the most.
5. **The loop closes when the zone stops flagging.** That is the measurable outcome, and it
   is the only one we claim.

### Channel A's second consumer, and the harder one

A large share of what makes a stretch feel unsafe is **not police work**. It is lighting,
footpaths, bus-stop siting and vacant plots. Safetipin found 96% of Bhopal's bus shelters
poorly lit. Those belong to the municipal corporation (GVMC in Visakhapatnam), not the
police.

So the real design needs **two-department routing** from one signal: the police get the
patrol view, the corporation gets the infrastructure view, and both see the same zone. That
is a memorandum and a data-sharing agreement, not a feature, and we say so plainly rather
than pretending an app solves it.

### Channel B: we do not replace dispatch

At scale, an SOS incident should enter the **existing ERSS or state pipeline as an
additional intake channel**, not a parallel system. The value we add is the payload: a
timeline rather than a press. `notifyPolice`-style delivery is a bridge; the real
integration is an ERSS adapter, and per Saaya's own honest disclaimer that work should not
begin before a written agreement.

## Governance, and what we would have to agree in writing

| Question | Position |
|---|---|
| Who can read the civic layer? | Named officers at the receiving station and the district wing. Role-based, audited, per-read logged. |
| Can anyone request a specific woman's history? | **No, architecturally.** There is no session id and no coordinate. The question cannot be answered from the data, which is a stronger guarantee than a policy. |
| How long is it kept? | Civic events aggregated and raw rows dropped past 90 days. Incidents per state record-retention rules. |
| Who corrects a wrong signal? | One nodal officer who can flag a zone as mis-scored, exactly the ask in the Saaya pilot proposal. Some early labels will be wrong and pretending otherwise loses trust. |
| What if the police ask for more? | The answer is no, and it is enforced by what we never collect. The trust boundary is the product. |

## False positives are published, not hidden

Every cancelled escalation is recorded and the **cancel rate is shown to the receiving
officer**, alongside the signal itself.

A safety system's credibility is set by its false alarms. An officer who can see that 30%
of flags were cancelled by the woman herself can calibrate how much weight to give the
other 70%. Hiding it would produce a number nobody trusts and nobody acts on.

This is also why the console shows the false-positive rate on its stat strip rather than
quietly filtering cancelled events away.

## Why this is not just an app

| The brief asks about | Ours |
|---|---|
| **Backend** | Two separate write paths with different privacy contracts, an on-device queue so a dropped network never loses an escalation, and anonymisation enforced at the database rather than the client |
| **Infrastructure** | Signals routed by police jurisdiction because the zones are jurisdictions; no new geocoding layer needed |
| **Processes** | Shift-briefing cadence, a threshold the receiving officer owns, presence as the intervention, a two-department split for what is not police work, a nodal officer to correct bad labels, and published false-positive rates |

**The screen is the smallest part of this.** The change is that the state gains an intake
it never had, for the 97% of moments that never became a crime, and a process for acting on
it that does not ask anyone to respond faster.
