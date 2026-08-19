# Saaya Lite - Accessibility
Not a compliance exercise. The brief scores "designed for real Indian users, including
people on mobile devices, slower connections or with limited digital experience", and our
strongest claim is F33: **the primary path requires zero taps.**

## The headline claim

A user who cannot read, cannot see the screen, or has never used a smartphone before is
**still protected**, because arming is automatic and escalation is automatic. The only
thing she ever has to do is answer a check-in, and that is one large button.

Say this in the write-up. It is a real accessibility property, not a marketing line, and
test M6 proves it.

## Screen reader

| Rule | Detail |
|---|---|
| Every interactive element | `contentDescription` stating the **action**, not the picture. "Confirm you are safe", not "shield icon". |
| iOS parity | Reuse the iOS hints: `I'm OK` hint is "Confirms you are safe and resets the check-in"; `I need help now` hint is "Starts an emergency SOS immediately". |
| Decorative icons | `contentDescription = null`, never `""` |
| Countdowns | `LiveRegion.Polite` announcing at 60 s, 30 s, 10 s, then every second under 5 s |
| State changes | announce ladder transitions: "Saaya is now telling your favourites" |
| Grouped content | `mergeDescendants = true` on cards so the whole card reads as one unit |
| Test tags | stable and separate from labels, since labels carry live countdowns |

## Focus order

| Screen | Order |
|---|---|
| `LadderCard` | title, message, **primary button**, secondary button. Icon skipped. |
| Home | `StatusPill`, map (single node, "Map of Visakhapatnam risk zones"), sheet content, primary action |
| Zone sheet | area name, risk level, stats, notes, station, call |
| SOS | state statement, what was sent, quick dial, stop button |

**Focus is trapped** inside check-in 2, family escalation and SOS. It matches the back
behaviour in `INTERACTION_SPEC.md`.

On the check-in card, move focus to the **primary button** on appear, so a switch-access or
keyboard user can answer with one action.

## Vision

| Requirement | Value |
|---|---|
| Body text contrast | 4.5:1 minimum against its actual background |
| Large text contrast | 3:1 minimum |
| `textTertiary` at 40% | decorative only, never the sole carrier of meaning |
| Colour alone | **never** signals state. Every ladder rung carries a text label. |
| Zone tiers | carry a text label in the chip, not only a fill colour |
| Focus indicator | 2 dp `brandLight` ring, visible on every focusable element |
| Font scale | works to 2.0x per `RESPONSIVE_SPEC.md` |

Colour-blind check: our ladder runs lavender, amber, red. Under deuteranopia amber and red
converge, which is precisely why **every rung carries text and a different border weight**.
Verify with a simulator on E9.

## Motor

- 48 dp minimum targets, 8 dp separation.
- Primary actions in the bottom third, reachable one-handed.
- No gesture is the only way to do anything. Every swipe has a button equivalent.
- No timed interaction other than the ladder itself, which is the product.
- No double-tap or long-press requirements anywhere.

## Cognitive

- One decision per screen. Onboarding never asks two things at once.
- Plain language. No jargon: never "geofence", "H3", "coarsened", "escalation ladder" in
  user-facing copy.
- The check-in states **why it appeared** and **what happens if she ignores it**. No hidden
  consequences.
- Consistent placement: the primary action is always bottom, always the largest thing.
- No time pressure on anything except the ladder, and the ladder always shows its clock.

## Testing

| Check | How |
|---|---|
| TalkBack, full journey | manual, onboarding through SOS, on E9 |
| Switch Access, check-in card | can she answer with one action |
| Font scale 2.0 | every screen, no clipping |
| Contrast | Accessibility Scanner on every screen, zero errors |
| Colour blindness | deuteranopia simulator on the ladder |
| One-handed | every primary action reachable, 6.7 inch device |

Record the results in `CODEX_LOG.md`. The write-up should state what passed and what did
not, rather than claiming general accessibility.
