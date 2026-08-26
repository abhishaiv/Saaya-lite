# AGENTS.md

**Codex: this file is your entry point. Read it completely, then start the loop.**

This is the build agent's manual. Humans reviewing this project should read `README.md`
instead, which explains what Saaya Lite is and how to verify it.

Saaya Lite is a mobile-first web app for the Build What Moves India hackathon (submission
2026-08-27). A scoped prototype of Saaya, a women's safety product for Visakhapatnam.

**Repository:** https://github.com/abhishaiv/Saaya-lite (public, branch `main`)

**The one claim the whole build exists to prove:** she never presses anything, and what
reaches the state is legible anyway.

A complete specification already exists: **41 documents, 185 frozen facts,
147 knowledge-graph entities, 366 provenanced edges.**
You are implementing it, not designing it.

---

## THE LOOP

One continuous run. **13 nodes**, in the order in `graph/build_graph.json`.

Context is your enemy in a long run: quality degrades *before* it visibly breaks, as you
start paraphrasing a spec you read twenty nodes ago and inventing plausible values. The
graph is the fix.

> **The agent forgets. The graph does not.**

Read `docs/spec/GRAPH_ENGINEERING.md` once before you start.

```
For each node in graph/build_graph.json order:

1. LOAD    ALWAYS re-read the four files in `always_read` (below), plus ONLY the docs in
           this node's `reads` array. That is your bounded subgraph. Do not re-read the
           whole spec pack, and do not work from memory of a doc you read earlier.

           **Read each file ONCE per node.** Open it, take what the node needs, and do not
           re-open it later in the same node. Re-reading a file you already loaded is the
           single largest avoidable cost in this build, and it buys nothing: the content
           has not changed since you read it ten minutes ago. If you cannot recall a
           detail, that is what the knowledge graph query is for.

2. PLAN    state the files you will create or change; confirm they match `produces`.

3. BUILD   obey the node's `shape`:
             serial         ONE agent. Do NOT fan out. Sequential reasoning scores -70%
                            when split. 9 of 13 nodes.
             diamond        spawn one subagent per item in `fanout`, concurrently. Each
                            worker writes ONLY its `owns` paths plus its manifest. NEVER
                            a shared file, NEVER another worker's path, and workers NEVER
                            commit. Then run scripts/fanout_check.py, then MERGE IN CODE.
             diamond+cycle  as diamond, then loop until 2 consecutive rounds surface
                            nothing new, cap 5. Dedupe against every finding SEEN.

4. GATE    the 10 gates below plus the node's `extra_gates`. Code, zero model tokens.

5. VERIFY  spawn this node's `verify_lenses` as SUBAGENTS, concurrently, FRESH CONTEXT:
             "You are an adversarial verifier. Lens: <LENS>. You did NOT write this code
              and you must not defend it. Your only job is to KILL this work. Default to
              kill=true when uncertain. Return ONLY JSON:
              {lens, kill, confidence, findings:[{file,line,what,why_it_matters,spec_ref}]}"
             spec       does it contradict, ignore or "improve on" the spec
             boundary   can anything identifying leak before SOS
             invention  does every literal trace to the RIGHT fact in spec_graph.json.
                        A same-valued fact governing something else is NOT provenance.
                        Run `grounded_check.py --explain <files>` to see what matched.
           MERGE verdicts IN CODE. Any kill rejects the node.
           A verifier that fails to run is a KILL, never a pass.

6. RECORD  node status + artifacts in graph/build_graph.json; a line in graph/runs.jsonl;
           and the knowledge graph:
             python3 scripts/kg.py add-entity <id> Artifact "<what>" node=<node>
             python3 scripts/kg.py add-edge   <id> produced_by node.<node>
             python3 scripts/kg.py event      node_completed "<summary>" node=<node>
           plus a Decision, Failure, Deviation or Question entity for anything this node
           forced. Never hand-edit graph/knowledge_graph.json.

           The graph append STAYS: it is a few lines, and it is what stops the next node
           re-deciding something this one already settled. The prose CODEX_LOG narrative
           does NOT: it restated what the graph already holds, at length. One line there
           if a correction needs prose, otherwise nothing.

7. DROP    discard this node's working context. Carry forward NOTHING but the graph.
           To recall an earlier decision, QUERY it:
             python3 scripts/kg.py query <term>
             python3 scripts/kg.py context <id> --depth 2

8. REPORT  FIVE LINES, then the next node. Not prose:
             node id + done/blocked
             files written
             gates run + result
             verifier verdict
             anything a later node must know
           No preamble, no recap of the spec, no restating what you just built. The graph
           and the diff are the record; the report is a pointer.
```

**Step 7 is the one that makes a long run survivable and the one most likely to be skipped.**
If the run dies, resume from `graph/build_graph.json`, never from the transcript.

### always_read

- `AGENTS.md` (this file)
- `docs/spec/SPEC_README.md`
- `docs/FEATURES.md`
- `docs/SCOPE.md`

Re-read these at the START of EVERY node, in addition to the node's `reads` array. The DROP step discards node context, which would otherwise drop the contract itself. These four are small and they are what stop scope drift across a long run.

---

## THE 10 GATES

A node is not done until every one passes. Stop at the first failure.

| # | Gate | Check |
|---|---|---|
| G1 | Compiles | `npm run build` exits 0 |
| G2 | Lint | `npx tsc --noEmit && npm run lint`, zero errors |
| G3 | Tests | `npx vitest run` exits 0 |
| G4 | New tests exist | the tests named in `TEST_PLAN.md` for this node are written and passing |
| G5 | Acceptance | the node's "Done when" is literally true, checked by running it |
| G6 | **Grounded** | `python3 scripts/grounded_check.py <files>` exits 0. Every numeric and colour literal traces to a fact in `graph/spec_graph.json`. **Never widen the TRIVIAL set to silence a failure.** |
| G7 | Non-negotiables | re-read the 12 in `SPEC_README.md`; none broken |
| G8 | Runs in a browser | the Vercel preview loads on a real mobile browser and the affected screen behaves as `SCREENS.md` describes |
| G10 | **Reads complete** | `python3 scripts/reads_check.py` exits 0. A node that cannot see the document defining what it must build will block, and correctly: the fault is the graph's. |
| G9 | **Verified** | every lens in `verify_lenses` ran fresh-context and none returned kill |

**Fails 3 times: STOP and report.** Never work around a gate, disable a test, or lower an
acceptance criterion.

---

## EXECUTION ORDER

Risk-first, not phase-first. Do not reorder it.

| # | Node | Title | Risk | Verify | Cum h |
|---|---|---|---|---|---|
|  1 | `T1.1` ✓ | Scaffold: Next.js, TypeScript, theme tokens, Vercel | low | spec | 2.0 |
|  2 | `T2.1` ✓ | Zone parsing to typed Zone/ZoneCard/PoliceStation (TS) | low | spec | 3.5 |
|  3 | `T4.1` ✓ | Session engine, pure TypeScript, zero browser API | HIGH | spec, boundary, invention | 6.5 |
|  4 | `T4.2` | Geolocation watch, arming, wake lock, tab lifecycle | HIGHEST | spec | 9.5 |
|  5 | `T1.3` ✓ | Component library C1 to C14 (React) | med | spec | 12.5 |
|  6 | `M4` | Home: map, zones, her dot, session states, arm banner, demo panel | med | spec | 17.0 |
|  7 | `M1` | Session UI: onboarding, check-ins, family escalation, SOS | med | spec | 27.5 |
|  8 | `M2` | Data and trust boundary: Firebase, queue, anonymiser, writers, and the trust screen | high | spec, boundary, invention | 33.5 |
|  9 | `M3` | Console: seed zones and the state view | med | spec | 37.0 |
| 10 | `M5` | Ship: submission page, demo-path Telugu and a11y, spot checks | med | spec | 40.0 |

**10 nodes, down from 22.** Restructured 2026-08-24 for a fixed weekly credit budget.
Dropped `T3.1`, `T7.3`, `T8.3`. Merged seventeen ids into `M1` to `M5` so shared reads load
once. Retired ids keep their records and are not executed.

**Order is demoability-first, not purely risk-first.** With a hard ceiling the order decides
what exists if the budget runs out, so the visible spine comes first. Checkpoints are in
`graph/build_graph.json`; the one after `M1` is the MVP line.

**Verification is proportional to risk.** `M2` alone gets spec, boundary and invention,
repeated until all pass, on the anonymiser and the two Firestore writers. Everywhere else is
one spec verifier, one round.

---

## DECIDE OR STOP

Before you block, apply this test:

> **Could this choice change what Meera experiences, or what the state receives?**

**No** — decide it yourself, record a `Decision` via `kg.py`, mention it in one line, and
keep going. Internal type shapes, a `Command` case for an effect the spec already requires,
naming, which API to use, test structure: all yours.

**Yes, or unsure** — stop. A product value missing from `spec_graph`, anything crossing the
trust boundary, two specs contradicting each other, a new dependency, a credential or
device, three gate failures, or a spec document you believe is wrong.

Full table in `SPEC_README.md`. Bias toward continuing on plumbing and stopping on
behaviour: a wrong internal type name costs a rename, a wrong escalation timing costs the
product's central claim.

## RUN CONTINUOUSLY - stop only for these

**Do not pause for approval after a completed node.** Finish it, commit, push, report in one
or two lines, and start the next one. The founder is not reviewing every node.

**Stop and wait only when:**

| Stop | Why |
|---|---|
| **BLOCKED** | the spec is silent, or a value needs a decision. Full format. |
| **A gate fails 3 times** | do not spend a fourth attempt |
| **A human gate** | before `T8.1`, before `T8.2`, after `T9.0`, after `T9.2`. Permission, not measurement. |
| **An anchor needs the founder** | `T4.2` hardware, `T9.1` Telugu, `T9.2` V7/V8 output |
| **You believe a spec document is wrong** | say so; three times now that has been correct |

Everything else, keep going. A node that passes its nine gates and its verifiers is done, and
the next node starts immediately.

**Batch your proposals.** If several values need the cite-and-propose path, collect them
across the node and post one list rather than stopping at each.

## HUMAN GATES

Four points where a mistake is costly to reverse. **Stop, explain, wait.** Ask permission
for nothing else. A gate is permission; an anchor is a measurement. Both are required.

| Node | When | Gate | Why irreversible |
|---|---|---|---|
| T8.1 | before | Firestore rules and public read go live | public read is hard to un-publish; confirm every record is synthetic first |
| T8.2 | before | console URL becomes reachable | this is the submission's live link; once shared it is judged |
| T9.0 | after | deployed site published on the landing page | an installed deployed site cannot be recalled from a judge's phone |
| T9.2 | after | submission | irreversible by definition |

---

## HARD RULES

Breaking one means the work is wrong even if it compiles.

1. **No AI, no ML, no model calls in the product.** Every decision is a stated rule.
2. **Never invent a value.** But a value **already written in a specification document** is
   a transcription, not an invention: batch those with `<doc>:<line>` citations and propose
   them in one message rather than blocking one at a time. See "Proposing a fact" in
   `SPEC_README.md`. Anything requiring a choice is still a full BLOCKED. Every literal traces to `graph/spec_graph.json`. A missing
   value is a spec bug: STOP and report. A new fact is the founder's decision, not yours.
3. **No third-party API keys exist here.** If you think you need one, something has drifted:
   read `docs/spec/SECRETS_AND_ACCESS.md` and STOP.
4. **The trust boundary is at SOS.** Nothing identifying leaves the device before it.
5. **A SUS record snaps to its zone and carries no session id.** No coordinate, ever.
6. **Favourites never leave the device.**
7. **No live location sharing exists.** Absent, not disabled.
8. **Every mock is labelled in the UI**, not only the write-up.
9. **The escalation accent never animates. SOS appears instantly.**
10. **No government branding or implied endorsement.** All data synthetic.
11. **Never add a dependency** outside `ARCHITECTURE.md` and the version catalog.
12. **Never touch the Saaya production Firebase project. Never regenerate the Vizag dataset.**

**Frozen, cannot be modified:** `docs/FEATURES.md`, the three Vizag data files, the
iOS-verbatim strings, the trust boundary, every fact in `graph/spec_graph.json`.

**Git.** Branch `main`. **One commit per completed node**, never per file, and only after
all 10 gates pass. Subject line is the node id and what it did: `T4.1 session engine with
full transition table`. Body says which gates passed and what needed correcting. Push after
each node so the founder can follow along. Never commit `google-services.json`,
`local.properties`, a keystore, or anything in `.gitignore`.

**You may write to:** `graph/build_graph.json` (status), `graph/runs.jsonl`,
`graph/knowledge_graph.json` (via `scripts/kg.py` only), `docs/spec/CODEX_LOG.md`, source
code, and a spec doc **only** when the founder answers a BLOCKED question.
**Never** `docs/FEATURES.md`, `progress.md`, or this file.

---

## WHEN BLOCKED

**Stop. Do not invent.** The specs are exhaustive by design; a missing value is a spec bug.

```
BLOCKED on <node id>
Need: <the exact decision or value missing>
Where it belongs: <which spec doc, and whether it is a spec_graph fact>
Options: <2 or 3, with a recommendation and the tradeoff>
```

Once answered, **write the answer into the spec first** (and into `spec_graph.json` if it is
a value), then continue. The spec stays the single source of truth.

---

## THE GRAPH

| File | Kind | You may |
|---|---|---|
| `graph/build_graph.json` | commit DAG: 13 active nodes plus retired records, typed edges, gates, status. Your execution order and resume checkpoint. | write status |
| `graph/spec_graph.json` | 115 facts: every number, colour and dimension, with provenance | **frozen** |
| `graph/knowledge_graph.json` | project brain: 139 entities, 366 edges, 15 classes with domain/range | append via `kg.py` only |
| `graph/runs.jsonl`, `graph/verifications.jsonl` | provenance | append |

| Script | Does |
|---|---|
| `scripts/grounded_check.py` | gate G6: every literal traces to a fact |
| `scripts/fanout_check.py` | asserts diamond workers wrote only their owned paths |
| `scripts/kg.py` | ontology, add-entity, add-edge, event, check, fuse, context, query, supersede |

---

## DOCUMENT MAP

All 41 documents. Every one is a `Document` entity in the knowledge graph, wired to
the nodes that read it. Query with `python3 scripts/kg.py query <name>`.

**Always (in `always_read`):** `AGENTS.md`, `docs/spec/SPEC_README.md`, `docs/FEATURES.md`,
`docs/SCOPE.md`

**Per node:** whatever the node's `reads` array names. Never more.

| Doc | Answers |
|---|---|
| `docs/FEATURES.md` | **THE CONTRACT.** 33 features, the 4-step ladder, what the state can and cannot see |
| `docs/SCOPE.md` | in, out, and the real-vs-mocked table |
| `docs/BUILD_PLAN.md` | the evenings, the definitions of done, the fixed cut order |
| `docs/spec/SPEC_README.md` | precedence, the 12 non-negotiables, prototype posture |
| `docs/spec/GRAPH_ENGINEERING.md` | why the graph, the node protocol, isolation, the knowledge graph |
| `docs/spec/CODEX_TASKS.md` | the task text for each node |
| `docs/spec/SETUP.md` | Firebase, tooling, repo layout, deploy commands |
| `docs/spec/SECRETS_AND_ACCESS.md` | every key and config file. **There are none to obtain.** |
| `docs/spec/BUILD_CONFIG.md` | Next.js, Vercel, versions, the closed list |
| `docs/spec/ARCHITECTURE.md` | modules, layers, threading, DI, repositories |
| `docs/spec/DATA_MODEL.md` | assets, IndexedDB, both Firestore payloads, rules, indexes |
| `docs/spec/BUSINESS_RULES.md` | **every number in the product** |
| `docs/spec/STATE_MACHINE.md` | states, events, transitions, recovery, full types |
| `docs/spec/DESIGN_SYSTEM.md` | colour, Poppins scale, shape, the escalation grading |
| `docs/spec/COMPONENT_LIBRARY.md` | 14 components at exact px, every state |
| `docs/spec/SCREENS.md` | 13 screens, layouts, navigation |
| `docs/spec/MAP_SPEC.md` | Leaflet, CARTO tiles, zone rendering, offline |
| `docs/spec/ICONOGRAPHY.md` | Material Symbols Rounded, the SF Symbols mapping |
| `docs/spec/MOTION_SPEC.md` | every animation, and the two that must never animate |
| `docs/spec/INTERACTION_SPEC.md` | gestures, haptics, sound, back behaviour |
| `docs/spec/RESPONSIVE_SPEC.md` | 320 px up, portrait, font scale to 2.0x |
| `docs/spec/STATES_CATALOGUE.md` | loading, empty, error, offline, denied, all screens |
| `docs/spec/ACCESSIBILITY_SPEC.md` | screen reader, focus, contrast, motor, cognitive |
| `docs/spec/COPY.md` | every string, English and Telugu, locked vocabulary |
| `docs/spec/WEB_PLATFORM.md` | geolocation, wake lock, tab lifecycle, and what a browser cannot do |
| `docs/spec/CONSOLE_SPEC.md` | the console, our live demo link, the journey trigger |
| `docs/spec/TEST_PLAN.md` | acceptance criteria, four layers, V1-V8 |
| `docs/spec/DEMO_SCRIPT.md` | the 3-minute video, shot by shot |
| `docs/spec/SUBMISSION.md` | landing page, write-up template, checklist |
| `docs/PROBLEM.md` | the problem, against the brief's six questions |
| `docs/EVIDENCE.md` | every number sourced |
| `docs/COMPLIANCE.md` | the brief clause by clause: standing, originality, provenance |
| `docs/OPERATING_MODEL.md` | the process: who receives what, who acts, what closes the loop |
| `docs/spec/CODEX_LOG.md` | your log. **A submission deliverable.** |
| `BUILD_STATE.md` | human view of the graph, generated from it |
| `CODEX_PROMPT.md` | the founder's prompts |
| `progress.md` | founder's decision log. **Read for context, never write.** |

---

## WHY THE LOG MATTERS

Saaya Lite contains **no OpenAI model in the product**, so Codex building it is the sole
basis for the hackathon's "built with Codex or powered by an OpenAI model" requirement.
`CODEX_LOG.md` is quoted in the submission.

Write each entry the same session, and **be honest in "needed correcting"**. A write-up that
admits where Codex was wrong reads as real engineering. One claiming a clean run reads as
marketing, and these judges build with Codex daily.

---

## BEFORE YOU START

Run both and paste the output:

```bash
for i in $(seq 1 33); do grep -rq "F$i\b" docs/spec/ docs/FEATURES.md || echo "UNCOVERED F$i"; done
python3 scripts/kg.py check
```

The first must print nothing. The second must report 0 problems.

Then create the Firebase project per `docs/spec/SETUP.md` (needed at node `T1.2`), read
`docs/spec/GRAPH_ENGINEERING.md`, and begin the loop at node **`T1.1`**.
