export type Theme = "pink" | "pool" | "golden";
export type Phase = "collecting" | "ideas" | "planning";
export type Deal = "nonstop" | "domestic" | "short" | "red-eye";

export interface Trip {
  code: string;
  hostMemberId: string;
  title: string;
  note: string;
  theme: Theme;
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
  destinationId: string;
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
