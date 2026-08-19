# Saaya Lite - Graph Engineering
Adopted 2026-08-18, upgraded the same day against the 14-step roadmap.

Sources: the Codez 14-step Graph Engineering roadmap (supplied as PDF), the
agentfactory.panaversity.org crash course, TrueFoundry's multi-agent guide, and Google
Research's *Towards a science of scaling agent systems*. Adapted to our constraints, not
copied: several steps are deliberately not adopted and the reasons are recorded below.

---

## Why a graph, for a build that runs sequentially

Founder decision: **one continuous run.** Every node implemented and verified one after
the other, no parallel agents.

That is exactly the situation where a graph stops being optional. In a long single run the
agent's context fills, and quality degrades *before* it visibly breaks: it starts
paraphrasing a spec it read twenty tasks ago instead of re-reading it, and inventing values
that look plausible. The literature's phrase for the fix is the whole point:

> **The agent forgets. The graph does not.**

So the graph is not a scheduler here. It is **the memory**. Each node loads only its own
bounded subgraph, does its work, writes a typed record, and drops everything else. The run
can go on indefinitely because nothing needs to be carried forward in the transcript.

## Two graphs, never collapsed

They have different truth standards, and merging them is the classic mistake.

| | `graph/build_graph.json` | `graph/spec_graph.json` |
|---|---|---|
| Kind | commit DAG, work lineage | knowledge graph, domain facts |
| Nodes | 22 build tasks | 115 facts: numbers, colours, dimensions, ids |
| Edges | `requires`, `produces` | `sourced_from`, `governs` |
| Truth standard | did this run, did its gates pass | is this the value the founder decided |
| Mutable | yes, status advances | **no, frozen** |
| Written by | Codex, after each node | the founder, via a BLOCKED answer |

Provenance is on the third file, `graph/runs.jsonl`: one record per node execution, with
what was produced, which gates passed, and **what needed correcting**.

## The fake-edge finding, and why the order changed

The first technique is to interrogate every arrow: *does this edge carry data, or is it
just the order I happened to write things in?* Cutting the fake edges gave hard numbers:

- **45 hours of work sit on a 15-hour critical path.** 67% is off it.
- The critical path is `T1.1 → T2.1 → T4.1 → T4.2 → T4.3 → T9.1 → T9.2`, which is exactly
  the auto-arm spine. The incompressible part is the part the submission rests on, which is
  the right shape.
- **The console cluster is 10.5 hours and needs almost nothing from the Android app.**
  `T8.2` requires only `T8.1 → T1.2 + T2.1`.

That last one was a real scheduling error the linear plan hid. The console **is the required
live demo link**, and it was scheduled for evening eight of nine. If evening eight went
badly we would have failed a hard submission requirement with no warning.

**The order is now risk-first, not phase-first:**

| Was | Now |
|---|---|
| Riskiest node (T4.2, geofencing) at ~evening 4 | **cleared by hour 9.5** |
| Live demo link (T8.2) at evening 8, ~hour 24 | **exists at hour 14** |
| Engine (T4.1) at evening 4 | **hour 6.5**, and it needs no device |

Even with zero parallelism, reordering alone means both catastrophic risks are retired in
the first third of the build.

## The node protocol, and the context hygiene that makes a long run survivable

For each node, in order, from `build_graph.json`:

```
1. LOAD   the node record. Read ONLY the docs in its `reads` array.
          Do not re-read the whole spec pack. That is the bounded subgraph.
2. PLAN   state the files you will create or change
3. BUILD  implement only this node's `produces` artifacts
4. VERIFY the 9 gates, plus this node's `extra_gates`, plus the grounded check
5. RECORD write the node record: status, gates_passed, artifacts, corrections
          append one line to graph/runs.jsonl
6. DROP   discard the working context for this node. Carry forward NOTHING except
          the graph. The next node re-reads what it needs.
```

Step 6 is the one that is easy to skip and the one that matters most. If the run starts
carrying accumulated context forward, it degrades into an ordinary long session and the
graph stops earning its keep.

**If the run dies**, it resumes from `build_graph.json`, not from the transcript. Node
status is the checkpoint.

## The grounded checker

The literature calls this the grounded checker pattern: instead of "seems off", demand an
edge. *Does this triple exist?* If not, return a structured revision request naming the
exact missing relation.

Our gate G6 used to be "no invention: every number traces to a spec doc", which is a vibe
check nobody can fail reliably. It is now mechanical:

```bash
python3 scripts/grounded_check.py <changed files>
```

Every numeric and colour literal in the changed source must trace to a fact id in
`spec_graph.json`. An unmatched literal is either an invented value (a spec violation) or
a real product value missing from the graph (a spec bug). Both need a human, and the
checker says so rather than guessing.

Three escape hatches, in order of preference: use the graphed value; STOP and report so the
founder decides and the fact is added; or, only for genuinely structural literals like a
loop bound, append `// GROUNDED-EXEMPT: <reason>` to that line. **Widening the TRIVIAL set
to silence a failure is forbidden**, because that converts the one mechanical check we have
back into a vibe check.

This matters because a plausible invented number is our single most likely failure mode and
the hardest to spot in review.

## Frozen nodes

Loops cannot modify these. Declared in `build_graph.json` under `frozen_nodes`.

| Frozen | Why |
|---|---|
| `docs/FEATURES.md` | the contract. An agent editing the contract to match its implementation is a real failure mode. |
| the three Vizag data files | audited, and they anchor the submission's evidence chain |
| iOS-verbatim strings in `COPY.md` | already in the brand voice and demo-tested |
| the trust boundary at SOS | the product's central claim |
| every fact in `spec_graph.json` | changed only by a founder decision, recorded as an amendment |

## Anchors

Anchors are measurements **from outside the graph**. They are the only evidence that can
mark a claim verified, because a loop grading its own homework decays.

| Anchor | Node |
|---|---|
| a real device arms a session with **no tap** | T4.2 |
| `aapt2 dump xmltree` shows `allowBackup="false"` | T1.1 |
| the console loads in a logged-out private window, on a phone, on another network | T8.2 |
| airplane mode, the escalation is not lost | T6.2 |
| check-in 2 appears over a locked screen | T5.1 |
| the V7 no-AI grep and V8 manifest check outputs | T9.2 |
| the founder reads the Telugu | T9.1 |

**A node whose gates pass but whose anchor was never taken is not done.** Codex cannot take
most of these; they are the founder's, and `build_graph.json` marks them.

## What we deliberately do not build

The method has more parts than we need, and adopting all of it would cost more than it
returns on a nine-evening solo build.

| Skipped | Why |
|---|---|
| Entity resolution and deduplication | our entities are hand-authored and unique. There is nothing ambiguous to merge, and a false merge is the risk that machinery exists to prevent. |
| Schema-constrained extraction pipeline | our facts are authored by the founder, not extracted from documents. There is no extraction step to constrain. |
| Governance loops, arbitration nodes, counter-metrics | these guard against gaming, blindness, conflict and decay in long-running autonomous systems. Ours runs nine evenings with the founder reviewing every node. |
| Parallel execution and worktree orchestration | founder decision: one continuous run. The graph still records what *could* run in parallel, so this is available later without a rewrite. |

## Files

```
graph/build_graph.json    22 nodes, typed edges, gates, status. The execution order.
graph/spec_graph.json     115 facts with provenance. Frozen.
graph/runs.jsonl          one line per node execution. Append only.
scripts/grounded_check.py the grounded checker. Gate G6.
```

`BUILD_STATE.md` remains as the human-readable view and is **generated from**
`build_graph.json`. The JSON is the source of truth; if they disagree, the JSON wins.


---

# Upgrade, 2026-08-18: the 14 steps, applied

## The finding that shaped the upgrade

Google Research measured multi-agent systems by task type, and the result cuts against the
obvious reading of every fan-out diagram:

| Task type | Result |
|---|---|
| Parallelisable, centralised coordination | **+81%** |
| **Sequential reasoning** | **-70%**, across every multi-agent variant tested |
| Error amplification, independent agents | **17.2x** |
| Error amplification, with a centralised orchestrator as validation bottleneck | **4.3x** |

Most of this build is sequential reasoning. `T4.1`'s state machine and `T4.2`'s geofencing
are not decomposable, and fanning out on them would make them worse. **The founder's choice
of one continuous sequential run is the correct architecture for this work, and the research
says so.**

But one part of our work *is* genuinely parallelisable and independent: **verification**.
And the 17.2x versus 4.3x figure says verification is exactly what stops errors propagating.

So the upgrade is narrow: **keep the sequential spine, add a verifier diamond on the edge.**

## Step by step: adopted, adapted, or rejected

| # | Step | Us |
|---|---|---|
| 1 | Nodes are jobs, edges are what flows | **Adopted.** An edge exists only where data moves. |
| 2 | Your linear script is a degenerate graph | **Adopted.** The fake-edge pass found 67% off the critical path and a live-link scheduled 10 hours too late. |
| 3 | Give every node a contract | **Adopted.** Every node has `requires`, `produces`, `reads`, `extra_gates`, `verify_lenses`. |
| 4 | The edge is a data contract; reduce in plain code | **Adopted.** Gate checks and verdict merging are code. Edges are free. |
| 5 | Fan out with `parallel()` | **Adopted for verification only.** Never for implementation, per the -70% finding. |
| 6 | Fan in at a barrier | **Adopted.** The verdict merge is a genuine barrier: a node passes only when every skeptic has reported. |
| 7 | The diamond: split, work, merge | **Adopted as the node shape.** Implement, gate, fan out skeptics, merge in code. |
| 8 | Route the edge at runtime | **Adopted, small.** Verify depth routes off node risk, which is the diff-size router in a fixed form. |
| 9 | **Put a verifier on the edge** | **Adopted. The single highest-value step for us.** See below. |
| 10 | Isolate nodes so one failure cannot poison the graph | **Partly.** A verifier that fails to run is treated as a **kill**, never a pass. Worktree isolation rejected: the roadmap says reach for it only when nodes write in parallel, and ours do not. |
| 11 | Add a cycle, but make it converge | **Adopted.** On rejection, fix and re-verify, deduping against **every finding seen for that node**, not only accepted ones. Otherwise rejected findings reappear forever and the loop never converges. |
| 12 | Tier the models across the nodes | **Adopted as tiered verification effort**, since there is one model here. 3 lenses on HIGHEST, 2 on HIGH, code gates elsewhere: 16 verifier runs, not 66. |
| 13 | Topology is your cost and latency | **Acknowledged.** Our spine is deliberately serial because the work is serial. The only barrier is the verdict merge, which genuinely needs every skeptic. |
| 14 | Let the model draw the graph | **Rejected.** Our graph is known and specified. Self-routing is for jobs you cannot plan in advance. |

## The verifier diamond

```
IMPLEMENT   one agent, node's bounded subgraph only
    |
REDUCE      plain code, zero tokens: G1-G8 + grounded_check.py
    |
VERIFY      fan out N fresh-context skeptics, each told to KILL the work
              spec       does it contradict, ignore or "improve on" the spec
              boundary   can anything identifying leak before SOS
              invention  does every literal trace to spec_graph
    |
MERGE       plain code: ANY kill rejects the node
    |
RECORD      node record, runs.jsonl, knowledge_graph.json
```

**Fresh context is the entire mechanism.** A verifier sharing the implementer's context
inherits its blind spots and will rationalise rather than attack. Each lens is told
explicitly that it did not write the code and must not defend it, and to **default to kill
when uncertain**.

**A verifier that fails to run is a kill, not a pass.** Fail closed. The one thing that
would quietly destroy this design is treating tooling trouble as a green light.

**Which nodes:** `T4.2` and `T7.2` get all three lenses, because one guards the core claim
(she arms with no press) and the other guards the trust boundary. `T4.1`, `T5.1`, `T7.1`,
`T8.2` and `T9.2` get two. Everything else runs on code gates alone.

## The knowledge graph

`graph/knowledge_graph.json`, 77 seeded entities and 48 edges. Typed entities: `source`,
`finding`, `claim`, `constraint`, `decision`, `competitor`, `persona`, `artifact`,
`failure`, `deviation`, `question`, `anchor`, `verification`.

Seeded with the full project brain: every research source and finding, every competitor
figure, the persona, the six submission claims with their evidence edges, all 19
constraints including the Safetipin guardrails, and all 15 founder decisions with rationale
and what motivated them.

**Codex appends after every node**, via `scripts/kg.py`. Never by hand.

```bash
python3 scripts/kg.py add-entity  art.engine artifact "SessionEngine.kt" node=T4.1
python3 scripts/kg.py add-edge    art.engine produced_by T4.1
python3 scripts/kg.py query       shakthi
python3 scripts/kg.py neighbours  claim.no_press
python3 scripts/kg.py check
```

The helper enforces what would otherwise be forgotten: **nothing is ever deleted**, only
superseded; every edge's endpoints must exist; and types must be declared. That is what
keeps the history auditable rather than tidy.

**Why this matters more than it looks.** In a long run, node 18 needs to know what node 4
decided. Reading node 4's transcript is impossible by then. Querying the graph takes one
command. The knowledge graph is what turns "the agent forgets" from a problem into a
non-issue, and it is also where the submission write-up's evidence chain lives, so
`EVIDENCE.md` and the write-up can both be checked against it.

## Two graphs became four files

| File | Kind | Mutable |
|---|---|---|
| `graph/build_graph.json` | commit DAG, work lineage | status only |
| `graph/spec_graph.json` | 115 facts, the values | **frozen** |
| `graph/knowledge_graph.json` | the project brain | **append only, never delete** |
| `graph/runs.jsonl`, `graph/verifications.jsonl` | provenance | append only |

They are kept separate on purpose. The roadmap and the crash course both warn that
collapsing graphs with different truth standards is the classic mistake: "did this run" and
"is this the right value" are not the same question.


---

# Upgrade 2: native subagent fan-out, 2026-08-18

**Codex can now spawn subagents from a parent agent.** The orchestration-script fallback is
removed. Fan-out is native, so breadth is affordable.

**But availability is not licence.** The constraint on fanning out implementation was never
tooling, it was task structure, and it still holds:

> Google Research: sequential reasoning tasks score **-70%** across every multi-agent variant.
> The graph-engineering repo's stop rule, independently: **parallel configurations win ~80%;
> sequential work loses across configurations.**

So the graph is now **mixed**, and every node declares its shape.

## Node shapes

| Shape | Meaning | Nodes |
|---|---|---|
| `serial` | sequential reasoning. **One agent.** Fanning out would make it worse. | 18 |
| `diamond` | genuinely decomposable: split, N parallel workers with contracts, merge in code | `T2.1`, `T1.3`, `T9.1` |
| `diamond+cycle` | a diamond, then loop-until-dry | `T9.2` |

**The four diamonds, and why only these four.** A node earns a diamond only when its
sub-jobs are independent, with no cross-item dependency:

| Node | Split | Workers | Merge |
|---|---|---|---|
| `T2.1` | one worker per bundled asset file | 3 | code: assert 24/19/37 counts and the lat-lon sanity range |
| `T1.3` | one worker per component C1-C14 | 14 | one integration pass: shared tokens, no duplicated helpers, gallery renders all 14 |
| `T9.1` | one worker per screen S1-S13 | 13 | code: no duplicate string keys, no hardcoded user-facing text remains |
| `T9.2` | one worker per submission check V1-V8 | 8 | code: all eight green, then loop-until-dry |

38 parallel worker spawns in total. Everything else stays single-agent, deliberately.

`T4.1` and `T4.2` are the clearest examples of what must **not** be split: a state machine
and a geofencing service are one piece of reasoning each. Handing halves of them to
different agents is precisely the -70% case.

## The cycle at T9.2

The final sweep is unknown-size discovery: finding one problem reveals two more. A counter
would miss the tail, so it loops until **2 consecutive rounds surface nothing new**, capped
at 5 rounds.

The detail that makes it converge, and that almost everyone gets wrong: **dedupe against
every finding SEEN, not only the confirmed ones.** Otherwise rejected findings reappear
each round and the loop pays to rediscover the same dead ends forever.

## Verification widened

Fan-out is native, so the verifier tier loosens. **Every node now gets at least one
fresh-context skeptic.**

| Risk | Lenses | Nodes |
|---|---|---|
| HIGHEST | spec, boundary, invention | 2 |
| HIGH | spec, boundary, invention | 5 |
| med | spec, invention | 8 |
| low | spec | 7 |

**44 verifier runs**, up from 16. The -70% finding constrains implementation, not
verification: skeptics are independent by construction, which is exactly the parallelisable
case that scores +81%.

Verification is now spawned natively by the parent agent. There is no script, no
`CODEX_CMD`, no subprocess. The lens prompts live in `README.md` and the rules are
unchanged: each skeptic is told it did not write the code, must not defend it, and should
**default to kill when uncertain**; a verifier that fails to run is a **kill**, never a
pass; and merging verdicts is plain code, zero tokens.

## Human gates

New, from the graph-engineering repo: a gate placed **exactly where a mistake is costly to
reverse**. Distinct from an anchor, which is a measurement. A gate is permission.

| Gate | When | Why it is irreversible |
|---|---|---|
| Firestore rules and public read go live | before `T8.1` | public read is hard to un-publish; confirm every record is synthetic first |
| Console URL becomes reachable | before `T8.2` | it is the submission's live link; once shared it is judged |
| APK published on the landing page | after `T9.0` | an installed APK cannot be recalled from a judge's phone |
| Submission | after `T9.2` | irreversible by definition |

Codex stops at each and waits. It does not ask permission for anything else.

---

# The knowledge graph, rebuilt on the 9-stage pipeline

Rebuilt at v2 against the pipeline from the graph-engineering repo and the ontology
methodology from the Southeast University Knowledge Graph course.

| Stage | Ours |
|---|---|
| 1 Scope | everything: build knowledge, product evidence chain, domain research |
| 2 Representation | typed property graph, JSON, one file |
| 3 **Ontology** | **14 classes with attributes; 14 relations with declared domain and range** |
| 4 Entities | 99, including 22 `BuildNode` mirrors so the two graphs link without merging |
| 5 Relations | 56 edges, each carrying `at`, `by` and `confidence` |
| 6 **Events** | first-class and temporal: 11 event types, append-only |
| 7 **Quality gate** | `kg.py check` validates class, relation, domain, range, provenance, dangling refs |
| 8 **Fusion** | `kg.py fuse` flags near-duplicate labels; `add-entity` warns at insert time |
| 9 **Serve to LLMs** | `kg.py context <id> --depth N` emits a **bounded subgraph**, never the whole store |

## What v2 added over v1

- **A real ontology.** v1 had flat type lists. v2 declares domain and range per relation, so
  a wrongly-typed edge is rejected at write time rather than discovered later.
- **Edges carry time and provenance.** The repo's phrasing is the right one: *a bare
  connection is not a fact.* Every edge records when it was asserted and by whom.
- **Events as a first-class layer**, separate from entities and relations. `node_completed`,
  `gate_failed`, `verifier_killed`, `anchor_taken`, `blocked`, `spec_amended` and others.
  Entities say what is true; events say what happened.
- **Fusion**, which v1 did not need and v2 does. Codex now writes entities every node, so
  `art.engine` and `art.session_engine` for the same file is a real risk. The tool warns at
  insert and `fuse` scans on demand. It refuses to auto-merge: **a false merge is worse than
  a duplicate.**
- **Bounded subgraph serving.** Stage 9 exists because handing an LLM the whole store defeats
  the purpose. `context` walks N hops and returns only that.
- **One integrity rule with teeth:** only an `Anchor` or a `Verification` may `verify` a
  `Claim`. Self-assertion is rejected by the quality gate.

## The gate earned its place immediately

On its first run, `kg.py check` rejected **10 edges in the data I had just seeded**. Both
causes were ontology errors, not data errors: `sourced_from` did not allow a `Claim` to rest
on a `Finding`, and did not allow a `Constraint` to come from a `Source`, which is exactly
what the Safetipin guardrails do. The ontology was widened and the data left alone.

That is the correct outcome and worth recording: the quality gate's first job was to catch
its own author.

---

# Isolation: no worktrees. Disjoint contracts instead.

## The question, and why the obvious answer was wrong

`T1.3` spawns 14 component subagents that all write into `ui/components`. The roadmap says
worktree isolation is for exactly that: nodes that write in parallel. So: add worktrees?

**No. The collision was a symptom of a badly-drawn node contract, not of parallelism.**

Step 3 says a node contract is bounded input, bounded output, exactly one job. The original
fan-out gave 14 workers a **shared output surface**: theme tokens, common helpers,
`strings.xml`, the gallery. Buying a seatbelt for that is treating the symptom.

And the roadmap is explicit about the cost: worktrees are *"the seatbelt for the one
topology that needs it, not a default tax on every run."* Fourteen full Android checkouts
is heavy on disk, slow, and turns one merge into fourteen.

**The node I should have worried about was not `T1.3`.** Its 14 component files are mostly
disjoint already. `T9.1` was the real problem: 13 screen workers all writing
`values/strings.xml` and `values-te/strings.xml`. Two shared files, thirteen writers,
guaranteed collision.

## The fix: every worker owns disjoint paths, the merge writes the shared files

| Node | Each worker owns | Merge writes |
|---|---|---|
| `T2.1` | its own parser and model file | `ZoneLoader.kt` |
| `T1.3` | `ui/components/<Name>.kt` + a JSON manifest | `SaayaModifiers.kt`, `ComponentGallery.kt` |
| `T9.1` | `build/fanout/T9.1/<Screen>.strings.json` | `strings.xml`, `values-te/strings.xml` |
| `T9.2` | `build/fanout/T9.2/<Vn>.json` | `summary.json`, and **never any source file** |

Workers coordinate through **manifests**, not through the filesystem. A `T1.3` worker
declares the tokens, strings and helpers it needs; it does not go and add them.

This is step 4 doing the work: the reduce is plain code, and **edges are free.**

## It converts a collision risk into a correctness check

This is the part that makes it better engineering rather than merely cheaper.

- `T1.3`'s merge **fails on an invented token**, because every `tokens_used` entry must exist
  in `spec_graph.json`. A shared-file write would have let a worker quietly add one.
- `T1.3`'s merge **fails when two workers declare the same helper with different signatures**,
  which is a real duplicate-symbol bug caught before it compiles.
- `T9.1`'s merge **fails loudly when two screens claim the same string key with different
  text.** With thirteen agents appending to one `strings.xml`, one of them would simply have
  won and nobody would have noticed.
- `T9.1`'s merge **fails on any key present in English but missing in Telugu.**

None of those checks are possible when workers write shared files directly.

## Enforced, not merely intended

```bash
python3 scripts/fanout_check.py <node> [worker ids...]
```

Asserts no two workers claimed the same path, no worker wrote outside its owned paths, and
no worker touched a merge-owned file. **A violation means the contract is wrong: fix the
contract, never widen the guard.**

**Workers never commit.** Only the parent commits, once, after the merge. That removes git
index contention as a category rather than managing it.

## When worktrees WOULD be right

Written down so this is not relitigated, and so the answer is available if it changes.

If a future diamond's workers must each modify the **same existing file** - a cross-cutting
refactor, a rename across call sites, a migration touching every caller - then the writes
are genuinely overlapping and no contract can make them disjoint. Isolate that node.

We have no such node. If one is ever added, isolate it. **Do not widen the contracts to fit.**
