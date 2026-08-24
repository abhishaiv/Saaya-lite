# Saaya Lite - Build State

**Generated from `graph/build_graph.json`. That file is the source of truth.**
Regenerate with `python3 scripts/render_build_state.py`.

## Execution

| Field | Value |
|---|---|
| Mode | **single continuous run**, order below |
| Next node | **T4.2** - Geolocation watch, arming, wake lock, tab lifecycle |
| Nodes complete | 3 of 13 |
| Total work | 38.5 h |

## Node ledger

Risk-first: the two most dangerous nodes clear early and the live demo link exists by
hour 14 rather than hour 24. Reasoning in `docs/spec/GRAPH_ENGINEERING.md`.

| # | Node | Title | Risk | Shape | Cum h | Verify | Status |
|---|---|---|---|---|---|---|---|
| 1 | `T1.1` | Scaffold: Next.js, TypeScript, theme tokens, Vercel | low | serial | 2.0 | spec | complete |
| 2 | `T2.1` | Zone parsing to typed Zone/ZoneCard/PoliceStation (TS) | low | diamond | 3.5 | spec | complete |
| 3 | `T4.1` | Session engine, pure TypeScript, zero browser API | HIGH | serial | 6.5 | spec, boundary, invention | complete |
| 4 | `T4.2` | Geolocation watch, arming, wake lock, tab lifecycle | HIGHEST | serial | 9.5 | spec | pending |
| 5 | `T1.3` | Component library C1 to C14 (React) | med | diamond | 12.5 | spec | pending |
| 6 | `M2` | Data and trust boundary: Firebase, offline queue, anonymiser, writers | high | serial | 17.0 | spec, boundary, invention | pending |
| 7 | `M1` | Session UI: onboarding, check-ins, family escalation, SOS | med | serial | 27.5 | spec | pending |
| 8 | `T2.2` | Map screen: Leaflet, CARTO tiles, zones, her dot | med | serial | 30.0 | spec | pending |
| 9 | `M3` | Console: seed zones and the state view | med | serial | 33.5 | spec | pending |
| 10 | `T4.3` | Home session states, arm banner, demo panel | med | serial | 35.5 | spec | pending |
| 11 | `T9.0` | Submission page: video, summary, disclosures | low | serial | 36.5 | spec | pending |
| 12 | `T9.1` | Localisation and a11y on the demo path only | med | diamond | 37.5 | spec | pending |
| 13 | `T9.2` | Verification spot checks V1 to V9 | HIGH | diamond+cycle | 38.5 | - | pending |

## Human gates

Stop and wait. A gate is permission; an anchor is a measurement.

| Node | When | Gate |
|---|---|---|
| T1.1 | before | connect the GitHub repo to Vercel so previews build |
| M2 | before | register the Firebase Web app and supply its config |
| T2.2 | before | the production Vercel URL is shared as the submission's live link |
| M3 | before | Firestore rules and public read go live |
| T9.0 | after | submission form |

## Spec amendments

When the spec was silent and the founder answered, record it here, in the spec doc, and
as a fact in `graph/spec_graph.json` if it is a value.

| Date | Node | What was missing | Decision | Fact id |
|---|---|---|---|---|
| | | | | |
