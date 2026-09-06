# DEMO_RECORDING.md — Saaya Lite Round 2 demo-day recording guide

Deployed preview: https://saaya-lite-ic6yvhjga-abhishai-vardhans-projects.vercel.app
(branch `round2/demo`, commit c04fc35, deployed 2026-09-06, status Ready.)

## Before recording

1. **WhatsApp credentials are NOT installed yet.** The route truthfully answers
   `{"status":"not_configured"}` until WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
   and WHATSAPP_DEMO_RECIPIENT are set (privately, Vercel env, Preview environment)
   with a ROTATED token — the previously chat-disclosed token must not be used.
   The alert line under the first check-in card will read "not ready" until then.
   Every other part of the take (timers, ladder, SOS, police preview, PIN stop)
   works without it.
2. Use Chrome on the recording iPhone, HTTPS page foreground for the whole take.
   Demo timing: check-in 1 appears immediately at Start, misses at 10s / 20s / 30s,
   I'm OK resets and the next check-in comes 10s later.
3. Keep a demo PIN set through the real four-digit validation path. No bypass exists.
4. Optional: second phone (the opted-in recipient's) to film the WhatsApp arrival.
   Opening WhatsApp on the recording iPhone itself may suspend the page.

## The demo path (shared by all takes)

Home → Demo button → the sheet discloses the automatic first-miss message and the
compressed timing → **Start Demo** (no GPS permission, movement, zone picker or
night-time condition is required — the demo arms a fixed high-risk zone internally) →
badge shows Demo, check-in card appears with a 10-second ring → the first miss fires
the real WhatsApp alert (status line under the card shows sending → accepted/not
ready, never "delivered") → check-in 2 → check-in 3 → SOS with the synthetic police
incident preview labelled "Demo — synthetic incident" → PIN → quiet screen with the
stopped acknowledgement → Start Demo again for the next take.

## Take 1 — all missed (the full ladder)

- Start Demo, do not tap I'm OK at any rung.
- Show check-in 1/3 (10s), the alert status line after the first miss,
  check-in 2/3 (10s), check-in 3/3 (10s).
- At 30s total: SOS. Show the labelled synthetic police preview —
  armed row, three missed rows, SOS row, zone row, "local only" note.
- Enter the PIN. The quiet screen shows the stopped acknowledgement.
- Reset is deliberately unavailable during SOS (wrong-PIN must not stop it);
  the panel says so if tried.

## Take 2 — I'm OK recovery

- Start Demo, wait for check-in 1/3, then tap **I'm OK**.
- The acknowledgement card appears; the alert attempt is cancelled while in flight.
- The next check-in arrives after 10s (5 minutes in a real watch).
- Tap I'm OK again. Ladder resets cleanly: no stacked warnings, no duplicate alert
  (a message already accepted upstream cannot be recalled and is never claimed as
  recalled — the rung-2 alert simply does not fire on the reset ladder).

## Take 3 — immediate SOS

- Start Demo (or use the live SUS button from idle) and press **SOS** right away.
- SOS is the same path the ladder reaches: same overlay, same police preview,
  same PIN requirement. Wrong PIN does not stop it; only the correct PIN does.

## Truthful wording for the recording

- The alert is reported as **accepted** (provider took it), never "delivered".
  Delivery evidence is the second phone's WhatsApp screen, if the recipient is
  configured; otherwise say plainly that the connection is not ready.
- The police preview is **synthetic and local-only**. No police component is
  contacted. Do not imply receipt or dispatch by any real service.
- Demo reset is refused during SOS on purpose: a demo exit must never bypass an
  active SOS.