# Elsewhere — executive summary

**Date:** 7 November 2026  
**Product:** Elsewhere, a group trip planner for HackRPI 2026 (Archit, Gavin, Jon)  
**Live site:** https://hackrpi-26.vercel.app

## In one paragraph

Elsewhere lets a host send one link. Friends add dates, budget, and airport with no login. The app shortlists places that already work for everyone, the group votes and approves, and Gemini drafts an itinerary. Production is a working Next.js app on Vercel with Redis persistence and Gemini. Local `archit-branch` is now ahead of production: it includes everything live plus a worth-it shortlist and a shared trip log. That work is committed locally (`5924229`) and has not been pushed.

## Production today

Shipped on `main` (commit `c2ef42e`, last deploy ~5:53pm ET):

- Host an invite, share `/t/{code}`, friends join without accounts
- Constraint matching (dates, budget ceiling, airports, vibes, dealbreakers)
- Gemini destination proposals and post-approval itineraries, with sample-data fallback
- Custom invite photo and AI invite designer
- Availability strip, share + calendar, retry, “your trips”
- Upstash Redis on Vercel; JSON file locally

Not in production: accounts, live fares/bookings, real-time sync (polls every 4s), trip log, worth-it labels. The README still describes the old static HTML prototype.

## What we just finished (not live yet)

Merged production into `archit-branch` and cleaned it up:

| Decision | Outcome |
|---|---|
| Storage | MongoDB removed. Redis in production, file store locally |
| Keep | Worth-it shortlist (steal / fair / stretch) and shared trip log |
| Drop | Visa as a dealbreaker. Passport choice is international vs US-only |
| Quality | Typecheck clean; 83 unit tests and 7 API tests passing |

Local branch is **7 commits ahead** of `origin/archit-branch`. Open PR #1 is stale and will need a refresh after push.

## What still has to happen

1. Push `archit-branch` and open/update a PR onto `main`
2. Merge to `main` so Vercel ships trip log + worth-it
3. Rewrite the README (it still tells people to open `index.html`)
4. Click through the merged UI in a browser before judging the demo

Until that PR lands, judges and testers on the live URL will not see the trip log or worth-it shortlist.


---

## Update — 7 November 2026, 7:37pm ET

**Branch:** `archit-branch` at `f5ac2c4`, pushed and in sync with origin. **5 commits ahead of `main` (`c2ef42e`), 0 behind.** [PR #1](https://github.com/archityem/HACKRPI26/pull/1) is open, mergeable, and clean. Production (https://hackrpi-26.vercel.app) still tracks `main`.

### What this branch implements

Elsewhere is a no-login group trip planner: a host sends one link, friends add dates, budget, and airport, and the app shortlists places that already work for everyone. This branch keeps everything already live and adds the pieces that make the shortlist and the aftermath feel like a real plan, not just a vote.

Already live on production (also on this branch):

- Host an invite and share `/t/{code}`; friends join without accounts
- Matching on dates, budget ceiling, airports, vibes, and dealbreakers
- Gemini destination proposals and post-approval itineraries, with sample-data fallback
- Custom invite photo and AI invite designer
- Availability strip, share + calendar, retry, and “your trips”
- Redis in production; JSON file locally

New on this branch, not live until PR #1 merges:

- **Worth-it shortlist.** Ideas show 3–8 priced places labeled steal / fair / stretch against the group ceiling, with a short reason.
- **Shared trip log.** After everyone approves, the crew gets a shared log for lodging and next-step checks (flights, stay, days), not a private per-device checklist.
- **Clearer host flow.** After creating a trip, the host stays on the invite to send the link first, with a ready-to-paste chat message.
- **Passport, not visa.** Visa was dropped as a dealbreaker. Travelers choose passport-ready (international) or US-only. Remaining deals: nonstop, domestic, short, red-eye.
- **Storage cleanup.** MongoDB is gone. Production uses Upstash Redis; local uses `data/db.json`.
- **Team briefing files.** Role prompts and this executive summary live in the repo; `.gitignore` ignores secrets under `agentfiles/`.

Intentionally not in scope: accounts, live fares or bookings, and true real-time sync (the app polls every 4 seconds).

### What is still open

Bugs reported no P0 demo-breakers if people approve one at a time, Redis is configured, and the invite uses the default title or an AI template. Two P1s are still open: an unauthenticated `?me=` query can reveal another traveler’s private budget, and two people approving at once can overwrite each other so planning never unlocks. Known P2s include the classic poster still saying “spring break out.”, a README that still describes `index.html`, Windows/API-test and missing typecheck CI, an AI job that can flip to fallback after 90 seconds while generation is still running, and Vercel silently using a local file if Redis env vars are missing.

Browser verification of production is still outstanding. The branch should not merge to `main` until the P1s are addressed.