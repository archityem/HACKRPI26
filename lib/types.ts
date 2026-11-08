import type { InviteTemplate } from "./template";

export type Theme = "pink" | "pool" | "golden";
export type Phase = "collecting" | "ideas" | "planning";
export type Deal = "nonstop" | "domestic" | "short" | "red-eye";

export interface Trip {
  code: string;
  hostMemberId: string;
  title: string;
  note: string;
  theme: Theme;
  tone?: "sage" | "apricot" | "dusk" | "lavender" | "rose" | "butter" | "sky"; // the host's ticket color
  template?: InviteTemplate; // AI-designed invite look (lib/template.ts); the classic poster when absent
  cover?: string; // host's invite picture as a data URL (lib/cover.ts); never sent in snapshots
  windowStart: string; // YYYY-MM-DD, host's rough date window
  windowEnd: string;
  nights: number;
  maxBudget: number; // ceiling for the group; members may go lower, never higher
  vibes: string[];
  phase: Phase;
  proposal: string | null; // destination id
  approvals: string[]; // member ids
  createdAt: string;
  candidates?: Candidates; // cached destination proposals; fixtures are used when absent
  itinerary?: Itinerary; // cached plan for the approved destination
  custom?: Destination[]; // places members added to the ranking ("got a better idea?")
  drafts?: Record<string, Destination>; // a member's priced-but-not-yet-added place, by member id
  lodgingVotes?: Record<string, string>; // member id -> lodging option id (lib/lodging.ts)
  planItems?: PlanItem[]; // things members added to the itinerary
}

export interface PlanItem {
  id: string;
  day: number; // 0-based day of the trip
  time: string; // HH:MM, 24h
  title: string;
  addedBy: string; // member id
}

export interface Candidates {
  key: string; // hash of the inputs the proposals were generated for
  source: "gemini";
  model: string;
  generatedAt: string;
  destinations: Destination[];
}

export interface Member {
  id: string;
  tripCode: string;
  name: string;
  origin: string; // IATA
  start: string;
  end: string;
  min: number;
  max: number;
  prefs: string[];
  deals: Deal[];
  ready: boolean;
}

export interface Vote {
  tripCode: string;
  memberId: string;
  destinationId: string; // the member's #1 pick
  ranking?: string[]; // the member's full order, best first
  locked?: boolean; // "lock in my ranking"
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  emoji: string;
  caption: string;
  tags: string[];
  flight: Record<string, number>; // origin IATA -> round-trip fare
  night: number;
  daily: number;
  hours: number;
  stops: number;
  domestic: boolean;
  overnight: boolean;
  proposedBy?: string; // member id, for places added by a member instead of proposed by the AI
  reason?: string; // one-line AI note about the price
}

export interface ItineraryDay {
  date: string; // YYYY-MM-DD
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface Itinerary {
  key: string; // hash of the inputs it was generated for
  destinationId: string;
  model: string;
  generatedAt: string;
  summary: string;
  days: ItineraryDay[];
  tips: string[];
}
