import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs } from "../lib/ics.ts";
import { inviteMessage, itineraryText, nudgeMessage } from "../lib/messages.ts";

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
