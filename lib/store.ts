import { promises as fs } from "node:fs";
import path from "node:path";
import type { Member, Trip, Vote } from "./types";

/**
 * Storage interface. File-backed by default; MongoDB when MONGODB_URI is set.
 * The rest of the app only talks to this interface.
 */
export interface Store {
  createTrip(trip: Trip, host: Member): Promise<void>;
  getTrip(code: string): Promise<Trip | null>;
  updateTrip(code: string, patch: Partial<Trip>): Promise<Trip | null>;
  listMembers(code: string): Promise<Member[]>;
  upsertMember(member: Member): Promise<void>;
  listVotes(code: string): Promise<Vote[]>;
  setVote(vote: Vote): Promise<void>;
  deleteVote(code: string, memberId: string): Promise<void>;
}

interface Data {
  trips: Trip[];
  members: Member[];
  votes: Vote[];
}

const FILE = path.join(process.cwd(), "data", "db.json");
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Data> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Data;
  } catch {
    return { trips: [], members: [], votes: [] };
  }
}

// Serialize read-modify-write so concurrent requests don't clobber each other.
function mutate<T>(fn: (d: Data) => T): Promise<T> {
  const run = queue.then(async () => {
    const d = await read();
    const out = fn(d);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(d, null, 2));
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

const fileStore: Store = {
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

async function makeMongoStore(uri: string, dbName: string): Promise<Store> {
  const { MongoClient } = await import("mongodb");
  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);
  const trips = db.collection<Trip>("trips");
  const members = db.collection<Member>("members");
  const votes = db.collection<Vote>("votes");
  const strip = <T extends object>(doc: (T & { _id?: unknown }) | null) => {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    void _id;
    return rest as T;
  };
  return {
    async createTrip(trip, host) {
      await trips.insertOne({ ...trip });
      await members.insertOne({ ...host });
    },
    async getTrip(code) {
      return strip(await trips.findOne({ code }));
    },
    async updateTrip(code, patch) {
      return strip(await trips.findOneAndUpdate({ code }, { $set: patch }, { returnDocument: "after" }));
    },
    async listMembers(code) {
      return (await members.find({ tripCode: code }).toArray()).map((m) => strip(m)!);
    },
    async upsertMember(member) {
      await members.replaceOne({ id: member.id }, member, { upsert: true });
    },
    async listVotes(code) {
      return (await votes.find({ tripCode: code }).toArray()).map((v) => strip(v)!);
    },
    async setVote(vote) {
      await votes.replaceOne({ tripCode: vote.tripCode, memberId: vote.memberId }, vote, { upsert: true });
    },
    async deleteVote(code, memberId) {
      await votes.deleteOne({ tripCode: code, memberId });
    },
  };
}

const g = globalThis as unknown as { __store?: Promise<Store> };

export function getStore(): Promise<Store> {
  if (!g.__store) {
    const uri = process.env.MONGODB_URI;
    g.__store = uri
      ? makeMongoStore(uri, process.env.MONGODB_DB || "elsewhere")
      : Promise.resolve(fileStore);
  }
  return g.__store;
}
