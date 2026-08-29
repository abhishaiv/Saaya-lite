# Saaya Lite - Environment Setup
Lite needs Node 20, npm and Google Chrome. Every setup step is explicit so nothing is
guessed.

## Lite setup now

Firebase, anonymous auth, Firestore, rules/indexes, queueing, state writers and the console
are cut to round two. **Do not create, register, configure or deploy a Firebase project for
Lite.** The app is a local-only browser prototype deployed through the Vercel repository
connection. No Firebase configuration belongs in `.env.local` for this build.

## Round-two Firebase archive — do not run for Lite

These historical project values and procedures are retained only to describe a separately
approved future build. They do not mean Firebase configuration exists, is expected or may be
used by Lite.

| Field | Value |
|---|---|
| Project id | `saaya-lite` |
| Project number | `799647753855` |
| Storage bucket | `saaya-lite.firebasestorage.app` |
| Region | `asia-south1` (Mumbai) |
| Auth | Anonymous only |
| Two mobile apps | registered on the previous platform. Unused by the web SDK, harmless, ignore them. |
| `google-services.json` | an Android artefact. **The web build does not use it.** Gitignored. |

**Round-two only:** register a **Web** app in
Project settings → Your apps → Add app → Web, and paste its config in. The future web SDK
would perform anonymous auth before a future console reads records. The two mobile app ids
would not work for that future web build.

The future config would serve both future surfaces: the app from `NEXT_PUBLIC_FIREBASE_*`
environment variables and the console from `console/firebase-config.js`. Lite uses neither.

## Round-two Firebase project steps — do not run for Lite

**A NEW project. Never the Saaya production project.**

1. Firebase console, Add project, name `saaya-lite`, project id `saaya-lite-<suffix>`
   if taken. **Disable Google Analytics**, we collect nothing.
2. Build, Firestore Database, Create database, **production mode**, region
   `asia-south1` (Mumbai). Closest to Vizag and keeps Indian data in India, which is a
   line worth having in the write-up.
3. Build, Authentication, Get started, Sign-in method, enable **Anonymous only**.
   Enable nothing else. There is no account, no email, no password anywhere in this product.
4. Project settings, Your apps, Add app, **Web**. Give it any nickname. Firebase Hosting is
   not required here; we deploy to Vercel.
   - Copy the `firebaseConfig` object it shows you. That is the whole artefact: there is no
     file to download, and `google-services.json` is an Android thing the web SDK ignores.
   - Put the values in `.env.local` as `NEXT_PUBLIC_FIREBASE_*` for the app, and in
     `console/firebase-config.js` for the console. Same config, both surfaces.
   - **Needed at `T1.2`**, which performs anonymous auth, not at `T8.2`.
5. Nothing to do for Hosting. The app and the console both deploy to Vercel.
6. Record the project id in `CODEX_LOG.md`.

## Local tooling

| Tool | Version |
|---|---|
| Node | 20 LTS |
| npm | bundled with Node 20, lockfile committed |
| Firebase CLI | round two only; not required or used by Lite |
| Google Chrome | for the mobile-emulation and Chrome checks in `TEST_PLAN.md` |

No JDK, no Android SDK, no Xcode. If a step asks for one, it is left over from the previous
platform: stop and report it.

## Round-two `firebase.json` — do not create or deploy for Lite

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

## Lite repository layout

```
Saaya Lite/
  README.md                 the file you hand to Codex
  BUILD_STATE.md            resume pointer
  progress.md               founder-facing log
  docs/                     FEATURES, PROBLEM, SCOPE, EVIDENCE, BUILD_PLAN
  docs/spec/                this pack
  app/                      Next.js routes (App Router)
  src/                      domain, data, ui
  public/assets/            frozen Vizag data, map assets and local fonts
  scripts/                  local checks and graph tooling
  package.json
  .gitignore
```

## Lite deploy and verification

```bash
npm run build
```

The founder's Vercel repository connection creates the preview. Do not run a Firebase deploy
command for Lite.

## Round-two Firebase verification — do not run for Lite

| # | Check |
|---|---|
| 1 | Debug build authenticates anonymously and logs a uid |
| 2 | A test document writes to Firestore and is visible in the console |
| 3 | `firebase hosting:channel:list` resolves, so hosting is live |
| 4 | Region reads `asia-south1` in project settings |
| 5 | Only Anonymous is enabled under sign-in methods |
