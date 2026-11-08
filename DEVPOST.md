# Project name

Elsewhere

# Elevator pitch

A no-login group trip planner. Share a link, rank destinations together, and get an AI itinerary your friends can actually agree on.

# About the project

Group trips stall in the group chat. One person floats a weekend, three friends answer with different dates, and the thread goes quiet before anyone agrees on a place. Elsewhere is a no-login planner for that moment. The live app is at https://hackrpi-26.vercel.app.

One person starts a trip and shares an invite link or a short code. Friends open it on their own phones and join without creating an account. There is no password and no email sign-up. A device token ties each phone to the person who joined, so the same friend can come back to the trip later and only act as themselves.

Answers cover the constraints that actually decide a trip: home airport, the dates someone can travel, a budget ceiling, and the vibe they want. Those answers sit next to everyone else’s. The Vibe screen shows the overlap — who is free, what the group can spend, and which preferences keep coming up — so the plan starts from what the group already said yes to.

Rank ’em is a mobile-first ticket stack. Gemini suggests destinations that fit the group’s airports, dates, budget, and vibes. Each place is a ticket you can open, compare, and reorder. Friends drag the stack into the order they actually want. When the ranking locks, the group’s top pick becomes the plan, and Gemini writes an itinerary those friends can agree on: a shared destination, a window that works, and a day-by-day shape for the trip.

The screens you move through are Plan, Invite, Rank, Answers, and Vibe. Plan is where the locked destination and itinerary live. Invite is the link or code you send. Rank is the ticket stack. Answers is the airport, dates, budget, and vibe each person fills in. Vibe is the shared picture of what the group has in common.

## How we built it

Elsewhere is a Next.js 16 and React 19 app written in TypeScript and styled with Tailwind v4. It is deployed on Vercel. Trip state — members, answers, rankings, and the locked plan — lives in Upstash Redis, so a link opened on another phone sees the same trip. Destination ideas and the itinerary come from the Gemini API through `@google/genai`. The ranking stack uses dnd-kit for drag and reorder. Request payloads are checked with zod. There is no login: each device holds a private token, and the server accepts an action only from the member that token belongs to.

## Challenges we ran into

Keeping a trip intact after a reload took the longest to get right. A created trip and a locked ranking both have to come back the same way they were saved. Early Redis reads could miss a trip that had just been written, and vote and ranking fields did not always survive the round trip. A group could rank a destination, refresh, and find the decision gone. The fix was to make the stored record the thing the next request reads back, including the ranking and vote fields, so a created trip and a locked ranking still work after reload.

A second snag was the Gemini environment variable name. The deployment stored the key under a name the app was not reading, so the key looked unset. Until it was readable, the app showed sample destinations — San Juan, Cancún, Miami, Lisbon, and Costa Rica — and skipped itinerary generation. Matching the name the deployment already used let live suggestions and itineraries replace those samples. If the key is unset, the app still falls back to fixtures instead of failing closed.

The third problem showed up on a phone. Dragging a ticket to reorder it followed the finger sideways, off the stack, instead of staying in the column. Reorder only means up and down, so the drag was constrained to vertical movement inside the ranking column. The grab offset stays put, so the ticket remains under the finger, and a ticket that is already open stays open for the whole drag.

# Built with

nextjs, react, typescript, tailwind, vercel, redis, upstash, gemini, google-cloud, dnd-kit, zod

# Try it out

https://hackrpi-26.vercel.app

https://github.com/archityem/HACKRPI26

# Image gallery

*Suggested shots only. These are not uploaded files. If you add gallery images, capture them from the live app: the rank stack, the invite, a budget answer, the itinerary, and an in-column drag.*

# Video demo

None yet.

# Upload a file

Optional / skip

# Sponsor prizes currently selected

- Best First Time Hack
- Best Mobile App Hack
- [MLH] Best Domain Name from GoDaddy Registry
- [MLH] Build Your Hackathon A-Team with SpaceXSI

# GitHub repo

https://github.com/archityem/HACKRPI26.git

# Universities

RPI

# Tech feedback

Gemini fit this product once the API key was readable under the name the deployment already stored. With the key in place, destination ideas and itineraries come back shaped around the group’s airports, dates, budget, and vibes. Without it, the app stays usable by falling back to fixture destinations instead of failing closed. Vercel and Upstash Redis made the no-login model practical: a trip is a link, and every phone reads the same Redis record, so rankings and votes persist across reloads and devices. The useful lesson was to treat that stored document as the source of truth and to check a write by reading it back, including the ranking fields. Tailwind v4 kept the ticket-stack layout in the component tree, which made the mobile column easier to tune against the real screen: open tickets, vertical-only reorder, and a grab offset that stays under the finger. Designing the drag for a thumb in one column, where sideways movement has nowhere useful to go, is what made Rank ’em feel like a stack instead of a free-floating list.

# GoDaddy domains

*Do not invent a domain. Leave this field blank.*

# AI tools selected on the form

OpenAI, Anthropic, Gemini, Other

*The product itself uses the Gemini API.*

# Generative AI

Gemini API for destinations and itineraries, with fixture fallback if unset.

# Gemini Project Number

gen-lang-client-0789111956

*This project number is already on his form. Confirm it in AI Studio before submitting. Do not add any other project numbers or keys.*
