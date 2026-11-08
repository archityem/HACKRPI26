# Tripflow — executive summary

**Date:** 8 November 2026  
**Product:** Tripflow, a no-login group trip planner for HackRPI 2026  
**Live:** https://hackrpi-26.vercel.app  
**Repo:** https://github.com/archityem/HACKRPI26  
**Production branch:** `main`

## In one paragraph

Tripflow turns a group-chat trip into one link. A host names the trip, picks a rough date window, a length, a max budget, and a vibe, then sends the link. Friends open it on their phones and join with a first name. There is no app to install and no account to create. Each phone keeps a private device token, so someone can come back and only act as themselves. Answers cover the constraints that decide the trip: home airport, dates, a budget ceiling that stays private, and the vibe they want. The group ranks AI-suggested places on a ticket stack, the top pick becomes the plan, and Gemini drafts an itinerary they can edit and add to a calendar.

## What is live on main

The public description is `README.md` and `DEVPOST.md`. The app matches that description:

- **Invite.** The host shares a link or a short code. Friends land on the trip with no sign-up.
- **Answers.** Airport, dates, private budget, passport, and hard nos. The group sees a budget range, never one person's number.
- **Vibe.** Who has answered, the dates that overlap, and the preferences that keep coming up.
- **Rank.** Gemini suggests destinations that fit the group's airports, dates, budget, and vibes. Each place is a ticket. Friends open it, compare it, and drag the stack into their order. Someone can add their own place and have it priced. If Gemini is slow or unset, the app falls back to sample destinations and can retry.
- **Plan.** When the ranking locks, the group's top pick is the plan. Everyone says they're in, votes on where to stay, and gets an itinerary they can edit, copy, or download as a calendar file.

Storage is Upstash Redis on Vercel and a JSON file locally. The stack is Next.js, React, TypeScript, and Tailwind, with dnd-kit for the ranking stack and zod on request payloads. The UI is Gavin's Ticket Stack: mobile-first, big type, one main action per screen.

## How agents should treat the repo

Production work starts from `main`. Do not push or merge to `main` unless Archit said so. Do not commit secrets. Do not restore the old GUI. Do not invent another product name or a domain. `README.md` and `DEVPOST.md` already describe Tripflow; leave them unless they drift from the app.
