import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyApproval, makeFileStore, makeRedisStore, type RedisLike, type Store } from "../lib/store.ts";
import { hashToken, newToken } from "../lib/credential.ts";
import type { Member, Trip } from "../lib/types.ts";

// In-memory stand-in for the Upstash client. `flat` matches @upstash/redis with
// automaticDeserialization: false, which returns HGETALL as ["field", "value", ...] or [] if missing.
class FakeRedis implements RedisLike {
  data = new Map<string, Map<string, string>>();
  private readonly flat: boolean;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(flat = false) {
    this.flat = flat;
  }
  async hset(key: string, d: Record<string, string>) {
    const h = this.data.get(key) ?? new Map<string, string>();
    for (const [f, v] of Object.entries(d)) {
      assert.equal(typeof v, "string", `hset(${key}, ${f}) must receive a string`);
      h.set(f, v);
    }
    this.data.set(key, h);
    return Object.keys(d).length;
  }
  async hgetall(key: string) {
    const h = this.data.get(key);
    if (!h || !h.size) return this.flat ? [] : null;
    const record = Object.fromEntries(h);
    return this.flat ? Object.entries(record).flat() : record;
  }
  async hdel(key: string, ...fields: string[]) {
    const h = this.data.get(key);
    fields.forEach((f) => h?.delete(f));
    if (h && !h.size) this.data.delete(key);
    return fields.length;
  }
  async exists(...keys: string[]) {
    return keys.filter((k) => this.data.has(k)).length;
  }
  // Stands in for the Redis EVAL: one queued critical section, same decision as applyApproval.
  async eval(script: string, keys: string[], args: string[]) {
    const run = this.queue.then(() => {
      if (!script.includes("HSET") || !script.includes("approvals") || !script.includes("proposal")) {
        throw new Error("approval script is not the atomic update");
      }
      const h = this.data.get(keys[0]);
      if (!h || !h.size) return "missing";
      const trip = Object.fromEntries([...h.entries()].map(([f, v]) => [f, JSON.parse(v)])) as Trip;
      const result = applyApproval(trip, JSON.parse(args[1]) as string, JSON.parse(args[0]) as string, JSON.parse(args[2]) as string[]);
      if (!result.applied) return "stale";
      h.set("approvals", JSON.stringify(result.approvals));
      h.set("phase", JSON.stringify(result.phase));
      return "ok";
    });
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }
}

const trip = (code: string, o: Partial<Trip> = {}): Trip => ({
  code, hostMemberId: "h-" + code, title: "Spring", note: "", theme: "pink", windowStart: "2027-03-01", windowEnd: "2027-03-31",
  nights: 5, maxBudget: 1200, vibes: ["beach"], phase: "collecting", proposal: null, approvals: [], createdAt: "2026-11-07", ...o,
});
const member = (id: string, code: string, o: Partial<Member> = {}): Member => ({
  id, tripCode: code, name: id, origin: "BOS", start: "2027-03-06", end: "2027-03-14", min: 0, max: 900, prefs: ["beach"], deals: [], ready: false, ...o,
});

const stores: [string, () => Store][] = [
  ["file store", () => makeFileStore(path.join(mkdtempSync(path.join(tmpdir(), "elsewhere-")), "db.json"))],
  ["redis store (object hgetall)", () => makeRedisStore(new FakeRedis())],
  ["redis store (flat hgetall)", () => makeRedisStore(new FakeRedis(true))],
];

for (const [name, make] of stores) {
  describe(name, () => {
    test("createTrip round-trips the trip and its host", async () => {
      const s = make();
      await s.createTrip(trip("aaa"), member("h-aaa", "aaa"));
      assert.deepEqual(await s.getTrip("aaa"), trip("aaa"));
      assert.deepEqual((await s.listMembers("aaa")).map((m) => m.id), ["h-aaa"]);
    });
    test("unknown trip: getTrip and updateTrip return null", async () => {
      const s = make();
      assert.equal(await s.getTrip("nope"), null);
      assert.equal(await s.updateTrip("nope", { title: "x" }), null);
    });
    test("values keep their types (numeric-looking title stays a string, nulls and arrays survive)", async () => {
      const s = make();
      await s.createTrip(trip("bbb", { title: "2027", note: "true", proposal: null, vibes: [] }), member("h-bbb", "bbb"));
      const t = (await s.getTrip("bbb"))!;
      assert.equal(t.title, "2027");
      assert.equal(t.note, "true");
      assert.equal(t.proposal, null);
      assert.deepEqual(t.vibes, []);
      assert.equal(t.nights, 5);
    });
    test("updateTrip merges, returns the updated trip, and leaves other fields alone", async () => {
      const s = make();
      await s.createTrip(trip("ccc"), member("h-ccc", "ccc"));
      const t = await s.updateTrip("ccc", { phase: "planning", approvals: ["a", "b"], proposal: "miami" });
      assert.equal(t!.phase, "planning");
      assert.deepEqual(t!.approvals, ["a", "b"]);
      assert.equal(t!.title, "Spring");
      assert.equal((await s.getTrip("ccc"))!.proposal, "miami");
    });
    test("updateTrip with undefined removes the field", async () => {
      const s = make();
      await s.createTrip(trip("ddd"), member("h-ddd", "ddd"));
      await s.updateTrip("ddd", { jobs: { candidates: { key: "k", at: "t", state: "running" } } });
      assert.ok((await s.getTrip("ddd"))!.jobs);
      await s.updateTrip("ddd", { jobs: undefined });
      assert.equal((await s.getTrip("ddd"))!.jobs, undefined);
    });
    test("nested documents (candidates, itinerary) round-trip intact", async () => {
      const s = make();
      await s.createTrip(trip("eee"), member("h-eee", "eee"));
      const candidates = { key: "k", source: "gemini" as const, model: "m", generatedAt: "t", destinations: [{ id: "x", name: "Xé 🌴", country: "C", emoji: "🌴", caption: "c", tags: ["beach"], flight: { BOS: 200 }, night: 50, daily: 27.5, hours: 4, stops: 0, domestic: false, overnight: false }] };
      await s.updateTrip("eee", { candidates });
      assert.deepEqual((await s.getTrip("eee"))!.candidates, candidates);
    });
    test("members: upsert inserts then replaces; scoped per trip", async () => {
      const s = make();
      await s.createTrip(trip("f1"), member("h1", "f1"));
      await s.createTrip(trip("f2"), member("h2", "f2"));
      await s.upsertMember(member("m1", "f1", { name: "Leo" }));
      await s.upsertMember(member("m1", "f1", { name: "Leo B", ready: true }));
      const f1 = await s.listMembers("f1");
      assert.equal(f1.length, 2);
      assert.deepEqual(f1.find((m) => m.id === "m1"), member("m1", "f1", { name: "Leo B", ready: true }));
      assert.deepEqual((await s.listMembers("f2")).map((m) => m.id), ["h2"]);
      assert.deepEqual(await s.listMembers("none"), []);
    });
    test("votes: one per member (re-voting replaces), deletable, scoped per trip", async () => {
      const s = make();
      await s.createTrip(trip("g1"), member("h1", "g1"));
      await s.createTrip(trip("g2"), member("h2", "g2"));
      await s.setVote({ tripCode: "g1", memberId: "a", destinationId: "miami" });
      await s.setVote({ tripCode: "g1", memberId: "a", destinationId: "cancun" });
      await s.setVote({ tripCode: "g1", memberId: "b", destinationId: "miami" });
      await s.setVote({ tripCode: "g2", memberId: "a", destinationId: "lisbon" });
      const v1 = (await s.listVotes("g1")).sort((x, y) => x.memberId.localeCompare(y.memberId));
      assert.deepEqual(v1, [
        { tripCode: "g1", memberId: "a", destinationId: "cancun" },
        { tripCode: "g1", memberId: "b", destinationId: "miami" },
      ]);
      await s.deleteVote("g1", "a");
      assert.deepEqual((await s.listVotes("g1")).map((v) => v.memberId), ["b"]);
      assert.equal((await s.listVotes("g2")).length, 1);
      await s.deleteVote("g1", "ghost"); // deleting a missing vote is harmless
    });
    test("votes keep ranking and locked, including an explicit false", async () => {
      const s = make();
      await s.createTrip(trip("g3"), member("h", "g3"));
      await s.setVote({ tripCode: "g3", memberId: "a", destinationId: "miami", ranking: ["miami", "cancun"], locked: true });
      await s.setVote({ tripCode: "g3", memberId: "b", destinationId: "lisbon", ranking: ["lisbon"], locked: false });
      const votes = (await s.listVotes("g3")).sort((x, y) => x.memberId.localeCompare(y.memberId));
      assert.deepEqual(votes, [
        { tripCode: "g3", memberId: "a", destinationId: "miami", ranking: ["miami", "cancun"], locked: true },
        { tripCode: "g3", memberId: "b", destinationId: "lisbon", ranking: ["lisbon"], locked: false },
      ]);
    });
    test("credentials store a hash and resolve only that member", async () => {
      const s = make();
      const token = newToken();
      await s.createTrip(trip("sec"), member("m", "sec", { ready: true, max: 400 }));
      await s.upsertMember(member("other", "sec"));
      await s.putCredential("sec", "m", hashToken(token));
      assert.equal((await s.memberByToken("sec", hashToken(token)))?.id, "m");
      assert.equal(await s.memberByToken("sec", hashToken(newToken())), null);
      assert.equal(await s.memberByToken("sec", token), null);
      const replaced = newToken();
      await s.putCredential("sec", "m", hashToken(replaced));
      assert.equal(await s.memberByToken("sec", hashToken(token)), null);
      assert.equal((await s.memberByToken("sec", hashToken(replaced)))?.max, 400);
    });
    test("concurrent approvals all stick and open planning once, and a stale proposal does not write", async () => {
      const s = make();
      const ids = ["a", "b", "c", "d"];
      await s.createTrip(trip("race", { proposal: "miami", phase: "ideas" }), member("host", "race"));
      await Promise.all(ids.map((id) => s.upsertMember(member(id, "race", { ready: true }))));
      await Promise.all(ids.map((id) => s.approve("race", id, "miami", ids)));
      const t = (await s.getTrip("race"))!;
      assert.deepEqual([...t.approvals].sort(), [...ids].sort());
      assert.equal(t.phase, "planning");
      assert.equal(t.proposal, "miami");
      const again = await s.approve("race", "a", "miami", ids);
      assert.equal(again.applied, true);
      assert.equal((await s.getTrip("race"))!.approvals.filter((id) => id === "a").length, 1);
      const stale = await s.approve("race", "a", "cancun", ids);
      assert.equal(stale.applied, false);
      assert.equal(stale.trip!.proposal, "miami");
      assert.equal(stale.trip!.phase, "planning");
      await s.updateTrip("race", { proposal: "cancun", approvals: ["z"], phase: "ideas" });
      const missed = await s.approve("race", "a", "miami", ids);
      assert.equal(missed.applied, false);
      assert.deepEqual((await s.getTrip("race"))!.approvals, ["z"]);
      assert.equal((await s.getTrip("race"))!.phase, "ideas");
    });
    test("one approval of two stays in ideas", async () => {
      const s = make();
      await s.createTrip(trip("part", { proposal: "miami", phase: "ideas" }), member("host", "part"));
      const result = await s.approve("part", "a", "miami", ["a", "b"]);
      assert.equal(result.applied, true);
      assert.deepEqual(result.trip!.approvals, ["a"]);
      assert.equal(result.trip!.phase, "ideas");
    });
    test("concurrent updates to different fields don't lose either", async () => {
      const s = make();
      await s.createTrip(trip("hhh"), member("h-hhh", "hhh"));
      await Promise.all([s.updateTrip("hhh", { approvals: ["a"] }), s.updateTrip("hhh", { phase: "ideas" }), s.updateTrip("hhh", { proposal: "x" })]);
      const t = (await s.getTrip("hhh"))!;
      assert.deepEqual([t.approvals, t.phase, t.proposal], [["a"], "ideas", "x"]);
    });
  });
}

test("flat hgetall zips fields before parsing; non-JSON strings and decoded values pass through", async () => {
  const host = member("host", "flat");
  const redis: RedisLike = {
    async hset() {
      return 1;
    },
    async hdel() {
      return 0;
    },
    async exists() {
      return 0;
    },
    async eval() {
      throw new Error("not used");
    },
    async hgetall(key: string) {
      if (key.endsWith(":members:flat")) return [host.id, host]; // value already decoded, not JSON text
      if (key.endsWith(":votes:flat")) {
        return [
          "host", "miami", // raw destination id, not JSON
          "friend", JSON.stringify({ destinationId: "lisbon", ranking: ["lisbon", "miami"], locked: false }),
        ];
      }
      if (key.endsWith(":trip:missing")) return [];
      // Field names ("title", "theme", ...) sit in the odd slots. Parsing those is the production crash.
      return [
        "code", JSON.stringify("flat"),
        "hostMemberId", JSON.stringify("host"),
        "title", JSON.stringify("2027"),
        "note", "not-json",
        "theme", JSON.stringify("pink"),
        "windowStart", JSON.stringify("2027-03-01"),
        "windowEnd", JSON.stringify("2027-03-31"),
        "nights", JSON.stringify(5),
        "maxBudget", JSON.stringify(1200),
        "vibes", JSON.stringify(["beach"]),
        "phase", JSON.stringify("collecting"),
        "proposal", JSON.stringify(null),
        "approvals", JSON.stringify([]),
        "createdAt", JSON.stringify("2026-11-07"),
      ];
    },
  };
  const s = makeRedisStore(redis);
  assert.equal(await s.getTrip("missing"), null);
  const t = (await s.getTrip("flat"))!;
  assert.equal(t.title, "2027");
  assert.equal(typeof t.title, "string");
  assert.equal(t.note, "not-json");
  assert.equal(t.theme, "pink");
  assert.equal(t.nights, 5);
  assert.equal(t.proposal, null);
  assert.deepEqual(t.approvals, []);
  assert.deepEqual(await s.listMembers("flat"), [host]);
  assert.deepEqual((await s.listVotes("flat")).sort((a, b) => a.memberId.localeCompare(b.memberId)), [
    { tripCode: "flat", memberId: "friend", destinationId: "lisbon", ranking: ["lisbon", "miami"], locked: false },
    { tripCode: "flat", memberId: "host", destinationId: "miami" },
  ]);
});

test("file store writes the credential hash and not the token", async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "elsewhere-")), "db.json");
  const s = makeFileStore(file);
  const token = newToken();
  await s.createTrip(trip("sec"), member("m", "sec"));
  await s.putCredential("sec", "m", hashToken(token));
  const text = readFileSync(file, "utf8");
  assert.equal(text.includes(token), false);
  assert.equal(text.includes(hashToken(token)), true);
});
