import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, costs, effectiveMax } from "../lib/matching.ts";
import { FIXTURE_DESTINATIONS as DESTS } from "../lib/destinations.ts";
import type { Member, Trip } from "../lib/types.ts";

const trip = (o: Partial<Trip> = {}): Trip => ({
  code: "t", hostMemberId: "a", title: "T", note: "", theme: "pink",
  windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 10_000,
  vibes: [], phase: "ideas", proposal: null, approvals: [], createdAt: "", ...o,
});
const member = (id: string, o: Partial<Member> = {}): Member => ({
  id, tripCode: "t", name: id, origin: "BOS", start: "2027-03-06", end: "2027-03-14",
  min: 0, max: 5000, prefs: ["beach"], deals: [], ready: true, ...o,
});
const ids = (r: ReturnType<typeof compute>) => r.eligible.map((d) => d.id);

// ---------- Date overlap ----------
test("overlap: latest start to earliest end", () => {
  const r = compute(trip(), [member("a"), member("b", { start: "2027-03-08", end: "2027-03-16" })], DESTS);
  assert.equal(r.start, "2027-03-08");
  assert.equal(r.end, "2027-03-14");
  assert.equal(r.tripEnd, "2027-03-13");
  assert.equal(r.overlap, true);
});
test("overlap: exactly `nights` days is enough, one fewer is not", () => {
  const ok = compute(trip(), [member("a", { start: "2027-03-06", end: "2027-03-11" })], DESTS);
  assert.equal(ok.overlap, true);
  const no = compute(trip(), [member("a", { start: "2027-03-06", end: "2027-03-10" })], DESTS);
  assert.equal(no.overlap, false);
  assert.deepEqual(no.eligible, []);
});
test("overlap: disjoint members → no overlap, no suggestions", () => {
  const r = compute(trip(), [member("a", { start: "2027-03-01", end: "2027-03-08" }), member("b", { start: "2027-03-20", end: "2027-03-28" })], DESTS);
  assert.equal(r.overlap, false);
  assert.deepEqual(r.eligible, []);
});
test("overlap is clamped to the host's window", () => {
  const r = compute(trip({ windowStart: "2027-03-10", windowEnd: "2027-03-20" }), [member("a", { start: "2027-03-01", end: "2027-03-31" })], DESTS);
  assert.equal(r.start, "2027-03-10");
  assert.equal(r.end, "2027-03-20");
});
test("trip length is respected (7 nights)", () => {
  const r = compute(trip({ nights: 7 }), [member("a", { start: "2027-03-06", end: "2027-03-12" })], DESTS);
  assert.equal(r.overlap, false);
});
test("nobody ready → empty result, not a crash", () => {
  const r = compute(trip(), [member("a", { ready: false })], DESTS);
  assert.equal(r.overlap, false);
  assert.deepEqual(r.eligible, []);
});

// ---------- Budget ----------
test("a member's budget excludes destinations above it", () => {
  const r = compute(trip(), [member("a", { max: 600 })], DESTS);
  assert.ok(!ids(r).includes("lisbon"));
  assert.ok(r.excluded.find((d) => d.id === "lisbon")!.reasons.some((x) => x.startsWith("Above")));
});
test("budget is a ceiling: host cap beats a member's higher max", () => {
  const t = trip({ maxBudget: 600 });
  assert.equal(effectiveMax(member("a", { max: 5000 }), t), 600);
  assert.ok(!ids(compute(t, [member("a", { max: 5000 })], DESTS)).includes("lisbon"));
});
test("a lower member budget still wins over a higher host cap", () => {
  assert.equal(effectiveMax(member("a", { max: 400 }), trip({ maxBudget: 900 })), 400);
});
test("the cheapest member's budget constrains the whole group", () => {
  const r = compute(trip(), [member("rich", { max: 5000 }), member("poor", { max: 600 })], DESTS);
  assert.ok(!ids(r).includes("lisbon"));
});
test("the cost for exactly the budget is allowed (boundary)", () => {
  const c = costs(DESTS.find((d) => d.id === "miami")!, { origin: "BOS" }, "2027-03-06", 5)!;
  const r = compute(trip(), [member("a", { max: c.total })], DESTS);
  assert.ok(ids(r).includes("miami"));
  const r2 = compute(trip(), [member("a", { max: c.total - 1 })], DESTS);
  assert.ok(!ids(r2).includes("miami"));
});

// ---------- Costs ----------
test("costs: miami from BOS, 5 nights, early date", () => {
  const c = costs(DESTS.find((d) => d.id === "miami")!, { origin: "BOS" }, "2027-03-06", 5)!;
  assert.deepEqual(c, { flight: 220, stay: 310, daily: 174, total: 704 });
});
test("costs: +$35 for trips starting on/after the 15th", () => {
  const d = DESTS.find((x) => x.id === "miami")!;
  assert.equal(costs(d, { origin: "BOS" }, "2027-03-15", 5)!.flight, 255);
  assert.equal(costs(d, { origin: "BOS" }, "2027-03-14", 5)!.flight, 220);
});
test("costs: unknown airport → null, and the destination is excluded with a reason", () => {
  assert.equal(costs(DESTS[0], { origin: "XXX" }, "2027-03-06", 5), null);
  const r = compute(trip(), [member("a", { origin: "XXX" })], DESTS);
  assert.deepEqual(r.eligible, []);
  assert.ok(r.excluded[0].reasons[0].includes("No fare"));
});
test("groupTotal is the sum of every member's total", () => {
  const r = compute(trip(), [member("a"), member("b", { origin: "JFK" })], DESTS);
  const s = r.eligible.find((d) => d.id === "miami")!;
  assert.equal(s.groupTotal, s.perMember.a.total + s.perMember.b.total);
});

// ---------- Deal-breakers ----------
test("deal-breakers exclude the right destinations", () => {
  assert.ok(!ids(compute(trip(), [member("a", { deals: ["nonstop"] })], DESTS)).includes("costarica"));
  assert.deepEqual(ids(compute(trip(), [member("a", { deals: ["domestic"] })], DESTS)).sort(), ["miami", "sanjuan"]);
  assert.ok(!ids(compute(trip(), [member("a", { deals: ["short"] })], DESTS)).includes("lisbon"));
  assert.ok(!ids(compute(trip(), [member("a", { deals: ["red-eye"] })], DESTS)).includes("lisbon"));
});
test("one member's deal-breaker applies to everyone", () => {
  const r = compute(trip(), [member("a"), member("b", { deals: ["domestic"] })], DESTS);
  assert.ok(ids(r).every((i) => ["miami", "sanjuan"].includes(i)));
});

// ---------- Ranking ----------
test("destinations matching more preferences rank higher", () => {
  const r = compute(trip(), [member("a", { prefs: ["culture", "city", "food"] })], DESTS);
  assert.ok(ids(r).indexOf("lisbon") < ids(r).indexOf("cancun"));
});
test("at most 5 suggestions are returned", () => {
  assert.ok(compute(trip(), [member("a")], DESTS).eligible.length <= 5);
});
test("a member joining only narrows the options, never widens them", () => {
  const solo = new Set(ids(compute(trip(), [member("a")], DESTS)));
  const duo = ids(compute(trip(), [member("a"), member("b", { max: 700, deals: ["nonstop"] })], DESTS));
  assert.ok(duo.every((i) => solo.has(i)));
});
