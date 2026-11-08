import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs } from "../lib/ics.ts";
import { dateAskLine, dateAskMessage, dateUnlockHeadline, dateUnlockHint, inviteMessage, itineraryText, nudgeMessage } from "../lib/messages.ts";

const base = { uid: "abc@elsewhere", title: "Cartagena", location: "Cartagena, Colombia", start: "2027-03-08", end: "2027-03-12", description: "Five days", now: new Date("2026-11-07T12:00:00Z") };

test("ics: all-day event whose end date is exclusive (the day after departure)", () => {
  const ics = buildIcs(base);
  assert.match(ics, /DTSTART;VALUE=DATE:20270308\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270313\r\n/);
});
test("ics: month and year boundaries roll over correctly", () => {
  assert.match(buildIcs({ ...base, start: "2027-03-28", end: "2027-03-31" }), /DTEND;VALUE=DATE:20270401\r\n/);
  assert.match(buildIcs({ ...base, start: "2027-12-28", end: "2027-12-31" }), /DTEND;VALUE=DATE:20280101\r\n/);
});
test("ics: valid envelope, CRLF endings, stable stamp and uid", () => {
  const ics = buildIcs(base);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
  assert.match(ics, /DTSTAMP:20261107T120000Z\r\n/);
  assert.match(ics, /UID:abc@elsewhere\r\n/);
  assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);
});
test("ics: commas, semicolons, backslashes and newlines are escaped", () => {
  const ics = buildIcs({ ...base, description: "a, b; c\\d\ne" });
  assert.match(ics, /DESCRIPTION:a\\, b\; c\\\\d\\ne\r\n/);
});
test("ics: long lines fold at 75 octets and unfold back to the original", () => {
  const long = "x".repeat(300);
  const ics = buildIcs({ ...base, description: long });
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, "line too long");
  assert.ok(ics.replace(/\r\n /g, "").includes("DESCRIPTION:" + long));
});
test("ics: multibyte characters are never split across a fold", () => {
  const ics = buildIcs({ ...base, title: "Cartagena é".repeat(30) });
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("SUMMARY:" + "Cartagena é".repeat(30)));
});

test("invite message includes the link, nights, window, and budget ceiling", () => {
  const m = inviteMessage({ title: "Spring", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1200, link: "https://x.app/t/abc123" });
  assert.match(m, /5 nights/);
  assert.match(m, /Mar 1 to Mar 31/);
  assert.match(m, /\$1,200/);
  assert.ok(m.endsWith("https://x.app/t/abc123"));
});
test("nudge message names people naturally", () => {
  assert.match(nudgeMessage({ title: "T", names: ["Leo"], link: "l" }), /^Leo:/);
  assert.match(nudgeMessage({ title: "T", names: ["Leo", "Sam"], link: "l" }), /^Leo and Sam:/);
  assert.match(nudgeMessage({ title: "T", names: ["Leo", "Sam", "Ava"], link: "l" }), /^Leo, Sam, and Ava:/);
});
test("date gap copy names the move and stays quiet about budget", () => {
  const ask = { memberId: "maya", name: "Maya", edge: "later" as const, to: "2027-03-13", days: 3 };
  assert.equal(dateAskLine(ask), "Maya could be free through Mar 13 (3 days later).");
  assert.equal(dateAskLine(ask, "maya"), "You could be free through Mar 13 (3 days later).");
  assert.equal(dateAskLine({ ...ask, edge: "earlier", days: 1, to: "2027-03-05" }), "Maya could start on Mar 5 (1 day earlier).");
  assert.match(dateUnlockHeadline({ have: 4, need: 5, shortfall: 1, windowTooShort: false, windowNights: 30 }), /4 nights overlap so far\. 1 more night/);
  assert.match(dateUnlockHeadline({ have: 0, need: 5, shortfall: 20, windowTooShort: false, windowNights: 30 }), /20 days of movement/);
  assert.match(dateUnlockHeadline({ have: 0, need: 5, shortfall: 5, windowTooShort: true, windowNights: 3 }), /only cover 3 nights/);
  const hint = dateUnlockHint({ have: 4, need: 5, shortfall: 1, windowTooShort: false, windowNights: 30, asks: [ask, { memberId: "leo", name: "Leo", edge: "earlier", to: "2027-03-05", days: 1 }] }, "leo");
  assert.match(hint, /^You could start on Mar 5/);
  const msg = dateAskMessage({ title: "Spring", nights: 5, shortfall: 3, windowTooShort: false, asks: [ask], link: "https://x.app/t/abc" });
  assert.match(msg, /Maya staying through Mar 13/);
  assert.ok(msg.endsWith("https://x.app/t/abc"));
  assert.equal(msg.includes("$"), false);
});

test("itinerary text lists every day and the tips", () => {
  const text = itineraryText({
    destination: "Cartagena", start: "2027-03-08", end: "2027-03-12",
    itinerary: { key: "k", destinationId: "c", model: "m", generatedAt: "t", summary: "S.", tips: ["Carry cash"], days: [
      { date: "2027-03-08", title: "Arrive", morning: "m", afternoon: "a", evening: "e" },
      { date: "2027-03-09", title: "Fort", morning: "m2", afternoon: "a2", evening: "e2" },
    ] },
  });
  assert.match(text, /Day 1 \(Mar 8\): Arrive/);
  assert.match(text, /Day 2 \(Mar 9\): Fort/);
  assert.match(text, /- Carry cash/);
});
