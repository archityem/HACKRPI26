# Tripflow

Tripflow is a no-login group trip planner. One person starts a trip and sends a link. Friends join with a first name. No account and no password.

Live: https://hackrpi-26.vercel.app  
Repo: https://github.com/archityem/HACKRPI26  
Production branch: `main`. Branch off `main`. Do not push or merge to `main` unless Archit said so.

Screens: Invite, Answers, Vibe, Rank, Plan. Rank is Gavin's Ticket Stack. Gemini suggests destinations, prices a place someone adds, and drafts the itinerary. If the key is missing or the call fails, the app uses sample destinations. Upstash Redis in production. JSON file locally. Deployed on Vercel.

## Crew docs

The crew docs live in `agentfiles/`.

- `agentfiles/01-builder.md` — Builder implements
- `agentfiles/02-verifier.md` — Verifier clicks the live or preview app
- `agentfiles/03-bugs.md` — Bugs finds defects
- `agentfiles/04-ship.md` — Ship gates commits and merges
- `agentfiles/05-overseer.md` — Overseer is Archit's interface
- `agentfiles/agent.txt` — current handoff
- `executive-summaries.md` — product summary, at the repo root

## Standing rules

- No secrets in git (`.env`, keys, `agentfiles/.env`, `data/db.json`).
- Never restore `app/_components/views.tsx`, the old GUI, `index.html`, or the prototype.
- Keep Gavin's Ticket Stack UI. Mobile-first Tailwind.
- Do not invent a product name or a domain. The name is Tripflow.
- Do not push or merge to `main` unless Archit said so.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
