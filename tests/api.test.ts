import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

// Integration test: boots the real Next server on a throwaway port and walks the full flow.
const PORT = 3199;
const B = `http://localhost:${PORT}/api/trips`;
let server: ChildProcess;

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const j = async (r: Response) => ({ status: r.status, body: (await r.json()) as any });

before(async () => {
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
    env: { ...process.env, GEMINI_API_KEY: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", KV_REST_API_URL: "", KV_REST_API_TOKEN: "", NEXT_DIST_DIR: ".next-test", DATA_FILE: "data/test-db.json" },
    stdio: "ignore",
    detached: process.platform !== "win32",
  });
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://localhost:${PORT}/`); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error("server did not start");
});
// Kill the whole process group on Unix; `npx` used to spawn children that outlive a plain kill.
after(() => {
  if (!server?.pid) return;
  try { process.kill(process.platform === "win32" ? server.pid : -server.pid, "SIGTERM"); } catch {}
});

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

test("shared trip log unlocks after unanimous approval", async () => {
  const { body: c } = await j(await post(B, { hostName: "A", title: "T", windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 3000 }));
  await post(`${B}/${c.code}/members`, { memberId: c.memberId, name: "A", origin: "BOS", start: "2027-03-06", end: "2027-03-14", max: 3000, prefs: ["beach"] });
  const pick = (await j(await fetch(`${B}/${c.code}`))).body.match.eligible[0].id;
  assert.equal((await post(`${B}/${c.code}/log`, { memberId: c.memberId, lodgingName: "Too soon" })).status, 400);
  await post(`${B}/${c.code}/proposal`, { memberId: c.memberId, destinationId: pick });
  await post(`${B}/${c.code}/approve`, { memberId: c.memberId });
  const log = await j(await post(`${B}/${c.code}/log`, { memberId: c.memberId, checks: ["stay"], lodgingName: "Beach house", lodgingNote: "Walkable." }));
  assert.equal(log.status, 200);
  assert.equal(log.body.trip.log.lodgingName, "Beach house");
  assert.deepEqual(log.body.trip.log.checks, ["stay"]);
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
