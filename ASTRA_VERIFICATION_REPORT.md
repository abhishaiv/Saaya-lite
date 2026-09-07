# ASTRA_VERIFICATION_REPORT.md — Round 2 demo-day build report card

> Historical report for `9015488`. Independent verification found substantive
> failures; use `DEMO_VERIFICATION.md` and current `DEMO_RECORDING.md` for corrected
> checkpoint results and open gates, not the claims below.

**Prepared for external verification.** Written 2026-09-06 by the implementation
agent (Claude Code). Every claim below is checkable from the repository; commands
are given. This report asserts nothing that was not run — open gates are listed
as open.

## What to verify (quick version)

- Repo: https://github.com/abhishaiv/Saaya-lite, branch `round2/demo`
  (worktree /Users/abhishai/saaya-lite-round2; the Desktop checkout was never touched).
- Base commit: bd95b6b. Build commits: c04fc35 + one follow-up (test + docs commit — run `git log --oneline bd95b6b..round2/demo`).
- Live deployment: https://saaya-lite-ic6yvhjga-abhishai-vardhans-projects.vercel.app
  (Vercel preview auto-built from the branch push, status Ready, verified 200 on 2026-09-06).
- All gates were run and passed in the worktree (Node 24, `npm ci` first if fresh):

```
npx vitest run            # 45 files, 245 tests, 0 failed
npx tsc --noEmit          # no errors
npm run lint              # no warnings or errors
npm run build             # succeeds, /api/demo-alert listed as a dynamic route
python3 scripts/grounded_check.py   # 0 ungrounded literals
python3 scripts/reads_check.py      # type contract closed, 0 unresolved
python3 scripts/kg.py check        # 423 entities, 0 problems
```

Total change since bd95b6b: ~49 files, ~2700 insertions, ~1770 deletions.
Run `git diff bd95b6b --stat` for the exact list, `git diff bd95b6b -- <file>` per file.

## Spec source

The founder-approved spec: `/Users/abhishai/Desktop/Saaya Lite/ROUND2_DEMO_DAY_PLAN.md`
(also mirrored in the knowledge graph as `doc.round2_demo_day_plan`, sourced from
`src.founder_round2_answers`). Its 14 acceptance items (section E) are mapped to
tests at the bottom of this report.

## Change inventory, file by file

### 1. Domain engine — the three-check-in ladder (checkpoint B core)

| File | Change | What Astra should check |
|---|---|---|
| `src/domain/engine/rules.ts` | `DEFAULT_RULES.ladder` = cadence 300s, windows 120/60/60s, okReset 300s; `DEMO_RULES` = 10/10/10s windows, 10s okReset, cadence 300; `DEMO_ARM_TIME` NIGHT_DEEP hour 4. | Values match the founder-approved timing; DEMO shares the same shape as DEFAULT. |
| `src/domain/engine/sessionEngine.ts` | Ladder is SHADOW → CHECKIN_1 → CHECKIN_2 → CHECKIN_3 → SOS_ACTIVE. `RequestFamilyAlert` fires exactly once at the first miss; `CancelFamilyAlert` on I'm OK from rungs 2/3; `WriteSusEvent` at miss 2 only in AUTO_ZONE; miss 3 → SOS with trigger LADDER_LAPSE. `OkTapped` uses absolute deadlines (old deadlines invalidated). Recovery re-schedules from persisted remaining seconds; overdue sessions advance deterministically; legacy persisted FAMILY_ESCALATED normalizes to CHECKIN_3. Wrong PIN: there is no engine path that stops SOS except `PinAccepted`. | Walk `sessionEngine.test.ts` "full ladder" test; grep `RequestFamilyAlert` in the engine — must appear only in the miss-1 transition. |
| `src/domain/engine/intervalCalculator.ts` | **DELETED** — the tier-band interval table is gone; flat cadence only. | `grep -r intervalCalculator src/` returns nothing. |
| `src/domain/model/session.ts` | SessionState keeps FAMILY_ESCALATED only for legacy persistence. | Live states reachable from the engine are the 5 above. |
| `src/domain/engine/homeEngineBridge.ts` | View mapping adds check-in windows per rung and drops the family-escalation overlay plumbing. | — |

### 2. Demo entry (checkpoint B — no prerequisites)

| File | Change | What Astra should check |
|---|---|---|
| `src/ui/screens/home/demoControls.ts` | `startDemoEventSequence(zoneId)` returns exactly `[ZoneEntered, CheckInTimerFired]`. No speed toggle, no zone picker, no movement/night-band prerequisite. | The engine sees the same events a real zone entry produces. |
| `src/platform/demoModeStore.ts` | Speed-toggle storage removed. `markDemoArmedSession` / `isDemoArmedSession` / `clearDemoArmedSession` — the demo mark is session-scoped in localStorage, survives reload, and re-selects DEMO_RULES at recovery. | The mark clears on RESOLVED and PIN stop (see HomeScreen listener). |
| `src/ui/screens/home/HomeScreen.tsx` | `handleStartDemo`: gates on IDLE/RESOLVED, sets DEMO_RULES on engine + runtime, arms the first HIGH-risk zone from frozen data, marks the demo session. Recovery callback re-installs DEMO_RULES before `engine.recover()`. StartLocationWatch is filtered only for the simulated demo entry (demoArmInFlightRef), never for real arming. | No code path lets the demo run while a real session is live (Start is disabled outside IDLE/RESOLVED, and the panel states `demoResetBlockedSos` during SOS). |

### 3. Server-side WhatsApp alert (checkpoint C — security-critical)

| File | Change | What Astra should check |
|---|---|---|
| `app/api/demo-alert/route.ts` | The single messaging surface. Server-owned recipient, message (EN+TE approved texts), credentials from server env only (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_DEMO_RECIPIENT`, optional `WHATSAPP_API_VERSION`, optional `WHATSAPP_DEMO_KEY`). Same-origin-or-bearer-key authorization, per-operation dedup (500-entry LRU cap, fact `alert.dedup.track.max`), 50-send instance cap (fact `alert.sends.cap`), 10s upstream timeout. Statuses: `accepted` (202, provider HTTP 200 — **never** claimed as delivered), `duplicate` (202, no resend), `failed` (502/429), `unknown` (502 on upstream timeout), `not_configured` (503). GET returns the truthful recorded status or 404. | No arbitrary recipient/message field is read from the request; grep the route for `to:` — it is `config.recipient` only. No token ever appears in browser code: `grep -rn WHATSAPP src/` finds only the isolation test. |
| `src/platform/familyAlertChannel.ts` | Abortable client. Sends only `{operationId, locale, demo}` — zero contact data. Maps responses to `accepted/failed/unknown/notready`; network throw → `unknown` (the request may have landed). | `familyAlertChannel.test.ts` "sends only operation, locale and demo flag". |
| `src/ui/screens/home/HomeScreen.tsx` (alert performer) | `alertPerformerRef` routes `RequestFamilyAlert`/`CancelFamilyAlert`; one in-flight request tracked via AbortController; cancel aborts and clears the sending state; a stale response from a superseded controller is discarded. Alert state is UI-only — **no** branch of it can pause or cancel the ladder. | The `if (familyAlertAbortRef.current !== controller) return;` guard — this is the duplicate-send prevention client-side. |
| `src/platform/familyMessageLinks.ts` | **DELETED** — the wa.me device-handoff link is gone; there is no parallel fake-delivery path. | `grep -r wa.me src/` returns nothing. |
| `src/platform/demoAlertRoute.test.ts` | 11 route tests, including: server-owned recipient/message assertion on the upstream fetch call, cross-site 401, dedup (fetch called once), cap 429, timeout → unknown, GET truthfulness. | Env stubs live per-test; no real credential exists in the file. |

### 4. Police preview + PIN/reset semantics (checkpoint D)

| File | Change | What Astra should check |
|---|---|---|
| `src/ui/screens/home/SosOverlay.tsx` | `SosDemoIncident` section labelled with `policeDemoLabel` ("Demo — synthetic incident"), rows for armed/missed 1-3/SOS, zone row, local-only note. No claim of police receipt/dispatch. Wrong PIN shows an error state and never calls `onPinAccepted`; only `verifyPin` success does. | The demo section renders only when the demo passes an incident; a normal SOS shows no synthetic rows. |
| `src/ui/screens/home/HomeSessionSurface.tsx` | `demoIncidentFor` builds the incident from copy only. Ack cards: okAcknowledgement (after I'm OK) and demoStopAcknowledgement (after PIN stop, `policeDemoRowStopped` + `policeDemoStatusStopped`). | Ack cards render only in SHADOW / IDLE respectively (the state guard in the render conditions). |
| `src/ui/screens/home/DemoPanel.tsx` | Pre-start disclosure of the automatic first-miss message + demo timing note. Start enabled only in IDLE/RESOLVED; **Reset disabled during SOS_ACTIVE** with `demoResetBlockedSos` ("Demo reset is unavailable during SOS. Enter the correct PIN to stop."). | A demo reset can never bypass an active SOS. |

### 5. Copy, components, gallery

| File | Change | What Astra should check |
|---|---|---|
| `src/ui/copy/strings.ts` | All new keys present in BOTH EN and TE (checkin3, okThanks, policeDemo* ×9, demoResetBlockedSos, duration*, statusCheckin3). Calm-companion copy: "Just checking in" → "Quick reminder" → "One more check-in"; no "delivered", no "family knows", no "help is coming". | `grep -in "delivered\|help is coming\|family knows" src/ui/copy/strings.ts` — only the truthful alert status keys. |
| `src/ui/components/StatusPill.tsx`, `LadderCard.tsx`, `CountdownRing.tsx`, `AppSessionStatus.tsx`, `CheckInOverlay.tsx`, `ComponentGallery.tsx` | CHECKIN_3 replaces FAMILY_ESCALATED on every live surface; CheckInOverlay shows one card with the alert status line and the I'm OK primary action; alert line shows sending/accepted/failed/unknown/not-ready truthfully ("accepted" is never "delivered"). | `grep -rn FAMILY_ESCALATED src/ui/` should show only defensive label entries, no live transition path. |
| `src/ui/screens/home/FamilyEscalationOverlay.tsx` | **DELETED** (with its test). | — |

### 6. Tests and gates

- Full suite: **45 files, 245 tests, 0 failed** (`npx vitest run`).
- `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` clean.
- `grounded_check.py`: 0 ungrounded literals — 2 new facts added directly to
  `graph/spec_graph.json` (alert.dedup.track.max = 500, alert.sends.cap = 50) with
  sourced_from; knowledge_graph.json was never hand-edited (kg.py used for entities/edges).
- `reads_check.py`: 18 types, 0 unresolved. `kg.py check`: 0 problems.
- Test files rewritten to the three-rung ladder: sessionEngine (54), rules (9),
  deadlineTimer, tabRecovery, demoModeStore, demoControls, demoPanel, homeEngineBridge,
  homeSessionSurface, sosOverlay, components, componentGallery, appSessionStatus,
  safetyDeliveryPipeline + the two new files (demoAlertRoute 11, familyAlertChannel 9).

### 7. Docs and records

- `DEMO_RECORDING.md` — the three takes (all missed / I'm OK recovery / immediate SOS),
  setup steps, and the truthful-wording rules for the recording.
- `progress.md` — appended the 2026-09-06 Round 2 entries (what is finished / open).
- KG: `src.founder_round2_answers`, `doc.round2_demo_day_plan`,
  `dec.round2.three_checkin_ladder`, `dec.round2.start_demo_no_prereqs`,
  `dec.round2.server_alert_route`, `art.round2.demo_alert_route` (supersedes
  `art.phase1c.family_message_handoff` and `dec.round2.sos_delivery_state`), event ev.0088.

## Acceptance items → verification map (plan section E)

| # | Item | Where verified |
|---|---|---|
| 1 | Start without GPS/Vizag/speed toggle | demoControls.test.ts, homeEngineBridge demo tests, DemoPanel tests (no zone picker) |
| 2 | Three prompts + SOS follow demo deadlines | sessionEngine demo-ladder test (10/10/10), rules.test DEMO_RULES |
| 3 | One first miss → one authorized provider request | sessionEngine "exactly once at first miss"; demoAlertRoute keyed/same-origin tests |
| 4 | Duplicates/reload/retry don't re-send | demoAlertRoute dedup test (fetch called once); HomeScreen controller guard; familyAlertChannel duplicate test |
| 5 | I'm OK resets and cancels deadlines/sends | sessionEngine OkTapped it.each (CancelTimer + CancelFamilyAlert + fresh okReset deadline); familyAlertChannel abort-signal test |
| 6 | WhatsApp failure leaves ladder running | alert performer is fire-and-forget UI state; familyAlertChannel failed/unknown tests |
| 7 | Wrong PIN cannot stop SOS; correct PIN does | Engine accepts only PinAccepted; SosOverlay calls onPinAccepted only after verifyPin true; **no interactive wrong-PIN component test exists** (needs the device rehearsal; listed below) |
| 8 | Reset is demo-scoped, cannot bypass SOS | DemoPanel test: Reset disabled during SOS_ACTIVE + demoResetBlockedSos |
| 9 | Credentials absent from client bundles/logs | familyAlertChannel credential-isolation test (scans src/); build output — no NEXT_PUBLIC_WHATSAPP |
| 10 | Unauthorized/arbitrary recipient/body rejected | demoAlertRoute cross-site 401; request body fields are never used for recipient/content |
| 11 | Acknowledgement never presented as delivered | route returns "accepted" only; channel test "never claims delivery"; copy grep |
| 12 | Synthetic police view has no real data | SosOverlay demo section built from copy only; sosOverlay tests |
| 13 | Tab recovery reconciles without background claims | tabRecovery tests (incl. legacy FAMILY_ESCALATED → CHECKIN_3 migration, LADDER_LAPSE) |
| 14 | Normal policy 5/2/1-min + reset; final expiry pending | rules.test (300/120/60/300); window3 60s is PROVISIONAL — not final |

## Open gates (NOT passed — verify these are still open, do not mark them closed)

1. **WhatsApp credentials.** `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` /
   `WHATSAPP_DEMO_RECIPIENT` are NOT installed in Vercel. The previously
   chat-disclosed token must be ROTATED before any deployment; the replacement and the
   opted-in recipient number must be installed privately by the founder. Until then
   the live route answers `{"status":"not_configured"}` (verified 2026-09-06) and the
   in-app alert line reads "not ready". **No token value has ever been written to any
   prompt, file, or log in this build.**
2. **Device rehearsal.** Chrome on the founder's iPhone at the deployed URL, with a
   second opted-in recipient phone to confirm actual WhatsApp receipt. Both PIN
   outcomes and a repeat run on device. Not yet done.
3. **Normal-profile final expiry.** Window 3 = 60s is provisional per the plan;
   the founder has not specified the final expiry semantics.
4. **Interactive wrong-PIN component test** (item 7's UI half) — the suite runs in a
   node environment with renderToStaticMarkup; the wrong-PIN path is verified by code
   inspection (SosOverlay.tsx: onPinAccepted only fires on verifyPin success) and
   needs the device rehearsal or a jsdom addition.
5. **Delivery evidence.** Nothing in this build can prove delivery — by design, the
   route reports acceptance only. Delivery evidence is the recipient's phone screen
   during the rehearsal.

## Deployment facts

- Deployed by Vercel's GitHub integration from the `round2/demo` branch push (the
  founder's `saaya-lite` project; **production** saaya-lite.vercel.app was NOT touched —
  this is a Preview environment).
- An empty `saaya-lite-round2` project accidentally created by the CLI during this
  session was deleted immediately; the account holds only the original project.
- The route is serverless: module-level dedup memory and the send cap are
  per-instance. The cap bounds a single instance; multiple instances each get 50.
  Durable dedup across instances is listed as future work (plan section G) — the
  in-instance dedup plus the client's one-request-per-session guard is the shipped bound.
