# UI Overhaul: restyle the app to match DESIGN.md and plan.md

## 1. The job

The app already works. The features are built, connected to the backend and deployed.
Your job is to **change how it looks and feels, not what it does.**

Make every screen match the "Ticket Stack" style in `DESIGN.md` and the UX rules in `plan.md`.

This is a **prototype**. In order of importance:
1. Everything that works today still works.
2. It looks and feels like the design.
3. The code stays simple, so we can change it fast.

When in doubt, choose simple and clean over clever and complete.

---

## 2. Read these first

| File | What it covers | Rule |
|---|---|---|
| `DESIGN.md` | Colors, fonts, spacing, corner radius, component specs | **Wins on anything visual** |
| `design/` | The 8 approved screens as PNGs and static HTML, plus a README | **Shows what each screen should look like.** Match the layout and copy, and take values from DESIGN.md |
| `plan.md` | Style, UX rules, the 8 target screens, components, motion, copy | Use §1, §2, §4, §5, §6, §7, §8, §9 and the "Data the UI expects" table in §10 |

**Ignore these parts of plan.md:**
- Library ideas in §10 that don't fit our stack. Never change the backend.
- §3 and §11–§14 (market, AI tools, references, roadmap).
- Features we don't have yet. **Restyle what exists.** If something in plan.md §4 isn't built yet (for example the web answer page with "Get the app", drag-to-rank, or "propose your own" with AI pricing), list it in your Step 0 report and ask before building it.
- The codename "Stub". Keep the app's real name and logo.

Don't edit `DESIGN.md` or `plan.md`. If something in them looks wrong, ask.

---

## 3. Ground rules

**Don't touch**
- API calls, data fetching, the backend, the database or auth logic
- Routes and URLs, environment variables, build or deploy config
- If a visual change would need a logic change, stop and ask.

**Keep it simple**
- Use the styling approach the project already uses. Don't switch frameworks.
- New libraries are limited to **fonts, an icon set, a bottom sheet or drawer, and a drag-to-reorder list for ranking** (each only if one is missing). List them before installing. Ask before adding anything else.
- No Storybook, design-system package, theme switcher or dark mode. No new state management, and no "for later" abstraction layers.
- Don't write new tests. See §7 for how to check your work.

**Keep it easy to change**
- Every design value lives in **one tokens file**. Components never hardcode a color, font size or spacing value.
- Build a small set of reusable components and build screens out of them.
- Use props for variants, like `<Card variant="decision">`, instead of copy-pasting components.
- Use the names from DESIGN.md (`sage`, `on-sage`, `display-xl`, `trip-ticket`) so the code and the design speak the same language.

---

## 4. Steps

Do these in order. If the project uses git, commit after each step with a clear message such as `ui: step 2 - basic components`.

### Step 0: Look around (no code changes)
- Read `design/README.md` and look at every PNG in `design/screens/`.
- Work out the stack: web or mobile, which framework, which styling tool.
- List every screen and the shared components each one uses.
- Match each screen to the components it should use (see the map in §5).
- Send me a short report covering:
  - the stack
  - a table mapping each screen to its new components
  - the libraries you want to add
  - your questions
- **Stop and wait for my OK.**

### Step 1: Tokens and fonts
- Create the single tokens file from DESIGN.md. Use the matching shortcut:

  | Styling tool | Command |
  |---|---|
  | Tailwind v3 or NativeWind | `npx @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json` |
  | Tailwind v4 | `npx @google/design.md export --format css-tailwind DESIGN.md > theme.css` |
  | Plain CSS | `npx @google/design.md export --format css-vars DESIGN.md > tokens.css` |

  For anything else (StyleSheet, styled-components and so on), write a `theme.ts` by hand from the YAML block at the top of DESIGN.md.
- Load the fonts:
  - **Archivo** for headlines and big numbers
  - **Inter** for all other text
  - **Space Mono** for small uppercase labels only

  On React Native, use static font files (Archivo Expanded Black, Archivo Condensed Black, Archivo ExtraBold), not the variable font.
- Set the app background to `paper`.

### Step 2: Basic components
Build these: Text styles, Button (primary, secondary, danger), Chip, Card, Input, Avatar, Toast (with Undo), Sheet (a bottom sheet on mobile, a drawer or modal on web) and Tab bar.

**Tip:** if the app already has a shared component such as `Button`, restyle it in place instead of creating a new one. Every screen that uses it updates automatically, and nothing breaks.

### Step 3: Signature components
Build only the ones that match features we already have (see §5).

**Trip colors:** every trip gets one color from sage, apricot, dusk, lavender, rose, butter or sky. If trips don't already store a color, pick one based on the trip ID so the same trip always gets the same color. **Don't add a database field.**

### Step 4: Restyle screens, one at a time
- Work in the order of plan.md §4: start a trip, invite, web landing, your answers, vibe check, rank 'em, propose your own, trip plan.
- On each screen, keep the data and logic exactly as they are and swap only the layout and components.
- Use the matching file in `design/screens/` (same number as plan.md §4) as the target. Open the screen once and compare it to the PNG before moving on.
- **Rank 'em (screen 6) matters most.** It's where the AI shows up. Give it the most care.

**Checkpoint:** after the first two screens, send me screenshots (or describe them) and wait for my OK before doing the rest.
### Step 5: Polish
- **Motion** (plan.md §7): the press lift, the expand when a card opens, and the vote "pop". Keep it short. If the stack makes something hard, skip it and note it.
- **Haptics:** mobile only. Skip on web.
- **Dialogs:** replace "Are you sure?" dialogs with Undo toasts where that's easy. Keep the confirm dialog for anything destructive that can't be undone, like deleting a trip.
- **Copy:** update button labels and empty states using plan.md §8 without changing what they mean.
- **Accessibility, a quick pass:**
  - tap targets are at least 44px
  - only the color pairs from DESIGN.md are used
  - every icon-only button has a label

### Step 6: Wrap up
Send me:
- what changed, as a short list by screen
- where the tokens live, and how to change a color or font in one place
- anything you skipped, or anything that needs a decision from me

---

## 5. Component map

| If the app has… | Use… | Color |
|---|---|---|
| The host's new-trip form | One screen of cards: fields on paper, length and vibe chips, budget as a big `numeral` | dusk (budget card) |
| The invite / share screen | `TripTicket` (`where-to`), link row, "Send to the gc" | trip color (sage by default) |
| The page an invite link opens | Ticket, who has answered, "Answer here" and the `AppPromo` card | trip color |
| The survey / preferences form | `QuestionCard`s with a progress bar | dusk (budget), white (the rest) |
| Group results or a waiting screen | `StatTile`, `DateDots`, `VibeBars`, `AlertCard` | sage hero, white tiles, apricot alert |
| AI trip suggestions | Hero `TripTicket` (`suggestion`), `RankRow`s, `AIVerdictPill` | each suggestion's trip color |
| Custom destination | `ProposeSheet` and `EstimateCard` | lavender |
| Voting on lodging or similar | `DecisionCard` | lavender |
| The final trip / itinerary | `TripTicket` (`locked`), `DayTabs`, `BoardingPass` | winner's color, sage lock pill |
| Forms | `Sheet` and `Input` | white |
| Confirm dialogs | Undo `Toast` | ink |

If something doesn't fit any of these, use a plain white `module-card` and flag it in your report.

---

## 6. Suggested folder layout

Fit this into the project's existing structure, and keep screens and routes where they already are.

```
theme/              tokens and fonts (the only place design values live)
components/ui/      Button, Chip, Card, Text, Input, Avatar, Toast, Sheet, TabBar
components/trip/    TripTicket, QuestionCard, StatTile, DateDots, VibeBars, RankRow,
                    AIVerdictPill, EstimateCard, AppPromo, DecisionCard, DayTabs,
                    BoardingPass, CrewRow, AlertCard
```

---

## 7. How to check your work (keep it light)

- **After each step:** the app starts, and the screens you changed open without errors.
- **At the end:** go through every existing feature once (host a trip, open the link on the web, answer, rank, propose a place, view the plan) to confirm it still works with the real backend.
- If the project already has tests and they run quickly, run them once at the end.
- Don't write new tests, and don't run long or repeated checks.

---

## 8. When to ask me

Put your questions together in one message instead of asking one at a time.

**Ask me when:**
- a visual change would need a logic, API or database change
- you want a library that isn't fonts, icons, a sheet/drawer or a drag-to-reorder list
- a screen doesn't fit any component
- following the design would hide or remove an existing feature

**Don't ask, just decide and mention it in your report**, for small visual calls such as spacing, which trip color to use or the order of cards.

---

## 9. Done when

- [ ] Every screen matches its PNG in `design/screens/` (layout and copy), with no old styles left over
- [ ] Components have no hardcoded colors or sizes; everything comes from the tokens file
- [ ] The fonts load on every platform we ship
- [ ] Each screen has one primary (ink) button
- [ ] Every existing feature still works against the real backend
- [ ] The app builds and deploys the same way it did before
