import { test } from "node:test";
import assert from "node:assert/strict";
import { dealsWithPassport, inviteBlurb, passportFrom, posterLines } from "../lib/client.ts";

test("posterLines stacks a trip title for the invite cover", () => {
  assert.deepEqual(posterLines("Spring break, somewhere."), { top: "Spring", mid: "break", end: "somewhere." });
  assert.deepEqual(posterLines("Girls trip"), { top: "Girls", end: "trip." });
  assert.deepEqual(posterLines("Go"), { top: "Go", end: "go." });
});

test("inviteBlurb is a paste-ready chat message", () => {
  const t = inviteBlurb({
    title: "Spring break, somewhere.", note: "One beach.", nights: 5,
    windowStart: "2027-03-01", windowEnd: "2027-03-31", maxBudget: 1200,
  }, "http://localhost:3000/t/abc");
  assert.match(t, /Spring break/);
  assert.match(t, /\$1,200/);
  assert.match(t, /abc/);
});

test("passport maps onto domestic / visa deal-breakers", () => {
  assert.equal(passportFrom(["nonstop", "domestic"]), "domestic");
  assert.equal(passportFrom(["visa"]), "visa");
  assert.equal(passportFrom(["nonstop"]), "open");
  assert.deepEqual(dealsWithPassport(["nonstop", "domestic"], "visa"), ["nonstop", "visa"]);
  assert.deepEqual(dealsWithPassport(["visa"], "open"), []);
});
