# Saaya Lite - Brief Compliance
Written 2026-08-18 against the Build What Moves India builder brief, clause by clause.
Everything here goes into the submission write-up. Several of these are things a judge
will wonder about and we would rather answer first.

---

## 1. "A real problem you have faced"

**The honest answer, and it must be in the write-up.**

The founder is a man. He has not personally faced this problem, and pretending otherwise
would be the worst possible opening for a submission judged on honesty.

What is true: he is from Visakhapatnam, he built Saaya for his sisters, his cousins and
his friends, and the problem was defined by **12 recorded interviews with solo women
travellers**, every one of whom already had a safety app installed and **not one of whom
had ever pressed SOS**. The product's central claim came from those interviews, not from
an assumption.

**What we say:** "This is not a problem I face. It is a problem I watched the women around
me manage silently, and then went and asked twelve of them about. Every one had a safety
app. None had ever pressed the button. That finding is the entire product."

Do not soften this and do not claim lived experience. A judge who senses a borrowed story
discounts everything after it.

## 2. "Do not submit an old project with only small changes"

**This is the single largest compliance risk in the submission and it must be met head on.**

Saaya is a real, pre-existing iOS and watchOS product. Saaya Lite reuses its problem
statement, its audited Visakhapatnam dataset, its colour tokens, and several strings
verbatim. A judge who discovers that on their own will conclude we submitted an old project.

**So we say it first, plainly, in the write-up.**

| What is reused | What is new |
|---|---|
| The problem statement and the 12 interviews | The entire web codebase, written from scratch for this hackathon in Next.js and TypeScript |
| The audited Visakhapatnam zone dataset (24 zones, NCRB 2023 calibrated) | The auto-arming model: zone crossed with hour, which does not exist in the iOS app |
| Colour tokens and several check-in strings | The four-step ladder with the trust boundary as an explicit, visible step |
| The brand and the name | The anonymised zone-level civic signal and the state view console, both designed here and cut to round two |
| | The whole public-service framing: naming Shakthi and T-Safe and building the missing intake tier |

**The sentence for the write-up:** "Saaya is an existing iOS product. Saaya Lite is not a
port of it. It is a new web codebase, built for this hackathon, that takes one argument
out of Saaya and proves it end to end: that India's emergency intake accepts only completed
crimes, and that the missing tier can be built without asking her to press anything. The
iOS app has no auto-arming. The anonymised civic signal and the state view are designed and
specified here but cut to round two and built in neither. Those are the
build."

**Verifiable:** the repository has no Swift, the first commit is dated within the hackathon
window, and `CODEX_LOG.md` records every task.

## 3. Data provenance

| Asset | Source | Permission |
|---|---|---|
| Visakhapatnam zone dataset, 24 zones | Built by the founder for Saaya. Aggregate counts calibrated against **NCRB Crime in India 2023** city tables (5,746 total, 997 crimes against women), with zone boundaries drawn to Visakhapatnam police station jurisdictions and risk notes derived from **publicly published news reports**. | Founder's own work. NCRB tables are published government statistics. |
| Police station points, 37 | Publicly listed station names, addresses and published landline numbers. | Public information. |
| Map tiles | OpenStreetMap Standard. | Attribution shown permanently in-app. |
| Poppins | Google Fonts. | SIL Open Font License 1.1 |
| Noto Sans Telugu | Google Fonts. | SIL Open Font License 1.1 |
| Material Symbols Rounded | Google. | Apache License 2.0 |
| All incidents, favourites, names, numbers in the demo | **Synthetic.** Written for this build. | n/a |

**No personal or restricted information was scraped.** The dataset holds aggregate counts
per police jurisdiction. It contains no victim, no accused, no address, no FIR number and
no individual case record. Nothing in it identifies a person.

## 4. Naming Shakthi, T-Safe, 112 and ERSS

We name them because the brief asks us to pick a real public digital service and show what
is difficult about the current experience. Every figure we quote is **the government's own
published number**, cited to its source.

This is comparative reference, not endorsement. Specifically:

- **No government logo, wordmark, seal or emblem appears anywhere** in the app, the
  console, the landing page or the video.
- Nothing implies approval, partnership or affiliation.
- The disclaimer "not connected to AP Police, Shakthi, T-Safe, 112 or ERSS, and not a
  government product" is permanent in the app, permanent in the console header, and stated
  in the video.
- The criticism is of an intake design, not of the officers running it. The write-up says
  so, because 153 Shakthi Teams responding in 8 minutes is a real achievement and our
  argument is that the button upstream of them carries no context.

## 5. "Do not access, test or interfere with a live government system"

**We did not.** No government API, portal, database or endpoint was accessed, called,
tested or probed at any point. No credentials were sought. No undocumented or private API
was used. Nothing was reverse-engineered.

Every figure about Shakthi, T-Safe, 112 and the Nirbhaya Fund comes from published
sources: DGP press statements, CAG Report No. 7 of 2025, NFHS-5, Lok Sabha replies, Play
Store listings and press reporting. All are listed in `EVIDENCE.md`.

**Not in this build, cut to round two.** As designed, the state view is our own Firebase
project. It resembles what a police console could
receive. It is connected to nothing.

## 6. Sensitive data

No real Aadhaar, PAN, password, OTP, payment detail or health information exists anywhere
in this build, including in test fixtures and demo seeds. The app **cannot** collect them:
there is no such field, no payment path and no document upload.

The only personal data the app touches is a favourite's name and phone number, which she
types herself, which stay in on-device storage, and which are **never uploaded**, enforced
by `allowBackup="false"` and by there being no remote write path in `FavouriteRepository`.

## 7. Mock and synthetic data, where the brief requires it

| Where a real system would be involved | What we do |
|---|---|
| SMS or WhatsApp to her favourites | Composed and displayed, never dispatched. Labelled on screen. Real delivery needs India DLT registration. |
| Police or emergency dispatch | Not connected. No backend at all in this build. |
| Any government identity or record | Never touched. No login, no OTP, no verification. |
| Incidents shown in the console | Synthetic, or generated by the demo panel during a walkthrough. |

## 8. The six questions, and where each is answered

| Question | Answer lives in |
|---|---|
| Who is facing the problem? | `PROBLEM.md` §1, and §1 above on standing |
| What is difficult about the current experience? | `PROBLEM.md` §2, with Shakthi's 0.28% and T-Safe's 1,300 |
| What did you change? | `PROBLEM.md` §3 |
| Why is your version better? | `PROBLEM.md` §4 and the T-Safe table in `SCOPE.md` |
| What works today, what is mocked? | `SCOPE.md`, and §7 above |
| How could this work safely at larger scale? | `PROBLEM.md` §6 and `OPERATING_MODEL.md` |
