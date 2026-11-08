import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { groupOrder } from "../lib/rank.ts";
import type { Vote } from "../lib/types.ts";

// Integration test: boots the real Next server on a throwaway port and walks the full flow.
const PORT = 3199;
const B = `http://localhost:${PORT}/api/trips`;
let server: ChildProcess;

const post = (url: string, body: unknown, token?: string) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
const get = (url: string, token?: string) =>
  fetch(url, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
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
  const { code, memberId: host, token: hostToken } = c.body;
  assert.match(code, /^[a-z0-9]{6}$/);
  assert.equal(typeof hostToken, "string");
  assert.notEqual(hostToken, host);

  // Host hasn't answered yet: not counted as ready, no suggestions. A public id is not a credential.
  let s = await j(await get(`${B}/${code}?me=${host}`));
  assert.equal(s.body.me, null);
  assert.equal(s.body.match.readyCount, 0);
  assert.equal(s.body.match.eligible.length, 0);
  assert.equal(JSON.stringify(s.body).includes(hostToken), false);

  const hostAns = await j(await post(`${B}/${code}/members`, { memberId: host, name: "Maya", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 2000, prefs: ["beach"] }, hostToken));
  assert.equal(hostAns.status, 200);
  assert.equal(hostAns.body.token, undefined);
  // Host ceiling (1200) caps the member's own higher max (2000).
  assert.equal(hostAns.body.members.find((m: any) => m.id === host).max, 1200);

  const leo = await j(await post(`${B}/${code}/members`, { name: "Leo", origin: "jfk", start: "2027-03-08", end: "2027-03-16", max: 900, prefs: ["nightlife"] }));
  const leoId = leo.body.memberId;
  const leoToken = leo.body.token as string;
  assert.equal(typeof leoToken, "string");
  assert.equal(leo.body.match.readyCount, 2);
  assert.equal(leo.body.match.start, "2027-03-08");

  // Spoofed save does not change Leo. His budget stays private unless the request carries his credential.
  assert.equal((await post(`${B}/${code}/members`, { memberId: leoId, name: "Leo", origin: "JFK", start: "2027-03-08", end: "2027-03-16", max: 1, prefs: ["nightlife"] }, hostToken)).status, 403);
  assert.equal((await post(`${B}/${code}/members`, { memberId: leoId, name: "Leo", origin: "JFK", start: "2027-03-08", end: "2027-03-16", max: 1, prefs: ["nightlife"] })).status, 401);
  s = await j(await get(`${B}/${code}?me=${leoId}`));
  assert.equal(s.body.me, null);
  assert.equal(s.body.members.find((m: any) => m.id === leoId).max, undefined);
  assert.equal(s.body.members.find((m: any) => m.id === leoId).min, undefined);
  assert.equal(s.body.trip.maxBudget, 1200);
  assert.equal(s.body.members.find((m: any) => m.id === leoId).name, "Leo");
  s = await j(await get(`${B}/${code}?me=${host}`, hostToken));
  assert.equal(s.body.me, host);
  assert.equal(s.body.members.find((m: any) => m.id === leoId).max, undefined);
  assert.equal(s.body.members.find((m: any) => m.id === host).max, 1200);
  s = await j(await get(`${B}/${code}`, leoToken));
  assert.equal(s.body.members.find((m: any) => m.id === leoId).max, 900);

  const pick = s.body.match.eligible[0].id;
  // Voting is limited to current suggestions and to the credential's member.
  assert.equal((await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: "atlantis" }, leoToken)).status, 400);
  assert.equal((await post(`${B}/${code}/vote`, { memberId: "stranger", destinationId: pick })).status, 401);
  assert.equal((await post(`${B}/${code}/vote`, { memberId: host, destinationId: pick }, leoToken)).status, 403);
  const v = await j(await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: pick }, leoToken));
  assert.equal(v.body.votes.length, 1);
  assert.equal(v.body.votes[0].memberId, leoId);
  // Re-voting replaces, not appends.
  await post(`${B}/${code}/vote`, { memberId: leoId, destinationId: pick }, leoToken);
  s = await j(await get(`${B}/${code}`));
  assert.equal(s.body.votes.length, 1);

  // Can't approve before a proposal exists, and a public id cannot approve.
  assert.equal((await post(`${B}/${code}/approve`, { memberId: host }, hostToken)).status, 400);
  assert.equal((await post(`${B}/${code}/approve`, { memberId: host })).status, 401);
  await post(`${B}/${code}/proposal`, { memberId: host, destinationId: pick }, hostToken);
  let a = await j(await post(`${B}/${code}/approve`, { memberId: host }, hostToken));
  assert.equal(a.body.trip.phase, "ideas"); // one of two
  assert.equal((await post(`${B}/${code}/approve`, { memberId: leoId }, hostToken)).status, 403);
  assert.deepEqual((await j(await get(`${B}/${code}`))).body.trip.approvals, [host]);
  a = await j(await post(`${B}/${code}/approve`, { memberId: leoId }, leoToken));
  assert.equal(a.body.trip.phase, "planning"); // everyone

  // The same answers again leave the approved plan in place, including a resend of the pre-cap max.
  const same = await j(await post(`${B}/${code}/members`, { memberId: leoId, name: "Leo", origin: "JFK", start: "2027-03-08", end: "2027-03-16", max: 900, prefs: ["nightlife"] }, leoToken));
  assert.equal(same.status, 200);
  assert.equal(same.body.trip.phase, "planning");
  assert.equal(same.body.trip.proposal, pick);
  assert.deepEqual([...same.body.trip.approvals].sort(), [host, leoId].sort());
  // Host's original 2000 was stored as the ceiling. Sending it again is not a new budget.
  const hostAgain = await j(await post(`${B}/${code}/members`, { memberId: host, name: "Maya", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 2000, prefs: ["beach"] }, hostToken));
  assert.equal(hostAgain.body.trip.phase, "planning");
  assert.equal(hostAgain.body.members.find((m: any) => m.id === host).max, 1200);
  assert.equal(hostAgain.body.trip.proposal, pick);

  // Editing constraints invalidates the proposal and approvals.
  const edit = await j(await post(`${B}/${code}/members`, { memberId: leoId, name: "Leo", origin: "JFK", start: "2027-03-08", end: "2027-03-16", max: 800, prefs: ["nightlife"] }, leoToken));
  assert.equal(edit.body.trip.proposal, null);
  assert.deepEqual(edit.body.trip.approvals, []);
  assert.equal(edit.body.trip.phase, "ideas");
});

test("a late joiner must also approve before planning unlocks", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  const ans = (n: string, id?: string, token?: string) => post(`${B}/${c.code}/members`, { memberId: id, name: n, origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] }, token);
  await ans("A", c.memberId, c.token);
  const pick = (await j(await get(`${B}/${c.code}`))).body.match.eligible[0].id;
  await post(`${B}/${c.code}/proposal`, { memberId: c.memberId, destinationId: pick }, c.token);
  await post(`${B}/${c.code}/approve`, { memberId: c.memberId }, c.token);
  const late = (await j(await ans("B"))).body;
  assert.equal(late.trip.proposal, null); // new member reset the agreement
  assert.equal(typeof late.token, "string");
});

test("simultaneous approvals both land and open planning", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  await post(`${B}/${c.code}/members`, { memberId: c.memberId, name: "A", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] }, c.token);
  const leo = await j(await post(`${B}/${c.code}/members`, { name: "B", origin: "JFK", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] }));
  const pick = (await j(await get(`${B}/${c.code}`))).body.match.eligible[0].id;
  await post(`${B}/${c.code}/proposal`, { memberId: c.memberId, destinationId: pick }, c.token);
  const [a, b] = await Promise.all([
    j(await post(`${B}/${c.code}/approve`, { memberId: c.memberId }, c.token)),
    j(await post(`${B}/${c.code}/approve`, { memberId: leo.body.memberId }, leo.body.token)),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const s = await j(await get(`${B}/${c.code}`));
  assert.deepEqual([...s.body.trip.approvals].sort(), [c.memberId, leo.body.memberId].sort());
  assert.equal(s.body.trip.phase, "planning");
  assert.equal(s.body.trip.proposal, pick);
});

test("resaving the same answers keeps a locked ranking and the approved plan", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1200, vibes: ["beach"] }));
  const answers = { memberId: c.memberId, name: "A", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 1200, prefs: ["beach", "food"] };
  await post(`${B}/${c.code}/members`, answers, c.token);
  const ids = (await j(await get(`${B}/${c.code}`, c.token))).body.match.eligible.map((d: { id: string }) => d.id);
  assert.ok(ids.length > 0);
  const ranked = await j(await post(`${B}/${c.code}/rank`, { memberId: c.memberId, ranking: ids, locked: true }, c.token));
  assert.equal(ranked.status, 200);
  const proposal = ranked.body.trip.proposal as string;
  assert.ok(proposal);
  assert.equal(ranked.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId).locked, true);
  const approved = await j(await post(`${B}/${c.code}/approve`, { memberId: c.memberId }, c.token));
  assert.equal(approved.body.trip.phase, "planning");

  const same = await j(await post(`${B}/${c.code}/members`, { ...answers, name: "Ada", prefs: ["food", "beach"] }, c.token));
  assert.equal(same.body.trip.phase, "planning");
  assert.equal(same.body.trip.proposal, proposal);
  assert.deepEqual(same.body.trip.approvals, [c.memberId]);
  const vote = same.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId);
  assert.equal(vote.locked, true);
  assert.deepEqual(vote.ranking, ids);

  const changed = await j(await post(`${B}/${c.code}/members`, { ...answers, max: 400 }, c.token));
  assert.equal(changed.body.trip.proposal, null);
  assert.deepEqual(changed.body.trip.approvals, []);
  assert.equal(changed.body.trip.phase, "ideas");
  const after = changed.body.votes.find((v: { memberId: string; locked?: boolean }) => v.memberId === c.memberId);
  if (after) assert.equal(after.locked, false);
});

test("host's invite picture is stored, kept out of snapshots, and served on its own", async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(60).fill(7)]);
  const base = { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1000, theme: "pool" };
  const { body: c } = await j(await post(B, { ...base, cover: `data:image/jpeg;base64,${jpeg.toString("base64")}` }));
  const s = (await j(await fetch(`${B}/${c.code}`))).body;
  assert.equal(s.trip.theme, "pool");
  assert.equal(s.trip.cover, undefined);
  assert.equal(s.trip.coverUrl, `/api/trips/${c.code}/cover`);
  const img = await fetch(`http://localhost:${PORT}${s.trip.coverUrl}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/jpeg");
  assert.equal(img.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), jpeg);

  // Without a picture: no URL, and the cover route 404s.
  const { body: plain } = await j(await post(B, base));
  assert.equal((await j(await fetch(`${B}/${plain.code}`))).body.trip.coverUrl, null);
  assert.equal((await fetch(`${B}/${plain.code}/cover`)).status, 404);
  // Not an image, or lying about its type: rejected.
  assert.equal((await post(B, { ...base, cover: `data:image/png;base64,${jpeg.toString("base64")}` })).status, 400);
  assert.equal((await post(B, { ...base, cover: "data:text/html;base64,PGgxPmhpPC9oMT4=" })).status, 400);
});

test("AI invite templates: 3 designs from the title, and a stored template is sanitized", async () => {
  const brief = { title: "Girls cabin weekend", note: "Hot tubs and board games", hostName: "Maya", vibes: ["nature"] };
  const r = await j(await post(`http://localhost:${PORT}/api/templates`, brief));
  assert.equal(r.status, 200);
  assert.equal(r.body.templates.length, 3);
  assert.equal(r.body.source, "fallback"); // tests run with GEMINI_API_KEY unset
  assert.equal(new Set(r.body.templates.map((t: any) => t.layout)).size, 3);
  assert.equal((await post(`http://localhost:${PORT}/api/templates`, { title: "" })).status, 400);

  const base = { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1000 };
  const evil = { ...r.body.templates[0], headline: ["<img onerror=x>"], palette: { bg: "url(x)", ink: "#000000", accent: "#ffffff" }, layout: "nope" };
  const { body: c } = await j(await post(B, { ...base, template: evil }));
  const t = (await j(await fetch(`${B}/${c.code}`))).body.trip.template;
  assert.equal(t.layout, "poster");
  assert.ok(!t.headline.join("").includes("<"));
  assert.match(t.palette.bg, /^#[0-9a-f]{6}$/);
  assert.equal((await post(B, { ...base, template: "not a template" })).status, 400);
  assert.equal((await j(await fetch(`${B}/${(await j(await post(B, base))).body.code}`))).body.trip.template, undefined);
});

test("retry: validates input, requires a ready member, 404s unknown trips", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  assert.equal((await post(`${B}/${c.code}/retry`, {})).status, 400);
  assert.equal((await post(`${B}/${c.code}/retry`, { memberId: c.memberId }, c.token)).status, 403); // host hasn't answered yet
  assert.equal((await post(`${B}/nope00/retry`, { memberId: "x" })).status, 404);
  await post(`${B}/${c.code}/members`, { memberId: c.memberId, name: "A", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] }, c.token);
  assert.equal((await post(`${B}/${c.code}/retry`, { memberId: c.memberId }, c.token)).status, 200);
});

test("rank lock saves the order and proposes group #1 once everyone has locked", async () => {
  const { body: c } = await j(await post(B, { hostName: "Maya", title: "Rank", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 2000, vibes: ["beach"] }));
  await post(`${B}/${c.code}/members`, { memberId: c.memberId, name: "Maya", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 2000, prefs: ["beach"] }, c.token);
  const leo = await j(await post(`${B}/${c.code}/members`, { name: "Leo", origin: "JFK", start: "2027-03-06", end: "2027-03-14", max: 2000, prefs: ["beach"] }));
  const leoId = leo.body.memberId as string;
  const ids: string[] = (await j(await get(`${B}/${c.code}`))).body.match.eligible.map((d: { id: string }) => d.id);
  assert.ok(ids.length >= 3, `expected at least 3 suggestions, got ${ids.join(",")}`);
  // Host puts the AI's #1 first. Leo puts that place last, so full rankings and "#1 only" disagree.
  const hostRank = [...ids];
  const leoRank = [...ids.slice(1), ids[0]];
  const ready = [c.memberId as string, leoId];
  const votes: Vote[] = [
    { tripCode: c.code, memberId: c.memberId, destinationId: hostRank[0], ranking: hostRank, locked: true },
    { tripCode: c.code, memberId: leoId, destinationId: leoRank[0], ranking: leoRank, locked: true },
  ];
  const fullWinner = groupOrder(votes, ids, ready)[0].id;
  const headWinner = groupOrder(votes.map((v) => ({ ...v, ranking: undefined })), ids, ready)[0].id;
  assert.notEqual(fullWinner, headWinner);

  assert.equal((await post(`${B}/${c.code}/rank`, { memberId: c.memberId, ranking: hostRank, locked: true })).status, 401);
  const first = await j(await post(`${B}/${c.code}/rank`, { memberId: c.memberId, ranking: hostRank, locked: true }, c.token));
  assert.equal(first.status, 200);
  assert.equal(first.body.trip.proposal, null);
  const saved = first.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId);
  assert.equal(saved.locked, true);
  assert.equal(saved.destinationId, hostRank[0]);
  assert.deepEqual(saved.ranking, hostRank);

  const reloaded = await j(await get(`${B}/${c.code}`));
  const again = reloaded.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId);
  assert.equal(again.locked, true);
  assert.deepEqual(again.ranking, hostRank);

  const both = await j(await post(`${B}/${c.code}/rank`, { memberId: leoId, ranking: leoRank, locked: true }, leo.body.token));
  assert.equal(both.status, 200);
  assert.equal(both.body.trip.proposal, fullWinner);
  assert.equal(both.body.votes.find((v: { memberId: string }) => v.memberId === leoId).locked, true);

  const unlocked = await j(await post(`${B}/${c.code}/rank`, { memberId: c.memberId, ranking: hostRank, locked: false }, c.token));
  assert.equal(unlocked.status, 200);
  assert.equal(unlocked.body.trip.proposal, null);
  assert.equal(unlocked.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId).locked, false);
  const after = await j(await get(`${B}/${c.code}`));
  const hostVote = after.body.votes.find((v: { memberId: string }) => v.memberId === c.memberId);
  assert.equal(hostVote.locked, false);
  assert.deepEqual(hostVote.ranking, hostRank);
});

test("validation and not-found", async () => {
  assert.equal((await post(B, { hostName: "" })).status, 400);
  assert.equal((await post(B, { hostName: "A", title: "T", windowStart: "2027-03-10", windowEnd: "2027-03-01", nights: 5, maxBudget: 100 })).status, 400);
  assert.equal((await fetch(`${B}/nope00`)).status, 404);
  assert.equal((await post(`${B}/nope00/members`, { name: "x", origin: "BOS", start: "2027-03-01", end: "2027-03-09", max: 1, prefs: ["a"] })).status, 404);
});
