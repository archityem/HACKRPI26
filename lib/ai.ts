import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { Candidates, Destination, Member, Trip } from "./types";

// Fares and lodging from the model are ESTIMATES, not live prices. The UI labels them that way.

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);
// GEMINI_MODEL, if set, is tried first. Ordered by measured latency/availability (3.7/3.8 were overloaded on 2026-11-07);
// slow, overloaded, or unavailable models fall through to the next.
const MODELS = () =>
  [...new Set([process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"].filter(Boolean) as string[])];
const TAGS = ["beach", "food", "nature", "nightlife", "culture", "city"] as const;
const COUNT = 8;
const TIMEOUT_MS = 30_000;

let client: GoogleGenAI | undefined;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const transient = (e: unknown) => [429, 500, 503, 504].includes((e as { status?: number })?.status ?? 0);

/** One structured-JSON call with retry + model fallback. Returns the parsed JSON and the model that answered. */
async function generateJson(prompt: string, schema: unknown, temperature: number): Promise<{ json: unknown; model: string }> {
  let last: unknown;
  for (const model of MODELS()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: prompt,
          config: { temperature, responseMimeType: "application/json", responseJsonSchema: schema, httpOptions: { timeout: TIMEOUT_MS } },
        });
        return { json: JSON.parse(res.text ?? ""), model };
      } catch (e) {
        last = e;
        const status = (e as { status?: number })?.status;
        if (status === 404 || status === undefined) break; // unavailable, or timed out / network error: next model
        if (!transient(e)) throw e;
        await sleep(800 * (attempt + 1));
      }
    }
  }
  throw last;
}

// ---- Candidate destinations -------------------------------------------------

const Proposal = z.object({
  destinations: z.array(
    z.object({
      name: z.string().min(1),
      country: z.string().min(1),
      emoji: z.string().min(1),
      caption: z.string().min(1),
      tags: z.array(z.string()),
      fares: z.array(z.object({ origin: z.string(), roundTripUsd: z.number().positive() })),
      lodgingPerNightUsd: z.number().positive(),
      dailySpendUsd: z.number().positive(),
      flightHours: z.number().positive(),
      stops: z.number().int().min(0),
      domestic: z.boolean(),
      overnight: z.boolean(),
    }),
  ),
});

interface Inputs {
  origins: string[];
  prefs: string[];
  deals: string[];
}

function inputsFor(trip: Trip, members: Member[]): Inputs {
  const ready = members.filter((m) => m.ready);
  const uniq = (a: string[]) => [...new Set(a)].sort();
  return {
    origins: uniq(ready.map((m) => m.origin)),
    prefs: uniq([...trip.vibes, ...ready.flatMap((m) => m.prefs)]),
    deals: uniq(ready.flatMap((m) => m.deals)),
  };
}

/** Stable key: proposals only need regenerating when one of these changes. */
export function candidateKey(trip: Trip, members: Member[]): string {
  return createHash("sha1")
    .update(JSON.stringify([inputsFor(trip, members), trip.windowStart, trip.windowEnd, trip.nights, trip.maxBudget]))
    .digest("hex")
    .slice(0, 16);
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "place";

type Parsed = z.infer<typeof Proposal>;

/** Model output -> app destinations. Drops anything not priced for every origin; sanitizes ids and tags. */
export function toDestinations(parsed: Parsed, origins: string[]): Destination[] {
  const seen = new Set<string>();
  const destinations: Destination[] = [];
  for (const p of parsed.destinations) {
    const fares = Object.fromEntries(p.fares.map((f) => [f.origin.toUpperCase(), Math.round(f.roundTripUsd)]));
    if (origins.some((o) => fares[o] === undefined)) continue; // can't price this for everyone: drop it
    let id = slug(p.name);
    while (seen.has(id)) id += "x";
    seen.add(id);
    destinations.push({
      id, name: p.name, country: p.country, emoji: p.emoji, caption: p.caption.slice(0, 80),
      tags: p.tags.filter((t) => (TAGS as readonly string[]).includes(t)),
      flight: Object.fromEntries(origins.map((o) => [o, fares[o]])),
      night: Math.round(p.lodgingPerNightUsd), daily: Math.round(p.dailySpendUsd * 2) / 2,
      hours: p.flightHours, stops: p.stops, domestic: p.domestic, overnight: p.overnight,
    });
  }
  return destinations;
}

export async function proposeDestinations(trip: Trip, members: Member[]): Promise<Candidates> {
  const { origins, prefs, deals } = inputsFor(trip, members);
  const month = new Date(trip.windowStart + "T12:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const prompt = `You help a group of friends pick a trip. Propose exactly ${COUNT} varied destinations.

Group:
- Departure airports (IATA): ${origins.join(", ")}
- Travel window: ${trip.windowStart} to ${trip.windowEnd} (${month}); trip length ${trip.nights} nights
- Max budget per person for everything (round-trip flight + ${trip.nights} nights lodging + daily spending): $${trip.maxBudget}
- Interests: ${prefs.join(", ") || "no strong preference"}
- Hard requirements: ${deals.length ? deals.join(", ") : "none"}
  (nonstop = only nonstop flights; domestic = US destinations only; short = flights under 5 hours; red-eye = no overnight flights)

Rules:
- Every destination must be realistically reachable from EVERY departure airport above.
- Prefer destinations that plausibly fit the budget; include a mix of cheaper and pricier options.
- "tags" must only use: ${TAGS.join(", ")}.
- "fares": one entry per departure airport, a realistic typical round-trip economy fare in USD for that month. These are estimates.
- "lodgingPerNightUsd": typical per-person share of a mid-range shared stay per night.
- "dailySpendUsd": typical per-person daily food and activities spend.
- "flightHours": typical one-way duration from the group's airports; "stops": typical minimum number of stops; "overnight": true if the typical itinerary is a red-eye.
- "domestic": true only for destinations inside the United States (including Puerto Rico).
- "caption": a short evocative line under 60 characters.
- "emoji": one emoji.`;

  const { json, model } = await generateJson(prompt, z.toJSONSchema(Proposal), 0.5);
  const parsed = Proposal.parse(json);

  const destinations = toDestinations(parsed, origins);
  if (!destinations.length) throw new Error("Gemini returned no usable destinations");
  return { key: candidateKey(trip, members), source: "gemini", model, generatedAt: new Date().toISOString(), destinations };
}
