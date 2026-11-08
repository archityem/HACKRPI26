import type { Vote } from "./types";

// Ranking rules shared by the server (auto-lock) and the UI (live "group #1").
// Each member's order is worth points: 1st gets the most, last gets 1. Ties keep the incoming order.

/** A member's order, restricted to places that still exist; legacy single votes count as a one-item order. */
export function orderOf(v: Vote, ids: string[]): string[] {
  const known = new Set(ids);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of v.ranking ?? [v.destinationId]) if (known.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  return out;
}

/** Places ordered by the group's points. `memberIds` limits whose votes count (the ready members). */
export function groupOrder(votes: Vote[], ids: string[], memberIds?: string[]): { id: string; points: number }[] {
  const points = new Map(ids.map((id) => [id, 0]));
  for (const v of votes) {
    if (memberIds && !memberIds.includes(v.memberId)) continue;
    orderOf(v, ids).forEach((id, i) => points.set(id, points.get(id)! + ids.length - i));
  }
  return ids.map((id) => ({ id, points: points.get(id)! })).sort((a, b) => b.points - a.points);
}

export type Verdict = "Great value" | "Good value" | "Fair price" | "Pricey";

/** How a per-person price sits against the host's budget cap. */
export function verdictFor(perPerson: number, cap: number): Verdict {
  const r = perPerson / Math.max(cap, 1);
  return r <= 0.55 ? "Great value" : r <= 0.75 ? "Good value" : r <= 0.95 ? "Fair price" : "Pricey";
}
