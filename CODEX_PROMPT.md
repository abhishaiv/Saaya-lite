# Codex Prompt - graph-driven continuous run

Founder decision 2026-08-18: **one continuous run.** Every node implemented and verified,
one after the other. Paste the prompt below once. If the run dies, paste the Resume prompt.

---

## RUN (paste once)

```
You are building Saaya Lite: a native Android app in Kotlin and Jetpack Compose, for the
Build What Moves India hackathon.

Repository: https://github.com/abhishaiv/Saaya-lite  (public, branch `main`)
Working directory is this repository, already cloned and with the remote configured.

A complete specification already exists: 38 documents plus a build graph, roughly 44,000
words. Your job is to implement it exactly. You are not designing anything.

This is a GRAPH-DRIVEN CONTINUOUS RUN. You will implement 22 nodes in order, verifying
each before moving on. The graph is your memory, not the transcript. Read
docs/spec/GRAPH_ENGINEERING.md first and understand why before you start.

READ FIRST, IN FULL, IN THIS ORDER:
  1. AGENTS.md                          the loop, the 9 gates, the hard rules, the doc map
  2. docs/spec/GRAPH_ENGINEERING.md     why the graph, the node protocol, the verifier
                                        diamond, frozen nodes, anchors, the knowledge
                                        graph, and the context-hygiene rule
  3. docs/spec/SPEC_README.md           precedence when docs disagree, the 12
                                        non-negotiables, prototype posture
  4. docs/FEATURES.md                   THE CONTRACT. 33 features. Not in it, not built.
  5. docs/SCOPE.md                      what is deliberately out, real vs mocked
  6. graph/build_graph.json             the 22 nodes and the execution order

Then, before writing any code, confirm back to me:
  - the first node id, its `produces` list, and its `reads` list
  - the files you intend to create
  - the output of the two self-checks below
  - anything the spec does not cover that you would otherwise have to invent

SELF-CHECKS, run both and paste the output:
  for i in $(seq 1 33); do grep -rq "F$i\b" docs/spec/ docs/FEATURES.md || echo "UNCOVERED F$i"; done
  python3 scripts/grounded_check.py --staged
Both must print nothing of concern. An uncovered feature means its specification is
missing and you would have to invent it. Report it instead of building it.

THEN RUN THE NODE LOOP, from README.md, for every node in graph/build_graph.json order:

  1. LOAD    the node record. Read ONLY the docs in its `reads` array.
             Do NOT re-read the whole spec pack. That array is your bounded subgraph.
  2. PLAN    state the files you will create or change
  3. BUILD   read the node's `shape`:
               serial        ONE agent, no fan-out. 18 of 22 nodes. Sequential
                             reasoning scores -70% when split; do not split it.
               diamond       spawn one subagent per item in `fanout.items`,
                             concurrently. Each worker writes ONLY its `owns` paths
                             plus its manifest, NEVER a shared file and NEVER another
                             worker's path, and workers never commit. Then run
                             `python3 scripts/fanout_check.py <node> <ids>`, then
                             MERGE IN CODE, never with an agent
               diamond+cycle diamond, then loop-until-dry: stop after 2 consecutive
                             empty rounds, cap 5, dedupe against every finding SEEN
             Implement only this node's `produces` artifacts, nothing more
  4. GATE    the 9 gates, plus the node's `extra_gates`, plus:
                python3 scripts/grounded_check.py <changed files>
             These are code, zero tokens. All must pass.
  5. VERIFY  spawn the node's `verify_lenses` as SUBAGENTS, concurrently, each with
             FRESH CONTEXT, each told: you did not write this code, you must not
             defend it, your only job is to kill it, default to kill when uncertain.
             Merge the verdicts IN CODE. ANY kill rejects the node.
             A verifier that fails to run is a KILL, never a pass.
             Fix, then re-verify, deduping against EVERY finding seen for this node.
  6. RECORD  update graph/build_graph.json status; append to graph/runs.jsonl; append
             the prose entry to docs/spec/CODEX_LOG.md; and update the knowledge graph:
                python3 scripts/kg.py add-entity <id> artifact "<what>" node=<node>
                python3 scripts/kg.py add-edge   <id> produced_by <node>
             plus a `decision`, `failure`, `deviation` or `question` entity for anything
             this node forced. Never hand-edit graph/knowledge_graph.json.
  7. DROP    discard this node's working context. Carry forward NOTHING but the graph.
             When you need to know what an earlier node decided, QUERY the knowledge
             graph (python3 scripts/kg.py query <term>). Do not try to recall it.
  8. COMMIT   git add -A && git commit, ONE commit for this node, subject
              "<node id> <what it did>", body listing gates passed and anything
              corrected, plus the trailers Node:, Built-with: OpenAI Codex and
              Verified-by:. Then git push origin main.
              Never commit google-services.json, local.properties, a keystore, or
              anything matching .gitignore.
  9. REPORT   one short summary to me, then continue to the next node

STEP 6 IS NOT OPTIONAL. If you carry accumulated context forward, this becomes an
ordinary long session, quality degrades before it visibly breaks, and you will start
inventing values that look plausible. Re-read from the graph every node.

HARD RULES. Breaking one means the work is wrong even if it compiles:
  - No AI, no ML, no model calls anywhere. Every decision is a stated rule.
  - Never invent a number, colour, string, radius, threshold or version. Every literal
    must trace to a fact id in graph/spec_graph.json. If a value is missing, that is a
    spec bug: STOP and report it. Do NOT widen the TRIVIAL set in the checker to make a
    failure go away.
  - There are NO third-party API keys in this project. If you think you need one,
    something has drifted. Read docs/spec/SECRETS_AND_ACCESS.md and STOP.
  - The trust boundary is at SOS. Nothing identifying leaves the device before it.
  - Never add a dependency outside docs/spec/ARCHITECTURE.md and the version catalog.
  - Frozen nodes cannot be modified: docs/FEATURES.md, the three Vizag data files, the
    iOS-verbatim strings, the trust boundary, and every fact in graph/spec_graph.json.
  - You may write to: graph/build_graph.json (status only), graph/runs.jsonl,
    docs/spec/CODEX_LOG.md, source code, and a spec doc ONLY when I answer a BLOCKED
    question. Never docs/FEATURES.md, never progress.md, never README.md.
  - Write the JVM unit tests named in docs/spec/TEST_PLAN.md as part of each node, not
    afterwards. They are what prove the trust boundary holds.

ANCHORS. Some nodes need a measurement only I can take, marked in BUILD_STATE.md.
A node whose gates pass but whose anchor was never taken is NOT done. When you reach one,
tell me exactly what to check and wait. These are: T1.1 manifest dump, T4.2 arms with no
tap on a real device, T5.1 check-in 2 over a locked screen, T6.2 airplane mode, T8.2
console logged out on another network, T9.1 Telugu, T9.2 the V7 and V8 outputs.

STOP AND REPORT, do not work around, when:
  - a gate fails 3 times
  - the grounded checker flags a literal you believe is correct
  - the spec does not cover a decision you need
  - a node needs a physical device or a credential
  - you believe a spec document is wrong

BLOCKED format:
  BLOCKED on <node id>
  Need: <the exact decision or value missing>
  Where it belongs: <which spec doc, and whether it is a spec_graph fact>
  Options: <2 or 3, with a recommendation and the tradeoff>

Start now: read the six documents, run both self-checks, then confirm the plan for node
T1.1 before writing any code.
```

---

## RESUME (paste only if the run dies)

```
Resuming the Saaya Lite graph-driven build. Working directory is this repository.

Read, in full:
  1. AGENTS.md                        the loop, the 9 gates, the hard rules
  2. docs/spec/GRAPH_ENGINEERING.md   the node protocol and the context-hygiene rule
  3. graph/build_graph.json           find the first node whose status is not "complete"
  4. the last 3 lines of graph/runs.jsonl, so you know what just happened
  5. ONLY the docs in that node's `reads` array

Do not read the whole spec pack. Do not reconstruct the previous session from the
transcript. The graph is the checkpoint.

Tell me the node id, its `produces` list, and your file plan. Wait for my go, then
continue the node loop exactly as before.
```

---

## FIRST, ONCE: get the repo

```bash
gh repo clone abhishaiv/Saaya-lite && cd Saaya-lite
```

Everything below runs inside that clone. The specification is already committed there;
you are adding application code to it, node by node.

## FOUNDER NOTES

**Why the order looks strange.** It is risk-first, not phase-first. The two nodes most
likely to sink the build clear early:

| Node | Cleared at | Why it is first |
|---|---|---|
| `T4.1` engine | hour 6.5 | highest-value logic, pure JVM, needs no device to verify |
| `T4.2` geofencing | hour 9.5 | the likeliest evening-killer on Android |
| `T8.2` console | **hour 14** | this is the **required live demo link**. It was scheduled for evening 8. If evening 8 had gone badly we would have failed a hard submission requirement with no warning. |

**Your anchors, in order.** Codex will stop and ask for each. Nothing else needs you.

1. `T1.1` — `aapt2 dump xmltree` shows `allowBackup="false"`
2. `T4.2` — **a real phone arms a session with no tap.** The most important check in the build.
3. `T5.1` — check-in 2 appears over a locked screen
4. `T6.2` — airplane mode, the escalation survives
5. `T8.2` — open the console logged out, on a phone, on another network
6. `T9.1` — read the Telugu. Codex cannot judge it.
7. `T9.2` — the V7 no-AI grep and V8 manifest outputs

**Before you start:** create the Firebase project per `docs/spec/SETUP.md`. It is needed
at node 5.

**The failure mode to watch for.** Codex inventing a plausible number instead of stopping.
The grounded checker catches it mechanically now, so the tell has changed: watch for Codex
proposing to add a value to `spec_graph.json` or to widen the checker's TRIVIAL set. Both
mean it wants to invent. A new fact is **your** decision, not its.
