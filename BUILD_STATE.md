# Saaya Lite - Build State

**Generated from `graph/build_graph.json`. That file is the source of truth.**
Regenerate with `python3 scripts/render_build_state.py`.

## Execution

| Field | Value |
|---|---|
| Mode | **single continuous run**, order below |
| Next node | **T4.1** - Session engine, pure TypeScript, zero browser API |
| Nodes complete | 2 of 22 |
| Total work | 45.0 h |

## Node ledger

Risk-first: the two most dangerous nodes clear early and the live demo link exists by
hour 14 rather than hour 24. Reasoning in `docs/spec/GRAPH_ENGINEERING.md`.

| # | Node | Title | Risk | Shape | Cum h | Verify | Status |
|---|---|---|---|---|---|---|---|
| 1 | `T1.1` | Scaffold: Next.js, TypeScript, theme tokens, Vercel | low | serial | 2.0 | spec | complete |
| 2 | `T2.1` | Zone parsing to typed Zone/ZoneCard/PoliceStation (TS) | low | diamond | 3.5 | spec | complete |
| 3 | `T4.1` | Session engine, pure TypeScript, zero browser API | HIGH | serial | 6.5 | spec, boundary, invention | pending |
| 4 | `T4.2` | Geolocation watch, arming, wake lock, tab lifecycle | HIGHEST | serial | 9.5 | spec, boundary, invention | pending |
| 5 | `T1.2` | Firebase wiring, anonymous auth (project exists) | low | serial | 10.5 | spec | pending |
| 6 | `T8.1` | Seed zones to Firestore | low | serial | 11.0 | spec | pending |
| 7 | `T8.2` | State view console route | HIGH | serial | 14.0 | spec, boundary, invention | pending |
| 8 | `T1.3` | Component library C1 to C14 (React) | med | diamond | 17.0 | spec, invention | pending |
| 9 | `T2.2` | Map screen: Leaflet, CARTO tiles, zones, her dot | med | serial | 19.5 | spec, invention | pending |
| 10 | `T4.3` | Home session states, arm banner, demo panel | med | serial | 21.5 | spec, invention | pending |
| 11 | `T3.1` | Zone detail sheet, nearest station | low | serial | 23.5 | spec | pending |
| 12 | `T3.2` | Onboarding, permissions, favourites, PIN (Web Crypto) | med | serial | 26.5 | spec, invention | pending |
| 13 | `T5.1` | Check-in 1 and 2, Notification API, full-screen overlay | HIGH | serial | 29.5 | spec, boundary, invention | pending |
| 14 | `T6.1` | Family escalation builder and screen | med | serial | 31.5 | spec, invention | pending |
| 15 | `T6.2` | Offline queue in IndexedDB with backoff | med | serial | 33.0 | spec, invention | pending |
| 16 | `T7.1` | SOS screen and PIN entry | HIGH | serial | 35.5 | spec, boundary, invention | pending |
| 17 | `T7.2` | Anonymiser and the two Firestore writers | HIGHEST | serial | 37.5 | spec, boundary, invention | pending |
| 18 | `T7.3` | What the police see, in the citizen app | low | serial | 39.0 | spec | pending |
| 19 | `T8.3` | Console live journey trigger | med | serial | 40.5 | spec, invention | pending |
| 20 | `T9.0` | Submission page: video, summary, disclosures | low | serial | 41.5 | spec | pending |
| 21 | `T9.1` | Localisation, low-end, font scale, a11y | med | diamond | 43.5 | spec, invention | pending |
| 22 | `T9.2` | Verification sweep V1 to V8 | HIGH | diamond+cycle | 45.0 | spec, boundary, invention | pending |

## Human gates

Stop and wait. A gate is permission; an anchor is a measurement.

| Node | When | Gate |
|---|---|---|
| T1.1 | before | connect the GitHub repo to Vercel so previews build |
| T8.1 | before | Firestore rules and public read go live |
| T2.2 | before | the production Vercel URL is shared as the submission's live link |
| T9.0 | after | submission form |

## Spec amendments

When the spec was silent and the founder answered, record it here, in the spec doc, and
as a fact in `graph/spec_graph.json` if it is a value.

| Date | Node | What was missing | Decision | Fact id |
|---|---|---|---|---|
| | | | | |
