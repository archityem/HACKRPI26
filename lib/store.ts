import { promises as fs } from "node:fs";
import path from "node:path";
import type { Member, Trip, Vote } from "./types";

/**
 * Storage interface. Upstash Redis when its env vars are set (production), otherwise a JSON file (local dev).
 * The rest of the app only talks to this interface.
 */
export interface Store {
  createTrip(trip: Trip, host: Member): Promise<void>;
  getTrip(code: string): Promise<Trip | null>;
  /** Merge `patch` into the trip; a key set to undefined is removed. Returns null if the trip doesn't exist. */
  updateTrip(code: string, patch: Partial<Trip>): Promise<Trip | null>;
  listMembers(code: string): Promise<Member[]>;
  upsertMember(member: Member): Promise<void>;
  listVotes(code: string): Promise<Vote[]>;
  setVote(vote: Vote): Promise<void>;
  deleteVote(code: string, memberId: string): Promise<void>;
}

// ---------------------------------------------------------------- File store (local development)

interface Data {
  trips: Trip[];
  members: Member[];
  votes: Vote[];
}

export function makeFileStore(file: string): Store {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<Data> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as Data;
    } catch {
      return { trips: [], members: [], votes: [] };
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
    listMembers: async (code) => (await read()).members.filter((m) => m.tripCode === code),
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

/** The slice of the Upstash client we use, so tests can supply an in-memory fake. */
export interface RedisLike {
  hset(key: string, data: Record<string, string>): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
  hdel(key: string, ...fields: string[]): Promise<unknown>;
  exists(...keys: string[]): Promise<number>;
}

const k = {
  trip: (code: string) => `elsewhere:trip:${code}`, // hash: field -> JSON
  members: (code: string) => `elsewhere:members:${code}`, // hash: memberId -> JSON
  votes: (code: string) => `elsewhere:votes:${code}`, // hash: memberId -> destinationId
};

// Each trip field is its own hash field, so concurrent patches to different fields (say `candidates` and
// `approvals`) don't overwrite each other the way a whole-document read-modify-write would.
const serialize = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([f, v]) => [f, JSON.stringify(v)]));
const parseAll = <T>(h: Record<string, unknown>): T =>
  Object.fromEntries(Object.entries(h).map(([f, v]) => [f, JSON.parse(String(v))])) as T;

export function makeRedisStore(r: RedisLike): Store {
  const getTrip = async (code: string) => {
    const h = await r.hgetall(k.trip(code));
    return h && Object.keys(h).length ? parseAll<Trip>(h) : null;
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
    async listMembers(code) {
      const h = await r.hgetall(k.members(code));
      return h ? Object.values(h).map((v) => JSON.parse(String(v)) as Member) : [];
    },
    async upsertMember(member) {
      await r.hset(k.members(member.tripCode), { [member.id]: JSON.stringify(member) });
    },
    async listVotes(code) {
      const h = await r.hgetall(k.votes(code));
      return h ? Object.entries(h).map(([memberId, v]) => ({ tripCode: code, memberId, destinationId: String(v) })) : [];
    },
    async setVote(vote) {
      await r.hset(k.votes(vote.tripCode), { [vote.memberId]: vote.destinationId });
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
      const redis = new Redis({ ...(redisEnv() as { url: string; token: string }), automaticDeserialization: false });
      return makeRedisStore(redis as unknown as RedisLike);
    })();
  }
  return g.__store;
}
