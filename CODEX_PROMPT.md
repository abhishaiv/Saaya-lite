# Saaya Lite — resume here

You are the build agent. Mobile-first web app: Next.js 14 App Router, TypeScript strict,
Leaflet, Firebase, IndexedDB. Repo is cloned and on `main`. Everything is in the repo;
nothing is in this chat. Do not ask for context you can read.

**This file replaces the old prompt. The graph was restructured on 2026-08-24 for a reduced
token budget.** Do not re-derive where the build is: it is written below and in the graph.

## Where the build actually is

| | |
|---|---|
| Complete | `T1.1`, `T2.1`, `T4.1` |
| Live | **https://saaya-lite.vercel.app** — connected and deployed 2026-08-28, on commit `ed1ed4f`. Run G8/G9 anchors against this URL now. |
| In progress | `T1.3`. Components C1 to C6 done and more uncommitted in the worktree. Fonts done, subset shaping gate passed (`anchor.font_gate_passed`). |
| Remaining | **7 nodes, 32.0h** |
| Deadline | **2026-08-28 20:00 IST. No grace period.** |

**Start by committing the uncommitted `T1.3` work in the worktree, then finish `T1.3`.**
Then follow `graph/build_graph.json` order. `git pull` first: the graph changed under you.

## Read once, now, then start

1. `AGENTS.md` — the loop, the 10 gates, `always_read`, DECIDE OR STOP
2. `docs/spec/CODEX_TASKS.md` — your node list, generated from the graph
3. `graph/build_graph.json` — order, per-node `reads`, gates

Then per node: `always_read` plus that node's `reads`. Nothing else.

## What changed on 2026-08-24, so you do not look for it

**Dropped.** `T8.3` console live trigger only. The live update arriving without a refresh is
the point; a button that triggers it is not.

**Two earlier drops were reversed.** `T3.1` zone detail and `T7.3` the in-app trust screen
were cut on 2026-08-24 and reinstated the same day, because both were load-bearing:
`SCOPE` calls zone detail the reason she installs it on a calm day, and `DEMO_SCRIPT` opens
both on camera. `T3.1` is folded into `M4`, `T7.3` into `M2`. Build them.

**Merged.** Seventeen ids became five nodes so their shared reads load once:

| New | Replaces |
|---|---|
| `M1` Session UI | `T3.2` `T5.1` `T6.1` `T7.1` |
| `M2` Data and trust boundary | `T1.2` `T6.2` `T7.2` |
| `M3` Console | `T8.1` `T8.2` |
| `M4` Home | `T2.2` `T4.3` |
| `M5` Ship | `T9.0` `T9.1` `T9.2` |

A merged node is **one** node: load its reads once, build every part, report once. Old ids
still resolve in the knowledge graph if you query them.

**Order is demoability-first now, not purely risk-first.** The budget is fixed, so the order
decides what exists if it runs out. The visible spine comes first.

| # | Node | Title | h |
|---|---|---|---|
| 4 | `T4.2` | Geolocation watch, arming, wake lock, tab lifecycle | 3.0 |
| 5 | `T1.3` | Component library C1 to C14 (React) | 3.0 |
| 6 | `M4` | Home: map, zones, her dot, session states, arm banner, demo panel | 4.5 |
| 7 | `M1` | Session UI: onboarding, check-ins, family escalation, SOS | 10.5 |
| 8 | `M2` | Data and trust boundary: Firebase, offline queue, anonymiser, writers | 4.5 |
| 9 | `M3` | Console: seed zones and the state view | 3.5 |
| 10 | `M5` | Ship: submission page, demo-path Telugu and a11y, spot checks | 3.0 |

**Checkpoints. Commit at every one.**

| | |
|---|---|
| after `T1.3` | Components exist. Nothing user-visible yet. |
| after `M4` | HOME IS LIVE. Map, zones, her dot, session states and the demo panel on a real phone. First thing worth showing anyone. |
| after `M1` | THE LADDER RUNS. Shadow, check-in 1, check-in 2, family escalation, SOS, end to end on a phone. This is the MVP: if everything stops here, there is still a working product to demo. |
| after `M3` | THE ARGUMENT IS COMPLETE. The console receives the anonymous SUS event and the SOS incident live. This is what the submission is actually about. |
| after `M5` | SUBMITTABLE. |

**`M1` has a cut line inside it.** Build in the order the node states. Steps 1 to 4 are the
product; step 5 is onboarding polish and may be dropped without the demo suffering.

**Verification is proportional to risk.** `M2` **only** gets full adversarial verification:
spec, boundary and invention as fresh-context subagents, repeated until all three pass,
concentrated on the **anonymiser and the two Firestore writers**. Everywhere else is **one
spec verifier, one round**. Do not spawn more.

## The budget is fixed and it is the real constraint

One weekly credit window. It will not be topped up mid-build. Behave accordingly:

- **Commit at every checkpoint, and after every numbered step inside `M1`.** Uncommitted
  work is work that did not happen if the window closes.
- **Never rebuild something that is already committed.** `T1.1`, `T2.1` and `T4.1` are
  complete. `T4.2` is committed and only waits on its anchor. Components C1 to C6 exist.
- **Prefer finishing a node over polishing one.** A working ugly screen beats a beautiful
  half-screen, every time, at this budget.
- **If you judge the budget is running low**, stop at the next checkpoint, commit, and write
  a five-line state note: what is done, what is next, what is half-done, which gates are
  open. Do not start a node you cannot finish.
- **Do not spend budget re-reading.** See the token discipline below; it is the whole reason
  this restructure happened.

## Token discipline

Your tokens have been going on reloading, not on writing code. Three rules:

1. **Read each file once per node.** Do not re-open a file you already loaded in this node.
   If you cannot recall a detail, query the graph: `python3 scripts/kg.py query <term>`.
2. **Report in five lines.** node + done/blocked, files written, gates run, verifier verdict,
   anything a later node must know. No preamble, no recap, no restating what you built.
3. **RECORD keeps the knowledge-graph append** — it is a few lines and it stops the next
   node re-deciding this one's questions. The prose `CODEX_LOG.md` narrative is dropped.

**BLOCKED reports stay exactly as they are.** Ten so far, every one correct, several caught
real defects nothing else would have. That is not where the tokens are going. Keep blocking.

## Gates

```
python3 scripts/grounded_check.py <files>   G6, every literal traces to a LIVE fact
python3 scripts/grounded_check.py --explain <file>
python3 scripts/reads_check.py              G10, must report 0 unresolved types
python3 scripts/kg.py check                 must report 0 problems
npx vitest run                              must stay green
```

`--explain` now flags **AMBIGUOUS** when several live facts share a value and govern
different documents. A green G6 proves a number is known somewhere, never that it is the
right one here. That has blocked this build twice. Check the fact id, not the number.

## Human gates

| Gate point | What the founder must do |
|---|---|
| — | **None open.** Vercel is connected: https://saaya-lite.vercel.app. M2, M3 and M5 are cut to round two, so their gates no longer apply. |

If you reach a gated node and its gate is still open, **say so in one line and move to the
next node that is not gated.** Do not stall, do not invent a workaround, do not weaken a
gate to proceed.

## Hard rules

- No AI, ML or model calls anywhere in the product.
- `src/domain/` has zero React, DOM, browser API and no `Date.now()`. Time enters as
  `ctx.nowEpochMs`.
- Commands are intent-only. `NotifyFamily` carries no number and no message.
- Nothing identifying leaves the device before SOS. Favourites and the PIN hash never leave.
- Never regenerate the frozen Vizag assets. They are audited.
- No real Aadhaar, PAN, passwords, OTPs, payment or health data, fixtures included.
- Never commit secrets or anything in `.gitignore`.
- No government branding, no implied endorsement.
- Never run `firebase deploy` without explicit founder approval.
- Never invent a value. Superseded facts are not provenance.
- **Do not weaken a gate to make something pass.** If a gate is wrong, say so and fix the
  gate deliberately, as a decision, recorded.

## What the web cannot do, stated so you do not try

No background arming. No audio through the silent switch or Do Not Disturb. No lock-screen
presentation and no turning the screen on. No undismissable notification. No `FLAG_SECURE`,
so screenshots cannot be blocked. `navigator.vibrate` does not exist in iOS Safari. No
offline first launch: the Service Worker posts notifications and caches nothing.

Each is disclosed in the write-up. Claiming any of them is worse than lacking them.

## Start

1. `git pull`. The graph changed under you.
2. Commit the uncommitted `T1.3` work already in the worktree before anything else.
3. Print the node count from `graph/build_graph.json` and the entity/edge counts from
   `kg.py check`, in two lines.
4. Finish `T1.3`, then run continuously through `graph/build_graph.json` order.
