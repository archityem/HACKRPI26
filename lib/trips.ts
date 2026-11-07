import { randomUUID } from "node:crypto";
import { aiEnabled, candidateKey, itineraryKey, planItinerary, proposeDestinations, type PlanInput } from "./ai";
import { coverUrl } from "./cover";
import { FIXTURE_DESTINATIONS } from "./destinations";
import { compute } from "./matching";
import { getStore } from "./store";
import type { Destination, Member, Trip } from "./types";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
export const newCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const newId = () => randomUUID();

// ---- Destination candidates (Gemini, generated in the background) ------------------------------

const inflight = new Map<string, Promise<void>>();
const failedKey = new Map<string, string>(); // trip code -> inputs key that failed; don't hammer the API

export type Source = "gemini" | "fixture" | "pending";

/** Proposals are usable if they price every current departure airport, even if other inputs changed since. */
function covers(c: NonNullable<Trip["candidates"]>, members: Member[]) {
  const origins = [...new Set(members.filter((m) => m.ready).map((m) => m.origin))];
  return c.destinations.length > 0 && c.destinations.every((d) => origins.every((o) => d.flight[o] !== undefined));
}

/** Which destinations to match against right now. */
export function destinationsFor(trip: Trip, members: Member[]): { destinations: Destination[]; source: Source } {
  if (!aiEnabled()) return { destinations: FIXTURE_DESTINATIONS, source: "fixture" };
  if (trip.candidates && covers(trip.candidates, members)) return { destinations: trip.candidates.destinations, source: "gemini" };
  if (failedKey.get(trip.code) === candidateKey(trip, members)) return { destinations: FIXTURE_DESTINATIONS, source: "fixture" };
  return { destinations: [], source: "pending" };
}

/** Kick off (or join) background generation for a trip. Safe to call often; never throws. */
export function ensureCandidates(code: string): Promise<void> {
  if (!aiEnabled()) return Promise.resolve();
  const running = inflight.get(code);
  if (running) return running; // that run re-checks inputs when it finishes
  const run = (async () => {
    const store = await getStore();
    for (let i = 0; i < 3; i++) {
      const trip = await store.getTrip(code);
      if (!trip) return;
      const members = await store.listMembers(code);
      if (!members.some((m) => m.ready)) return;
      const key = candidateKey(trip, members);
      if (trip.candidates?.key === key || failedKey.get(code) === key) return;
      try {
        const candidates = await proposeDestinations(trip, members);
        await store.updateTrip(code, { candidates });
        failedKey.delete(code);
        await pruneToDestinations(code, candidates.destinations);
      } catch (e) {
        console.error(`[ai] proposeDestinations failed for ${code}:`, e instanceof Error ? e.message : e);
        failedKey.set(code, key);
        return;
      }
    }
  })().finally(() => inflight.delete(code));
  inflight.set(code, run);
  return run;
}

// ---- Itinerary (generated once everyone has approved) ----------------------------------------

const itinInflight = new Map<string, Promise<void>>();
const itinFailed = new Map<string, string>(); // trip code -> key that failed

async function planInputFor(trip: Trip, members: Member[]): Promise<PlanInput | null> {
  if (trip.phase !== "planning" || !trip.proposal) return null;
  const { destinations } = destinationsFor(trip, members);
  const match = compute(trip, members, destinations);
  const destination = match.eligible.find((d) => d.id === trip.proposal);
  if (!destination || !match.start) return null;
  const ready = members.filter((m) => m.ready);
  return {
    destination, start: match.start, nights: trip.nights, travelers: ready.length,
    prefs: [...trip.vibes, ...ready.flatMap((m) => m.prefs)], deals: ready.flatMap((m) => m.deals),
  };
}

/** Generate the itinerary in the background once the group has approved. Safe to call often; never throws. */
export function ensureItinerary(code: string): Promise<void> {
  if (!aiEnabled()) return Promise.resolve();
  const running = itinInflight.get(code);
  if (running) return running;
  const run = (async () => {
    const store = await getStore();
    const trip = await store.getTrip(code);
    if (!trip) return;
    const input = await planInputFor(trip, await store.listMembers(code));
    if (!input) return;
    const key = itineraryKey(input);
    if (trip.itinerary?.key === key || itinFailed.get(code) === key) return;
    try {
      await store.updateTrip(code, { itinerary: await planItinerary(input) });
      itinFailed.delete(code);
    } catch (e) {
      console.error(`[ai] planItinerary failed for ${code}:`, e instanceof Error ? e.message : e);
      itinFailed.set(code, key);
    }
  })().finally(() => itinInflight.delete(code));
  itinInflight.set(code, run);
  return run;
}

/** New proposals replace the old ones: drop votes/proposals pointing at destinations that no longer exist. */
async function pruneToDestinations(code: string, destinations: Destination[]) {
  const store = await getStore();
  const ids = new Set(destinations.map((d) => d.id));
  for (const v of await store.listVotes(code)) if (!ids.has(v.destinationId)) await store.deleteVote(code, v.memberId);
  const trip = await store.getTrip(code);
  if (trip?.proposal && !ids.has(trip.proposal)) await resetAgreement(trip);
}

/** Everything the client needs for a trip, with other members' budgets redacted. */
export async function snapshot(code: string, me?: string | null) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return null;
  const [members, votes] = await Promise.all([store.listMembers(code), store.listVotes(code)]);
  const { destinations, source } = destinationsFor(trip, members);
  const match = compute(trip, members, destinations);
  const planInput = await planInputFor(trip, members);
  const itinKey = planInput ? itineraryKey(planInput) : null;
  if (planInput) void ensureItinerary(code);
  const view = members.map((m) =>
    m.id === me ? m : { ...m, min: undefined, max: undefined },
  ) as Array<Member | Omit<Member, "min" | "max">>;
  const { cover, ...publicTrip } = trip; // the picture is served separately, not on every poll
  return {
    trip: { ...publicTrip, coverUrl: cover ? coverUrl(code) : null },
    members: view,
    votes,
    me: me ?? null,
    ai: {
      enabled: aiEnabled(), generating: inflight.has(code), source, model: trip.candidates?.model,
      itinerary: itineraryStatus(trip, itinKey, itinInflight.has(code), itinKey !== null && itinFailed.get(code) === itinKey),
    },
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

function itineraryStatus(trip: Trip, key: string | null, generating: boolean, failed: boolean): "off" | "ready" | "generating" | "failed" {
  if (!aiEnabled()) return "off";
  if (key && trip.itinerary?.key === key) return "ready";
  if (generating) return "generating";
  return failed ? "failed" : "generating"; // not started yet counts as generating: it starts on this very request
}
