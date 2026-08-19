# Saaya Lite - Problem Evidence Base
Compiled 2026-08-18 for Build What Moves India (deadline 2026-08-27).
Rule: no claim in the submission unless it traces to a row here.

## A. The emergency services themselves are under-delivering

| Claim | Number | Source |
|---|---|---|
| ERSS Dial 112 emergency response vehicles deployed vs required (as of Mar 2024) | 258 of 1,866 (86% shortfall) | CAG Report No. 7 of 2025, Compliance Audit |
| Women's Helpline 181 integration into 112 | Not yet integrated | CAG Report No. 7 of 2025 |
| States that have integrated ALL emergency numbers into 112 | 5 of 36 (Delhi, Kerala, Gujarat, Haryana, Lakshadweep) | MHA submission cited in SC proceedings |
| Delhi bus/taxi panic buttons found working in random physical audit | 0 of 14 buses tested | Delhi ACB audit report |
| Control room response when drivers pressed the panic button | Never received any response | Delhi ACB audit report |
| 112 India app downloads | 5.5 million | Google Play listing |

## B. Women do not use the reporting channels that exist

| Claim | Number | Source |
|---|---|---|
| Women facing intimate partner violence who sought ANY help | 14.2% | NFHS-5 (2019-21) |
| Of help-seekers, share who used informal channels (family, in-laws) | ~95% | NFHS-5 analysis, BMC Global and Public Health |
| Women who sought help from police | ~7% | NFHS-5 |
| Women who told no one at all (worst states) | ~84% (J&K, Manipur), 81.8% Bihar | NFHS-5 |
| SHe-Box (central POSH portal) complaints from govt offices nationally | 79 total, 56 still pending | MoWCD, Lok Sabha reply |

## C. The real harm is a daily tax on mobility, not the rare emergency

| Claim | Number | Source |
|---|---|---|
| Delhi women students who faced harassment while travelling | 89% | Borker, "Safety First", World Bank |
| Extra rupees/year women pay for a route 1 SD safer than men pay | Rs 18,800 (~USD 290), ~2x DU annual tuition | Borker, World Bank |
| Extra travel time women accept for a safer route (vs men) | 40 min vs 4 min | Borker, World Bank |
| College quality women trade away for a safer route | Bottom-half college over a top-20% college | Borker, World Bank |
| Women across 11 Indian cities who felt public transport was safe | 9% | survey cited in Deccan Herald |
| Bhopal bus shelters poorly lit / not visible in dark | 96% | WRI EMBARQ Bhopal pilot |
| Women wanting last-mile connectivity improved | 77% | same |
| Chennai women reporting being stalked at least once | 63.7% of 270 | Indian J Community Medicine |

## D. Public safety money is allocated with data that excludes women

| Claim | Number | Source |
|---|---|---|
| Nirbhaya Fund allocated vs utilised | Rs 9,549 cr allocated, Rs 4,241 cr released, ~Rs 2,989 cr utilised | CBGA / parliamentary panel |
| States/UTs with under 15% Nirbhaya utilisation | 18 of 36 | CBGA |
| Safe City project spend and coverage | Rs 2,919.55 cr, 8 cities only | CBGA |
| Share of rape cases occurring in rural areas | 75% | CBGA analysis |
| Direct-benefit women's schemes as share of union budget 2020-21 | under 0.07% | Oxfam |

## E. Category graveyard (why an SOS app is the wrong submission)

| Claim | Number | Source |
|---|---|---|
| Women's safety apps launched in India post-2013 | ~115 | Safetipin (Shreya Basu), 2026-07-30 meeting |
| Still operating today | ~4 | same |
| Why survivors survived | stopped being curative SOS/tracking tools, moved to root-cause work with police and govt data | same |

## F. Design guardrails from the Safetipin critique (2026-07-30)

Any concept we pick MUST survive these. They killed the obvious ideas already.

1. Nobody presses a panic button. A decade-long women's-safety operator has never pressed one in her life. Do not require a press.
2. "Why would someone report an unsafe place?" Nobody does a safety audit while feeling unsafe. Do not require a deliberate report.
3. Live location sharing becomes stalking and control in the Indian family context. Safetipin BUILT it and REMOVED it. Do not make tracking the core.
4. Police data as a base layer is politically unreliable and goes missing in big cities.
5. Assume all four money doors (user, business, police, government) are closed by default.

Implication: the signal must be a BYPRODUCT of something she already does, not a new civic duty we ask of her.
Anchor for that: NFHS-5 says the informal telling already happens at scale (~95% of help-seeking). The behaviour exists. It just never reaches a public system.

## G. The two government apps we are replacing (added 2026-08-18)

This is the "existing digital service" the hackathon brief asks us to name. Both are
government-built. Both fail, in opposite directions.

### Shakthi (Andhra Pradesh Police) - everybody installs it, nothing happens

| Claim | Number | Source |
|---|---|---|
| Downloads | 1.52 crore | DGP AP, May 2025 |
| SOS presses | 11,60,146 | DGP AP, May 2025 |
| Registered for immediate response | 34,192 = **2.9%** of presses | DGP AP, May 2025 |
| FIRs registered | 3,193 = **0.28%** of presses | DGP AP, May 2025 |
| Shakthi Teams | 153-164 across 26 districts + 2 commissionerates | DGP AP / Hans India |
| Response target | 8 min | DGP AP |

**The honest reading, and we will present both:** either 97% of presses were accidental or
non-genuine, in which case the button generates noise that buries the real 3%; or a large
share were genuine and went unserved. The state cannot distinguish between the two, because
**a press carries no context**. That is the defect, not the response time.

### T-Safe (Telangana Police) - the closest existing thing to Saaya, and nobody uses it

| Claim | Detail | Source |
|---|---|---|
| What it does | trip monitoring; safety check trigger 15 min into the ride; on no-response, alerts auto-created to initiate police response | Telangana Police Women Safety Wing |
| Activation | download the app, or dial 100 and use an IVR option | Telangana Police |
| Scope | cab rides, Telangana only | Telangana Police |
| Downloads, last 30 days | ~1,300 | AppBrain |
| Reported user issues | could not get a registered account after multiple attempts; 1090/1091 numbers not working | Play Store reviews |

**Why this matters:** T-Safe proves the check-in-and-escalate pattern is already
government-sanctioned, so we are not proposing something exotic. It also proves that
building it is not enough. Our differences must be stated plainly:

| | T-Safe | Saaya Lite |
|---|---|---|
| How it starts | she starts the trip (app or IVR) | the zone arms it, no press |
| When it checks | fixed 15 min timer | adapts to zone, hour and route |
| What it sends | an alert | a labelled incident with reason and confidence |
| Where the data goes | closes with the trip | back into where patrols stand |
| Coverage | cabs, Telangana | any journey |

### The combined problem statement

Two government apps. One with 1.52 crore installs and a 0.28% outcome rate. One that
solved the mechanic and got 1,300 downloads in a month. Between them they define the gap:
**India's emergency intake accepts exactly one event type, a completed crime, and the one
state app that tried to accept an earlier signal asked her to start it herself.**
