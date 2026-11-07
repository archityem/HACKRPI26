import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";

// Integration test: boots the real Next server on a throwaway port and walks the full flow.
const PORT = 3199;
const B = `http://localhost:${PORT}/api/trips`;
let server: ChildProcess;

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const j = async (r: Response) => ({ status: r.status, body: (await r.json()) as any });

before(async () => {
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], { env: { ...process.env, GEMINI_API_KEY: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", KV_REST_API_URL: "", KV_REST_API_TOKEN: "", NEXT_DIST_DIR: ".next-test", DATA_FILE: "data/test-db.json" }, stdio: "ignore", detached: true });
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://localhost:${PORT}/`); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error("server did not start");
});
// Kill the whole process group; `npx` spawns children that outlive a plain kill.
after(() => { if (server?.pid) try { process.kill(-server.pid, "SIGTERM"); } catch {} });

test("full flow: create → join → vote → propose → approve → planning", async () => {
  const c = await j(await post(B, { hostName: "Maya", title: "Spring", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1200, vibes: ["beach"] }));
  assert.equal(c.status, 201);
  const { code, memberId: host } = c.body;
  assert.match(code, /^[a-z0-9]{6}$/);

  // Host hasn't answered yet: not counted as ready, no suggestions.
  let s = await j(await fetch(`${B}/${code}?me=${host}`));
  assert.equal(s.body.match.readyCount, 0);
  assert.equal(s.body.match.eligible.length, 0);

  const hostAns = await j(await post(`${B}/${code}/members`, { memberId: host, name: "Maya", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 2000, prefs: ["beach"] }));
  assert.equal(hostAns.status, 200);
  // Host ceiling (1200) caps the member's own higher max (2000).
  assert.equal(hostAns.body.members.find((m: any) => m.id === host).max, 1200);

  const leo = await j(await post(`${B}/${code}/members`, { name: "Leo", origin: "jfk", start: "2027-03-08", end: "2027-03-16", max: 900, prefs: ["nightlife"] }));
  const leoId = leo.body.memberId;
  assert.equal(leo.body.match.readyCount, 2);
  assert.equal(leo.body.match.start, "2027-03-08");

  // Privacy: Leo's budget is hidden from the host's view, visible in his own.
  s = await j(await fetch(`${B}/${code}?me=${host}`));
  assert.equal(s.body.members.find((m: any) => m.id === leoId).max, undefined);
  s = await j(await fetch(`${B}/${code}?me=${leoId}`));
  assert.equal(s.body.members.find((m: any) => m.id === leoId).max, 900);

  const pick = s.body.match.eligible[0].id;
  // Voting is limited to current suggestions and ready members.
  assert.equal((await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: "atlantis" })).status, 400);
  assert.equal((await post(`${B}/${code}/vote`, { memberId: "stranger", destinationId: pick })).status, 403);
  const v = await j(await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: pick }));
  assert.equal(v.body.votes.length, 1);
  // Re-voting replaces, not appends.
  await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: pick });
  s = await j(await fetch(`${B}/${code}`));
  assert.equal(s.body.votes.length, 1);

  // Can't approve before a proposal exists.
  assert.equal((await post(`${B}/${code}/approve`, { memberId: host })).status, 400);
  await post(`${B}/${code}/proposal`, { memberId: host, destinationId: pick });
  let a = await j(await post(`${B}/${code}/approve`, { memberId: host }));
  assert.equal(a.body.trip.phase, "ideas"); // one of two
  a = await j(await post(`${B}/${code}/approve`, { memberId: leoId }));
  assert.equal(a.body.trip.phase, "planning"); // everyone

  // Editing constraints invalidates the proposal and approvals.
  const edit = await j(await post(`${B}/${code}/members`, { memberId: leoId, name: "Leo", origin: "JFK", start: "2027-03-08", end: "2027-03-16", max: 800, prefs: ["nightlife"] }));
  assert.equal(edit.body.trip.proposal, null);
  assert.deepEqual(edit.body.trip.approvals, []);
  assert.equal(edit.body.trip.phase, "ideas");
});

test("a late joiner must also approve before planning unlocks", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  const ans = (n: string, id?: string) => post(`${B}/${c.code}/members`, { memberId: id, name: n, origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] });
  await ans("A", c.memberId);
  const pick = (await j(await fetch(`${B}/${c.code}`))).body.match.eligible[0].id;
  await post(`${B}/${c.code}/proposal`, { memberId: c.memberId, destinationId: pick });
  await post(`${B}/${c.code}/approve`, { memberId: c.memberId });
  const late = (await j(await ans("B"))).body;
  assert.equal(late.trip.proposal, null); // new member reset the agreement
});

test("retry: validates input, requires a ready member, 404s unknown trips", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  assert.equal((await post(`${B}/${c.code}/retry`, {})).status, 400);
  assert.equal((await post(`${B}/${c.code}/retry`, { memberId: c.memberId })).status, 403); // host hasn't answered yet
  assert.equal((await post(`${B}/nope00/retry`, { memberId: "x" })).status, 404);
  await post(`${B}/${c.code}/members`, { memberId: c.memberId, name: "A", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] });
  assert.equal((await post(`${B}/${c.code}/retry`, { memberId: c.memberId })).status, 200);
});

test("validation and not-found", async () => {
  assert.equal((await post(B, { hostName: "" })).status, 400);
  assert.equal((await post(B, { hostName: "A", title: "T", windowStart: "2027-03-10", windowEnd: "2027-03-01", nights: 5, maxBudget: 100 })).status, 400);
  assert.equal((await fetch(`${B}/nope00`)).status, 404);
  assert.equal((await post(`${B}/nope00/members`, { name: "x", origin: "BOS", start: "2027-03-01", end: "2027-03-09", max: 1, prefs: ["a"] })).status, 404);
});
