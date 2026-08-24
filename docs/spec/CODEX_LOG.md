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
| Tasks run through Codex | 4 |
| Tasks accepted with no correction | 0 |
| Tasks needing correction | 4 |
| Estimated hours saved | ~2.5 net |
| Where Codex was clearly better than hand-writing | Mechanical Android and web theme/icon scaffolds; exact PWA asset generation; three-way parser fan-out; exhaustive asset joins and coordinate anchors; pure transition reducer with 37 timing-rule tests; adversarial recovery and provenance checks |
| Where Codex was clearly worse | Initial dependency completeness, 8 GB memory sizing, Material default-role closure, the too-narrow coordinate repair recommendation, first-pass recovery semantics, provenance-graph bookkeeping, and two defects in the CSS grounding gate |

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

### T2.1 - Zone parsing to typed models          2026-08-20, ~75 minutes active

**Asked:** Bundle the three audited Vizag assets and parse them through a true three-worker
diamond into typed `Zone`, `ZoneCard` and `PoliceStation` models. Merge only after the
ownership guard, assert the exact dataset counts and joins, catch GeoJSON coordinate swaps,
and persist every verifier verdict.

**Produced:** Three disjoint parser/model pairs and manifests, a pure Kotlin `ZoneLoader`,
byte-identical Android asset copies, and `ZoneParsingTest`. The merge asserts 24 zones,
19 cards, 37 stations, the 6/9/4/5 tier split, exact non-safe card joins and the corrected
Visakhapatnam district envelope. `domain/` has zero Android imports.

**Shipped:** A clean debug build and lint pass; two passing JVM tests over all three bundled
assets; an external anchor checking 24 centroids plus 165 polygon vertices with zero outside
the envelope and zero swapped centroids passing; and grounded provenance comments that bind
the ambiguous 24/19/37 literals to `zones.total`, `cards.total` and `stations.total`. The
supplemental invention verifier and fresh spec round 2 both returned `kill=false` at 0.99.

**Needed correcting:** The original four coordinate facts faithfully transcribed
`DATA_MODEL.md`, but the document's tight box was false against the frozen asset. The first
repair recommendation—lowering only the longitude minimum to 83.0975—was also too narrow;
34 polygon vertices would still have failed. The founder supplied a district envelope that
survives data corrections, and the parser now validates every centroid and vertex. G1 also
found stale `… 2.class` copies confined to generated output, removed by Gradle `clean`; the
first test helper used Java 11 `Files.readString`, replaced with a buffered reader. Spec
verifier round 1 then killed a stale copy of the old bounds in `build_graph.json`; that
resume-contract defect was fixed before round 2. The founder's correction commit captured
the in-progress source before all gates, so history was preserved and the completion commit
records the final delta and provenance rather than rewriting it.

**Verdict:** Saved modest time. Parallel parser transcription and exhaustive mechanical
checks were fast and caught a real specification defect, but the incomplete repair
recommendation and one test-API mistake consumed part of that gain.

### T4.1 - Session engine, pure JVM          2026-08-20, ~210 minutes active

**Asked:** Implement the complete session state machine as a deterministic JVM engine with
zero Android imports, exact arming, dwell, check-in, family and SOS timing, process-death
recovery, intent-only commands and the corrected on-device trust boundary. Freeze the
AUTO_ZONE hour band at arm, persist absolute deadlines, run all ten gates and continue only
after fresh spec, boundary and invention lenses pass.

**Produced:** Flat `SessionState`, exhaustive `SessionEvent`, intent-only `Command`, `Rules`,
`ArmingEvaluator`, `IntervalCalculator`, `DwellEvaluator` and `SessionEngine` types, plus 31
engine and 6 rules tests. AUTO_ZONE captures `armedHourBand` exactly once; MANUAL stays at ten
minutes; every scheduled timer carries its absolute epoch-millisecond deadline; recovery
restores that deadline or fires immediately when overdue; and invalid persisted AUTO_ZONE
data uses the existing recovery-error path.

**Shipped:** A pure Kotlin domain engine with no Android imports, personal data or pre-SOS
backend effects. The complete project assembles and lints cleanly, all 39 unit tests pass,
G6 reports 22 grounded Kotlin files with zero violations, G10 closes 51 referenced types,
and the final APK installs and cold-launches on `saaya_api35`. Fresh final spec and boundary
lenses passed at 0.98 confidence and the fresh invention lens passed at 0.99.

**Needed correcting:** The initial contract omitted definitions for `Command`,
`PersistedSession`, `Rules` and `EngineResult.outcome`, and the source documents disagreed on
manual disarm and when anything becomes state-visible; founder amendments closed those
gaps. Spec verifier round 1 then killed four real defects: current-band `n/a` could crash an
active session, SHADOW recovery recomputed rather than restored its deadline, ZoneExited had
an undocumented current-zone guard, and overdue recovery advanced without restarting the
foreground service. The founder selected `FREEZE_AT_ARM`, which resolved the behavioral
choice and is now a semantic fact. Invention round 1 also caught an inert `0.5` fixture
default that passed G6 only by matching the wrong fact. After those fixes, the final
invention round caught one more audit defect: `spec_graph.json` declared 248 facts while
containing 279. The header was synchronized and a fresh verifier passed. G1's first final
rerun found only stale duplicate transformed classes under generated `app/build`; `clean`
removed them and the full assemble/lint/test rerun passed.

**Verdict:** Saved about one net hour. Codex wrote and tested the broad deterministic engine
quickly and its adversarial passes found consequential spec and recovery defects, although
the first implementation and provenance bookkeeping both needed correction.

### T1.1 - Next.js scaffold, theme tokens and PWA assets          2026-08-24, ~55 minutes active

**Asked:** Rebuild the first node for the web pivot: an exact pinned Next.js and TypeScript
scaffold, frozen Saaya theme tokens, installable brand assets and Vercel configuration. Keep
browser APIs outside the pure domain layer and continue while the founder connects Vercel.

**Produced:** A Next.js App Router project with the complete pinned runtime and development
dependency closure, strict TypeScript and ESLint configuration, Vitest, manifest metadata,
an intentionally minimal dark home surface, typed and CSS theme tokens, and favicon,
Apple-touch, regular and maskable PWA icons derived from the committed v2 SVG master.

**Shipped:** The local production build, type check, lint and four token-contract tests pass.
The production server returns the app, manifest and opaque icons at their canonical paths;
the favicon is byte-identical to the brand master, and a fresh-context spec verifier returned
`kill=false` at 0.98 confidence. The Vercel deploy artifact and real-mobile preview gate are
explicitly pending, as the founder directed, until the repository connection produces its URL.

**Needed correcting:** The new CSS coverage exposed two defects in `grounded_check.py`: it
validated a hex colour and then scanned the colour's digits again as numbers, and its colour
index retained only the last fact when several semantic facts shared one value. The scanner
now removes colour tokens before numeric matching and `--explain` reports every matching
colour fact. The intentional regression fixture still fails only for its three invented values.

**Verdict:** Saved about one net hour. The scaffold and icon derivation were fast and exact;
the stricter gate also found real defects in the build tooling before later CSS-heavy nodes.
