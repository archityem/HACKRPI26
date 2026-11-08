# plan.md: Group Trip Planner (codename: **Stub**)

> **How to use this file:** put `plan.md` and `DESIGN.md` in the repo root. `plan.md` covers what we're building and why. `DESIGN.md` covers how it looks (tokens and rules, in Google's open DESIGN.md format). Point your coding agent (Claude Code, Copilot, Cursor) at both before every UI task. If the two files disagree, **DESIGN.md wins on visuals and plan.md wins on behavior.**

---

## 0. TL;DR

- **Style: "Ticket Stack".** Swiss-poster typography, muted color-blocked cards and ticket-stub details. Type and color do the work, with almost no chrome, shadows or illustration.
- **UX bet: link-first, like Partiful.** Friends open the invite link and answer **on the website, with no account**. Downloading the app is an easy, optional extra, never a gate.
- **Core loop:**
  1. The host sets the basics: dates, length, budget cap and vibe.
  2. The host shares one link.
  3. Friends answer a 30-second survey.
  4. AI suggests 3–5 trips priced per person.
  5. Everyone **ranks** them and can **propose their own** place, which the AI prices.
  6. The group's winner becomes the trip plan, which ends as a travel log.
- **Stack:** keep the existing one (MongoDB + Gemini backend). This file only covers the UI.
---

## 1. The style, defined

The reference collage is a known current look. It goes by several names: **Swiss / International-style UI**, **bento grid**, **"bold minimalism"**, and **neo-brutalism-lite**. We take neo-brutalism's color blocking and confidence and skip its thick black borders and hard shadows.

| Signature move | What it looks like | Why it fits a trip app |
|---|---|---|
| **Poster type** | Huge, tightly tracked grotesk headlines: destination names, dates (12/02), totals ($212) | Type *is* the graphic, so every trip looks designed with no photo needed |
| **Color blocking** | Flat cards in muted, dusty pastels (sage, apricot, dusk blue, lavender, rose) on warm cream. No neons, no gradients | Instantly scannable. Each trip gets its own color, like a Spotify Wrapped card |
| **Modular cards** | One card = one thing (a decision, a day, a cost). Cards stack, peek and expand like tickets in a wallet | Maps 1:1 onto features and onto reusable components |
| **Ticket-stub details** | Monospace metadata, perforation notches, big numerals, QR/barcode accents | Says "trip" without clip-art planes and suitcases |
| **Minimal chrome** | Few icons, no shadows, one primary button per screen | Less to parse means less friction |

**Anti-goals:** generic travel-booking UI (blue gradients, stock beach photos, star ratings), glassmorphism, dense dashboards.

---

## 2. Product principles (use these as tie-breakers)

1. **Link > app.** The invite link works in any browser. Seeing a trip, answering and ranking never require an account. Offer the app *next to* the web option, never in front of it, and carry answers over if someone installs.
2. **One card, one job.** If a card needs two primary actions, it's two cards.
3. **Default everything.** Pre-fill the host's dates and budget cap, remember your home airport after you've answered once, and start your ranking in the AI's order. People edit only when they disagree.
4. **Rank, don't debate.** Ranking replaces the group-chat argument: drag your favorites up, and the group's #1 rises on its own. Anyone can add a place, and the AI prices it so it's compared fairly.
5. **Make it postable.** The locked trip ticket and the final itinerary export as story-sized images. Shares are the growth loop.
6. **Fun never blocks.** Animations run 300ms or less, can be interrupted, and turn off with Reduce Motion. Jokes live in copy and empty states, never in the path of a task.
---

## 3. Users and the gap

- **Host:** the friend who takes the initiative. Sets the hard limits (dates, length, budget cap, vibe) and sends the link.
- **Friends:** everyone else. They add their own limits (home airport, personal budget, dates, passport) and rank the options. Many will never install anything, and that's fine.
- **The problem:** group trips never make it out of the group chat. Planning falls on one person, and existing apps are paid, ugly or start with a sign-up.
- **Positioning:** *the group's answers do the planning. AI turns them into priced options, everyone ranks, done. No sign-up for your friends.*
---

## 4. Information architecture

Eight screens in one flow. The canvas mockup shows each one.

| # | Screen | Who | What's on it |
|---|---|---|---|
| 1 | **Start a trip** | Host | One screen: trip name, rough dates, length chips, a budget cap card (big number, "can go down, never up"), pick-2 vibe chips |
| 2 | **Invite** | Host | "WHERE TO?" ticket with the basics on the stub, who's in, a copyable link, "Send to the gc" |
| 3 | **Link landing (web)** | Friend | The ticket, who's already answered, the primary "Answer here · 30 sec" button, and a secondary "Rather use the app?" card ("your answers come with you") |
| 4 | **Your answers** | Friend (web or app) | Four questions, one card each: home airport, your max budget (private, capped at the host's), dates you can do, passport OK. A small "Get the app" button in the header |
| 5 | **Vibe check** | Everyone | Live group summary: X of Y answered, budget range, airports, best dates, vibe votes, and a nudge for anyone who hasn't answered. Nobody waits on anybody |
| 6 | **Rank 'em** | Everyone | Your #1 as a big ticket (cost per person, group total, AI value verdict, "why it fits"), the rest as draggable ranked rows, "Suggest your own place" and "Lock in my ranking" |
| 7 | **Propose your own** | Everyone | Bottom sheet: type a place → AI estimate card (per person, group total, flights / stay / food breakdown, value verdict) → "Add to the ranking" |
| 8 | **Trip plan** | Everyone | Locked ticket for the winner, a lodging vote, cost per person, and day tabs with a rough itinerary. Grows into the travel log |

**How ranking works:** each person's ranking turns into points, with 1st place worth the most. The group's current #1 shows live on screen 6. When everyone has locked their ranking (or the host closes it), the top trip moves to screen 8.
---

## 5. Core flows and friction budget

| Flow | Steps | Budget | Smart defaults |
|---|---|---|---|
| **Host setup** | One screen → "Make the invite" | **Under 30s to a link** | Length preset to 4–5 nights. Trip color auto-assigned |
| **Open the link** (web) | Landing → "Answer here" | **1 tap to start** | No account, first name only |
| **Get the app** (optional) | "Get it" → store → app opens on the same trip | **1 tap** | The trip ID and a guest token travel with the link, so answers carry over |
| **Answer** | Four question cards → done | **About 30s** | Budget slider capped at the host's cap. Home airport remembered next time |
| **Rank** | Drag rows → "Lock in my ranking" | **1 tap if you agree with the AI** | Starts in the AI's order |
| **Propose your own** | "Suggest your own place" → type it → "Price it" → "Add to the ranking" | **3 taps** | Same dates, airports and group size as the AI picks, so prices compare fairly |
| **Lock the trip** | Automatic when everyone has ranked, or the host closes it | **0 taps** | Winner keeps its trip color on the plan |
| **Plan** | Lodging vote and rough itinerary | **Prefilled by AI** | People edit; they don't start from blank |

### Friction rules (definition of done for every screen)

- [ ] No account to answer, rank or propose. If an account is ever needed (for example to host), use phone OTP or Sign in with Apple or Google, with no passwords.
- [ ] The app is always optional, and asking someone to install never blocks a task.
- [ ] No confirm dialogs. Use an **undo toast** (5s) instead. Only "delete trip" gets a confirm.
- [ ] Typing a place name is enough to propose it. The AI fills in the rest.
- [ ] Optional fields never block. Answers save as you go (optimistic UI).
- [ ] One primary CTA per screen, pinned in the thumb zone.
- [ ] Every empty or loading state says what's happening ("pricing Chicago…") and has at most one action.
- [ ] Nudges are gentle and batched. Real-time alerts only for "ranking closes soon" and "trip is locked".
---

## 6. Component library (build these first, in this order)

Tokens live in `DESIGN.md`. Every component below uses tokens only, with no raw hex or px.

1. **Primitives:**
   - `Text` variants: display-xl, display-lg, numeral, title, headline, body, label, meta
   - `Button` (primary, secondary, danger)
   - `Chip`, `Avatar`, `Input`, `Toast`, `Sheet`
2. **TripTicket:** trip-color fill, big display type, `meta` labels, notched stub line. Variants:
   - `where-to`: before a destination is picked
   - `suggestion`: destination, dates, cost per person, group total, AI verdict
   - `locked`: the winner, with a sage lock pill
   - `export`: a 1080×1920 story image
3. **QuestionCard:** one survey question per card, with a progress bar above. States: `done` (compact, check plus Edit), `active` (expanded and colored), `upcoming` (collapsed).
4. **Pulse tiles:**
   - `StatTile`: one big number plus a `meta` label
   - `DateDots`: availability dots with the best range highlighted
   - `VibeBars`
5. **RankRow:** rank number, destination, price per person, AI verdict and a 44px drag handle. States: `ranked`, `dragging` (lifts and scales, no shadow), `new` (a custom place that was just added).
6. **AIVerdictPill:** ink pill with sage text ("Good value", "Fair price", "Pricey for March"). One per suggestion.
7. **ProposeSheet and EstimateCard:** a place input with "Price it", a loading state, then the estimate: per person, group total, breakdown, verdict and a one-line reason.
8. **AppPromo:** the secondary "Rather use the app?" card and a compact header button. It never blocks anything.
9. **DecisionCard:** lavender. Used for the lodging vote.
10. **DayTabs and BoardingPass:** big day numbers, plus itinerary items with the time in `meta`.
11. **CrewRow, AlertCard and TabBar.**

**States every component needs:** default, pressed (lift 4px, scale 1.02), disabled, loading (a skeleton in the `line` color), empty, error (inline, never a modal).
---

## 7. Motion and haptics

| Moment | Motion | Haptic |
|---|---|---|
| Press any card | Lift 4px, scale 1.02, spring back | none |
| Open a module | Shared-element expand from the card (≤300ms) | none |
| Fan out a stack | Cards spread with a 30ms stagger | light |
| Reorder your ranking | The row lifts and follows your finger, the others slide aside, and rank numbers recount | light, on drop |
| AI prices a place | Skeleton in the estimate card, then the numbers count up (≤600ms) | success |
| Lock a decision | "LOCKED" stamp scales in, card tints sage | success |
| Trip fully locked (dates + place) | One confetti burst, the only confetti in the app | success |
| Undo toast | Slides up, auto-dismisses after 5s | none |

Use spring physics (stiffness ~220, damping ~18) and no linear easing. With **Reduce Motion** on, everything becomes a 150ms crossfade.

---

## 8. Voice and copy

Short, casual, lowercase is fine for headlines, never corporate, never try-hard.

| Instead of | Say |
|---|---|
| Sign up to respond | answer here · 30 sec |
| Download our app | rather use the app? your answers come with you. |
| Submit ranking | lock in my ranking |
| Add custom destination | got a better idea? |
| Calculating… | pricing chicago… |
| Reminder: 2 members have not responded | 2 still out. poke them? |
| Are you sure you want to delete? | deleted. *undo* |
| Trip finalized | it's happening. |

No emoji in buttons or labels. Avoid slang that will age in six months.

---

## 9. Accessibility bar (non-negotiable)

Contrast is checked against WCAG AA (4.5:1 for text). `DESIGN.md` lints clean with Google's CLI, which includes the contrast check.

| Surface | Text | Ratio |
|---|---|---|
| sage #C7D7B0 | ink | 10.6 |
| apricot #EDB48E | ink | 8.8 |
| dusk #59639C | white | 5.7 |
| lavender #D0C7EA | ink | 10.0 |
| rose #E0AFBB | ink | 8.4 |
| butter #EFDCA6 | ink | 11.8 |
| sky #BCD2E8 | ink | 10.4 |
| paper #F4F0E8 | muted #6E6A62 | 4.7 |
| danger #B23A30 | white | 5.9 |

- Tap targets are at least 44×44pt, including chips and avatar rows.
- Dynamic Type applies to all Inter text. Display type scales up to a cap and never truncates interactive labels.
- Color is never the only signal: votes show counts and avatars, and RSVP uses ring styles as well as color.
- VoiceOver labels describe whole cards ("Vote: where should we stay? 3 of 6 voted. Closes tonight.").

---

## 10. Tech notes (UI only)

Keep the existing stack and backend (MongoDB + Gemini). For the UI:

| Need | Use |
|---|---|
| Tokens | DESIGN.md → one theme file (`npx @google/design.md export …`, see UI_OVERHAUL.md Step 1) |
| Fonts | Archivo, Inter, Space Mono (static Archivo instances on React Native) |
| Drag to rank | Whatever drag-and-drop list fits the stack, for example react-native-draggable-flatlist (React Native) or dnd-kit (web React) |
| Sheets | A bottom sheet on mobile, a drawer on web |
| One link, web or app | The link opens the web page. "Get the app" passes the trip ID and a guest token so the app opens the same trip with answers kept |
| Icons | Phosphor (Bold weight) |

**Data the UI expects** (your field names will differ, so map them; don't rename them):

| Data | Fields |
|---|---|
| Trip | Name, dates window, length, budget cap and vibes (host) |
| Member | Name, guest token, whether they've answered |
| Answers | Airport, budget, dates and passport (per member) |
| Suggestions | Destination, dates, per-person and group cost, AI verdict and reason, who proposed it |
| Rankings | Each member's ordered list of suggestion IDs |
| Plan | Lodging options and itinerary items |
---

## 11. AI tooling: skills and design files to use

| Tool | Use it for | Setup |
|---|---|---|
| **DESIGN.md** (included) | Source of truth for tokens and visual rules that any agent reads | `npx @google/design.md lint DESIGN.md` after every edit |
| **frontend-design** skill (Anthropic) | Art-direction pass on new screens so they don't come out generic | `npx skills add anthropics/skills --skill frontend-design` |
| **ui-ux-pro-max** skill | UX and accessibility review passes, with React Native guidance included | `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max` |
| **Figma MCP server** | If you mock up in Figma, the agent reads real frames instead of screenshots | `claude mcp add --transport http figma https://mcp.figma.com/mcp`, then `/mcp` to authenticate |
| **awesome-design-md / getdesign.md** | Reference DESIGN.md files from real brands (for example Spotify) to compare against | Browse getdesign.md. Don't replace ours |

Skills suggest; **DESIGN.md decides.** If a skill proposes off-system colors, fonts or shadows, reject the change.

**Prompt template for building a component:**
```
Read plan.md §6 and DESIGN.md. Build <ComponentName> in /components using only DESIGN.md tokens
(NativeWind classes from tailwind.theme.json). Include states: default, pressed, disabled,
loading, empty, error. Add a Storybook-style preview screen with every variant on paper and
on ink backgrounds. Check: 44pt targets, VoiceOver label, Reduce Motion fallback.
```

---

## 12. Reference library: where to look and what to take

**Style inspiration (the look)**
| Source | Search or link | Take |
|---|---|---|
| Dribbble | "swiss style mobile", "ticket app", "neubrutalism mobile", "bento mobile" | Type scale, color pairings, ticket details |
| Gumroad kit: *Event App, Minimal Brutalism, Ticket App UI* (58 iOS screens, $7+) | rufatrashidov.gumroad.com/l/eventapp | Closest ready-made match to the collage |
| Figma Community | search "Neubrutalism Design System", "Neobrutalism Components" (free) | Component structure. Strip the borders and shadows |
| RetroUI Figma kit (free) | retroui.shadcn.io/figma | Bold component patterns (web-first) |
| Neobrutalist resource roundup | designpieces.com/2026/08/brutalist-design-resources | Fonts, palettes, free kits |
| Spotify Wrapped | Wrapped 2024 coverage (custom Spotify Mix type, color-led) | Per-item color identity, shareable story cards |

**Patterns and flows (the behavior)**
| Source | What to study |
|---|---|
| **Mobbin** (mobbin.com) | Partiful, Spotify, Airbnb wishlists, Splitwise, Venmo: onboarding, sharing, polls, empty states |
| **Lazyweb** (free) | Partiful's phone sign-up flow, step by step |
| **Banani references** (free) | Screens from viral consumer apps |
| **Partiful** (App Store, plus the Pratt IxD critique) | Link-first invites, guests without the app, text blasts, date polling |

**Native baselines (use these, don't redraw them)**
| Kit | Note |
|---|---|
| Apple iOS UI Kit (Figma Community, official) | System sheets, keyboards, share sheets, status bars |
| Material 3 Design Kit (Figma Community, official) | Android equivalents |

**Flow-only kits (good screens, wrong style, so restyle them)**
| Kit | Take |
|---|---|
| Tripify, AI Trip Planner UI Kit (figma.com/community/file/1291417684443460350) | Itinerary and "my trips" flows |
| Eventix by Nucleus UI ($19) | Ticket detail, RSVP, attendee lists |
| TicketSwipe by VIP.graphics | Social and ticket discovery patterns |

**Competitors to tear down:** Partiful (vibe, links), Troupe (voting), Wanderlog (itinerary and map), Splitwise (expense UX), Let's Jetty (bachelor/bachelorette weekend flows).

---

## 13. Roadmap

| Phase | Ship |
|---|---|
| **0 · Foundation** | DESIGN.md → theme file. Primitives, TripTicket, QuestionCard, RankRow |
| **1 · Restyle MVP** | Screens 1–8 restyled on the existing backend. Web landing with the optional app path |
| **2 · Delight** | Motion pass, haptics, AI pricing animation, story export of the locked ticket, gentle nudges |
| **3 · Grow** | Travel log and post-trip recap, shared photo album, trip templates for clubs and orgs |

**Metrics that prove low friction**
- Time from "start a trip" to the link being sent: **under 60s** median.
- **Share of invitees who answer from the link without installing:** the key metric. Target above 60%.
- Ranking completion (share of the group who lock a ranking): target above 70%.
- Share of trips where someone proposes their own place: shows people trust the AI pricing.
- Trips that reach a locked destination: target above 50%.

**Usability test script (5 college students, 15 minutes each)**
1. "Start a spring break trip for 7 friends and send them the link."
2. (On a second phone, as a guest) "You just got this link. Answer the questions."
3. "Rank the trip ideas, then add a place you'd rather go."
Record time on task, taps, and every moment they hesitate.
---

## 14. Open decisions

- Final app name (Stub is a codename).
- iOS-first or iOS and Android together (Expo makes both cheap, but test on iOS first since most of the audience is on iPhone).

---

## Sources

- Bento grid as a 2026 mobile pattern: [Moburst: 8 App Design Trends for 2026](https://www.moburst.com/blog/top-mobile-web-design-trends/), [StudioMeyer: Bento Grid Layouts 2026](https://studiomeyer.io/en/blog/bento-grid-layouts)
- Partiful UX and why it works with Gen Z: [Sacra: Phone-first social invites for Gen Z](https://sacra.com/chat/h/1750e385-3146-4818-9ed3-eb5725dcf2d5/), [Yahoo: How Partiful revived the evite](https://ca.style.yahoo.com/party-ill-seriously-want-partiful-090058088.html), [CNBC via NBC: Partiful vs Apple](https://www.nbcmiami.com/news/business/money-report/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple/3595614/?amp=1), [Partiful on the App Store](https://apps.apple.com/us/app/id1662982304), [Pratt IxD: Design Critique of Partiful](https://ixd.prattsi.org/2025/02/design-critique-partiful/)
- Group trip competitor landscape: [PopSci: apps to organize a group outing](https://www.popsci.com/diy/group-trip-planning-apps/), [Best Group Travel Planning Apps 2026](https://marketing-5my.pages.dev/en/blog/best-group-travel-planning-apps)
- Spotify Wrapped design: [Fast Company: Wrapped 2024](https://www.fastcompany.com/91239913/spotify-wrapped-2024-music-evolution), [Spotify Newsroom: Wrapped 2024](https://newsroom.spotify.com/?p=32167)
- Neobrutalism resources: [Design Pieces roundup](https://www.designpieces.com/2026/08/brutalist-design-resources/), [RetroUI Figma kit](https://retroui.shadcn.io/figma), [Minimal Brutalism Ticket App UI kit](https://rufatrashidov.gumroad.com/l/eventapp)
- Flow kits: [Tripify (Dribbble → Figma)](https://dribbble.com/shots/22977184-Tripify-AI-Trip-Planner-App-UI-Kit), [Eventix by Nucleus UI](https://nucleusui.gumroad.com/l/event-booking-mobile-ui-kit), [TicketSwipe](https://vipgraphics.gumroad.com/l/ticketUI)
- Native kits: [Figma Help: Apple's UI kits](https://help.figma.com/hc/en-us/articles/24037833895831-Get-started-with-Apple-s-UI-kit), [UIThings: iOS 27 UI kit](https://uithings.com/ios-ipados-27-ui-kit-figma)
- Pattern libraries: [Mobbin](https://mobbin.com/), [Lazyweb: Partiful sign-up flow](https://app.lazyweb.com/flow/partiful/sign-up-with-phone), [Banani references](https://www.banani.co/references)
- DESIGN.md: [google-labs-code/design.md](https://github.com/google-labs-code/design.md), [The Decoder: Google open-sources DESIGN.md](https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/), [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- Skills and MCP: [anthropics/skills: frontend-design](https://claudemarketplaces.com/skills/anthropics/skills/frontend-design), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Figma MCP + Claude Code setup](https://www.superdesign.dev/blog/figma-to-claude-code)
- Archivo variable axes: [Archivo on fontalternatives](https://fontalternatives.com/fonts/archivo/)
