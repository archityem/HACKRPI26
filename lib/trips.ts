import { randomUUID } from "node:crypto";
import { FIXTURE_DESTINATIONS } from "./destinations";
import { compute } from "./matching";
import { getStore } from "./store";
import type { Member, Trip } from "./types";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
export const newCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const newId = () => randomUUID();

/** Everything the client needs for a trip, with other members' budgets redacted. */
export async function snapshot(code: string, me?: string | null) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return null;
  const [members, votes] = await Promise.all([store.listMembers(code), store.listVotes(code)]);
  const match = compute(trip, members, FIXTURE_DESTINATIONS);
  const view = members.map((m) =>
    m.id === me ? m : { ...m, min: undefined, max: undefined },
  ) as Array<Member | Omit<Member, "min" | "max">>;
  return {
    trip,
    members: view,
    votes,
    me: me ?? null,
    match: {
      start: match.start,
      end: match.end,
      tripEnd: match.tripEnd,
      overlap: match.overlap,
      readyCount: match.ready.length,
      eligible: match.eligible,
      excluded: match.excluded.map(({ id, name, reasons }) => ({ id, name, reasons })),
    },
  };
}

/** Any change to someone's constraints invalidates the proposal and approvals. */
export async function resetAgreement(trip: Trip) {
  const store = await getStore();
  await store.updateTrip(trip.code, { proposal: null, approvals: [], phase: "ideas" });
}
