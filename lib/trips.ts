import { randomUUID } from "node:crypto";
import { aiEnabled, candidateKey, itineraryKey, planItinerary, proposeDestinations, type PlanInput } from "./ai";
import { coverUrl } from "./cover";
import { background } from "./background";
import { FIXTURE_DESTINATIONS } from "./destinations";
import { jobFresh } from "./jobs";
import { compute } from "./matching";
import { getStore } from "./store";
import { invalidatesAgreement, sameConstraints } from "./answers";
import type { Destination, JobState, Member, Trip } from "./types";

export { invalidatesAgreement, sameConstraints };

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
export const newCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const newId = () => randomUUID();

// ---- Destination candidates (Gemini, generated in the background) ------------------------------

const inflight = new Map<string, Promise<void>>(); // this process only; the trip's `jobs` field covers other instances

/** Record (or clear, with undefined) a background job on the trip so every server instance sees it. */
async function setJob(code: string, name: "candidates" | "itinerary", job: JobState | undefined) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return;
  await store.updateTrip(code, { jobs: { ...trip.jobs, [name]: job } });
}
const running = (key: string): JobState => ({ key, at: new Date().toISOString(), state: "running" });
const failed = (key: string): JobState => ({ key, at: new Date().toISOString(), state: "failed" });

// fixture = AI is off (sample data on purpose); fallback = AI is on but failed, so sample data is a stand-in; pending = still generating.
export type Source = "gemini" | "fixture" | "fallback" | "pending";

/** Proposals are usable if they price every current departure airport, even if other inputs changed since. */
function covers(c: NonNullable<Trip["candidates"]>, members: Member[]) {
  const origins = [...new Set(members.filter((m) => m.ready).map((m) => m.origin))];
  return c.destinations.length > 0 && c.destinations.every((d) => origins.every((o) => d.flight[o] !== undefined));
}

/** Which destinations to match against right now. */
export function destinationsFor(trip: Trip, members: Member[]): { destinations: Destination[]; source: Source } {
  const added = trip.custom ?? []; // places members added to the ranking ride along with whatever the AI proposed
  if (!aiEnabled()) return { destinations: [...FIXTURE_DESTINATIONS, ...added], source: "fixture" };
  if (trip.candidates && covers(trip.candidates, members)) return { destinations: [...trip.candidates.destinations, ...added], source: "gemini" };
  if (jobFresh(trip.jobs?.candidates, candidateKey(trip, members)) === "failed") return { destinations: [...FIXTURE_DESTINATIONS, ...added], source: "fallback" };
  return { destinations: [], source: "pending" };
}

/** Kick off (or join) background generation for a trip. Safe to call often; never throws. */
export function ensureCandidates(code: string): Promise<void> {
  if (!aiEnabled()) return Promise.resolve();
  const existing = inflight.get(code);
  if (existing) return existing; // that run re-checks inputs when it finishes
  const run = (async () => {
    const store = await getStore();
    for (let i = 0; i < 3; i++) {
      const trip = await store.getTrip(code);
      if (!trip) return;
      const members = await store.listMembers(code);
      if (!members.some((m) => m.ready)) return;
      const key = candidateKey(trip, members);
      if (trip.candidates?.key === key) return;
      if (jobFresh(trip.jobs?.candidates, key)) return; // another instance is on it, or it failed recently
      await setJob(code, "candidates", running(key));
      try {
        const candidates = await proposeDestinations(trip, members);
        await store.updateTrip(code, { candidates });
        await setJob(code, "candidates", undefined);
        await pruneToDestinations(code, candidates.destinations);
      } catch (e) {
        console.error(`[ai] proposeDestinations failed for ${code}:`, e instanceof Error ? e.message : e);
        await setJob(code, "candidates", failed(key));
        return;
      }
    }
  })().finally(() => inflight.delete(code));
  inflight.set(code, run);
  return run;
}

// ---- Itinerary (generated once everyone has approved) ----------------------------------------

const itinInflight = new Map<string, Promise<void>>();

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
  const existing = itinInflight.get(code);
  if (existing) return existing;
  const run = (async () => {
    const store = await getStore();
    const trip = await store.getTrip(code);
    if (!trip) return;
    const input = await planInputFor(trip, await store.listMembers(code));
    if (!input) return;
    const key = itineraryKey(input);
    if (trip.itinerary?.key === key) return;
    if (jobFresh(trip.jobs?.itinerary, key)) return; // another instance is on it, or it failed recently
    await setJob(code, "itinerary", running(key));
    try {
      await store.updateTrip(code, { itinerary: await planItinerary(input) });
      await setJob(code, "itinerary", undefined);
    } catch (e) {
      console.error(`[ai] planItinerary failed for ${code}:`, e instanceof Error ? e.message : e);
      await setJob(code, "itinerary", failed(key));
    }
  })().finally(() => itinInflight.delete(code));
  itinInflight.set(code, run);
  return run;
}

/** Clear failed AI jobs for a trip and start them again. Used by the Retry button after an outage. */
export async function retryAi(code: string) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return;
  const jobs = { ...trip.jobs };
  if (jobs.candidates?.state === "failed") delete jobs.candidates;
  if (jobs.itinerary?.state === "failed") delete jobs.itinerary;
  await store.updateTrip(code, { jobs });
  background(() => ensureCandidates(code));
  background(() => ensureItinerary(code));
}

/** New proposals replace the old ones: drop votes/proposals pointing at destinations that no longer exist. */
async function pruneToDestinations(code: string, destinations: Destination[]) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  const ids = new Set([...destinations, ...(trip?.custom ?? [])].map((d) => d.id));
  for (const v of await store.listVotes(code)) {
    const all = v.ranking ?? [v.destinationId];
    const ranking = all.filter((id) => ids.has(id));
    if (!ranking.length) await store.deleteVote(code, v.memberId);
    else if (ranking.length !== all.length) await store.setVote({ ...v, destinationId: ranking[0], ranking, locked: false });
  }
  if (trip?.proposal && !ids.has(trip.proposal)) await resetAgreement(trip);
}

/** Drop rankings that no longer fit. `unlock` is for a real constraint change; an unchanged resave keeps locks. */
export async function pruneVotes(code: string, eligible: Set<string>, unlock: boolean) {
  const store = await getStore();
  for (const v of await store.listVotes(code)) {
    const all = v.ranking ?? [v.destinationId];
    const order = all.filter((id) => eligible.has(id));
    if (!order.length) {
      await store.deleteVote(code, v.memberId);
      continue;
    }
    const same = order.length === all.length && order.every((id, i) => id === all[i]);
    if (same && !(unlock && v.locked)) continue;
    await store.setVote({ ...v, destinationId: order[0], ranking: order, locked: unlock ? false : v.locked });
  }
}

/**
 * Everything the client needs for a trip, with other members' budgets redacted.
 * `me` is a member id already proven by their private credential. A public id is not proof.
 */
export async function snapshot(code: string, me?: string | null) {
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return null;
  const [members, votes] = await Promise.all([store.listMembers(code), store.listVotes(code)]);
  const { destinations, source } = destinationsFor(trip, members);
  const match = compute(trip, members, destinations);
  const planInput = await planInputFor(trip, members);
  const itinKey = planInput ? itineraryKey(planInput) : null;
  const candKey = candidateKey(trip, members);
  // Polling doubles as a safety net: if generation was cut off, the next poll restarts it (jobs prevent duplicates).
  if (planInput) background(() => ensureItinerary(code));
  if (source === "pending") background(() => ensureCandidates(code));
  const view = members.map((m) =>
    m.id === me ? m : { ...m, min: undefined, max: undefined },
  ) as Array<Member | Omit<Member, "min" | "max">>;
  const { cover, drafts, ...publicTrip } = trip; // the picture is served separately; drafts are private to their member
  void drafts;
  // The group sees a range of budgets, never one person's number (and never with a single answer).
  const caps = match.ready.map((m) => Math.min(m.max, trip.maxBudget));
  const budgetRange = caps.length >= 2 ? [Math.min(...caps), Math.max(...caps)] : null;
  return {
    trip: { ...publicTrip, coverUrl: cover ? coverUrl(code) : null },
    members: view,
    votes,
    me: me ?? null,
    ai: {
      enabled: aiEnabled(),
      generating: inflight.has(code) || jobFresh(trip.jobs?.candidates, candKey) === "running",
      source,
      model: trip.candidates?.model,
      itinerary: itineraryStatus(
        trip, itinKey,
        itinInflight.has(code) || (itinKey !== null && jobFresh(trip.jobs?.itinerary, itinKey) === "running"),
        itinKey !== null && jobFresh(trip.jobs?.itinerary, itinKey) === "failed",
      ),
    },
    match: {
      start: match.start,
      end: match.end,
      tripEnd: match.tripEnd,
      overlap: match.overlap,
      readyCount: match.ready.length,
      budgetRange,
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

// ---- Member-suggested places ---------------------------------------------------------------------

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
export const placeId = (name: string) => (name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "place") + "-c";

/** Without AI there is no real pricing: make a stable, clearly labelled sample estimate from the name. */
export function sampleEstimate(trip: Trip, members: Member[], name: string): Destination {
  const h = hash(name.toLowerCase());
  const origins = [...new Set(members.filter((m) => m.ready).map((m) => m.origin))];
  return {
    id: placeId(name), name, country: "Sample estimate", emoji: "📍", caption: "A place from the group", tags: [],
    flight: Object.fromEntries(origins.map((o, i) => [o, 140 + ((h >> (i * 3)) % 260)])),
    night: 40 + (h % 35), daily: 24 + (h % 10), hours: 2 + (h % 5), stops: 0, domestic: false, overnight: false,
    reason: "Sample numbers: turn on the AI key for a real estimate.",
  };
}
