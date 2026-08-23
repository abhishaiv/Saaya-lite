# Founder runbook

**Not for Codex.** `CODEX_PROMPT.md` is the file you attach; this one is for you, and it was
split out so nothing founder-facing sits inside a file the agent reads as instruction.

## Starting the run

```bash
cd "/Users/abhishai/Desktop/Saaya Lite" && codex
```

Attach `CODEX_PROMPT.md`. **Do not clone fresh** — `app/google-services.json` is gitignored
and would not come with a clone.

If the run dies, attach the same file again. It detects a partly-complete
`graph/build_graph.json` and resumes from the first incomplete node rather than from a lost
transcript.

## What Codex will stop and ask you for

**Anchors — 7 measurements only you can take.** A node whose gates pass but whose anchor was
never taken is not done. In execution order:

| # | Node | What you check | Roughly |
|---|---|---|---|
| 1 | `T1.1` | the Vercel preview URL loads on a real mobile browser, themed, no console errors | |
| 2 | `T4.2` | **a real phone arms a session with no tap, page open** — the most important check in the build | |
| 3 | `T5.1` | check-in 2 renders full-screen and its Notification fires on a real phone | |
| 4 | `T6.2` | offline through the ladder: nothing lost, flushes on reconnect | |
| 5 | `T8.2` | the console loads logged out, on a phone, on another network | |
| 6 | `T9.1` | you read the Telugu — Codex cannot judge it | |
| 7 | `T9.2` | the no-AI grep, and **the network tab through a full ladder showing nothing identifying leaves before SOS** | |

Anchor 2 is the one that matters most. It is the product's entire claim. A desktop browser
with devtools emulation will happily report success where a real phone does not, so run it on
a phone.

**Human gates — 4 points that cannot be undone.** Codex stops and asks. It should ask for
nothing else.

Firestore public read going live (before `T8.1`) · the console URL becoming reachable
(before `T8.2`) · the deployed site published (after `T9.0`) · submission (after `T9.2`).

**One outstanding setup item.** Register a **Web** app in Firebase and paste its config into
`console/firebase-config.js`. The console uses the web SDK and needs its own app id; the
two mobile app ids already on the project will not work for it. Needed at `T8.2`, node 7. Codex will ask.

## What to watch for

**The failure mode is invention, not error.** Codex writing a plausible number that nobody
chose is harder to spot than a crash. `grounded_check.py` catches it mechanically now, so
the tell has moved: watch for Codex proposing to **add a fact to `spec_graph.json`** or to
**widen the `TRIVIAL` set**. Both mean it wants to invent. A new fact is your decision.

**If Codex says a spec document is wrong, take it seriously** before overruling. At that
point it is reading them more closely than either of us.

**Do not let it skip step 7 (DROP).** If it starts referring to things from many nodes ago
without querying the knowledge graph, the context hygiene has lapsed and quality will
degrade before it visibly breaks.

## Following along

```bash
git log --grep="Built-with: OpenAI Codex" --oneline   # what Codex has built
python3 scripts/codex_contribution.py                 # summary from the real record
python3 scripts/render_build_state.py && cat BUILD_STATE.md
```

## If you need to change something mid-build

Answer the BLOCKED question, and make sure the answer lands **in the specification**, not
just in chat. If it is a number it also becomes a fact in `spec_graph.json`, or the grounded
checker will reject the code that uses it. Codex knows to do this; check that it did.
