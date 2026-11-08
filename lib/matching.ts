import type { Destination, Member, Trip, ValueCall } from "./types";

// Ported from prototype/elsewhere.html compute()/costs(), generalized to N members and trip.nights.

const DAY = 86_400_000;
const day = (d: string) => new Date(d + "T12:00:00Z");
const fmt = (t: Date) => t.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmt(new Date(day(d).getTime() + n * DAY));
const diffDays = (a: string, b: string) => Math.round((day(b).getTime() - day(a).getTime()) / DAY);

export interface Costs {
  flight: number;
  stay: number;
  daily: number;
  total: number;
}

export function costs(d: Destination, m: Pick<Member, "origin">, start: string, nights: number): Costs | null {
  const base = d.flight[m.origin];
  if (base === undefined) return null; // no fare known from this airport
  const dateBump = Number(start.slice(-2)) >= 15 ? 35 : 0;
  const flight = base + dateBump;
  const stay = d.night * nights;
  const daily = d.daily * (nights + 1);
  return { flight, stay, daily, total: Math.round(flight + stay + daily) };
}

/** A member's hard ceiling: their own max, never above the host's ceiling. */
export const effectiveMax = (m: Member, trip: Trip) => Math.min(m.max, trip.maxBudget);

export interface Suggestion extends Destination {
  reasons: string[];
  matched: string[];
  score: number;
  perMember: Record<string, Costs>;
  groupTotal: number;
  value: ValueCall;
  valueWhy: string;
}

const SHORTLIST = 8;

/** Is this price a steal, fair, or a stretch against the group's ceiling? */
export function valueCall(avg: number, ceiling: number, take?: string): { value: ValueCall; valueWhy: string } {
  const pct = ceiling > 0 ? Math.round((avg / ceiling) * 100) : 100;
  const heuristic: ValueCall = pct <= 62 ? "steal" : pct >= 88 ? "stretch" : "fair";
  const fromTake = /\bsteal\b/i.test(take ?? "") ? "steal" as const
    : /\bstretch\b/i.test(take ?? "") ? "stretch" as const
    : /\bfair\b/i.test(take ?? "") ? "fair" as const
    : null;
  const value = fromTake ?? heuristic;
  const fallback =
    value === "steal" ? `${pct}% of the group ceiling — leftover room for the fun stuff.`
    : value === "stretch" ? `${pct}% of the group ceiling. Still under the cap, with less slack.`
    : `${pct}% of the group ceiling. A realistic yes for this crew.`;
  const valueWhy = take?.trim() ? take.trim().slice(0, 140) : fallback;
  return { value, valueWhy };
}

export interface MatchResult {
  ready: Member[];
  start: string | null;
  end: string | null;
  tripEnd: string | null;
  overlap: boolean;
  eligible: Suggestion[];
  excluded: Suggestion[];
}

export interface SharedWindow {
  start: string;
  end: string;
  /** Nights that fit between start and end. Negative when the dates never meet. */
  span: number;
}

/** Latest start to earliest end, clamped to the host's window. */
export function sharedWindow(
  trip: { windowStart: string; windowEnd: string },
  people: { start: string; end: string }[],
): SharedWindow {
  const start = [trip.windowStart, ...people.map((m) => m.start)].sort().at(-1)!;
  const end = [trip.windowEnd, ...people.map((m) => m.end)].sort()[0];
  return { start, end, span: diffDays(start, end) };
}

export interface DatedPerson {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface DateAsk {
  memberId: string;
  name: string;
  edge: "earlier" | "later";
  from: string;
  to: string;
  days: number;
}

export interface DateUnlock {
  start: string;
  end: string;
  /** Nights that currently fit. 0 when the dates do not meet. */
  have: number;
  need: number;
  /** Days of movement a single binding edge needs. Larger than `need` when the dates do not meet. */
  shortfall: number;
  /** Nights the host window itself can hold. */
  windowNights: number;
  windowTooShort: boolean;
  /** One-person changes that open the trip. Each move is exactly `shortfall` days; anything smaller still misses. */
  asks: DateAsk[];
}

/**
 * When the ready dates cannot hold the trip, the smallest one-person changes that would.
 * Returns null when the dates already fit, or when nobody is in yet.
 * A change that would leave the host window is omitted — partial moves are not offered.
 */
export function dateUnlock(
  trip: { windowStart: string; windowEnd: string; nights: number },
  people: DatedPerson[],
): DateUnlock | null {
  if (!people.length) return null;
  const window = sharedWindow(trip, people);
  if (window.span >= trip.nights) return null;
  const shortfall = trip.nights - window.span;
  const windowNights = diffDays(trip.windowStart, trip.windowEnd);
  const asks: DateAsk[] = [];
  for (const person of people) {
    for (const edge of ["later", "earlier"] as const) {
      const ask = askIfOpens(trip, people, person, edge, shortfall);
      if (ask) asks.push(ask);
    }
  }
  asks.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name) || (a.edge === b.edge ? 0 : a.edge === "later" ? -1 : 1));
  return {
    start: window.start,
    end: window.end,
    have: Math.max(0, window.span),
    need: trip.nights,
    shortfall,
    windowNights,
    windowTooShort: windowNights < trip.nights,
    asks,
  };
}

function askIfOpens(
  trip: { windowStart: string; windowEnd: string; nights: number },
  people: DatedPerson[],
  person: DatedPerson,
  edge: "earlier" | "later",
  days: number,
): DateAsk | null {
  const to = edge === "later" ? addDays(person.end, days) : addDays(person.start, -days);
  if (edge === "later" ? to > trip.windowEnd : to < trip.windowStart) return null;
  const next = people.map((p) =>
    p.id === person.id ? { ...p, ...(edge === "later" ? { end: to } : { start: to }) } : p,
  );
  if (sharedWindow(trip, next).span < trip.nights) return null;
  return {
    memberId: person.id,
    name: person.name,
    edge,
    from: edge === "later" ? person.end : person.start,
    to,
    days,
  };
}

export function compute(trip: Trip, members: Member[], destinations: Destination[]): MatchResult {
  const ready = members.filter((m) => m.ready);
  const empty: MatchResult = { ready, start: null, end: null, tripEnd: null, overlap: false, eligible: [], excluded: [] };
  if (!ready.length) return empty;

  // Date overlap: latest start to earliest end, clamped to the host's window.
  const { start, end, span } = sharedWindow(trip, ready);
  const overlap = span >= trip.nights;
  const tripEnd = addDays(start, trip.nights);
  if (!overlap) return { ...empty, start, end, tripEnd };

  const allPrefs = [...new Set(ready.flatMap((m) => m.prefs))];
  const eligible: Suggestion[] = [];
  const excluded: Suggestion[] = [];

  for (const d of destinations) {
    const reasons: string[] = [];
    const perMember: Record<string, Costs> = {};
    for (const m of ready) {
      const c = costs(d, m, start, trip.nights);
      if (!c) {
        reasons.push(`No fare from ${m.origin} for ${m.name}`);
        continue;
      }
      perMember[m.id] = c;
      if (c.total > effectiveMax(m, trip)) reasons.push(`Above ${m.name}’s budget`);
      if (m.deals.includes("nonstop") && d.stops) reasons.push("Requires a connection");
      if (m.deals.includes("domestic") && !d.domestic) reasons.push("Outside the US");
      if (m.deals.includes("short") && d.hours >= 5) reasons.push("Flight longer than 5 hours");
      if (m.deals.includes("red-eye") && d.overnight) reasons.push("Overnight flight");
    }
    const matched = allPrefs.filter((p) => d.tags.includes(p));
    const totals = Object.values(perMember).map((c) => c.total);
    const groupTotal = totals.reduce((a, b) => a + b, 0);
    const comfort = ready.reduce((n, m) => {
      const c = perMember[m.id];
      return n + (c && c.total >= m.min && c.total <= effectiveMax(m, trip) ? 1 : 0);
    }, 0);
    const avg = totals.length ? groupTotal / totals.length : 0;
    const { value, valueWhy } = valueCall(avg, trip.maxBudget, d.valueTake);
    const entry: Suggestion = {
      ...d,
      reasons: [...new Set(reasons)],
      matched,
      score: matched.length * 10 + comfort - avg / 1000,
      perMember,
      groupTotal,
      value,
      valueWhy,
    };
    (entry.reasons.length ? excluded : eligible).push(entry);
  }
  eligible.sort((a, b) => b.score - a.score);
  return { ready, start, end, tripEnd, overlap, eligible: eligible.slice(0, SHORTLIST), excluded };
}
