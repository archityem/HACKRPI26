---
version: alpha
name: Stub — Ticket Stack
description: Swiss-poster typography, color-blocked modular cards and ticket-stub details for a link-first group trip planner built for college friend groups.
colors:
  ink: "#22211F"
  paper: "#F4F0E8"
  white: "#FFFFFF"
  muted: "#6E6A62"
  line: "#DDD6CA"
  primary: "#22211F"
  on-primary: "#FFFFFF"
  background: "#F4F0E8"
  on-background: "#22211F"
  surface: "#FFFDF9"
  on-surface: "#22211F"
  sage: "#C7D7B0"
  on-sage: "#22211F"
  apricot: "#EDB48E"
  on-apricot: "#22211F"
  dusk: "#59639C"
  on-dusk: "#FFFFFF"
  lavender: "#D0C7EA"
  on-lavender: "#22211F"
  rose: "#E0AFBB"
  on-rose: "#22211F"
  butter: "#EFDCA6"
  on-butter: "#22211F"
  sky: "#BCD2E8"
  on-sky: "#22211F"
  success: "#C7D7B0"
  on-success: "#22211F"
  danger: "#B23A30"
  on-danger: "#FFFFFF"
typography:
  display-xl:
    fontFamily: Archivo
    fontSize: 56px
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  display-lg:
    fontFamily: Archivo
    fontSize: 40px
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  numeral:
    fontFamily: Archivo
    fontSize: 72px
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.05em"
  title:
    fontFamily: Archivo
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.4
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  meta:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  pill: 999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 56px
    padding: 20px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 48px
    padding: 16px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 36px
    padding: 12px
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 36px
    padding: 12px
  trip-ticket:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.on-sage}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-apricot:
    backgroundColor: "{colors.apricot}"
    textColor: "{colors.on-apricot}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-dusk:
    backgroundColor: "{colors.dusk}"
    textColor: "{colors.on-dusk}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-lavender:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.on-lavender}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-rose:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.on-rose}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-butter:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.on-butter}"
    rounded: "{rounded.xl}"
    padding: 20px
  trip-ticket-sky:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.on-sky}"
    rounded: "{rounded.xl}"
    padding: 20px
  screen:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background}"
  caption-on-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.body-md}"
  divider:
    backgroundColor: "{colors.line}"
    height: 1px
  status-locked:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: 8px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 56px
    padding: 20px
  module-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  decision-card:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.on-lavender}"
    rounded: "{rounded.lg}"
    padding: 16px
  money-card:
    backgroundColor: "{colors.dusk}"
    textColor: "{colors.on-dusk}"
    rounded: "{rounded.lg}"
    padding: 16px
  alert-card:
    backgroundColor: "{colors.apricot}"
    textColor: "{colors.on-apricot}"
    rounded: "{rounded.lg}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    padding: 16px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  tab-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    height: 64px
  avatar:
    rounded: "{rounded.pill}"
    size: 32px
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 16px
---

## Overview

"Ticket Stack": a group trip planner that looks like a stack of gig tickets and travel stubs. Swiss-poster typography does the heavy lifting: huge, tightly tracked destination names, dates and dollar totals. Information lives in flat, color-blocked cards, one job per card, that stack, peek and expand. Ticket-stub details (monospace metadata, perforation notches, big numerals) make it read as "trip" without any clip art.

Personality: confident and playful but calm on the eyes, never cluttered. Fun shows up in color, motion and copy. It never adds steps.

Audience: college students (18–24) planning trips with 4–12 friends, used to the look of Partiful, Spotify and Instagram Stories.

## Colors

- **The palette is muted and dusty.** It has enough color to keep the bold, poster-like feel, but it's soft enough to look at for a long time. No neons and no fully saturated colors.
- **Ink (#22211F)**, a warm charcoal rather than pure black, is the primary color: text, primary buttons, tab bar. There is one primary action per screen and it is always an ink pill.
- **Paper (#F4F0E8)** is the app background. Cards sit on it in warm white (`surface`, #FFFDF9) or a trip color.
- **Trip colors** (sage, apricot, dusk, lavender, rose, butter, sky) are assigned per trip, the way Spotify Wrapped gives each card its own color. A trip's color fills its ticket and tints that trip's header. Every trip color has a fixed `on-` text color; never change the pairing. Dusk is the only dark trip color and the only one with white text.
- **Functional color use inside a trip:** decisions = lavender, money = dusk, alerts and deadlines = apricot, confirmed or locked = sage. Keep these consistent so users learn them.
- **Danger (#B23A30)** is only for destructive actions (leave trip, delete). It is never decorative.
- **Muted (#6E6A62)** for secondary text on paper or white (passes 4.5:1). **Line (#DDD6CA)** for hairline dividers and perforation dashes, never for text.
- No gradients. No transparency over photos except a single ink scrim at 40% for photo-backed tickets.

## Typography

- **Archivo** (variable: wght 100–900, wdth 62–125) for display. Use it Expanded (wdth ~112) and Black for destination names (`display-xl`, `display-lg`), and Condensed (wdth ~75) and Black for numerals (`numeral`: dates like 12/02, totals like $212). React Native doesn't reliably support variable axes, so ship static instances (Archivo Expanded Black, Archivo Condensed Black, Archivo ExtraBold) through expo-font.
- **Inter** for all UI and body text (`headline`, `body-*`, `label`). Supports Dynamic Type.
- **Space Mono** for `meta` only: times, confirmation codes, "DAY 02", seat-style labels. Always UPPERCASE, 12px, +0.04em. Never use it for sentences.
- Display type goes on a single line wherever possible and may be cropped by the card edge on the hero ticket (intentional poster effect), but never on interactive text.
- Max three type sizes per card.

## Layout

- 4px base grid. Screen margin `md` (16px). Gap between cards `xs` (8px). The tight gaps make it read as bento, not as a feed.
- The trip overview is a bento grid: full-width hero ticket, then a 2-column row of stat tiles, then full-width modules. Hierarchy comes from card size, not from headers.
- Stacked cards (trips list, ideas) overlap by 24px with a 16px peek of the card behind. Tapping a stack fans it out.
- The primary CTA is pinned to the bottom thumb zone, 16px above the tab bar or the home indicator.
- Bottom sheets for every create and edit flow. No full-screen forms.

## Elevation & Depth

Flat. No drop shadows. Depth comes from overlap (stacks), color contrast between card and paper, and motion (cards lift 4px and scale 1.02 while pressed). Sheets get a 40% ink scrim behind them, never a shadow.

## Shapes

- Cards: `lg` (24px). Hero trip ticket and sheets: `xl` (32px).
- Buttons, chips, avatars, tab bar, toasts: `pill`.
- Ticket signature: the hero ticket and the itinerary "boarding pass" have two 12px semicircle notches cut into the left and right edges at the stub line, with a dashed `line` divider between them. Use it only on those two components so it stays special.

## Components

- **button-primary**: ink pill, 56px tall, label in Inter 600. One per screen.
- **button-secondary**: white pill, 48px.
- **chip / chip-selected**: vote options, filters, RSVP (In / Maybe / Out). Selected = ink fill.
- **trip-ticket**: the hero. Trip color fill, destination in `display-xl`, dates in `numeral`, crew avatars, countdown in `meta`. Notched stub.
- **module-card**: white card for overview modules (Days, Ideas, Crew).
- **decision-card**: lavender. Question in `title`, options as chips, votes shown as avatar dots plus a count.
- **money-card**: dusk. One huge number ("$42 you owe Maya") in `numeral`, one action.
- **alert-card**: apricot. Deadlines and nudges ("vote closes in 3h").
- **input**: white, 52px, `md` radius, label above, never placeholder-only.
- **sheet**: white, `xl` top corners, drag handle, primary CTA pinned at the bottom.
- **tab-bar**: floating ink pill, 3 tabs, icon plus label.
- **toast**: ink pill with Undo. It replaces confirm dialogs.

## Do's and Don'ts

- Do let type be the graphic. A destination name at 56px beats a stock photo.
- Do give every trip its own color, and keep each color's on-color pairing fixed.
- Do use one primary action per screen, always the ink pill.
- Do show votes as avatars plus a number, never color alone.
- Don't add drop shadows, gradients, glassmorphism or thick neo-brutalist borders.
- Don't use neon or fully saturated colors. Stay inside the muted palette.
- Don't mix more than two trip colors on one screen (plus ink, paper and white).
- Don't use Space Mono or Archivo for paragraphs.
- Don't use confirm dialogs. Use undo toasts.
- Don't put emoji inside buttons. Emoji go on trip icons and reactions only.
