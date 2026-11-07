import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { makeFileStore, makeRedisStore, type RedisLike, type Store } from "../lib/store.ts";
import type { Member, Trip } from "../lib/types.ts";

// In-memory stand-in for the Upstash client: hashes of strings, like the real thing with automaticDeserialization off.
class FakeRedis implements RedisLike {
  data = new Map<string, Map<string, string>>();
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
    return h && h.size ? Object.fromEntries(h) : null;
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
  ["redis store (fake client)", () => makeRedisStore(new FakeRedis())],
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
    test("concurrent updates to different fields don't lose either", async () => {
      const s = make();
      await s.createTrip(trip("hhh"), member("h-hhh", "hhh"));
      await Promise.all([s.updateTrip("hhh", { approvals: ["a"] }), s.updateTrip("hhh", { phase: "ideas" }), s.updateTrip("hhh", { proposal: "x" })]);
      const t = (await s.getTrip("hhh"))!;
      assert.deepEqual([t.approvals, t.phase, t.proposal], [["a"], "ideas", "x"]);
    });
  });
}
