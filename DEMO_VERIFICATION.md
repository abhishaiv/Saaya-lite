# Demo verification — 2026-09-07

Baseline: `9015488`, compared with `bd95b6b`. The Desktop checkout is preserved.

## Contract corrections before implementation

The founder's verification request and ROUND2_DEMO_DAY_PLAN supersede the archived
round-one scope. These are implementation corrections, not new timing decisions:

- Persist each deadline at the transition's epoch, before asynchronous browser
  effects. Recovery consumes every elapsed stage from the original deadlines.
- Demo metadata selects the timing profile synchronously, including recovery.
  Resolution/reset restores the normal profile. A demo never starts/stops a real
  watch or resets a real active session.
- First-miss operations are episode-scoped, not session-scoped: the CHECKIN_1
  absolute deadline identifies an episode within the private messaging channel.
  This identifier never enters SUS or police records. OK invalidates queued client
  work; an already submitted provider message cannot be recalled.
- Start Demo is accessible without ordinary onboarding. A separate locally hashed
  demo PIN is prepared without replacing the real PIN.
- Synthetic police rows come from the current demo run. Immediate SOS must not
  fabricate three missed prompts.
- Origin/Referer is not authentication. Alert delivery stays disabled without
  private recording authorization AND a durable atomic reservation/budget store.
  Missing infrastructure is an open setup gate, never an in-memory fallback.
- The demo endpoint only sends the fixed synthetic test message to its configured
  opted-in recipient. Normal sessions must not send an unlabelled emergency-style
  message to that test recipient.
- Normal window 3 remains provisional. No phone rehearsal, recipient consent,
  token rotation, provider compatibility or delivery is claimed by local tests.

## Evidence

Statuses describe the corrected checkpoint, not the original implementation.
PASS means local source/test evidence, not phone/provider certification.

| Area | Result | Evidence |
|---|---|---|
| Shared transitions and first-miss intent | PASS after correction | `src/domain/engine/sessionEngine.ts:178` is the one RequestFamilyAlert transition. `:343` normalizes legacy recovery; `:403` consumes overdue successors from the previous absolute deadline. |
| Deadlines, cancellation and stale responses | PASS after correction | `src/platform/homeSessionRuntime.ts:69` snapshots persistence and installs timers before asynchronous effects. `src/platform/deadlineTimer.ts:59` ignores superseded callbacks. `src/ui/screens/home/HomeScreen.tsx:196` uses an episode operation ID and abort/controller identity guards. |
| Demo/normal isolation and entry | PASS locally after correction | `src/ui/screens/onboarding/AppGate.tsx:46` exposes demo setup without contacts/GPS. `HomeScreen.tsx:406` restores the persisted profile; `:435` suppresses real location resumption in demo; `:342` restores normal rules. `homeEngineBridge.ts:82` separates cooldowns. |
| PIN stop, repeat and immediate SOS | PASS in desktop Chrome; actual iPhone CANNOT-VERIFY | `src/ui/screens/home/SosOverlay.tsx:127` verifies the separate real/demo PIN before `onPinAccepted`. Chrome: wrong PIN retained SOS and cleared input; correct PIN stopped it; repeat and OK reset worked. `HomeSessionSurface.tsx:244` uses actual demo misses; immediate SOS showed no fabricated misses. |
| Endpoint authorization and deduplication | PASS with mocked provider/store; live infrastructure CANNOT-VERIFY | `app/api/demo-alert/route.ts:70` requires a signed private cookie. Origin/Referer alone cannot authorize. `src/server/demoAlertStore.ts:35` uses atomic Redis EVAL plus a durable global budget. Tests cover concurrency, independent route imports, ambiguous acknowledgements, cap, wrong key, forged Origin, tampered/expired cookies and unexpected fields. |
| Delivery honesty and isolation | PASS after correction; actual delivery CANNOT-VERIFY | `app/api/demo-alert/route.ts:119` requires a message ID for accepted, never delivered. `src/platform/familyAlertChannel.ts:66` preserves unknown. `route.ts:165` accepts only demo/locale/operationId; recipient/message are server-owned. Normal sessions cannot send to the demo recipient. |
| Calm UI and police preview | PASS locally after correction | `CheckInOverlay.tsx` renders one card with Demo/rung indicator. Redundant demo arm/permission banners are hidden. SOS status pill no longer overlaps the heading. `HomeSessionSurface.tsx` derives synthetic rows from actual demo misses. No emergency call was made. |
| Telugu | CANNOT-VERIFY native quality | Translations exist, including new demo setup/disclosures; English prioritized as instructed. Native phone rehearsal remains open. |
| Normal final expiry | CANNOT-VERIFY final policy | `src/domain/engine/rules.ts:11` explicitly marks 60 seconds PROVISIONAL; no founder decision inferred. |

## Mechanical evidence

- `npm ci` succeeded. Baseline was **44 files / 245 tests**, not the reported 45 files.
- Corrected checkpoint: **45 files / 253 tests passed**.
- `npx tsc --noEmit`: exit 0. `npm run lint`: no ESLint warnings/errors.
- `npm run build`: exit 0; `/api/demo-alert` and `/api/demo-access` both dynamic.
- G6: **154 files, 0 ungrounded literals** using explicit paths:
  `rg --files src app -g '*.ts' -g '*.tsx' -g '*.css' -g '*.js' -g '*.mjs' | xargs python3 scripts/grounded_check.py`.
  Bare G6 scans **zero files** here and is NOT acceptance evidence. Same-valued matches
  still need semantic review; structural protocol/test exemptions do not widen TRIVIAL.
- G10: 18 types, 0 unresolved. Knowledge graph: 0 problems.
- Browser: Chrome desktop at 390 × 844, not an actual iPhone. All-missed reached SOS;
  not-ready messaging did not block timers; wrong/correct PIN, repeat, OK-to-SHADOW
  and immediate SOS were exercised. A subsequent production-build browser reconnect
  failed in the Chrome control connection; built HTTP server answered 200. No browser
  reload or real-phone pass is inferred from that check.

## Open gates and limitations

1. Rotated token, provided Phone Number ID/account type, opted-in recipient and compatible
   message/session are not verified. No WhatsApp message was sent by this verification.
2. Durable Redis service and private operator key are setup gates. Code stays
   `not_configured` without them. No service, billing plan or credential was created.
3. Actual iPhone Chrome and recipient-phone receipt rehearsal remain open.
4. Normal final expiry and native Telugu review remain open.
5. Fresh final verifier found a startup-recovery race, then returned `kill=false`, confidence
   0.94 after correction. `HomeScreen.tsx:621` now checks recovery readiness before and
   after the asynchronous PIN-store read; `tabLifecycle.ts:101` locks entry during recovery.
   Verdicts are in `graph/verifications.jsonl`. No phone/provider pass is implied.
6. Local Node 25 differs from declared Node 20; npm flags pinned Next 14.2.15 as vulnerable.
   No unapproved dependency upgrade was made. This is not a general security certification.
7. Redis tests model its REST contract; actual Redis/provider integration remains open.
   Unknown reservations never resend, prioritizing no duplicates over guaranteed delivery.
8. OK cannot recall submitted messages. No police receipt/dispatch or reliable locked-phone
   monitoring is claimed. The broader Round 2 backend is not this demo's deliverable.

See `DEMO_RECORDING.md` for setup/takes. Desktop and original `round2/demo` are preserved;
corrections use `codex/demo-verification`.
