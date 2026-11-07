import type { Suggestion } from "./matching";
import type { Deal, Member, Trip, Vote } from "./types";

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
    source: "gemini" | "fixture" | "fallback" | "pending"; // fallback = AI failed, sample data stands in; pending = not ready yet
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
  ["nonstop", "Nonstop flights only"], ["domestic", "US destinations only"],
  ["short", "Flights under 5 hours"], ["red-eye", "No overnight flights"],
];

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

// ---- Traveler colors: stored as an index on the member, rendered through the --ew-t0..--ew-t7 CSS variables.
export const hueVar = (m: { hue?: number }, fallbackIndex = 0) => `var(--ew-t${(m.hue ?? fallbackIndex) % 8})`;

// ---- Trips this device has opened, for the home page. Device-local, never sent anywhere.
export interface RememberedTrip { code: string; title: string; at: string }
const TRIPS_KEY = "elsewhere:trips";
export const listTrips = (): RememberedTrip[] => {
  try { return JSON.parse(localStorage.getItem(TRIPS_KEY) ?? "[]") as RememberedTrip[]; } catch { return []; }
};
export const rememberTrip = (code: string, title: string) => {
  try {
    const rest = listTrips().filter((t) => t.code !== code);
    localStorage.setItem(TRIPS_KEY, JSON.stringify([{ code, title, at: new Date().toISOString() }, ...rest].slice(0, 12)));
  } catch { /* storage unavailable: the list just won't persist */ }
};
