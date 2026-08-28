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

### Node M3 Completed: Console (Seed Fixtures and State View)
- **Synthetic Seed Script**: `scripts/seed-fixtures.mjs` populates synthetic `sus_events` and `sos_incidents` (marked with `source: "CONSOLE_DEMO"`), never modifying or pulling from frozen Vizag assets directly.
- **Console Route & Architecture**: `app/console/page.tsx` serves the state view console at `/console`.
- **Live Snapshot Listener**: `src/ui/screens/console/consoleStore.ts` subscribes via `onSnapshot` to `sus_events` and `sos_incidents` in real time.
- **Console UI Components**:
  - `ConsoleHeader`: PROTOTYPE badge, no-government disclaimer, `▶ Watch a journey happen` live demo button with 90s countdown cooldown, and real-time narration strip.
  - `ConsoleStatStrip`: Displays SUS events count, SOS incidents count, zones flagged count, repeat zones count, and prominent False-Positive Rate (`CANCELLED_BY_USER / total SUS`).
  - `ConsoleFilters`: 24h / 7d / 30d time windows, All / SUS / SOS type filter, Hide Cancelled toggle (with count of hidden records).
  - `ConsoleRecordList`: Newest-first record stream. SUS rows display zone, tier, hour, date, outcome, and unlinkability annotation. SOS rows display precise coordinates, station, status, contacts count, and expandable event sequence timeline.
- **Scripted Journey Trigger**: Replays a 30s synthetic journey writing live Firestore documents with `source: "CONSOLE_DEMO"`, advances the narration strip, and auto-expands the SOS timeline upon arrival.
- **Verification & Gates**: 171 tests passed (3 new console tests), build and lint clean, 0 ungrounded literals across 26 files, 0 unresolved type reads.
