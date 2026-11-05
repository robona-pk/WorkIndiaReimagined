# WorkIndia Reimagined

A real, multi-view prototype of a rethought employer-recruitment app for WorkIndia's hunting (employer acquisition) product — not a slide deck, not a six-step demo. Built from:

- analysis of 12,541 employer sales calls
- a cohort study of 98,505 employers (visit × response × unlock behaviour) showing a 10.3x conversion gap between passive and active trial employers
- first-week employer interviews (including the "we thought you were a commission-based consultancy" misconception)
- a live walkthrough of the production employer flow on workindia.in, including one reproduced bug (false "wallet balance low / job rejected" message on a brand-new trial account)

## View it

Open `index.html` directly in a browser, or enable GitHub Pages on this repo (Settings → Pages → Build and deployment → Source: **GitHub Actions**) for a live URL — the workflow in `.github/workflows/pages.yml` is already wired up.

## What's inside

A real app, not a walkthrough:

- **Onboarding** — one screen: phone, company, job details. No OTP wall, no multi-step queue.
- **Dashboard** — job status, trial progress (profiles reviewed / shortlisted / days used), a milestone timeline.
- **Candidates** — a fixed, rationed allocation (30 profiles total, released in batches of 10). Every profile is AI pre-screened by voice (availability, pay, location, language) before the employer ever sees it. Mark **Relevant** to unlock contact, or **Not relevant** — no raw resume dump, no swipe-to-browse.
- **Calls** — platform-only, masked calling (no number is ever shown, Uber-style). A call only counts once it connects. After the call, the employer marks the candidate **Shortlisted** or not, based on the actual conversation — never the profile alone.
- **Trial & Billing** — the trial ends at whichever comes first: 3 shortlisted, 30 profiles reviewed, or 7 days. The renewal moment shows the evidence (profiles reviewed, calls connected, shortlists) instead of a silent autopay charge. The ₹2,948/month autopay mandate is unchanged — this redesign doesn't touch that mechanic. A short, non-verbose flat-fee line ("one-time flat fee, no commission on salary") addresses the consultancy misconception directly.
- **Updates** — the WhatsApp-style feed that's actually the primary surface for the ~67% of employers who source through an agent and never open the dashboard at all. Includes the new post-hire feedback loop: once a hire is confirmed, the employer gets asked to rate it — a loop that doesn't exist on the platform today.
- **Settings** — account info and a reset button for demoing.

## What's explicitly out of scope

Multi-hire trials — this round is single-hire only, per direction from the product owner, since the team is still validating whether a trial construct is the right shape at all before extending it.

## Open parameters (flagged, not decided)

- **Batch depth / total allocation** (currently 10-per-batch, 30 total) is illustrative. The real number likely depends on job-category candidate-pool size and needs a median-time-to-first-call analysis to tune properly.
- Whether a **Relevant-but-never-connected-call** candidate should trigger any objective validation step, to resist an employer gaming the shortlist count without ever placing a call.

No build step — plain HTML/CSS/JS, no dependencies, state persisted in the browser via `localStorage` (this is a front-end-only prototype; there is no backend, no real calling, and no real payment).
