import { test } from "node:test";
import assert from "node:assert/strict";
import { aiEnabled, candidateKey, geminiKey, itineraryKey, toDestinations, toItinerary, type PlanInput } from "../lib/ai.ts";
import { compute } from "../lib/matching.ts";
import type { Member, Trip } from "../lib/types.ts";

const raw = (name: string, o: Record<string, unknown> = {}) => ({
  name, country: "X", emoji: "🌴", caption: "c", tags: ["beach"],
  fares: [{ origin: "BOS", roundTripUsd: 300 }, { origin: "jfk", roundTripUsd: 280 }],
  lodgingPerNightUsd: 60, dailySpendUsd: 40, flightHours: 4, stops: 0, domestic: false, overnight: false, ...o,
});
const parsed = (...d: ReturnType<typeof raw>[]) => ({ destinations: d }) as Parameters<typeof toDestinations>[0];

const trip = (o: Partial<Trip> = {}): Trip => ({
  code: "t", hostMemberId: "a", title: "T", note: "", theme: "pink", windowStart: "2027-03-01", windowEnd: "2027-03-31",
  nights: 5, maxBudget: 2000, vibes: ["beach"], phase: "ideas", proposal: null, approvals: [], createdAt: "", ...o,
});
const member = (id: string, o: Partial<Member> = {}): Member => ({
  id, tripCode: "t", name: id, origin: "BOS", start: "2027-03-06", end: "2027-03-14", min: 0, max: 2000,
  prefs: ["beach"], deals: [], ready: true, ...o,
});

test("aiEnabled: GEMINI_API_KEY wins; an empty or missing key falls back to Gemini", () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const prevGemini = process.env.Gemini;
  const restore = () => {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
    if (prevGemini === undefined) delete process.env.Gemini;
    else process.env.Gemini = prevGemini;
  };
  // Placeholders only. A mismatch reports a label, never the key string.
  const label = () => {
    const key = geminiKey();
    if (key === "primary-not-a-key") return "primary";
    if (key === "fallback-not-a-key") return "fallback";
    if (key === "") return "off";
    return "other";
  };
  try {
    delete process.env.GEMINI_API_KEY;
    delete process.env.Gemini;
    assert.equal(label(), "off");
    assert.equal(aiEnabled(), false);

    process.env.Gemini = "fallback-not-a-key";
    assert.equal(label(), "fallback");
    assert.equal(aiEnabled(), true);

    process.env.GEMINI_API_KEY = "";
    assert.equal(label(), "fallback");
    assert.equal(aiEnabled(), true);

    process.env.GEMINI_API_KEY = "primary-not-a-key";
    assert.equal(label(), "primary");
    assert.equal(aiEnabled(), true);

    delete process.env.Gemini;
    assert.equal(label(), "primary");
    assert.equal(aiEnabled(), true);

    process.env.GEMINI_API_KEY = "";
    assert.equal(label(), "off");
    assert.equal(aiEnabled(), false);
  } finally {
    restore();
  }
});

test("toDestinations: prices every requested origin, normalizing IATA case", () => {
  const [d] = toDestinations(parsed(raw("Cancún")), ["BOS", "JFK"]);
  assert.deepEqual(d.flight, { BOS: 300, JFK: 280 });
  assert.equal(d.id, "cancun");
});
test("toDestinations: drops destinations that can't be priced for every origin", () => {
  const partial = raw("Nowhere", { fares: [{ origin: "BOS", roundTripUsd: 300 }] });
  assert.deepEqual(toDestinations(parsed(partial, raw("Ok")), ["BOS", "JFK"]).map((d) => d.name), ["Ok"]);
});
test("toDestinations: unknown tags are filtered out", () => {
  const [d] = toDestinations(parsed(raw("A", { tags: ["beach", "skiing", "food"] })), ["BOS", "JFK"]);
  assert.deepEqual(d.tags, ["beach", "food"]);
});
test("toDestinations: duplicate names get unique ids", () => {
  const ids = toDestinations(parsed(raw("Paris"), raw("Paris"), raw("Paris")), ["BOS", "JFK"]).map((d) => d.id);
  assert.equal(new Set(ids).size, 3);
});
test("toDestinations: extra origins from the model are ignored", () => {
  const [d] = toDestinations(parsed(raw("A", { fares: [{ origin: "BOS", roundTripUsd: 1 }, { origin: "LAX", roundTripUsd: 9 }] })), ["BOS"]);
  assert.deepEqual(Object.keys(d.flight), ["BOS"]);
});
test("generated destinations flow through the real matcher", () => {
  const dests = toDestinations(parsed(raw("Cheap", { tags: ["beach"] }), raw("Pricey", { lodgingPerNightUsd: 900 })), ["BOS"]);
  const r = compute(trip({ maxBudget: 1500 }), [member("a", { max: 1500 })], dests);
  assert.deepEqual(r.eligible.map((d) => d.id), ["cheap"]);
  assert.ok(r.excluded.some((d) => d.id === "pricey"));
});

test("candidateKey: stable for the same inputs, ignores member order and budgets", () => {
  const a = member("a", { origin: "BOS" }), b = member("b", { origin: "JFK", prefs: ["food"] });
  assert.equal(candidateKey(trip(), [a, b]), candidateKey(trip(), [b, a]));
  assert.equal(candidateKey(trip(), [a, b]), candidateKey(trip(), [a, { ...b, max: 100, min: 5 }]));
});
test("candidateKey: changes when origins, interests, deal-breakers, or the trip change", () => {
  const base = candidateKey(trip(), [member("a")]);
  assert.notEqual(base, candidateKey(trip(), [member("a"), member("b", { origin: "JFK" })]));
  assert.notEqual(base, candidateKey(trip(), [member("a", { prefs: ["beach", "food"] })]));
  assert.notEqual(base, candidateKey(trip(), [member("a", { deals: ["domestic"] })]));
  assert.notEqual(base, candidateKey(trip({ nights: 7 }), [member("a")]));
  assert.notEqual(base, candidateKey(trip({ maxBudget: 500 }), [member("a")]));
});
test("candidateKey: members who haven't answered don't affect it", () => {
  assert.equal(candidateKey(trip(), [member("a")]), candidateKey(trip(), [member("a"), member("b", { ready: false, origin: "LAX" })]));
});

// ---------- Itinerary ----------
const dest = toDestinations(parsed(raw("Cancún")), ["BOS"])[0];
const plan = (o: Partial<PlanInput> = {}): PlanInput => ({ destination: dest, start: "2027-03-08", nights: 5, prefs: ["beach", "food"], deals: [], travelers: 2, ...o });
const day = (t: string) => ({ title: t, morning: "m", afternoon: "a", evening: "e" });

test("toItinerary: dates each day from the start date, in order", () => {
  const it = toItinerary({ summary: "s", days: [day("1"), day("2"), day("3")], tips: [] }, plan(), "m");
  assert.deepEqual(it.days.map((d) => d.date), ["2027-03-08", "2027-03-09", "2027-03-10"]);
});
test("toItinerary: never more than nights+1 days, tips capped at 3", () => {
  const days = Array.from({ length: 12 }, (_, n) => day(String(n)));
  const it = toItinerary({ summary: "s", days, tips: ["1", "2", "3", "4", "5", "6"] }, plan({ nights: 5 }), "m");
  assert.equal(it.days.length, 6);
  assert.equal(it.tips.length, 3);
});
test("toItinerary: empty output is rejected", () => {
  assert.throws(() => toItinerary({ summary: "s", days: [], tips: [] }, plan(), "m"));
});
test("toItinerary: overlong text is trimmed", () => {
  const it = toItinerary({ summary: "s", days: [{ ...day("x"), morning: "z".repeat(5000) }], tips: [] }, plan(), "m");
  assert.ok(it.days[0].morning.length <= 110);
});
test("itineraryKey: same for same plan, different when destination, dates, interests, or group change", () => {
  const base = itineraryKey(plan());
  assert.equal(base, itineraryKey(plan({ prefs: ["food", "beach"] })));
  assert.notEqual(base, itineraryKey(plan({ start: "2027-03-09" })));
  assert.notEqual(base, itineraryKey(plan({ nights: 4 })));
  assert.notEqual(base, itineraryKey(plan({ prefs: ["beach"] })));
  assert.notEqual(base, itineraryKey(plan({ travelers: 3 })));
  assert.notEqual(base, itineraryKey(plan({ destination: { ...dest, id: "other" } })));
});
