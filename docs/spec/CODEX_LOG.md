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
| Tasks run through Codex | 1 |
| Tasks accepted with no correction | 0 |
| Tasks needing correction | 1 |
| Estimated hours saved | 0 net |
| Where Codex was clearly better than hand-writing | Mechanical theme, adaptive-icon and Gradle scaffold transcription; repeatable gate evidence |
| Where Codex was clearly worse | Initial dependency completeness, 8 GB memory sizing, Material default-role closure and commit hygiene |

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

### T1.1 - Scaffold, theme, manifest privacy flags          2026-08-20, ~180 minutes active

**Asked:** Build the single-module Android scaffold, complete dark theme tokens, privacy-safe
manifest, AndroidX splash, and the adaptive/monochrome launcher icon from the committed v2
brand master. Pass every gate before recording or shipping the node.

**Produced:** Gradle 8.9 / AGP 8.7.3 project wiring, the closed dependency catalog and
architecture package tree, Compose color/type/shape/spacing tokens, backup and cleartext
protections, AndroidX splash handling, and vector launcher resources derived from
`saaya-icon-v2.svg`.

**Shipped:** A debug APK that assembles, lints and runs its unit-test task; installs and cold
launches on `saaya_api35`; renders the exact dark empty surface and centred v2 launcher icon;
and whose packaged manifest reports `allowBackup=false`, `fullBackupContent=false`,
`usesCleartextTraffic=false`, plus both extraction and network-security rules. The fresh
round-2 spec verifier returned `kill=false` at 0.99 confidence.

**Needed correcting:** `androidx.core:core-ktx:1.15.0` required compileSdk 35, so the build
rule resolved it to 1.13.1, whose published AAR requires compileSdk 34. The first pass also
had the wrong SplashScreen import, an API-27 style that dropped base items, an incomplete
dependency/package scaffold, unclosed Material color/type/shape roles, an off-centre adaptive
pin and disabled wrapper URL validation. The first verifier killed all six issues; the second
passed after correction. The initial 2 GiB / 1 GiB memory recommendation was wrong for this
8 GB machine and also missed that KSP pressures the Kotlin daemon; the founder supplied the
1536 MiB Gradle/Kotlin profile, 768 MiB metaspace and two-worker cap that passed. Early source
was swept into founder fact/memory commits before gates, so history was preserved and this
completion commit records the final corrections and provenance rather than rewriting it.
At record time, a separate uniqueness audit found historical duplicate knowledge-graph event
IDs that `kg.py check` does not detect; the unique completion event is `ev.0016`, and the
allocator defect is retained honestly as `dev.kg.event_id_collisions` rather than repaired
inside this product node.

**Verdict:** Neutral on elapsed time. Codex produced and mechanically verified a broad
scaffold, but its first-pass omissions and machine-memory advice consumed the saved time.
