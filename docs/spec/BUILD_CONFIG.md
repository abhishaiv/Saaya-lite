# Saaya Lite - Build Configuration (web)
Replaces the Android build config, archived as `the git history and branch archive/android-kotlin`.

## Stack, pinned

```json
{
  "next": "14.2.15",
  "react": "18.3.1",
  "typescript": "5.6.3",
  "leaflet": "1.9.4",
  "firebase": "10.14.1",
  "idb": "8.0.0"
}
```

**Resolution rule, unchanged:** if a version fails to resolve, move to the latest stable in
the same **major** line, record it in `CODEX_LOG.md`, and update this file. A major bump is
not your call: stop and report. This rule already caught `core-ktx` on the Android build.

**Closed dependency list.** Those six plus their transitive deps. Nothing else without an
explicit amendment. **No** analytics, no UI kit, no CSS framework, no state library, no
component library. If a thing seems to need one, it probably needs less code instead.

## Project

| Setting | Value |
|---|---|
| Framework | Next.js **App Router** |
| Language | TypeScript, `strict: true` |
| Rendering | client components for the journey; API routes for Firestore writes |
| Target | ES2020, modern evergreen browsers |
| Package manager | npm (lockfile committed) |
| Node | 20 LTS |

```
app/                      routes
  page.tsx                the map. the entry point. no login.
  api/                    server-only Firestore writes
console/                  the state view (its own route)
src/domain/               THE PURE ENGINE. zero DOM, zero React, zero browser API.
src/data/                 IndexedDB, Firestore client, the queue
src/ui/                   components, theme tokens
public/assets/            the three Vizag files, fonts
```

`src/domain/` keeps the same rule the TypeScript had: **no platform imports.** It is plain
TypeScript so `SessionEngine` stays a pure function testable under `vitest` with a fake
clock, exactly as specified in `STATE_MACHINE.md`.

## No login

The brief asks for *"mock consumer login credentials if the project requires them."* **Ours
does not.** There is no account, no OTP, no password anywhere in this product, which is a
deliberate part of the design and not a gap: an emergency tool that asks you to sign in
first has already failed.

Say this in the submission rather than leaving a reviewer hunting for a login box.

## Privacy posture, carried over

The Android build's `allowBackup="false"` has no direct web equivalent, but the property it
protected does:

- Favourites and the PIN hash live in **IndexedDB only** and are never uploaded. There is no
  code path that sends them.
- **No cookies** beyond a single session flag. No analytics. No third-party script.
- The Service Worker caches **static assets only**, never anything personal.
- A reviewer can open devtools, watch the network tab through the whole ladder, and see that
  nothing identifying leaves the device before SOS.

That last line replaces the manifest check the previous platform relied on, and it is a
better demo: a reviewer can run it themselves while the video is playing.

## Deploy

Vercel, connected to the GitHub repo, deploying `main`. Preview deploys per branch.
Environment: only the public Firebase web config, which is public by design
(`SECRETS_AND_ACCESS.md`).

## Quality gates, mapped to the web toolchain

| Gate | Command |
|---|---|
| G1 compiles | `npm run build` |
| G2 lint | `npx tsc --noEmit && npm run lint` |
| G3 tests | `npx vitest run` |
| G6 grounded | `python3 scripts/grounded_check.py <changed .ts/.tsx>` |
| G8 runs | loads on a real mobile browser at the Vercel preview URL |
| G10 reads | `python3 scripts/reads_check.py` |

`grounded_check.py` already scans `.js`/`.mjs`; extend its extension list to `.ts` and
`.tsx`. The **dp values in `spec_graph` become px at 1x**, so the fact table transfers
unchanged.
