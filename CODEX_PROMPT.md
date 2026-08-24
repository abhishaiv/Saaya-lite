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
| Committed, not closed | `T4.2` at `da15bf9`. Code done. Waits on G8, the real-phone anchor and G9, all of which need the Vercel preview URL. |
| In progress | `T1.3`, components C1 to C6 done. Fonts done, subset shaping gate passed (`anchor.font_gate_passed`). |
| Remaining | 10 nodes, 32.0h |
| Deadline | **2026-08-28 20:00 IST. No grace period.** |

**Start at `T1.3`, component C7.** Then follow `graph/build_graph.json` order.

## Read once, now, then start

1. `AGENTS.md` — the loop, the 10 gates, `always_read`, DECIDE OR STOP
2. `docs/spec/CODEX_TASKS.md` — your node list, generated from the graph
3. `graph/build_graph.json` — order, per-node `reads`, gates

Then per node: `always_read` plus that node's `reads`. Nothing else.

## What changed on 2026-08-24, so you do not look for it

**Dropped.** `T3.1` zone detail sheet, `T7.3` police view in-app, `T8.3` console live
trigger. Off the judged path or duplicative. Their records stay in the graph with reasons;
they are not in `order` and you do not build them.

**Merged.** Twelve nodes became three, so their shared reads load once:

| New | Replaces | Why |
|---|---|---|
| `M1` Session UI | `T3.2` `T5.1` `T6.1` `T7.1` | all four read COMPONENT_LIBRARY, SCREENS, COPY, STATE_MACHINE |
| `M2` Data and trust boundary | `T1.2` `T6.2` `T7.2` | one data layer, one boundary |
| `M3` Console | `T8.1` `T8.2` | seeding exists to give the console something to read |

A merged node is **one** node: load its reads once, build every part, report once. The old
ids still resolve in the knowledge graph if you query them.

**Verification is now proportional to risk.** This is the big change.

- `M2` **only**: full adversarial verification. Spec, boundary and invention lenses, as
  fresh-context subagents, repeated until all three pass. Concentrate them on the
  **anonymiser and the two Firestore writers**. That is the trust boundary and the one place
  an error actually matters.
- Everywhere else: **one spec verifier, one round.** G6 and the browser gate already cover
  the mechanical part. Do not spawn more.

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

## Human gates, both still open

| Before | Gate | Blocks |
|---|---|---|
| `T1.1` | connect the repo to Vercel | closing `T4.2`'s anchor |
| `M2` | Firebase Web app config as `NEXT_PUBLIC_FIREBASE_*` | `M2`, `M3`, `T9.0` |
| `T2.2` | publish the production URL as the submission link | |
| `M3` | Firestore rules and public read go live | |
| after `T9.0` | submission form | |

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

Print the node count from `graph/build_graph.json` and the entity/edge counts from
`kg.py check`, in two lines. Then resume `T1.3` at C7 and run continuously.
