# How Tripflow works

Tripflow is a group trip planner with no accounts. One person starts a trip and sends a link. Friends open it on a phone, give a first name, answer a few questions, and rank places. The group's top pick becomes the plan.

Live app: https://hackrpi-26.vercel.app

## 1. Product surface

There is nothing to install and nothing to log into. A trip is a link: `/t/` plus a six-character code, for example `/t/ab3kmp`.

The phone shows one screen at a time. After someone has answered, a tab bar switches among Invite, Vibe, Rank, and Plan. Answers is a screen too, reached from those tabs, not a tab of its own. The address hash (`#invite`, `#answers`, `#vibe`, `#rank`, `#plan`) remembers which one is open. That switch lives in `app/_components/TripApp.tsx`.

| Screen | What someone does | Code |
| --- | --- | --- |
| Start | Name the trip, pick a date window, a length, a max budget, and up to two vibes. | `app/page.tsx`, `app/new/page.tsx` |
| Invite | The host shares the link and can pick the ticket color. A friend who has not answered yet sees a landing page and a first name. | `app/_components/Invite.tsx` |
| Answers | Home airport, a private budget, dates, passport, hard nos, and what they want from the trip. About thirty seconds. | `app/_components/Answers.tsx` |
| Vibe | Who has answered, the group's budget range, the dates that overlap, and a nudge for anyone still out. | `app/_components/Vibe.tsx` |
| Rank | Gavin's Ticket Stack. Open a place, compare it, drag to reorder, or add a place of your own. Lock the ranking. | `app/_components/Rank.tsx` |
| Plan | The top pick, "I'm in", a stay vote, an itinerary, and a calendar file once the trip locks. | `app/_components/Plan.tsx` |

A few details that matter when you describe it out loud:

- The group sees a budget range, never one person's number. The range appears once at least two people have answered.
- Choosing "No passport" is stored as the hard no `domestic` (US destinations only).
- The other hard nos are nonstop flights, flights under five hours, and no overnight flights.
- Rank is a stack of tickets. One ticket is open at a time. You drag the handle, up and down, not the whole card.
- Fares and lodging on the tickets are estimates. Nothing is booked.

The trip itself moves through three phases, stored on the trip: `collecting` while people are still answering, `ideas` while the group ranks and says yes, and `planning` once every person who answered has said "I'm in".

## 2. UI layer

The app is Next.js, React, and TypeScript, styled with Tailwind. The phone layout is a single column, `max-w-[430px]`, in `components/ui/tw.ts`. Colors and type come from `theme/tokens.css`.

Gavin's Ticket Stack is the UI: tickets, stubs, chips, the tab bar, and the rank stack. Shared pieces live in `components/ui/` and `components/trip/`. Trip screens live in `app/_components/`.

Drag-to-rank uses dnd-kit. `components/trip/RankList.tsx` wraps the stack in `DndContext` and `SortableContext`. `lib/rankDrag.ts` drops sideways movement so a ticket stays in the column. Keyboard reorder works too: focus the handle, space, then the arrow keys.

The home page (`/`) offers "Start a trip". The start form is `/new`. A trip page is `/t/[code]`, which renders `TripApp`. The page also sets the link-preview title from the trip, and `app/t/[code]/opengraph-image.tsx` draws the preview image. `app/manifest.ts` is the "add to home screen" manifest. Same link, same answers, still no account.

The open trip polls `GET /api/trips/[code]` every four seconds, and skips the poll while the tab is hidden, so a friend's answers show up without a refresh.

## 3. Client session

There is no account and no password. Joining is a first name on the shared link.

Each device keeps a private token in `localStorage` under `tripflow:session:` plus the trip code (`lib/client.ts`). The value is the member id and the token. The browser sends it as `Authorization: Bearer …` on later calls to that trip.

The server never stores the raw token. `lib/credential.ts` hashes it with SHA-256, and that hash is what gets saved. `lib/auth.ts` loads the member from the hash. If the body names a member id, it has to be this device's member. A missing or unknown token is a 401. A token for someone else is a 403. A public member id is not permission.

The same browser also keeps a short list of trips it has opened (`tripflow:trips`), only so the home page can show "your trips". That list is not sent to the server.

A friend who has not answered yet can open the landing page and the questions. The other screens stay closed until their answers are saved.

## 4. App and API layer

Pages and route handlers are the Next.js App Router under `app/`. The client talks to the trip through `api()` in `lib/client.ts`. POST bodies are checked with zod (`safeParse`). A bad body comes back as 400. On an existing trip, a change from a device calls `authenticate`, so the token has to match the member in the body. A first join has no token yet: `/members` treats a request with no credential and no member id as a new person and returns one.

| Request | What it does |
| --- | --- |
| `POST /api/trips` | Creates the trip and the host. Returns the code, the member id, and the token once. |
| `GET /api/trips/[code]` | The snapshot the screens render. Other people's budgets are stripped unless the token is theirs. |
| `POST /api/trips/[code]/members` | Join, or update your own answers. A first join issues a token. |
| `POST /api/trips/[code]/rank` | Saves your order. `locked: true` means you are done. |
| `POST /api/trips/[code]/proposal` | Sets the group's pick, or clears it. Any ready member can call it. Rank shows "close ranking" to the host. |
| `POST /api/trips/[code]/approve` | "I'm in" on the current pick. Planning starts only when every ready member has approved. |
| `POST /api/trips/[code]/estimate` | Prices a place someone typed. Kept as that person's draft. |
| `POST /api/trips/[code]/custom` | Moves that draft onto the ranking and unlocks everyone so the new place gets a look. |
| `POST /api/trips/[code]/lodging` | A vote on hostel, shared apartment, or boutique hotel. |
| `POST /api/trips/[code]/plan` | Adds or removes a stop on the itinerary. The AI draft stays as it was. |
| `POST /api/trips/[code]/retry` | Clears a failed Gemini job and tries again. |
| `POST /api/trips/[code]/ticket` | Host only. Sets the ticket color. |
| `GET /api/trips/[code]/cover` | The invite picture, if one was stored when the trip was created. The start screen does not send one. |
| `POST /api/templates` | Asks Gemini for invite-poster designs. The current start screen does not call it. |
| `POST /api/trips/[code]/vote` | Stores a single pick. The Rank screen uses `/rank` instead. |

The snapshot is built in `lib/trips.ts`. It joins the trip, the members, and the votes, runs matching (`lib/matching.ts`), and reports whether Gemini is on, generating, or standing in with samples. Matching finds the shared dates, prices each place per person (flight, lodging, daily spend), and drops a place that misses someone's budget or hard no. A place a member added stays on the list, with the warning shown on the ticket.

When every ready member has locked a ranking, `/rank` scores the orders in `lib/rank.ts` (first place gets the most points) and writes the group's number one as `proposal`. The phase stays `ideas` until everyone approves. Once at least one person has locked, the host sees "Close ranking and pick #1" on Rank, which posts the current number one to `/proposal`. Approval is one Redis operation (`lib/store.ts`) so a stale pick cannot flip the trip into planning.

Gemini work does not block the response. `lib/background.ts` starts it with Next.js `after()`, and the trip records the job so another server instance does not start the same one (`lib/jobs.ts`). Routes that can kick that work set `maxDuration` to 60 seconds.

Zod also checks Gemini's JSON inside `lib/ai.ts`. That is the model output, not the HTTP body.

## 5. Persistence

`lib/store.ts` is the only storage API the rest of the app uses.

- Production, when Redis URL and token are set: Upstash Redis, through `@upstash/redis`. Vercel can supply `KV_REST_API_URL` and `KV_REST_API_TOKEN`. A direct Upstash setup uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Either pair selects Redis.
- Locally, with those unset: a JSON file, `data/db.json`, or `DATA_FILE` if that is set. The file is gitignored.

Redis keys are hashes, one per trip:

- `tripflow:trip:{code}` — the trip, one hash field per property
- `tripflow:members:{code}` — member id to member JSON
- `tripflow:votes:{code}` — member id to that person's ranking
- `tripflow:auth:{code}` — token hash to member id

Each trip field is its own hash field, so two updates to different fields do not clobber each other. The file store serializes writes for the same reason.

Those four prefixes are the keys the store reads and writes.

## 6. AI layer

The in-app model is Gemini, called through `@google/genai` in `lib/ai.ts`. The app does not call Grok or xAI.

Three calls do the trip:

1. **Suggest destinations.** Once someone has answered, `proposeDestinations` asks for eight places that fit the group's airports, dates, budget, vibes, and hard nos. The result is cached on the trip.
2. **Price a place someone adds.** `priceDestination` estimates that place with the same assumptions, so it can sit next to the suggestions.
3. **Draft the itinerary.** After the phase is `planning`, `planItinerary` writes a day-by-day plan for the winning place: a short summary, morning / afternoon / evening, and three tips. Members can add their own stops on top. The draft says to check hours and prices. Nothing is booked.

Fares and lodging from the model are estimates, not live prices. The rank tickets say "AI" or "Est." accordingly. The plan tile says "Est. per person".

The key is `GEMINI_API_KEY` (or the `Gemini` env var, if that is the one already set in production). `GEMINI_MODEL` is optional and is tried first. If the key is missing, AI is off and the app uses the sample destinations in `lib/destinations.ts`: San Juan, Cancún, Miami, Lisbon, and Costa Rica, with sample fares from BOS, JFK, and ALB. The snapshot marks that source `fixture`.

If the key is set and the call fails, the same samples stand in and the source is `fallback`. Rank shows that they are samples and offers "Try again", which hits `/retry`. While a suggestion call is still running, the source is `pending` and Rank says it is pricing destinations. A place someone types in, if pricing fails, gets a labelled sample estimate instead of a Gemini price (`sampleEstimate` in `lib/trips.ts`).

`lib/ai.ts` can also design invite posters (`designInvites`). That path is `POST /api/templates`. The start screen in `app/new/page.tsx` does not use it.

## 7. Hosting

The app is deployed on Vercel. The live site is https://hackrpi-26.vercel.app. There is no other domain in this repo.

Link-preview URLs use the Vercel production host when `VERCEL_ENV` is `production`, and the deployment host otherwise (`app/layout.tsx`). Locally they fall back to `http://localhost:3000`.

Redis is the production database. Without Redis env vars, a server uses the JSON file, which is the local path. Settings are listed in `.env.example`. No key is required to run; without `GEMINI_API_KEY` the sample destinations are the list.

## 8. A trip, end to end

1. **Start.** On `/new` the host posts to `POST /api/trips`. The server makes a code, a host member who still has to answer, and a device token. The browser stores the token and opens `/t/{code}#invite`. Phase is `collecting`.
2. **Send the link.** The host shares `/t/{code}`. A friend with no token sees the landing page.
3. **Answers.** The friend posts to `POST /api/trips/[code]/members` with a first name, airport, dates, budget, passport, hard nos, and vibes. That creates the member, stores only the token hash, and marks them ready. The snapshot that comes back is now "you". Other people's budget numbers are omitted. The first real answers move the phase to `ideas`. If Gemini is configured, destination ideas start in the background.
4. **Vibe.** Everyone's poll of `GET /api/trips/[code]` shows who is ready, the shared dates, and the budget range once at least two people have answered.
5. **Rank.** Tickets come from Gemini, or from the samples. Dragging posts the new order to `/rank`. "Lock in my ranking" posts the same order with `locked: true`. When every ready member has locked, the highest-scoring place is saved as the proposal. Once at least one person has locked, the host can close ranking early and take the current number one.
6. **Plan.** The proposal is the plan. Each person taps "I'm in" (`/approve`). When the last ready member does, the phase becomes `planning`. Gemini drafts the itinerary in the background. The group votes on a stay (`/lodging`) and can add stops (`/plan`).
7. **Calendar.** Once the phase is `planning`, "Add to calendar" builds an `.ics` file in the browser (`lib/ics.ts`) for the trip dates and downloads it. "Copy itinerary" copies the draft as text. The file is a single all-day event. It does not book flights or rooms.

### One request, through the layers

Take "Lock in my ranking" on the Rank screen.

1. **UI.** `Rank.tsx` calls `api()` with the member id, the destination ids in order, and `locked: true`.
2. **Session.** `api()` reads `tripflow:session:{code}` and adds the Bearer token.
3. **API.** `POST /api/trips/[code]/rank` parses the body with zod. `authenticate` hashes the token, loads the member, and checks the id. The member has to be ready, and the trip cannot already be in `planning`.
4. **Matching.** Only ids that are still eligible are kept. The vote is written to `tripflow:votes:{code}` (or the votes array in `data/db.json`).
5. **Decision.** If every ready member now has a locked vote, `groupOrder` picks the winner and `updateTrip` sets `proposal`. The phase stays `ideas`.
6. **Back to the phone.** The response is a fresh snapshot. If this lock was the last one, the button becomes "See the plan". The next poll on everyone else's phone shows the same pick.

"I'm in" is the same path through `/approve`. That handler is the one that moves the phase to `planning`, and the following poll starts the itinerary job if the winning place and the shared dates are known.

## Where to look

- Screens: `app/_components/`
- Ticket Stack UI: `components/ui/`, `components/trip/`, `theme/tokens.css`
- Session and fetch: `lib/client.ts`, `lib/credential.ts`, `lib/auth.ts`
- Trip rules: `lib/trips.ts`, `lib/matching.ts`, `lib/rank.ts`, `lib/answers.ts`
- Storage: `lib/store.ts`
- Gemini: `lib/ai.ts`, `lib/destinations.ts`, `lib/jobs.ts`, `lib/background.ts`
- Calendar file: `lib/ics.ts`, used from `app/_components/Plan.tsx`
- Routes: `app/api/trips/`

The product summary for readers is `README.md`. A shorter product brief is `executive-summaries.md`.

The repo was put together by a five-role crew: Overseer, Builder, Verifier, Bugs, and Ship. Their notes are in `agentfiles/`. Those roles do not write the itinerary. Gemini does, when a key is set.
