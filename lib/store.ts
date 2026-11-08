import { promises as fs } from "node:fs";
import path from "node:path";
import type { Member, Trip, Vote } from "./types";

/**
 * Storage interface. Upstash Redis when its env vars are set (production), otherwise a JSON file (local dev).
 * The rest of the app only talks to this interface.
 */
export interface ApproveResult {
  trip: Trip | null;
  /** False when the trip is missing or `proposal` is no longer the one being approved. */
  applied: boolean;
}

export interface Store {
  createTrip(trip: Trip, host: Member): Promise<void>;
  getTrip(code: string): Promise<Trip | null>;
  /** Merge `patch` into the trip; a key set to undefined is removed. Returns null if the trip doesn't exist. */
  updateTrip(code: string, patch: Partial<Trip>): Promise<Trip | null>;
  /**
   * Record one approval and set the phase together, for the proposal currently on the trip.
   * A stale proposal writes nothing. Planning starts only when every ready id has approved.
   */
  approve(code: string, memberId: string, proposal: string, readyIds: readonly string[]): Promise<ApproveResult>;
  listMembers(code: string): Promise<Member[]>;
  upsertMember(member: Member): Promise<void>;
  /** Store the hash of a member's private credential. The raw token is never written. */
  putCredential(tripCode: string, memberId: string, tokenHash: string): Promise<void>;
  memberByToken(tripCode: string, tokenHash: string): Promise<Member | null>;
  listVotes(code: string): Promise<Vote[]>;
  setVote(vote: Vote): Promise<void>;
  deleteVote(code: string, memberId: string): Promise<void>;
}

/**
 * Add `memberId` to the approvals for `proposal` and pick the phase.
 * Planning requires every ready id. Same decision the Redis script commits in one EVAL.
 */
export function applyApproval(trip: Trip, memberId: string, proposal: string, readyIds: readonly string[]): {
  applied: boolean;
  approvals: string[];
  phase: Trip["phase"];
} {
  if (trip.proposal !== proposal) return { applied: false, approvals: trip.approvals, phase: trip.phase };
  const approvals = trip.approvals.includes(memberId) ? [...trip.approvals] : [...trip.approvals, memberId];
  const everyone = readyIds.length > 0 && readyIds.every((id) => approvals.includes(id));
  return { applied: true, approvals, phase: everyone ? "planning" : "ideas" };
}

// ---------------------------------------------------------------- File store (local development)

interface Credential {
  tripCode: string;
  memberId: string;
  tokenHash: string;
}

interface Data {
  trips: Trip[];
  members: Member[];
  votes: Vote[];
  credentials: Credential[];
}

export function makeFileStore(file: string): Store {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<Data> {
    try {
      const d = JSON.parse(await fs.readFile(file, "utf8")) as Partial<Data>;
      return { trips: d.trips ?? [], members: d.members ?? [], votes: d.votes ?? [], credentials: d.credentials ?? [] };
    } catch {
      return { trips: [], members: [], votes: [], credentials: [] };
    }
  }

  // Serialize read-modify-write so concurrent requests don't clobber each other.
  function mutate<T>(fn: (d: Data) => T): Promise<T> {
    const run = queue.then(async () => {
      const d = await read();
      const out = fn(d);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(d, null, 2));
      return out;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    createTrip: (trip, host) =>
      mutate((d) => {
        d.trips.push(trip);
        d.members.push(host);
      }),
    getTrip: async (code) => (await read()).trips.find((t) => t.code === code) ?? null,
    updateTrip: (code, patch) =>
      mutate((d) => {
        const t = d.trips.find((x) => x.code === code);
        if (!t) return null;
        Object.assign(t, patch);
        for (const k of Object.keys(t) as (keyof Trip)[]) if (t[k] === undefined) delete t[k];
        return t;
      }),
    approve: (code, memberId, proposal, readyIds) =>
      mutate((d) => {
        const t = d.trips.find((x) => x.code === code);
        if (!t) return { trip: null, applied: false };
        const result = applyApproval(t, memberId, proposal, readyIds);
        if (!result.applied) return { trip: t, applied: false };
        t.approvals = result.approvals;
        t.phase = result.phase;
        return { trip: t, applied: true };
      }),
    listMembers: async (code) => (await read()).members.filter((m) => m.tripCode === code),
    putCredential: (tripCode, memberId, tokenHash) =>
      mutate((d) => {
        d.credentials = d.credentials.filter((c) => !(c.tripCode === tripCode && c.memberId === memberId));
        d.credentials.push({ tripCode, memberId, tokenHash });
      }),
    memberByToken: async (tripCode, tokenHash) => {
      const d = await read();
      const cred = d.credentials.find((c) => c.tripCode === tripCode && c.tokenHash === tokenHash);
      if (!cred) return null;
      return d.members.find((m) => m.tripCode === tripCode && m.id === cred.memberId) ?? null;
    },
    upsertMember: (member) =>
      mutate((d) => {
        const i = d.members.findIndex((m) => m.id === member.id);
        if (i >= 0) d.members[i] = member;
        else d.members.push(member);
      }),
    listVotes: async (code) => (await read()).votes.filter((v) => v.tripCode === code),
    setVote: (vote) =>
      mutate((d) => {
        d.votes = d.votes.filter((v) => !(v.tripCode === vote.tripCode && v.memberId === vote.memberId));
        d.votes.push(vote);
      }),
    deleteVote: (code, memberId) =>
      mutate((d) => {
        d.votes = d.votes.filter((v) => !(v.tripCode === code && v.memberId === memberId));
      }),
  };
}

// ---------------------------------------------------------------- Redis store (production)

/**
 * The slice of the Upstash client we use, so tests can supply an in-memory fake.
 * With `automaticDeserialization: false`, hgetall returns the raw REST array
 * `["field", "value", ...]` (or `[]` when the key is missing) instead of a record.
 */
export interface RedisLike {
  hset(key: string, data: Record<string, string>): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, unknown> | unknown[] | null>;
  hdel(key: string, ...fields: string[]): Promise<unknown>;
  exists(...keys: string[]): Promise<number>;
  /** EVAL. Approvals use it so the insert and the phase write are one server-side operation. */
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

const k = {
  trip: (code: string) => `elsewhere:trip:${code}`, // hash: field -> JSON
  members: (code: string) => `elsewhere:members:${code}`, // hash: memberId -> JSON
  votes: (code: string) => `elsewhere:votes:${code}`, // hash: memberId -> JSON vote (legacy: raw destination id)
  auth: (code: string) => `elsewhere:auth:${code}`, // hash: tokenHash -> JSON memberId
};

/**
 * One Redis operation: refuse a stale proposal, union the member into approvals, then set the phase.
 * Keep the decision identical to applyApproval (planning iff every ready id is present).
 * Values are the JSON strings updateTrip writes, so proposal is compared raw and lists go through cjson.
 */
export const approveScript = `
local key = KEYS[1]
if redis.call('EXISTS', key) == 0 then
  return 'missing'
end
local proposal = redis.call('HGET', key, 'proposal')
if proposal ~= ARGV[1] then
  return 'stale'
end
local raw = redis.call('HGET', key, 'approvals')
local approvals = {}
if type(raw) == 'string' and raw ~= '' then
  local decoded = cjson.decode(raw)
  if type(decoded) == 'table' then
    for _, id in ipairs(decoded) do
      approvals[#approvals + 1] = id
    end
  end
end
local memberId = cjson.decode(ARGV[2])
local seen = false
for _, id in ipairs(approvals) do
  if id == memberId then
    seen = true
    break
  end
end
if not seen then
  approvals[#approvals + 1] = memberId
end
local encoded = #approvals == 0 and '[]' or cjson.encode(approvals)
redis.call('HSET', key, 'approvals', encoded)
local ready = cjson.decode(ARGV[3])
local everyone = type(ready) == 'table' and #ready > 0
if everyone then
  for _, id in ipairs(ready) do
    local ok = false
    for _, have in ipairs(approvals) do
      if have == id then
        ok = true
        break
      end
    end
    if not ok then
      everyone = false
      break
    end
  end
end
redis.call('HSET', key, 'phase', cjson.encode(everyone and 'planning' or 'ideas'))
return 'ok'
`;

// Each trip field is its own hash field, so concurrent patches to different fields (say `candidates` and
// `approvals`) don't overwrite each other the way a whole-document read-modify-write would.
const serialize = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([f, v]) => [f, JSON.stringify(v)]));

/**
 * Zip an HGETALL reply into field → value.
 * @upstash/redis skips its hash deserializer when automaticDeserialization is false, so the
 * reply is the flat REST list ["title", "\"Spring\"", "theme", "\"pink\"", ...]. Treating that
 * list as an object makes Object.entries yield the field names as values, and JSON.parse("title")
 * throws `Unexpected token 'i'`. A record-shaped reply (tests, or a client that already zipped)
 * is used as-is. Field names are never parsed.
 */
function asHash(reply: Record<string, unknown> | unknown[] | null): Record<string, unknown> | null {
  if (reply == null) return null;
  const entries: [string, unknown][] = [];
  if (Array.isArray(reply)) {
    for (let i = 0; i + 1 < reply.length; i += 2) {
      const field = reply[i];
      if (typeof field !== "string") continue;
      entries.push([field, reply[i + 1]]);
    }
  } else {
    for (const [field, value] of Object.entries(reply)) entries.push([field, value]);
  }
  return entries.length ? Object.fromEntries(entries) : null;
}

/** Parse JSON text we stored. Non-strings (already decoded) and non-JSON strings stay as they are. */
function parseStored(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch (e) {
    if (e instanceof SyntaxError) return v;
    throw e;
  }
}

const parseAll = <T>(h: Record<string, unknown>): T =>
  Object.fromEntries(Object.entries(h).map(([f, v]) => [f, parseStored(v)])) as T;

/** A vote hash field is JSON (`ranking`, `locked`) or, for rows written before that, a raw destination id. */
function voteFromField(code: string, memberId: string, raw: unknown): Vote {
  const parsed = parseStored(raw);
  if (typeof parsed === "string") return { tripCode: code, memberId, destinationId: parsed };
  if (parsed && typeof parsed === "object") {
    const v = parsed as { destinationId?: unknown; ranking?: unknown; locked?: unknown };
    const destinationId = typeof v.destinationId === "string" ? v.destinationId : "";
    const ranking = Array.isArray(v.ranking) ? v.ranking.filter((id): id is string => typeof id === "string") : undefined;
    const locked = typeof v.locked === "boolean" ? v.locked : undefined;
    return {
      tripCode: code,
      memberId,
      destinationId,
      ...(ranking?.length ? { ranking } : {}),
      ...(locked !== undefined ? { locked } : {}),
    };
  }
  return { tripCode: code, memberId, destinationId: String(parsed) };
}

function voteToField(vote: Vote): string {
  const body: { destinationId: string; ranking?: string[]; locked?: boolean } = { destinationId: vote.destinationId };
  if (vote.ranking?.length) body.ranking = vote.ranking;
  if (typeof vote.locked === "boolean") body.locked = vote.locked;
  return JSON.stringify(body);
}

export function makeRedisStore(r: RedisLike): Store {
  const readHash = async (key: string) => asHash(await r.hgetall(key));
  const getTrip = async (code: string) => {
    const h = await readHash(k.trip(code));
    return h ? parseAll<Trip>(h) : null;
  };
  return {
    async createTrip(trip, host) {
      await r.hset(k.trip(trip.code), serialize({ ...trip }));
      await r.hset(k.members(trip.code), { [host.id]: JSON.stringify(host) });
    },
    getTrip,
    async updateTrip(code, patch) {
      if (!(await r.exists(k.trip(code)))) return null;
      const set = serialize(patch);
      const removed = Object.keys(patch).filter((f) => (patch as Record<string, unknown>)[f] === undefined);
      if (Object.keys(set).length) await r.hset(k.trip(code), set);
      if (removed.length) await r.hdel(k.trip(code), ...removed);
      return getTrip(code);
    },
    async approve(code, memberId, proposal, readyIds) {
      const status = await r.eval(approveScript, [k.trip(code)], [
        JSON.stringify(proposal),
        JSON.stringify(memberId),
        JSON.stringify(readyIds),
      ]);
      const trip = await getTrip(code);
      if (status === "missing" || !trip) return { trip: null, applied: false };
      if (status !== "ok") return { trip, applied: false };
      return { trip, applied: true };
    },
    async listMembers(code) {
      const h = await readHash(k.members(code));
      return h ? Object.values(h).map((v) => parseStored(v) as Member) : [];
    },
    async upsertMember(member) {
      await r.hset(k.members(member.tripCode), { [member.id]: JSON.stringify(member) });
    },
    async putCredential(tripCode, memberId, tokenHash) {
      const h = await readHash(k.auth(tripCode));
      const stale = Object.entries(h ?? {})
        .filter(([, v]) => parseStored(v) === memberId)
        .map(([field]) => field);
      if (stale.length) await r.hdel(k.auth(tripCode), ...stale);
      await r.hset(k.auth(tripCode), { [tokenHash]: JSON.stringify(memberId) });
    },
    async memberByToken(tripCode, tokenHash) {
      const h = await readHash(k.auth(tripCode));
      if (!h || !(tokenHash in h)) return null;
      const memberId = parseStored(h[tokenHash]);
      if (typeof memberId !== "string" || !memberId) return null;
      const members = await readHash(k.members(tripCode));
      if (!members) return null;
      for (const value of Object.values(members)) {
        const member = parseStored(value) as Member;
        if (member?.id === memberId) return member;
      }
      return null;
    },
    async listVotes(code) {
      const h = await readHash(k.votes(code));
      return h ? Object.entries(h).map(([memberId, v]) => voteFromField(code, memberId, v)) : [];
    },
    async setVote(vote) {
      await r.hset(k.votes(vote.tripCode), { [vote.memberId]: voteToField(vote) });
    },
    async deleteVote(code, memberId) {
      await r.hdel(k.votes(code), memberId);
    },
  };
}

// ---------------------------------------------------------------- Selection

// Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*.
const redisEnv = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export const storageKind = (): "redis" | "file" => {
  const { url, token } = redisEnv();
  return url && token ? "redis" : "file";
};

const g = globalThis as unknown as { __store?: Promise<Store> };

export function getStore(): Promise<Store> {
  if (!g.__store) {
    g.__store = (async () => {
      if (storageKind() === "file") return makeFileStore(process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json"));
      const { Redis } = await import("@upstash/redis");
      // Values are JSON strings we manage ourselves; don't let the client guess types (e.g. title "2027" -> number).
      // The flag also makes hgetall return a flat array; asHash zips that back into a field map before parsing.
      const redis = new Redis({ ...(redisEnv() as { url: string; token: string }), automaticDeserialization: false });
      return makeRedisStore(redis as unknown as RedisLike);
    })();
  }
  return g.__store;
}
