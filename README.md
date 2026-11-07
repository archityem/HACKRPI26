# Elsewhere

A playful group trip planner prototype for HackRPI 2026. Friends join through a custom invitation, share their constraints, compare trip ideas, and approve a plan together.

## Run it

Open **index.html** in a modern browser. No package installation or API keys are required.

To serve it locally instead, run this command from the repository root:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Try the full flow

1. Select **I'm interested. Let's do this** on the invite.
2. Enter a name, departure airport, and available March dates.
3. Set a maximum budget or comfortable range, then pick preferences and dealbreakers.
4. Explore the updated destination suggestions, react, and vote.
5. Propose a destination and approve it.
6. Use the **Demo traveler** selector in the footer to switch to Maya and Leo and approve as each traveler.
7. After all three approve, the shared planning checklist unlocks.

Choose **Make it yours** to customize the title, note, and cover color and preview the invitation card or embed.

## Features

- Custom invitation title, message, and three cover themes.
- Date presets and exact available date ranges.
- Maximum budgets and comfortable budget ranges.
- Departure airports, interests, and hard dealbreakers.
- Suggestions filtered by shared availability, estimated trip cost, and every submitted requirement.
- Flight, lodging, and daily spending breakdowns.
- Destination votes and emoji reactions.
- Separate final approvals from every traveler before moving to planning.
- Conflicting-date and no-affordable-trip states.
- Mobile layouts and light/dark appearance.
- Browser-local saved state when storage is available.

## Edit and rebuild

Edit **prototype/elsewhere.html**, which contains the UI, styles, sample data, and interaction logic. Then regenerate the browser entry point:

```sh
python3 scripts/build.py
```

Commit both the source and the rebuilt **index.html**. The build uses Python's standard library and preserves the standalone page's preview runtime. It does not require Codex or any plugin files.

The source fragment can also be opened directly for quick UI work, but the standalone **index.html** supplies browser-local state persistence.

## Prototype scope

This is a frontend demonstration with three simulated travelers, three departure airports, and five candidate destinations for a five-night trip during March 2027. Fares, lodging, flight attributes, and daily spending are illustrative fixtures. The recommendations use local filtering and preference ranking, not a live AI or flight-search API.

The lower budget value expresses comfort; the upper value is the hard ceiling. Voting expresses a favorite. Final approval is a separate action. Editing a traveler's constraints clears the proposed plan and previous final approvals.

Invite links and embed code are previews, not published invites. Travelers and votes do not synchronize across devices. The privacy treatment for individual budgets is visual only; this demo has no authentication or authorization. There are no live bookings, wallet connections, or Solana payments. The final checklist records planning progress only.

Google Fonts is used for typography; system fonts provide a fallback. The generated page includes a sandboxed preview runtime for local state and appearance handling.

## Validation

The prototype was exercised in Microsoft Edge on desktop and at widths of 1024, 736, 390, and 320 pixels. Checks covered date and budget validation, filtering, totals, reactions, votes, unanimous approval, approval invalidation, invite customization, and horizontal overflow. Light and dark appearances were visually reviewed.
