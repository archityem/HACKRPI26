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
