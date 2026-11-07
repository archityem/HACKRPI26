import type { Suggestion } from "./matching";
import type { Deal, Member, Theme, Trip, Vote } from "./types";

// Shapes the API returns, shared by the UI.
export type PublicMember = Omit<Member, "min" | "max"> & { min?: number; max?: number };

export interface Snapshot {
  trip: Trip;
  members: PublicMember[];
  votes: Vote[];
  me: string | null;
  ai: {
    enabled: boolean;
    generating: boolean; // Gemini is currently proposing destinations
    source: "gemini" | "fixture" | "pending"; // pending = AI on, proposals not ready yet
    model?: string;
    itinerary: "off" | "ready" | "generating" | "failed";
  };
  match: {
    start: string | null;
    end: string | null;
    tripEnd: string | null;
    overlap: boolean;
    readyCount: number;
    eligible: Suggestion[];
    excluded: { id: string; name: string; reasons: string[] }[];
  };
}

// Without AI, only these airports have sample fares (lib/destinations.ts).
export const SAMPLE_AIRPORTS: Record<string, string> = { BOS: "Boston · BOS", JFK: "New York · JFK", ALB: "Albany · ALB" };
// With AI, any airport can be priced, so offer a broader list.
export const AIRPORTS: Record<string, string> = {
  ...SAMPLE_AIRPORTS,
  EWR: "Newark · EWR", LGA: "New York · LGA", PHL: "Philadelphia · PHL", DCA: "Washington · DCA", IAD: "Washington · IAD",
  BWI: "Baltimore · BWI", PIT: "Pittsburgh · PIT", BUF: "Buffalo · BUF", SYR: "Syracuse · SYR", ORD: "Chicago · ORD",
  ATL: "Atlanta · ATL", MIA: "Miami · MIA", DFW: "Dallas · DFW", DEN: "Denver · DEN", LAX: "Los Angeles · LAX",
  SFO: "San Francisco · SFO", SEA: "Seattle · SEA", BNA: "Nashville · BNA", CLT: "Charlotte · CLT", MSP: "Minneapolis · MSP",
};
export const airportsFor = (ai: boolean) => (ai ? AIRPORTS : SAMPLE_AIRPORTS);

export const PREFS: [string, string, string][] = [
  ["beach", "🏖", "Beach days"], ["food", "🍜", "Good food"], ["nature", "🌿", "Outdoors"],
  ["nightlife", "🪩", "Nightlife"], ["culture", "🏛", "Art & culture"], ["city", "🏙", "City exploring"],
];
export const prefLabel = (id: string) => PREFS.find((p) => p[0] === id)?.[2] ?? id;

export const DEALS: [Deal, string][] = [
  ["nonstop", "Nonstop flights only"],
  ["short", "Flights under 5 hours"], ["red-eye", "No overnight flights"],
];
export const PASSPORT: { id: "open" | "visa" | "domestic"; label: string; hint: string }[] = [
  { id: "open", label: "Passport ready", hint: "International is fine" },
  { id: "visa", label: "Easy entry only", hint: "Skip visa paperwork" },
  { id: "domestic", label: "US only", hint: "No passport / stay domestic" },
];
export const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: "pink", color: "#f3a8c9", label: "Pink postcard" },
  { id: "pool", color: "#b9dfe4", label: "Pool club" },
  { id: "golden", color: "#f5b777", label: "Golden hour" },
];
export const passportFrom = (deals: Deal[]): "open" | "visa" | "domestic" =>
  deals.includes("domestic") ? "domestic" : deals.includes("visa") ? "visa" : "open";
export const dealsWithPassport = (deals: Deal[], passport: "open" | "visa" | "domestic"): Deal[] => [
  ...deals.filter((d) => d !== "domestic" && d !== "visa"),
  ...(passport === "domestic" ? ["domestic" as const] : passport === "visa" ? ["visa" as const] : []),
];

/** Split a trip title into the stacked poster lines. */
export function posterLines(title: string): { top: string; mid?: string; end: string } {
  const words = title.trim().replace(/[.!?]+$/u, "").split(/[\s,]+/u).filter(Boolean);
  if (words.length <= 1) return { top: words[0] || "let's", end: "go." };
  if (words.length === 2) return { top: words[0], end: `${words[1]}.` };
  return { top: words[0], mid: words.slice(1, -1).join(" "), end: `${words[words.length - 1]}.` };
}

export function inviteBlurb(trip: Pick<Trip, "title" | "note" | "nights" | "windowStart" | "windowEnd" | "maxBudget">, link: string) {
  return [
    trip.title,
    trip.note,
    `${trip.nights}-night trip · ${range(trip.windowStart, trip.windowEnd)} · up to ${money(trip.maxBudget)}/person`,
    "Add your dates, budget, and airport — we’ll find a place everyone can say yes to.",
    link,
  ].filter((s) => s.trim()).join("\n");
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const day = (d: string) => new Date(d + "T12:00:00");
export const short = (d: string) => day(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const range = (a: string, b: string) => short(a) + " – " + short(b);
export const dayDiff = (a: string, b: string) => Math.round((day(b).getTime() - day(a).getTime()) / 86_400_000);

export class ApiError extends Error {}

export async function api<T = Snapshot>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: unknown }).error;
    throw new ApiError(typeof e === "string" ? e : Array.isArray(e) ? e.map((i: { message: string }) => i.message).join("; ") : "Something went wrong");
  }
  return data as T;
}

// Who "you" are on this device for a given trip. No login: the id lives in localStorage.
const key = (code: string) => `elsewhere:member:${code}`;
export const loadMemberId = (code: string): string | null => {
  try { return localStorage.getItem(key(code)); } catch { return null; }
};
export const saveMemberId = (code: string, id: string) => {
  try { localStorage.setItem(key(code), id); } catch { /* storage unavailable: session-only */ }
};
