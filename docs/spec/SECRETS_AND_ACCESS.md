# Saaya Lite - Keys, Access and Config
Everything external the build touches. Written 2026-08-18.

## The short answer

**No third-party API keys. No billing account. No paid service.** One Firebase project,
free tier, is the entire external footprint.

This is not luck, it is the result of deliberate decisions, and it is worth one line in the
submission: *nothing in this prototype can fail on submission day because of a key, a
quota or an expired credential.*

## What is deliberately NOT needed

Do not go and get these. If you find yourself needing one, something has drifted from the
spec, so **STOP and report it**.

| Not needed | Why | Decided in |
|---|---|---|
| Google Maps API key + billing | Leaflet with OpenStreetMap Standard tiles. No key or billing account. | `MAP_SPEC.md` |
| Any map tile key | OpenStreetMap Standard tiles are keyless. Requires attribution, which we show. | `MAP_SPEC.md` |
| OpenAI API key | There is no model in the product. Every decision is a stated rule. | founder, 2026-08-18 |
| SMS gateway, MSG91, Twilio, DLT registration | Not used. Saaya Lite has no gateway, API key or server route; a deliberate device-handoff tap only attempts to open her own messaging app. | `SCOPE.md` |
| WhatsApp Business API | Not used; same deliberate local device-handoff boundary. | `SCOPE.md` |
| Release keystore + passwords | Debug signing. A debug-signed deployed site sideloads identically. | `BUILD_CONFIG.md` §3 |
| Crash reporting, analytics, telemetry keys | We collect nothing, deliberately. | prototype posture |
| Any government API credential | Forbidden by the brief, and we never sought one. | `COMPLIANCE.md` §5 |
| Play Store / Google Play Console account | We distribute a direct deployed site, not a store listing. | `SUBMISSION.md` |

## What IS needed

### Founder, one-time, before T1.2

| # | Item | Where | Cost |
|---|---|---|---|
| 1 | A Google account for Firebase | console.firebase.google.com | free |
| 2 | A Firebase project named `saaya-lite`, **Analytics disabled** | per `SETUP.md` | free (Spark plan) |
| 3 | Firestore in **production mode**, region `asia-south1` | per `SETUP.md` | free tier |
| 4 | Authentication, **Anonymous only** enabled | per `SETUP.md` | free |
| 5 | Hosting enabled, site id `saaya-lite` | per `SETUP.md` | free |
| 6 | ~~Two mobile apps registered~~ | done on the previous platform. Harmless, unused by the web SDK. |
| 7 | One Web app registered, for the app **and** the console | Firebase console, Add app, Web | free |
| 8 | A YouTube account for the unlisted demo video | E9 | free |
| 9 | A GitHub account, public repo | optional, E9 | free |

**Item 7 is the one still outstanding, and it is needed at `T1.2`, not `T8.2`.** The whole
product is a web app now, so the Firebase web SDK performs anonymous auth at `T1.2`. The
mobile app ids on the project will not work for it. One registration serves both the app
and the console.
debug builds fail to authenticate, with an error that does not say why.

### Codex, local machine

| Item | Check |
|---|---|
| Node 20 LTS | `node -v`. This is the whole toolchain. |
| npm | `npm -v`, bundled with Node. The lockfile is committed. |
| Firebase CLI | `npm i -g firebase-tools` then `firebase login` (interactive, browser) |
| Codex CLI, authenticated | founder's own OpenAI account. Build tool only, not in the product. |

## The actual config files

Next.js uses `.env.local`, but we have nothing secret to put in it. Here are the real mechanisms and their exact contents.

### 1. The Firebase web config — copied, not downloaded

From Firebase console, Project settings, Your apps, **Web**. It is a plain object shown in
the console; there is no file to download. `google-services.json` is an Android artefact and
the web SDK ignores it entirely.

The same values go in two places: `NEXT_PUBLIC_FIREBASE_*` in `.env.local` for the app, and
`console/firebase-config.js` for the console. **This is not a secret.** It ships inside
every deployed site and anyone can extract it; it identifies the project and authorises
nothing. The Firestore rules are the security boundary.

**This is not a secret.** It ships inside every deployed site and anyone can extract it. It
identifies the project; it authorises nothing. The Firestore rules are the security
boundary. We gitignore it by convention, not because exposure would matter.

### 2. `console/firebase-config.js` — the web config, public by design

Copy from Firebase console, Project settings, Your apps, Web, Config.

```js
// Public by design. This identifies the project, it does not authorise anything.
// Security is enforced by firestore.rules, not by hiding these values.
export const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "saaya-lite.firebaseapp.com",
  projectId:         "saaya-lite",
  storageBucket:     "saaya-lite.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:abcdef"
};
```

**This one is committed**, because the console is a static site and the values must reach
the browser to work at all. Hiding it is impossible and pretending otherwise is worse.

### 3. `local.properties` — machine paths only, gitignored

```properties
# nothing machine-specific is required for the web build
```

Generated by your editor. Contains no secrets. Gitignored because it is
machine-specific, not because it is sensitive.

### 4. If you want a `.env`, this is all it would hold

There is nothing secret to put in it. For completeness, if a `.env` is created for the
seed script or the console build, it holds exactly:

```dotenv
# Saaya Lite - there are no secrets in this project.
# Every value below is public by design and ships in the client.
FIREBASE_PROJECT_ID=saaya-lite
FIREBASE_HOSTING_SITE=saaya-lite
FIRESTORE_REGION=asia-south1
ANDROID_APP_ID=com.nexaflow.saayalite
```

**Nothing here needs protecting.** If you are looking for the file that would leak
something if committed, there isn't one.

## Browser permissions, the other kind of "permission"

Requested from the user at runtime, never configured. Full detail and the required order in
`WEB_PLATFORM.md`.

| Permission | When asked | If denied |
|---|---|---|
| Geolocation | after a rationale screen in onboarding, never on load | continue; the map and manual arming still work, and we say so |
| Notifications | only when she first arms | continue; the in-page ladder runs while the tab is open |
| Wake Lock | no prompt | ignore failure; the ladder still runs |

**Never request anything on page load.** A permission prompt before the first screen is the
web equivalent of an install wall.

**Deliberately never requested:** camera, microphone, clipboard, contacts. Their absence is
verifiable in devtools, which is the point.

## Gitignore

```gitignore
# Secrets and machine-local (none exist yet, listed defensively)
google-services.json
keystore.properties
*.jks
*.keystore
local.properties
.env
.env.*

# Build output
/build/
**/build/
.gradle/
*.apk
*.aab
node_modules/
.next/
out/
.vercel/
*.tsbuildinfo
__pycache__/
*.pyc

# IDE / OS
.idea/
*.iml
.DS_Store

# Fan-out worker scratch (manifests are regenerated per node)
build/fanout/

# Build crash artefacts. A 719 MB JVM heap dump from the T1.1 OOM was swept into a
# commit by `git add -A` on 2026-08-19 and rejected by GitHub. These are never wanted.
*.hprof
*.heapdump
hs_err_pid*.log
replay_pid*.log
.kotlin/
```

This block is the real `.gitignore` verbatim. `*.jks`, `keystore.properties`,
`google-services.json` and the Android build outputs are defensive: the web build uses none
of them, but this repo carries the Android history on `archive/android-kotlin`, so an
accidental one can never be committed. The `*.hprof` entries are not theoretical.

## Verification, after setup

| # | Check | How |
|---|---|---|
| 1 | The app authenticates anonymously | a uid appears in the browser console at `T1.2` |
| 2 | A Web app is registered | Firebase console, Project settings, Your apps, Web |
| 3 | Firestore region is `asia-south1` | Firebase console |
| 4 | Only Anonymous sign-in enabled | Firebase console, Authentication |
| 5 | The site is reachable | the Vercel preview URL loads on a real phone |
| 6 | Map renders with no key | airplane mode off, no key configured anywhere, tiles load |
| 7 | Nothing secret is committed | `git log -p | grep -i "password\|secret\|private_key"` returns nothing |
