# Saaya Lite - Build State

**Generated from `graph/build_graph.json`. That file is the source of truth.**
If this file and the JSON disagree, the JSON wins. Regenerate with:

```bash
python3 scripts/render_build_state.py
```

## Execution

| Field | Value |
|---|---|
| Mode | **single continuous run**, topological order below |
| Next node | **T1.1 - Scaffold, theme, manifest privacy flags** |
| Nodes complete | 0 of 22 |
| Total work | 45.0 h |
| Blocked on | nothing |

## Node ledger

Order is risk-first: the two most dangerous nodes clear by hour 9.5, and the live demo
link exists at hour 14 instead of hour 24. Reasoning in `docs/spec/GRAPH_ENGINEERING.md`.

| # | Node | Title | Risk | Cum h | Requires | Status |
|---|---|---|---|---|---|---|
| 1 | `T1.1` | Scaffold, theme, manifest privacy flags | low | 2.0 | - | pending |
| 2 | `T2.1` | Zone parsing to typed Zone/ZoneCard/PoliceStation | low | 3.5 | T1.1 | pending |
| 3 | `T4.1` | Session engine, pure JVM, no Android imports | HIGH | 6.5 | T2.1 | pending |
| 4 | `T4.2` | Foreground service, geofencing, alarms, recovery | HIGHEST | 9.5 | T4.1, T2.1 | pending |
| 5 | `T1.2` | Firebase wiring, anonymous auth | low | 10.5 | T1.1 | pending |
| 6 | `T8.1` | Seed zones to Firestore | low | 11.0 | T1.2, T2.1 | pending |
| 7 | `T8.2` | Console: the live demo link | HIGH | 14.0 | T8.1 | pending |
| 8 | `T1.3` | Component library C1 to C14 | med | 17.0 | T1.1 | pending |
| 9 | `T2.2` | Map screen, zones, her dot, offline | med | 19.5 | T2.1, T1.3 | pending |
| 10 | `T4.3` | Home session states, arm banner, demo panel | med | 21.5 | T4.2, T2.2, T1.3 | pending |
| 11 | `T3.1` | Zone detail sheet, nearest station | low | 23.5 | T2.1, T1.3 | pending |
| 12 | `T3.2` | Onboarding, permissions, favourites, PIN | med | 26.5 | T1.3 | pending |
| 13 | `T5.1` | Check-in 1 and 2, notifications, lock screen | HIGH | 29.5 | T4.1, T1.3 | pending |
| 14 | `T6.1` | Family escalation composer and screen | med | 31.5 | T4.1, T1.3, T2.1 | pending |
| 15 | `T6.2` | Offline queue with backoff | med | 33.0 | T1.2 | pending |
| 16 | `T7.1` | SOS screen and PIN entry | HIGH | 35.5 | T4.1, T1.3, T3.2 | pending |
| 17 | `T7.2` | Anonymiser and the two Firestore writers | HIGHEST | 37.5 | T6.2, T4.1 | pending |
| 18 | `T7.3` | What the police see, in app | low | 39.0 | T7.2, T1.3 | pending |
| 19 | `T8.3` | Console live journey trigger | med | 40.5 | T8.2, T7.2 | pending |
| 20 | `T9.0` | Landing page with APK and video | low | 41.5 | T8.2 | pending |
| 21 | `T9.1` | Localisation, low-end, font scale, a11y | med | 43.5 | T4.3, T5.1, T6.1, T7.1, T7.3, T3.1 | pending |
| 22 | `T9.2` | Verification sweep V1 to V8 | HIGH | 45.0 | T9.1, T8.3, T9.0 | pending |

## Anchors - measurements only the founder can take

A node whose gates pass but whose anchor was never taken is **not done**.

| Node | Anchor |
|---|---|
| `T1.1` | `aapt2 dump xmltree` shows `allowBackup="false"` |
| `T4.2` | a real device arms a session with **no tap** |
| `T5.1` | check-in 2 appears over a locked screen |
| `T6.2` | airplane mode, the escalation is not lost |
| `T8.2` | console loads logged out, on a phone, on another network |
| `T9.1` | the founder reads the Telugu |
| `T9.2` | V7 no-AI grep and V8 manifest outputs |

## Spec amendments

When the spec was silent and the founder answered, record it here, in the spec doc, and
as a fact in `graph/spec_graph.json` if it is a value.

| Date | Node | What was missing | Decision | Fact id added |
|---|---|---|---|---|
| | | | | |
