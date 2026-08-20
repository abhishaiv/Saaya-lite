# Saaya Lite — build instruction

You are building **Saaya Lite**: a native Android app in Kotlin and Jetpack Compose, for the
Build What Moves India hackathon.

Repository: `https://github.com/abhishaiv/Saaya-lite` (public, branch `main`).
You are already inside it, with the remote configured.

A complete specification already exists: **41 documents, three graphs, 185 frozen facts.**
Your job is to implement it exactly. **You are not designing anything.**

---

## Are you starting or resuming?

Check `graph/build_graph.json`. If any node has `"status": "complete"`, you are **resuming**:
read `AGENTS.md`, `docs/spec/GRAPH_ENGINEERING.md`, the last three lines of
`graph/runs.jsonl`, and only the `reads` of the first node that is not complete. Do not
reconstruct the previous session from a transcript — the graph is the checkpoint. Then
continue the node loop below.

Otherwise you are starting fresh. Continue here.

---

## Setup already done — do not redo any of it

| Item | State |
|---|---|
| Firebase project `saaya-lite` (`799647753855`) | created, Firestore `asia-south1`, **anonymous auth only** |
| Both Android apps registered | `com.nexaflow.saayalite` and `com.nexaflow.saayalite.debug` |
| `app/google-services.json` | in place, contains **both** packages, gitignored |
| Vizag dataset | committed at `assets/` — 24 zones, 19 cards, 37 stations |
| Saaya iOS source | **not required.** Every value from it is already a fact in `spec_graph.json` |

**Not yet done:** a **Web** app registration for `console/firebase-config.js`. The console
uses the Firebase web SDK, which needs its own app id — the Android ones will not work.
Needed at **`T8.2` (node 7)**, not before. Stop and ask when you reach it.

Do not clone the repository again. `app/google-services.json` is gitignored and would not
come with a fresh clone.

---

## Read these first, in full, in this order

1. `AGENTS.md` — the loop, the 9 gates, the hard rules, the document map
2. `docs/spec/GRAPH_ENGINEERING.md` — why the graph, the node protocol, the verifier
   diamond, frozen nodes, anchors, the knowledge graph
3. `docs/spec/SPEC_README.md` — precedence when documents disagree, the 12
   non-negotiables, prototype posture
4. `docs/FEATURES.md` — **the contract.** 33 features. Not in it, not built.
5. `docs/SCOPE.md` — what is deliberately out, and the real-vs-mocked table
6. `graph/build_graph.json` — the 22 nodes and the execution order

## Then run both self-checks and paste the output

```bash
for i in $(seq 1 33); do grep -rq "F$i\b" docs/spec/ docs/FEATURES.md || echo "UNCOVERED F$i"; done
python3 scripts/kg.py check
```

The first must print nothing. The second must report 0 problems. An uncovered feature means
its specification is missing and you would have to invent it — report it, do not build it.

## Then confirm, before writing any code

- the first node id, its `produces` list and its `reads` list
- the files you intend to create
- anything the specification does not cover that you would otherwise have to invent

Wait for my go.

---

## The node loop

For every node, in `graph/build_graph.json` order:

**1. LOAD** — the four files in `always_read`, **plus only** the docs in this node's `reads`
array. That is your bounded subgraph. Do not re-read the whole spec pack, and do not work
from memory of a document you read earlier.

**2. PLAN** — state the files you will create or change. Confirm they match `produces`.

**3. BUILD** — obey the node's `shape`:

- `serial` — **one agent, no fan-out.** 18 of the 22 nodes. Sequential reasoning scores
  −70% when split, so splitting a state machine or a service across agents makes it worse.
- `diamond` — spawn one subagent per item in `fanout`, concurrently. Each worker writes
  **only** its `owns` paths plus its manifest. **Never** a file in
  `shared_files_written_by_merge`, never another worker's path, and **workers never commit.**
  Then run `python3 scripts/fanout_check.py <node> <worker ids>`. Then **merge in code**,
  per the node's `merge` string — never with an agent. The merge is where real bugs get
  caught, so do not weaken its assertions.
- `diamond+cycle` — as diamond, then loop until **2 consecutive rounds surface nothing new**,
  capped at 5. Dedupe against **every finding seen**, not only the confirmed ones, or it
  will not converge.

**4. GATE** — the 9 gates in `AGENTS.md`, plus the node's `extra_gates`, plus:

```bash
python3 scripts/grounded_check.py <changed files>
```

These are code. Zero model tokens. All must pass.

**5. VERIFY** — spawn this node's `verify_lenses` as **subagents, concurrently, with fresh
context.** Fresh context is the entire mechanism: a skeptic sharing your context inherits
your blind spots and rationalises instead of attacking. Give each exactly this framing:

> You are an adversarial verifier. Lens: `<LENS>`. You did **not** write this code and you
> must not defend it. Your only job is to **kill** this work. Default to `kill=true` when
> uncertain. Return ONLY JSON:
> `{lens, kill, confidence, findings:[{file,line,what,why_it_matters,spec_ref}]}`

The lenses:

- `spec` — does it contradict, ignore or "improve on" the specification
- `boundary` — can anything identifying leak before SOS
- `invention` — does every literal trace to the **right** fact in `graph/spec_graph.json`. A
  same-valued fact governing something else is not provenance. Use
  `python3 scripts/grounded_check.py --explain <files>` to see exactly what each matched.

**Merge the verdicts in code, not in a model. Any kill rejects the node.** A verifier that
fails to run is a **kill**, never a pass. When you fix, dedupe against every finding seen
for this node, not only the ones you accepted.

**6. RECORD** — node status and artifacts in `graph/build_graph.json`; one line in
`graph/runs.jsonl`; the prose entry in `docs/spec/CODEX_LOG.md`; and the knowledge graph:

```bash
python3 scripts/kg.py add-entity <id> Artifact "<what>" node=<node>
python3 scripts/kg.py add-edge   <id> produced_by node.<node>
python3 scripts/kg.py event      node_completed "<summary>" node=<node>
```

Plus a `Decision`, `Failure`, `Deviation` or `Question` entity for anything this node forced.
Never hand-edit `graph/knowledge_graph.json`.

**7. DROP** — discard this node's working context. Carry forward **nothing** but the graph.
To recall an earlier decision, query it:

```bash
python3 scripts/kg.py query <term>
python3 scripts/kg.py context <id> --depth 2
```

**Step 7 is not optional.** If you carry accumulated context forward, this becomes an
ordinary long session, quality degrades before it visibly breaks, and you will start
inventing values that look plausible.

**8. COMMIT** — one commit for this node, only after all 9 gates pass.

```
Subject:  <node id> <what it did>
Body:     which gates passed, what needed correcting, then:

          Node: <node id>
          Built-with: OpenAI Codex
          Verified-by: <lenses that ran>
```

Then `git push origin main`. Those trailers are how the repository is audited — `git log
--grep` on them is a documented verification step in `README.md`, so a missing trailer is a
broken claim. Never commit `google-services.json`, `local.properties`, a keystore, or
anything matching `.gitignore`.

**9. REPORT** — one short summary, then the next node.

---

## Hard rules

Breaking one means the work is wrong even if it compiles.

1. **No AI, no ML, no model calls in the product.** Every decision is a stated rule. This is
   a submission claim, verified by a grep.
2. **Never invent a value.** But a value **already written in a specification document** is
   a transcription, not an invention: batch those with `<doc>:<line>` citations and propose
   them in one message rather than blocking one at a time. See "Proposing a fact" in
   `SPEC_README.md`. Anything requiring a choice is still a full BLOCKED. Every numeric and colour literal must trace to one of the 185
   facts in `graph/spec_graph.json`. A missing value is a **spec bug**: stop and report it.
   **Never widen the `TRIVIAL` set** in the checker to make a failure go away.
3. **There are no third-party API keys in this project.** If you think you need one,
   something has drifted: read `docs/spec/SECRETS_AND_ACCESS.md` and stop.
4. **The trust boundary is at SOS.** Nothing identifying leaves the device before it.
5. **A SUS record snaps to its zone and carries no session id.** No coordinate, ever.
6. **Favourites never leave the device.** No live location sharing exists — absent, not
   disabled.
7. **Every mock is labelled in the UI**, not only in the write-up.
8. **The escalation accent never animates. SOS appears instantly.**
9. **Never add a dependency** outside `docs/spec/ARCHITECTURE.md` and the version catalog.
10. **Frozen, cannot be modified:** `docs/FEATURES.md`, the three files in `assets/`, the
    iOS-verbatim strings in `COPY.md`, the trust boundary, every fact in `spec_graph.json`.

**You may write to:** `graph/build_graph.json` (status only), `graph/runs.jsonl`,
`graph/knowledge_graph.json` (via `scripts/kg.py` only), `docs/spec/CODEX_LOG.md`, source
code, and a spec document **only** when I answer a BLOCKED question.
**Never** `docs/FEATURES.md`, `progress.md`, `README.md` or `AGENTS.md`.

**Write the JVM unit tests** named in `docs/spec/TEST_PLAN.md` as part of each node, not
afterwards. They are what prove the trust boundary holds.

---

## Human gates — stop and wait

Four points where a mistake cannot be undone. Stop, explain, and wait for me. **Ask
permission for nothing else.**

| When | Gate |
|---|---|
| before `T8.1` | Firestore rules and public read go live |
| before `T8.2` | the console URL becomes reachable |
| after `T9.0` | the APK is published on the landing page |
| after `T9.2` | submission |

## Anchors — measurements only I can take

A node whose gates pass but whose anchor was never taken is **not done**. Tell me exactly
what to check, and wait.

| Node | Anchor |
|---|---|
| `T1.1` | `aapt2 dump xmltree` shows `allowBackup="false"` |
| `T4.2` | **a real device arms a session with no tap** — the most important check in the build |
| `T5.1` | check-in 2 appears over a locked screen |
| `T6.2` | airplane mode, the escalation is not lost |
| `T8.2` | the console loads logged out, on a phone, on another network |
| `T9.1` | I read the Telugu — you cannot judge it |
| `T9.2` | the V7 no-AI grep and V8 manifest outputs |

---

## Stop and report, do not work around

- a gate fails 3 times
- the grounded checker flags a literal you believe is correct
- the specification does not cover a decision you need
- a node needs a physical device or a credential
- you believe a specification document is wrong

Use this format:

```
BLOCKED on <node id>
Need: <the exact decision or value missing>
Where it belongs: <which spec doc, and whether it is a spec_graph fact>
Options: <2 or 3, with a recommendation and the tradeoff>
```

Once I answer, **write the answer into the specification first** (and into
`spec_graph.json` if it is a value), then continue. The specification stays the single
source of truth.

---

**Start now:** read the six documents, run both self-checks, then confirm the plan for node
`T1.1` before writing any code.
