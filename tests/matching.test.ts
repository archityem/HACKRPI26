import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { compute, costs, effectiveMax, valueCall } from "../lib/matching.ts";
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
test("at most 8 suggestions are returned", () => {
  assert.ok(compute(trip(), [member("a")], DESTS).eligible.length <= 8);
});
test("valueCall: steal / fair / stretch against the ceiling", () => {
  assert.equal(valueCall(400, 1000).value, "steal");
  assert.equal(valueCall(750, 1000).value, "fair");
  assert.equal(valueCall(920, 1000).value, "stretch");
  assert.match(valueCall(400, 1000, "A bargain for this crew.").valueWhy, /bargain/);
  assert.equal(valueCall(900, 1000, "An incredible steal for this crew.").value, "steal");
});
test("eligible suggestions carry a value call", () => {
  const r = compute(trip({ maxBudget: 2000 }), [member("a")], DESTS);
  assert.ok(r.eligible.length);
  assert.ok(["steal", "fair", "stretch"].includes(r.eligible[0].value));
  assert.ok(r.eligible[0].valueWhy.length > 0);
});
test("a member joining only narrows the options, never widens them", () => {
  const solo = new Set(ids(compute(trip(), [member("a")], DESTS)));
  const duo = ids(compute(trip(), [member("a"), member("b", { max: 700, deals: ["nonstop"] })], DESTS));
  assert.ok(duo.every((i) => solo.has(i)));
});

// ---------- Parity with the prototype's original compute() ----------
function loadPrototype() {
  const lines = readFileSync(new URL("../prototype/elsewhere.html", import.meta.url), "utf8").split("\n");
  const grab = (startsWith: string, to?: (l: string) => boolean) => {
    const i = lines.findIndex((l) => l.startsWith(startsWith));
    assert.ok(i >= 0, `prototype line not found: ${startsWith}`);
    if (!to) return lines[i];
    let j = i;
    while (!to(lines[j])) j++;
    return lines.slice(i, j + 1).join("\n");
  };
  const src = [
    grab("const day="),
    grab("const destinations=[", (l) => l.startsWith("];")),
    grab("function costs("),
    grab("function compute(", (l) => l.trimEnd().endsWith("allPrefs}}")),
  ].join("\n");
  const ctx = vm.createContext({ state: { members: [] } });
  vm.runInContext(src + "\nthis.compute=compute;", ctx);
  const fn = ctx.compute as (m: Member[]) => any;
  // Results come from another vm realm; normalize so deepEqual compares plain data.
  return (m: Member[]) => JSON.parse(JSON.stringify(fn(JSON.parse(JSON.stringify(m)))));
}

test("PARITY: ported compute() matches the prototype on 500 random scenarios", () => {
  const proto = loadPrototype();
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const some = <T,>(a: T[], min = 0) => {
    const o = a.filter(() => rnd() < 0.4);
    return o.length >= min ? o : a.slice(0, min);
  };
  const dd = (n: number) => `2027-03-${String(n).padStart(2, "0")}`;
  let withSuggestions = 0;
  for (let n = 0; n < 500; n++) {
    const count = 1 + Math.floor(rnd() * 4);
    const ms: Member[] = Array.from({ length: count }, (_, i) => {
      const s = 1 + Math.floor(rnd() * 20);
      const e = Math.min(31, s + 3 + Math.floor(rnd() * 14));
      const max = 300 + Math.floor(rnd() * 1500);
      // Prototype has an explicit mode; we model "range" as min > 0 and "max only" as min = 0.
      const range = rnd() < 0.5;
      return member(`m${i}`, {
        origin: pick(["BOS", "JFK", "ALB"]), start: dd(s), end: dd(e),
        min: range ? 1 + Math.floor(rnd() * (max - 1)) : 0, max,
        prefs: some(["beach", "food", "nature", "nightlife", "culture", "city"], 1),
        deals: some(["nonstop", "domestic", "short", "red-eye"]) as Member["deals"],
      });
    });
    const a = proto(ms.map((m) => ({ ...m, mode: m.min > 0 ? "range" : "max" })));
    const b = compute(trip(), ms, DESTS);
    const label = JSON.stringify(ms);
    assert.equal(b.overlap, a.overlap, `overlap ${label}`);
    assert.deepEqual(ids(b), a.eligible.map((d: any) => d.id), `eligible order ${label}`);
    // Deliberate difference: with no date overlap the prototype still lists budget-based
    // exclusions (misleading, since dates are the real problem); we return none.
    if (a.overlap) {
      assert.deepEqual(
        b.excluded.map((d) => [d.id, d.reasons]).sort(),
        a.excluded.map((d: any) => [d.id, d.reasons]).sort(),
        `excluded ${label}`,
      );
      assert.equal(b.tripEnd, a.tripEnd, `tripEnd ${label}`);
    } else {
      assert.deepEqual(b.excluded, [], `no overlap → no exclusions ${label}`);
    }
    if (a.eligible.length) withSuggestions++;
  }
  assert.ok(withSuggestions > 100, `scenarios too degenerate (${withSuggestions} had suggestions)`);
});
