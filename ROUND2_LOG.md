# Round 2 Log — Backend (M2) and Console (M3)

This log records decisions, progress, and verification results for Node M2 and Node M3 on branch `round2/backend` in worktree `/tmp/saaya-round2`.

## Node M2: Data and Trust Boundary

### Started
- Environment and baseline verified: 152 vitest tests passing, tsc and eslint clean, 0 unresolved reads.
- Firebase Web configuration verified in `.env.local` (project: saaya-lite).

### Node M2 Completed: Data and Trust Boundary
- **Firebase Initialization & Auth**: `src/data/firebase/firebaseApp.ts` initializes Firebase Web SDK from `NEXT_PUBLIC_FIREBASE_*` with anonymous authentication only.
- **Anonymiser (Trust Boundary)**: `src/domain/anonymiser/anonymiser.ts` produces pure `SusEventPayload` and `SosIncidentPayload`. Verified strictly: `latitude`, `longitude`, `sessionId`, `uid`, `deviceId`, `name`, `phone` are absent from SUS events; no fine timestamps in SUS (integer hour and YYYY-MM-DD date only); two SUS events are unlinkable; SOS incidents contain precise coordinates and contact counts (never raw contact details).
- **Offline Queue & Backoff**: `src/domain/queue/backoffPolicy.ts`, `src/data/db/indexedDbQueueRepository.ts`, and `src/data/repository/queueFlushService.ts` implement the 5s/15s/60s/300s/900s backoff sequence with max 20 attempts before `FAILED_PERMANENT`. `SOS_INCIDENT` priority draining over `SUS_EVENT` verified.
- **Writers**: `src/data/firebase/susWriter.ts` and `src/data/firebase/sosWriter.ts` act as thin wrappers taking anonymiser outputs to `sus_events` and `sos_incidents` collections.
- **Firestore Security Rules & Indexes**: `firestore.rules` and `firestore.indexes.json` written per DATA_MODEL.md. Enforces `!request.resource.data.keys().hasAny(['latitude','longitude','sessionId','uid'])` at the database level. (Rules are NOT deployed).
- **S10 Trust Screen**: `src/ui/screens/police/PoliceViewScreen.tsx` renders all 3 honest sections (Right now: nothing, If you miss two check-ins, If SOS triggers) generated dynamically from the real anonymiser with sample sessions, plus permanent prototype disclaimer footer. Integrated into `SettingsScreen` and `HomeScreen`.
- **Verification & Gates**: 168 tests passed, build and lint clean, 0 ungrounded literals, 0 unresolved type reads.
