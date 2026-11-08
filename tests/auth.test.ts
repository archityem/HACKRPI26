import { test } from "node:test";
import assert from "node:assert/strict";
import { hashToken, newToken, readToken } from "../lib/credential.ts";
import { invalidatesAgreement, sameConstraints } from "../lib/answers.ts";
import type { Member } from "../lib/types.ts";

const answers = (o: Partial<Member> = {}): Member => ({
  id: "m", tripCode: "t", name: "Ada", origin: "BOS", start: "2027-03-06", end: "2027-03-14",
  min: 0, max: 900, prefs: ["beach", "food"], deals: ["nonstop"], ready: true, ...o,
});

test("readToken accepts a bearer credential and ignores anything else", () => {
  const token = newToken();
  const req = (authorization?: string) => new Request("http://localhost/api/trips/abcdef", { headers: authorization ? { authorization } : {} });
  assert.equal(readToken(req(`Bearer ${token}`)), token);
  assert.equal(readToken(req(`bearer ${token}`)), token);
  assert.equal(readToken(req()), null);
  assert.equal(readToken(req("Basic abc")), null);
  assert.equal(readToken(req("Bearer short")), null);
  assert.equal(readToken(req("Bearer ?me=public-id-not-a-token")), null);
  assert.equal(hashToken(token).length, 64);
  assert.notEqual(hashToken(token), token);
});

test("same answers, reordered prefs, and a new name do not invalidate an agreement", () => {
  const saved = answers();
  assert.equal(sameConstraints(saved, answers({ name: "Ada B", prefs: ["food", "beach"], deals: ["nonstop"] })), true);
  assert.equal(invalidatesAgreement(saved, answers({ name: "Renamed", prefs: ["food", "beach"] })), false);
  assert.equal(invalidatesAgreement(undefined, answers()), true);
  assert.equal(invalidatesAgreement(answers({ ready: false }), answers()), true);
});

test("budget, dates, airport, and deal changes are meaningful", () => {
  const saved = answers();
  assert.equal(invalidatesAgreement(saved, answers({ max: 800 })), true);
  assert.equal(invalidatesAgreement(saved, answers({ min: 100 })), true);
  assert.equal(invalidatesAgreement(saved, answers({ origin: "jfk" })), true);
  assert.equal(invalidatesAgreement(saved, answers({ origin: " bos " })), false);
  assert.equal(invalidatesAgreement(saved, answers({ end: "2027-03-20" })), true);
  assert.equal(invalidatesAgreement(saved, answers({ deals: [] })), true);
  assert.equal(invalidatesAgreement(saved, answers({ prefs: ["beach"] })), true);
});
