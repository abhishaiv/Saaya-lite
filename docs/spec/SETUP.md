# Saaya Lite - Environment Setup
Do this once, at T1.2. Every step is explicit so nothing is guessed.

## Firebase project — DONE 2026-08-19

| Field | Value |
|---|---|
| Project id | `saaya-lite` |
| Project number | `799647753855` |
| Storage bucket | `saaya-lite.firebasestorage.app` |
| Region | `asia-south1` (Mumbai) |
| Auth | Anonymous only |
| Release app | `com.nexaflow.saayalite` — `1:799647753855:android:f1ac1d7d789de1fd17014a` |
| Debug app | `com.nexaflow.saayalite.debug` — `1:799647753855:android:19c7be4f0fed48bb17014a` |
| `app/google-services.json` | **in place**, contains BOTH packages, gitignored |

**Still outstanding, needed at `T8.2` (node 7), not before:** register a **Web** app in
Project settings → Your apps → Add app → Web, and paste its config into
`console/firebase-config.js`. The console uses the Firebase **web** SDK, which needs its own
app registration; the Android app ids above will not work for it.

## Firebase project — original steps

**A NEW project. Never the Saaya production project.**

1. Firebase console, Add project, name `saaya-lite`, project id `saaya-lite-<suffix>`
   if taken. **Disable Google Analytics**, we collect nothing.
2. Build, Firestore Database, Create database, **production mode**, region
   `asia-south1` (Mumbai). Closest to Vizag and keeps Indian data in India, which is a
   line worth having in the write-up.
3. Build, Authentication, Get started, Sign-in method, enable **Anonymous only**.
   Enable nothing else. There is no account, no email, no password anywhere in this product.
4. Project settings, Your apps, Add app, Android.
   - Package name `com.nexaflow.saayalite`
   - **Also register `com.nexaflow.saayalite.debug`** as a second app, or debug builds fail
     to authenticate. This catches people out.
   - Download `google-services.json` into `app/`. **Gitignored.**
5. Build, Hosting, Get started. Site id `saaya-lite`. The console lives here.
6. Record the project id in `CODEX_LOG.md`.

## Local tooling

| Tool | Version |
|---|---|
| JDK | 17 |
| Android Studio | Ladybug or newer |
| Android SDK | API 34 platform + build-tools 34.0.0 |
| Firebase CLI | `npm i -g firebase-tools`, then `firebase login` |
| Node | 20 or newer, for the seed script only |

## `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "console",
    "site": "saaya-lite",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(js|css|html)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=300" }]
      }
    ],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

Cache is deliberately short. A judge opening a stale console during judging would be a
self-inflicted wound.

## Repository

**https://github.com/abhishaiv/Saaya-lite** — public, default branch `main`, already created and configured as `origin`.

Clone with `gh repo clone abhishaiv/Saaya-lite` or
`git clone https://github.com/abhishaiv/Saaya-lite.git`.

The repo is public deliberately: the hackathon accepts a source-code repository as a
submission artifact, and our whole posture is that we would rather be checked than believed.
Nothing secret lives here — see `SECRETS_AND_ACCESS.md`, there is nothing to leak.

## Repository layout

```
Saaya Lite/
  README.md                 the file you hand to Codex
  BUILD_STATE.md            resume pointer
  progress.md               founder-facing log
  docs/                     FEATURES, PROBLEM, SCOPE, EVIDENCE, BUILD_PLAN
  docs/spec/                this pack
  app/                      the Android app
  console/                  static site: index.html, app.js, style.css
  scripts/seed-zones.mjs    one-off zone seeding
  firebase.json
  firestore.rules
  firestore.indexes.json
  gradle/libs.versions.toml
  .gitignore
```

## Deploy commands

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only hosting
node scripts/seed-zones.mjs        # once, at T8.1, idempotent
```

**Never `firebase deploy` bare.** It deploys everything including functions we do not have,
and it is the command that has caused problems on the main Saaya project.

## Verification after setup

| # | Check |
|---|---|
| 1 | Debug build authenticates anonymously and logs a uid |
| 2 | A test document writes to Firestore and is visible in the console |
| 3 | `firebase hosting:channel:list` resolves, so hosting is live |
| 4 | Region reads `asia-south1` in project settings |
| 5 | Only Anonymous is enabled under sign-in methods |
