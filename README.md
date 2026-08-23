# Saaya Lite

**India's emergency apps only accept a crime that has already happened.
This one accepts the fifteen minutes before.**

An Android prototype built for [Build What Moves India](https://buildwhatmovesindia.com).
Visakhapatnam. Built with OpenAI Codex against a frozen specification.

> **Status:** specification complete and frozen. Application build in progress, node by node.
> Every commit tagged `Built-with: OpenAI Codex` is application code Codex wrote.
> See [How Codex built this](#how-codex-built-this) for how to verify that yourself.

---

## The problem

India already built apps for this. Two of them, in two states, and their own published
numbers tell the story.

| | Number | Source |
|---|---|---|
| **Shakthi** (AP Police) downloads | 1.52 crore | DGP Andhra Pradesh, May 2025 |
| Shakthi SOS presses | **11,60,146** | same |
| Of those, registered for immediate response | 34,192 — **2.9%** | same |
| Of those, became FIRs | 3,193 — **0.28%** | same |
| **T-Safe** (Telangana Police) downloads, 30 days | **~1,300** | AppBrain |
| Dial 112 response vehicles deployed vs required | 258 of 1,866 | CAG Report No. 7 of 2025 |
| Women facing violence who sought any help | 14.2% | NFHS-5 |

Read the 0.28% either way and the same defect appears. If most presses were accidental, the
button generates noise that buries the real ones. If many were genuine, they went unserved.
The control room cannot tell which, **because a press carries no context.**

T-Safe already solved the mechanic — it checks in during a ride and escalates on no-response
— and got 1,300 downloads in a month, because she still has to start the trip herself.

We interviewed **12 solo women travellers**. Every one already had a safety app installed.
**Not one had ever pressed SOS.**

## What we changed

She never starts it. The zone and the hour arm it. A four-step ladder runs, and the trust
boundary is a step she can see:

| Step | What runs | What leaves her phone |
|---|---|---|
| 1 Shadow | zone + hour arm it silently | **nothing** |
| 2 Check-in | adaptive prompt, not a fixed timer | **nothing** |
| 3 Family | favourites told, with context, cancel window open | contacts only |
| 4 SOS | PIN-protected, and she is told | precise location + identity |

Full argument: [`docs/PROBLEM.md`](docs/PROBLEM.md).
The process behind it — who receives what, who acts, what closes the loop:
[`docs/OPERATING_MODEL.md`](docs/OPERATING_MODEL.md).

## What is real, and what is mocked

Decided before building, not after. Full table: [`docs/SCOPE.md`](docs/SCOPE.md).

**Real:** the Visakhapatnam risk-zone map, GPS and zone detection, automatic arming with no
press, the adaptive check-in ladder, escalation timing, the PIN-protected SOS, both writes
into the state view, and the web console.

**Mocked, and labelled on screen in the product itself:** SMS and WhatsApp delivery to
favourites. Real delivery needs India DLT registration, a months-long regulatory process.

**Not connected to anything:** the state view is our own Firebase project. It has **no
connection to AP Police, Shakthi, T-Safe, 112 or ERSS**, and it is not a government product.

**No AI in the product.** Every decision Saaya Lite makes is a fixed rule you can read.

## How Codex built this

The prototype is built with **OpenAI Codex** against a specification that was written first
and then frozen. The specification exists so Codex never has to invent anything.

**Verify it yourself, in the repo:**

```bash
# every commit of application code Codex wrote
git log --grep="Built-with: OpenAI Codex" --oneline

# what each node produced, and what needed correcting
cat docs/spec/CODEX_LOG.md

# machine-readable run + verification provenance
cat graph/runs.jsonl graph/verifications.jsonl

# a summary generated from those logs, not from memory
python3 scripts/codex_contribution.py
```

**The method, in one paragraph.** The build is a graph of **22 nodes**, not a
chat. Each node names the only documents it may read, so context stays bounded across a long
run. **18 nodes are serial** because sequential
reasoning degrades when you split it; **4 fan out** into
38 parallel workers where the sub-jobs are genuinely independent.
Every node then passes **9 gates**, two of them mechanical rather than judgemental, and
**44 adversarial verifier runs** with fresh context whose only job is
to kill the work. Method and reasoning:
[`docs/spec/GRAPH_ENGINEERING.md`](docs/spec/GRAPH_ENGINEERING.md).

**Honest about who did what.** The specification in `docs/` was written in a planning
dialogue with Claude and then frozen; the two commits that added it say so in their trailers.
Every line of the Android application is written by Codex, against that frozen spec, and
tagged accordingly. We are stating this up front rather than leaving it to be discovered,
for the same reason everything else here is checkable.

## Verify our claims, don't take them

We would rather be checked than believed. These are the actual commands:

```bash
# no AI or model anywhere in the product
grep -ri "openai\|gpt\|claude\|tensorflow\|ml-kit" app/src

# the app cannot listen, watch, or send on her behalf
grep -E "RECORD_AUDIO|CAMERA|SEND_SMS" app/src/main/the Next.js config

# her favourites cannot leave the device
grep "allowBackup" app/src/main/the Next.js config     # must be false

# nothing identifying is written before SOS
npm run testDebugUnitTest --tests "*AnonymiserTest*"

# every number in the product traces to a decided value
python3 scripts/grounded_check.py app/src/main/java
```

The last one is worth a note: **185 frozen facts** in
[`graph/spec_graph.json`](graph/spec_graph.json) hold every number, colour and dimension in
the product, each traced to whoever decided it. A literal in the source that does not trace
to one of them fails the build. It is how "we did not invent this value" stops being a claim.

## Known limitations

- One city. Visakhapatnam only, because that is where the audited data is.
- Auto-arming needs background location. Denied, it degrades to foreground-only and says so.
- Some Android OEMs kill background services. We detect it and tell her, rather than
  pretending to watch.
- The zone data is calibrated against NCRB 2023 and is a **proxy for risk, not a measurement
  of it.** Low recorded crime can mean low reporting, and the app says exactly that.
- Firestore read is public for the demo, and IndexedDB uses destructive migration. Both are
  correct for a prototype and wrong for production. We say so rather than let you find it.
- Nine evenings, one person. This is a prototype and it is presented as one.

## Repository

| Path | What |
|---|---|
| [`AGENTS.md`](AGENTS.md) | the build agent's manual: the node loop, the 9 gates, the hard rules |
| `docs/` | the specification. 41 documents. Start with `PROBLEM.md`, `SCOPE.md`, `FEATURES.md` |
| `docs/spec/CODEX_LOG.md` | what Codex did at each node, including what needed correcting |
| `graph/build_graph.json` | the 22-node execution DAG: shapes, gates, verifier tiers, status |
| `graph/spec_graph.json` | 185 frozen facts. Every value in the product, with provenance |
| `graph/knowledge_graph.json` | 141 entities, 405 provenanced edges, 16-class ontology |
| `scripts/` | the mechanical gates: grounded, fan-out isolation, knowledge graph |
| `progress.md` | the unedited decision log, including the mistakes |

## Disclaimers

Saaya Lite is a prototype. It is **not a government product** and uses no government
branding. Every figure quoted about Shakthi, T-Safe, 112 and the Nirbhaya Fund is the
government's own published number, cited in [`docs/EVIDENCE.md`](docs/EVIDENCE.md). No
government system was accessed, tested or probed. All demonstration data is synthetic. No
real Aadhaar, PAN, OTP, payment or health data exists anywhere in this project, including
in test fixtures.

Saaya is an existing iOS product. **Saaya Lite is not a port of it** — it is a new Android
codebase built for this hackathon. What is reused and what is new is set out plainly in
[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).
