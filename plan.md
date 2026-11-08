# plan.md: Group Trip Planner (codename: **Stub**)

> **How to use this file:** put `plan.md` and `DESIGN.md` in the repo root. `plan.md` covers what we're building and why. `DESIGN.md` covers how it looks (tokens and rules, in Google's open DESIGN.md format). Point your coding agent (Claude Code, Copilot, Cursor) at both before every UI task. If the two files disagree, **DESIGN.md wins on visuals and plan.md wins on behavior.**

---

## 0. TL;DR

- **Style: "Ticket Stack".** Swiss-poster typography, color-blocked modular (bento) cards and ticket-stub details. Type and color do the work, with almost no chrome, shadows or illustration.
- **UX bet: link-first, like Partiful.** Friends see the trip and vote from a text link **without installing anything**. The app is for the planner; the link is for everyone else.
- **Core loop:** create a trip → share the link → the crew votes (dates, place, things to do) → locked decisions become the itinerary → split costs.
- **Stack:** Expo (iOS, Android and web from one React codebase), TypeScript, Supabase (Postgres, phone auth, realtime).

---

## 1. The style, defined

The reference collage is a known current look. It goes by several names: **Swiss / International-style UI**, **bento grid**, **"bold minimalism"**, and **neo-brutalism-lite**. We take neo-brutalism's color blocking and confidence and skip its thick black borders and hard shadows.

| Signature move | What it looks like | Why it fits a trip app |
|---|---|---|
| **Poster type** | Huge, tightly tracked grotesk headlines: destination names, dates (12/02), totals ($212) | Type *is* the graphic, so every trip looks designed with no photo needed |
| **Color blocking** | Flat, saturated cards (lime, tangerine, violet, lilac, magenta) on cream or black. No gradients | Instantly scannable. Each trip gets its own color, like a Spotify Wrapped card |
| **Modular cards** | One card = one thing (a decision, a day, a cost). Cards stack, peek and expand like tickets in a wallet | Maps 1:1 onto features and onto reusable components |
| **Ticket-stub details** | Monospace metadata, perforation notches, big numerals, QR/barcode accents | Says "trip" without clip-art planes and suitcases |
| **Minimal chrome** | Few icons, no shadows, one primary button per screen | Less to parse means less friction |

**Anti-goals:** generic travel-booking UI (blue gradients, stock beach photos, star ratings), glassmorphism, dense dashboards.

---

## 2. Product principles (use these as tie-breakers)

1. **Link > app.** Every trip has a shareable link that works in any browser. Seeing a trip or voting never requires an account. Ask for the install only *after* someone gets value (their first vote).
2. **One card, one job.** If a card needs two primary actions, it's two cards.
3. **Default everything.** Pre-fill "you paid", "split evenly", "everyone's in" and "poll closes in 48h". People edit only when they disagree.
4. **Decide, don't discuss.** Any idea becomes a vote in one tap, and votes auto-lock. The group chat is for memes; the app is for decisions.
5. **Make it postable.** The trip ticket, the final itinerary and a post-trip "Trip Wrapped" export as story-sized images. Shares are the growth loop.
6. **Fun never blocks.** Animations run 300ms or less, can be interrupted, and turn off with Reduce Motion. Jokes live in copy and empty states, never in the path of a task.

---

## 3. Users and the gap

- **Users:** college friend groups of 4–12. There's usually one **planner** doing about 80% of the work while everyone else replies "down 🙏" in the group chat and then goes quiet.
- **The gap:** Partiful nails link-first fun but is built around single events. Troupe does group voting but not itineraries. Wanderlog does itineraries and maps but is weak at group decisions. Splitwise only does money. Most groups juggle two or more apps.
- **Positioning:** *decide + plan + pay in one place, with Partiful's vibe and zero install for your friends.*

---

## 4. Information architecture

**App shell:** floating ink-pill tab bar with 3 tabs: **Trips · Inbox · You**. "New trip" is the primary CTA on Trips.

**Trip screen = a bento overview.** Each module opens into its full view with a shared-element expand.

```
┌─────────────────────────────────┐
│  TRIP TICKET  (trip color)      │  destination · dates · crew · countdown
│  MONTRÉAL                       │
│  03/13 → 03/16       ◖- - - -◗  │  ← notched stub
├────────────────┬────────────────┤
│  2 VOTES OPEN  │  $212 / PERSON │  stat tiles
├────────────────┴────────────────┤
│  NEXT UP  FRI 7:40 PM  Bus →    │  alert / next item
├─────────────────────────────────┤
│  DAYS   01   02   03   04       │  itinerary strip
├─────────────────────────────────┤
│  IDEAS  ▭▭▭ (stack of 6)        │  saved spots
├─────────────────────────────────┤
│  CREW   ●●●●●○  5 in · 1 maybe  │
└─────────────────────────────────┘
```

### MVP screens

| # | Screen | Purpose | Main components |
|---|---|---|---|
| 1 | **Trips home** | Your trips as a stacked deck, upcoming first | TripTicket (stacked), button-primary "New trip" |
| 2 | **New trip** (sheet, 3 steps) | Get to a shareable link fast | input, DateMode chips, ShareSheet |
| 3 | **Trip overview** | Bento of everything | TripTicket, StatTile, AlertCard, DayStrip, IdeaStack, CrewRow |
| 4 | **Votes** (list + detail) | Open and locked decisions | DecisionCard, VoteBar, status-locked |
| 5 | **Date poll** | Find dates that work | AvailabilityGrid (dot heatmap) |
| 6 | **Days** | Itinerary per day | DayTabs (big numerals), BoardingPass items |
| 7 | **Ideas** | Saved places and links | IdeaCard (auto-unfurled), reactions |
| 8 | **Money** | Balances and settling up | MoneyCard, ExpenseRow, AddExpense sheet |
| 9 | **Crew** | Who's in, roles, nudges | CrewRow, RSVP chips |
| 10 | **Web join page** | What a link opens: see, join, vote | TripTicket, DecisionCard, "I'm in" CTA |
| 11 | **Inbox** | Activity, nudges, closing votes | ActivityRow, AlertCard |
| 12 | **You** | Profile and Venmo / Cash App handles | input, toggles |

---

## 5. Core flows and friction budget

| Flow | Steps | Budget | Smart defaults |
|---|---|---|---|
| **Create trip** | Name/destination ("TBD" allowed) → dates (exact / flexible / "let the group vote") → share | **≤3 steps, under 30s to a link** | Trip color and emoji auto-assigned (tap to change). Crew size not asked |
| **Join from link** (web, no install) | Open link → see ticket and who's in → "I'm in" → first name → vote | **≤2 taps to first vote** | Phone number is optional ("text me updates"). OTP only if they opt in |
| **Make a decision** | On any idea or question → "put it to a vote" → options prefilled → send | **2 taps** | Closes in 48h or at majority. A tie means the planner picks |
| **Date poll** | Planner sets a window → crew taps the days they're free (drag for ranges) | **1 screen** | Heatmap highlights the best range. One tap to "lock dates" |
| **Add expense** | Amount → save | **1 sheet** | Paid by me, split across everyone who's in. Receipt photo optional |
| **Settle up** | "You owe Maya $42" → Pay in Venmo → mark paid | **2 taps** | Deep link with amount and note prefilled |
| **During the trip** | Trip home flips to NOW / NEXT mode on trip dates | **0 taps** | Next item, address and time sit at the top |

### Friction rules (definition of done for every screen)

- [ ] No passwords. Phone OTP plus Sign in with Apple or Google.
- [ ] No confirm dialogs. Use an **undo toast** (5s) instead. Only "delete trip" gets a confirm.
- [ ] Pasting a link (Airbnb, TikTok, Google Maps, Instagram) auto-unfurls it into an Idea card.
- [ ] Optional fields never block saving. Optimistic UI everywhere, with an offline cache for trip data.
- [ ] One primary CTA, pinned in the thumb zone.
- [ ] Every empty state has exactly one action.
- [ ] Notifications are batched into a daily digest. Only "vote closes soon", "you owe" and "trip starts tomorrow" go out in real time.
- [ ] Anything a guest can do on the web link works without an account.

---

## 6. Component library (build these first, in this order)

Tokens live in `DESIGN.md`. Every component below must use tokens only, with no raw hex or px.

1. **Primitives:** `Text` variants (display-xl, display-lg, numeral, title, headline, body, label, meta), `Button` (primary / secondary / danger), `Chip`, `Avatar`, `Input`, `Toast`, `Sheet`.
2. **TripTicket:** trip-color fill, destination in `display-xl` (it may crop at the card edge), dates in `numeral`, crew avatars, countdown in `meta`, notched stub line. Variants: `hero`, `stacked` (peek), `web` (join page), `export` (1080×1920 story image).
3. **StatTile:** one number plus one `meta` label. Half-width bento tile.
4. **DecisionCard:** lilac. Question in `title`, options as chips, **VoteBar** (avatar dots plus count), deadline in `meta`. States: `open`, `you-voted`, `tied`, `locked` (stamp plus lime `status-locked` pill).
5. **AvailabilityGrid:** month grid of dots (empty / some / everyone) in the style of the "11 February" reference. Tap toggles, drag selects a range.
6. **DayStrip and DayTabs:** big `numeral` day numbers (01, 02, 03). The selected day is an ink chip.
7. **BoardingPass (itinerary item):** time in `meta`, title in `headline`, place link, small notches. Swipe right to mark done.
8. **IdeaCard and IdeaStack:** unfurled link (image, title, source), reactions (emoji plus counts), "vote on this" and "add to day".
9. **MoneyCard:** violet. One huge number with one action. **ExpenseRow** for the list.
10. **CrewRow:** avatars with RSVP rings (in = lime ring, maybe = dashed, out = greyed).
11. **AlertCard:** tangerine, for deadlines and nudges.
12. **TabBar:** floating ink pill, 3 items.

**States every component needs:** default, pressed (lift 4px, scale 1.02), disabled, loading (skeleton in `line` color), empty, error (inline, never a modal).

---

## 7. Motion and haptics

| Moment | Motion | Haptic |
|---|---|---|
| Press any card | Lift 4px, scale 1.02, spring back | none |
| Open a module | Shared-element expand from the card (≤300ms) | none |
| Fan out a stack | Cards spread with a 30ms stagger | light |
| Cast a vote | Your avatar dot pops into the VoteBar | light |
| Lock a decision | "LOCKED" stamp scales in, card tints lime | success |
| Trip fully locked (dates + place) | One confetti burst, the only confetti in the app | success |
| Undo toast | Slides up, auto-dismisses after 5s | none |

Use spring physics (stiffness ~220, damping ~18) and no linear easing. With **Reduce Motion** on, everything becomes a 150ms crossfade.

---

## 8. Voice and copy

Short, casual, lowercase is fine for headlines, never corporate, never try-hard.

| Instead of | Say |
|---|---|
| Create poll | put it to a vote |
| RSVP | you in? |
| Expense added successfully | logged. $36 each. |
| No ideas yet | no ideas yet. paste a tiktok, we'll handle the rest. |
| Reminder: 4 members have not voted | 3 of 7 voted. poke the rest? |
| Are you sure you want to delete? | deleted. *undo* |
| Trip finalized | it's happening. 🎉 |

Emoji go in trip icons and reactions only, never in buttons. Avoid slang that will age in six months.

---

## 9. Accessibility bar (non-negotiable)

Contrast is checked against WCAG AA (4.5:1 for text). `DESIGN.md` lints clean with Google's CLI, which includes the contrast check.

| Surface | Text | Ratio |
|---|---|---|
| lime #CCF54A | ink | 15.0 |
| tangerine #FF5B24 | ink | 6.1 |
| violet #5A4BF5 | white | 5.6 |
| lilac #C7B5FF | ink | 10.3 |
| magenta #C81E76 | white | 5.4 |
| peach #FFC9A8 | ink | 12.7 |
| sky #A9C8FF | ink | 11.1 |
| paper #F3EFE6 | muted #6B675F | 4.9 |
| danger #C8281C | white | 5.6 |

- Tap targets are at least 44×44pt, including chips and avatar rows.
- Dynamic Type applies to all Inter text. Display type scales up to a cap and never truncates interactive labels.
- Color is never the only signal: votes show counts and avatars, and RSVP uses ring styles as well as color.
- VoiceOver labels describe whole cards ("Vote: where should we stay? 3 of 6 voted. Closes tonight.").

---

## 10. Tech plan

| Layer | Choice | Why |
|---|---|---|
| App + web link pages | **Expo + Expo Router**, TypeScript | One React codebase for iOS, Android **and** the web join page the links open |
| Styling | **NativeWind**, with the theme generated from DESIGN.md | `npx @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json` keeps tokens in one place |
| Animation and gestures | react-native-reanimated, react-native-gesture-handler | Card stacks, shared-element expands, drag-to-select |
| Sheets | @gorhom/bottom-sheet | All create and edit flows |
| Backend | **Supabase**: Postgres, Auth (phone OTP, Apple, Google), Realtime, Storage | Live votes and itinerary edits, guest-friendly auth, it's just Postgres |
| Fonts | Archivo (static Expanded Black, Condensed Black, ExtraBold), Inter, Space Mono via expo-font | Use the static instances from the Google Fonts download, or cut them with fontTools if they aren't included |
| Icons | Phosphor (Bold weight) | Chunky strokes that match the type |
| Share images | react-native-view-shot to render TripTicket `export` | Story-ready PNGs |
| Notifications | expo-notifications, plus SMS for guests who opted in | Guests may never install |
| Payments | Venmo / Cash App deep links only (no money handling) | Zero compliance overhead for the MVP |

**Data model (MVP):**
`users` · `trips (id, name, destination, color, emoji, start, end, status)` · `members (trip_id, user_id | guest_token, name, rsvp, role)` · `polls (trip_id, type[date|choice], question, closes_at, status, winner_option_id)` · `options` · `votes (option_id, member_id)` · `ideas (trip_id, url, title, image, added_by)` · `itinerary_items (trip_id, day, time, title, place, idea_id)` · `expenses (trip_id, paid_by, amount, note)` · `splits (expense_id, member_id, share)`.
Guests get a `guest_token` cookie on the web, and it's merged into their account if they install later.

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

| Phase | Length | Ship |
|---|---|---|
| **0 · Foundation** | 1 week | DESIGN.md → NativeWind theme. Primitives, TripTicket, DecisionCard. Figma moodboard with 10 reference shots. 5-person hallway test of the ticket and vote cards |
| **1 · MVP** | 3–4 weeks | Create trip → share link → **web join + vote** → date poll → Days → basic Money. Supabase realtime |
| **2 · Delight** | 2 weeks | Motion pass, haptics, link unfurl, reactions, story export of the trip ticket, SMS nudges |
| **3 · Grow** | ongoing | "Trip Wrapped" recap, photo album, idea suggestions from saved links, campus or org trip templates |

**Metrics that prove low friction**
- Time from opening the app to the share link being sent: **under 60s** median.
- **Share of invitees who vote from the link without installing:** the key metric. Target above 60%.
- Poll completion rate (share of crew who voted before close): target above 70%.
- Trips that reach "dates + place locked": target above 50%.

**Usability test script (5 college students, 15 minutes each)**
1. "Start a spring break trip with 5 friends and get them the link."
2. (On a second phone, as a guest) "You just got this link. Tell the group which weekend works."
3. "You paid $180 for the Airbnb. Get everyone to pay you back."
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
