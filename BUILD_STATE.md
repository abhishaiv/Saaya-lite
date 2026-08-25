# Saaya Lite - Build State

**Generated from `graph/build_graph.json`. That file is the source of truth.**
Regenerate with `python3 scripts/render_build_state.py`.

## Execution

| Field | Value |
|---|---|
| Mode | **single continuous run**, order below |
| Next node | **T4.2** - Geolocation watch, arming, wake lock, tab lifecycle |
| Nodes complete | 3 of 10 |
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
| 6 | `M4` | Home: map, zones, her dot, session states, arm banner, demo panel | med | serial | 17.0 | spec | pending |
| 7 | `M1` | Session UI: onboarding, check-ins, family escalation, SOS | med | serial | 27.5 | spec | pending |
| 8 | `M2` | Data and trust boundary: Firebase, offline queue, anonymiser, writers | high | serial | 32.0 | spec, boundary, invention | pending |
| 9 | `M3` | Console: seed zones and the state view | med | serial | 35.5 | spec | pending |
| 10 | `M5` | Ship: submission page, demo-path Telugu and a11y, spot checks | med | serial | 38.5 | spec | pending |

## Human gates

Stop and wait. A gate is permission; an anchor is a measurement.

| Node | When | Gate |
|---|---|---|
| T1.1 | before | connect the GitHub repo to Vercel so previews build |
| M2 | before | register the Firebase Web app and supply its config |
| M3 | before | Firestore rules and public read go live |
| M5 | before | the production Vercel URL is shared as the submission's live link |
| M5 | after | submission form |

## Spec amendments

When the spec was silent and the founder answered, record it here, in the spec doc, and
as a fact in `graph/spec_graph.json` if it is a value.

| Date | Node | What was missing | Decision | Fact id |
|---|---|---|---|---|
| | | | | |
