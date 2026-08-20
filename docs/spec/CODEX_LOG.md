# Saaya Lite - Codex Contribution Log

**This file is a submission deliverable, not a courtesy.** Saaya Lite contains no OpenAI
model in the product, so Codex building it is the sole basis for the hackathon's "built
with Codex or powered by an OpenAI model" requirement. The E9 write-up quotes this file.

## How to write an entry

Write it **the same evening**, immediately after the task. Reconstructing this on E9
produces something vague, and vague is worse than short.

The "What needed correcting" column is the important one. A write-up that admits where
Codex was wrong reads as honest engineering. One that claims a clean run reads as
marketing, and these judges build with Codex daily.

## Template

```
### T<id> - <task name>          <date>, <minutes>

**Asked:** one or two sentences, the actual intent, not the pasted prompt.
**Produced:** what came back. Files, line counts, approach taken.
**Shipped:** what survived into the build.
**Needed correcting:** what was wrong, missed or hallucinated, and how it was fixed.
**Verdict:** saved time / neutral / cost time. One line of why.
```

## Running tally, update as you go

| Metric | Value |
|---|---|
| Tasks run through Codex | |
| Tasks accepted with no correction | |
| Tasks needing correction | |
| Estimated hours saved | |
| Where Codex was clearly better than hand-writing | |
| Where Codex was clearly worse | |

## Decisions to record here specifically

These are asked for elsewhere in the spec and must land in this file:

- [x] T1.2: the Firebase project id — **`saaya-lite`** (project number `799647753855`, region
      `asia-south1`, anonymous auth only, both `com.nexaflow.saayalite` and
      `.debug` registered, `app/google-services.json` in place and gitignored)
- [ ] T2.2: osmdroid or Google Maps, and why
- [ ] T9.1: Telugu strings verified by the founder, yes or no
- [ ] T9.2: raw output of V7 (the no-AI grep) and V8 (the manifest check)

## Entries

<!-- newest at the bottom -->
