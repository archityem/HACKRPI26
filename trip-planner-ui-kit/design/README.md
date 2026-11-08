# Design reference: Group Trip Planner UI

These are the 8 approved screens from the UI proposal canvas. Use them with `plan.md`, `DESIGN.md` and `UI_OVERHAUL.md`.

| File type | What it is | Use it for |
|---|---|---|
| `screens/*.png` | Picture of each screen (390×844, 2x) | What the screen should look like |
| `screens/*.html` | The same screen as static HTML, which opens in any browser | Exact layout, spacing, sizes and copy |

## Rules

1. **Match the layout, hierarchy and copy** in these files.
2. **Take every value from `DESIGN.md` tokens.** Never copy raw hex codes or px values into components. Use the table below to translate.
3. **The sample data is fake** (names, prices, places, dates). Wire in the real data from the backend.
4. **They're static.** These files have no logic. Behavior comes from plan.md §4 and §5.
5. **Only restyle what exists.** If a screen shows a feature the app doesn't have yet, flag it in the Step 0 report instead of building it.

## Screens

| File | plan.md §4 screen | Main components |
|---|---|---|
| `01-start-a-trip` | 1 · Start a trip | Inputs on paper, length and vibe chips, budget `numeral` on a dusk card |
| `02-invite` | 2 · Invite | `TripTicket` (where-to), link row, "Send to the gc" |
| `03-link-landing-web` | 3 · Link landing (web) | `TripTicket`, who answered, `AppPromo`, "Answer here" |
| `04-your-answers` | 4 · Your answers | `QuestionCard`s (done / active / upcoming), progress bar, header "Get the app" |
| `05-vibe-check` | 5 · Vibe check | `StatTile`, `DateDots`, `VibeBars`, `AlertCard` |
| `06-rank-em` | 6 · Rank 'em | `TripTicket` (suggestion), `AIVerdictPill`, `RankRow`s, "Suggest your own place" |
| `07-propose-your-own` | 7 · Propose your own | `ProposeSheet`, `EstimateCard` |
| `08-trip-plan` | 8 · Trip plan | `TripTicket` (locked), `DecisionCard`, `StatTile`, `DayTabs`, `BoardingPass` |

## Raw value → DESIGN.md token

| Value in these files | Token |
|---|---|
| `#22211F` | `ink` / `primary` |
| `#F4F0E8` | `paper` / `background` |
| `#FFFDF9` | `surface` |
| `#FFFFFF` (text) | `white` / `on-dusk` |
| `#6E6A62` | `muted` |
| `#DDD6CA` | `line` |
| `#C7D7B0` | `sage` |
| `#EDB48E` | `apricot` |
| `#59639C` | `dusk` |
| `#D0C7EA` | `lavender` |
| `#E0AFBB` | `rose` |
| `#EFDCA6` | `butter` |
| `#BCD2E8` | `sky` |
| Archivo 900, `font-stretch: 112%` | `display-xl`, `display-lg`, `title` |
| Archivo 900, `font-stretch: 75%` | `numeral` |
| Inter | `headline`, `body-*`, `label` |
| Space Mono 12px, uppercase | `meta` |
| Radius 32px / 24px / 16px / pill | `rounded.xl` / `rounded.lg` / `rounded.md` / `rounded.pill` |
