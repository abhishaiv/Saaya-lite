# Saaya Lite — corrected demo recording checkpoint

Verified HTTPS preview: https://saaya-lite-q96k091la-abhishai-vardhans-projects.vercel.app/?demo=1
Deployed code: `b0d6ae7b5bc2745aaac6cf0ec728925d2ae87788`, Vercel Ready, 2026-09-07.
Chrome opens the separate demo-PIN setup. Entry HTTP 200; alert GET HTTP 503 with
`not_configured`, correctly preserving the private messaging setup gate.

Branch: `codex/demo-verification`, based on GLM's `9015488`.
The original round2/demo preview is historical, not evidence for these corrections.
Use the verified preview URL reported with this checkpoint and append `/?demo=1`.
Production `saaya-lite.vercel.app` stays unchanged.

## Start and PIN

1. Open `/?demo=1` in Chrome on the recording iPhone. Keep Chrome foreground.
2. Set a non-obvious four-digit **demo PIN**, or enter your existing demo PIN.
   This is local-only and separate from the normal safety PIN. Remember it for SOS stop.
   No favourite, contact, GPS, movement, hour band or zone picker is required.
3. Read the disclosure, then tap **Start Demo**. Check-in 1 appears immediately.
4. Wrong PIN never stops SOS. Reset/exit cannot bypass SOS: enter the correct PIN.
   Start Demo again after stopping. Demo cannot reset an active normal session.

## Private WhatsApp setup — STILL OPEN

The demo runs without messaging setup, but that is **not** a successful delivery take.
Without setup the first miss shows not-ready; the SOS countdown still runs.

Configure privately in Vercel's Preview environment, never tracked files or URLs:

- `WHATSAPP_ACCESS_TOKEN`: rotated replacement, never the chat-disclosed token.
- `WHATSAPP_PHONE_NUMBER_ID`: verify the provided account/number with Meta.
- `WHATSAPP_DEMO_RECIPIENT`: consenting test recipient in provider-compatible format.
- `WHATSAPP_DEMO_KEY`: a strong random private operator key, at least 32 characters.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: approved durable store.
- `WHATSAPP_DEMO_ENABLED=confirmed`, `WHATSAPP_DEMO_RECIPIENT_CONFIRMED=confirmed`,
  `WHATSAPP_DEMO_TEMPLATE_CONFIRMED=confirmed`: only after the corresponding checks.
- Optional `WHATSAPP_API_VERSION`; current code pin is `v23.0`.

The endpoint sends a fixed synthetic **free-form text**, not a template. Confirm that
this is allowed for the recipient's current WhatsApp session before enabling it.
A template-required session is an open compatibility gate, not something a flag fixes.
Account type and consent have not been verified here. No service was provisioned.

After redeploy, the founder opens `/demo-access` on the same HTTPS preview and privately
enters the operator key. It travels in the HTTPS body, not a URL, and yields an HttpOnly,
SameSite=Strict signed cookie lasting eight hours. Never record or share this key.
Return to `/?demo=1` before filming.

The durable namespace caps reservations at 50. A repeated operation keeps its ID,
including after an ambiguous result, and cannot send twice. Do not clear reservations
to make a retry send. There is no in-memory fallback when storage is unavailable.

## Take 1 — all missed

- Start Demo, leave all three prompts unanswered.
- At 0s: “Just checking in”; at 10s: first-miss alert request and “Quick reminder”;
  at 20s: “One more check-in”; at 30s: SOS.
- Show “Demo — synthetic incident”, actual missed rows and local-only disclosure.
- Film actual arrival on the recipient phone. **Accepted does not mean delivered.**
  If status is not-ready, failed or unknown, do not claim the delivery take passed.
- Stop with the demo PIN. Never tap a real emergency-call link during testing.

## Take 2 — I'm OK recovery

- Start Demo, tap **I'm OK**. SHADOW resumes; next check-in is ten seconds later.
- Miss that next first check-in to confirm a new episode can request its own one alert.
- OK cancels pending client work, not messages already submitted to the provider.
  Interrupted requests can remain unknown; Saaya never claims recall or family receipt.
- Use PIN stop if SOS begins, then repeat.

## Take 3 — immediate SOS

- Start Demo, then tap **SOS** immediately. Do not use normal SUS for this take.
- Synthetic preview must not invent missed check-ins that did not occur.
- Try one wrong PIN: SOS remains. Enter the correct demo PIN: it stops.
- Rehearse reloading an active demo SOS: its demo identity and PIN protection must survive.

## Evidence and remaining work

See `DEMO_VERIFICATION.md` for file/line findings and automated/desktop evidence.
Actual iPhone, recipient receipt, token rotation, account compatibility, durable-store
integration and native Telugu review remain open. Normal cadence is five minutes,
with 120/60/provisional-60-second windows; final normal expiry needs founder approval.
No police receipt/dispatch, reliable locked-phone monitoring or broader Round 2 completion
is implied. The messaging provider receives the configured recipient: do not claim
nothing identifying leaves the device through the family-messaging path.
