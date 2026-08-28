# Saaya Lite — round two, isolated

You are building **M2 (data and trust boundary) and M3 (console)** for Saaya Lite, a
women's-safety web app. You are running in a completely separate git worktree from the
agent building the live submission. Read this whole file before touching anything.

## Where you are, and why it is safe to build here

This directory (`/tmp/saaya-round2`) is a git worktree on branch `round2/backend`,
forked from the commit that is live in production. It is **not** the directory the other
agent is working in, and it is **not synced to iCloud** — it lives on local disk specifically
so two agents can work at once without file contention or corruption.

The live submission at **https://saaya-lite.vercel.app** already works end to end without
Firebase: map, zone detail, auto-arm, both check-ins, family escalation, SOS. It was
submitted that way on purpose under a hard deadline. **Your job is to build the backend and
console properly, on your own branch, so it can be reviewed and merged for round two** —
not to touch the submission.

## The one rule that overrides everything else here

**You never touch branch `main`, and you never touch:**
- `graph/build_graph.json`
- `graph/knowledge_graph.json`
- the live Vercel project or its environment variables
- `firebase deploy`, in any form, for any reason

Those belong to the other agent and to the founder. Your only outputs are commits on
`round2/backend` in this worktree. When both nodes are done and every gate below passes,
**stop and report** — do not open a PR, do not merge, do not push to `main`. A human decides
when this integrates.

## What to build, and in what order

Read `graph/round2_graph.json`. It has two nodes, `M2` then `M3`, each with its own `reads`
list (files in `docs/`), `build_order`, and `done_when` criteria. Read a node's `reads` files
before writing any code for it — this project runs on the same discipline the other agent
uses: nothing is invented, everything traces to a spec file or a frozen fact in
`graph/spec_graph.json`.

**M2 is the important one.** It is marked `verify_lenses: [spec, boundary, invention]` for a
reason: it is the trust boundary. The anonymiser and the two Firestore writers are the one
place in this entire product where a mistake is not cosmetic — it is a privacy failure. Build
the anonymiser first, as a pure function, and write its test before you wire it to anything
live. The exact contract is in the node's `the_one_rule_that_cannot_bend` field. Do not
proceed past a failing anonymiser test for any reason.

## Config

`.env.local` in this worktree already has the real Firebase Web SDK config for the
`saaya-lite` project (anonymous auth, Firestore). It is gitignored — never commit it, never
print the API key into a file that gets committed. It is not a secret in the security sense
(Firebase web config is public by design; Firestore rules are the real boundary), but keep
it out of git regardless, because that is the project's standing convention.

## Gates — the same scripts the other agent uses, because the facts are shared

```
npx vitest run                              must be green, including new anonymiser tests
npx tsc --noEmit && npm run lint             must be clean
python3 scripts/grounded_check.py <files>    G6 — every literal traces to a live fact in
                                              graph/spec_graph.json. Never invent a value.
python3 scripts/reads_check.py               G10 — must still report 0 unresolved. Your work
                                              must not break the type contract the rest of
                                              the app depends on.
```

Do **not** run `python3 scripts/kg.py` anything — that operates on the shared knowledge
graph, which is the other agent's live state. Keep your own decisions log instead: append
short entries to `ROUND2_LOG.md` at the worktree root (create it if absent) as you go —
what you built, what you decided, what you'd flag for review. That file is your record;
nothing reads it automatically.

## Hard rules, unchanged from the rest of the project

- No AI, ML, or model calls anywhere in the **product** (the tooling you're using to build
  it is a separate question; the shipped code makes zero external model calls).
- `src/domain/` stays pure: no React, no DOM, no browser API, no `Date.now()`.
- Commands/writes are intent-only where the existing code already establishes that pattern
  — do not have the UI layer build a Firestore payload directly; let the writer own that.
- No real Aadhaar, PAN, passwords, OTPs, payment or health data anywhere, fixtures included.
- Never commit secrets, `.env*`, or anything already in `.gitignore`.
- No government branding, no implied endorsement.
- **Never run `firebase deploy`.** Rules and indexes are written and reviewed, not deployed,
  from this branch. That is a founder action, later, deliberately.

## When you are done

Report in five lines: what's built, what passed, what you'd flag for a human reviewing this
branch before it ever reaches main. Then stop. Do not start looking for more to do — this
scope is exactly M2 and M3, nothing else.
