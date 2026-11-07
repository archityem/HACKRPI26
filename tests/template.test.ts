import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, defaultTemplate, fallbackTemplates, sanitizeTemplate } from "../lib/template.ts";

const good = {
  layout: "ticket", font: "playfair", deco: "dots", motif: "🌴",
  palette: { bg: "#112233", ink: "#f5f5f5", accent: "#ffcc00" },
  headline: ["salt", "water", "season."], kicker: "maya's crew", footer: "somewhere warm", sticker: "you're invited",
};

test("keeps a valid template and normalizes casing", () => {
  const t = sanitizeTemplate(good)!;
  assert.equal(t.layout, "ticket");
  assert.equal(t.font, "playfair");
  assert.deepEqual(t.headline, ["salt", "water", "season."]);
  assert.equal(t.kicker, "MAYA'S CREW");
  assert.equal(t.motif, "🌴");
});

test("rejects things that aren't a template", () => {
  for (const bad of [null, undefined, "x", 5, [], {}, { headline: [] }, { headline: ["  ", "<>"] }]) assert.equal(sanitizeTemplate(bad), null);
});

test("unknown layout, font and deco fall back to safe values", () => {
  const t = sanitizeTemplate({ ...good, layout: "../../x", font: "Comic Sans", deco: "<script>" })!;
  assert.deepEqual([t.layout, t.font, t.deco], ["poster", "fraunces", "curves"]);
});

test("colours: bad hex and CSS injection are replaced, never passed through", () => {
  const t = sanitizeTemplate({ ...good, palette: { bg: "red; background:url(x)", ink: "javascript:alert(1)", accent: "#12" } }, "pool")!;
  assert.deepEqual(t.palette.bg, "#b9dfe4");
  assert.match(t.palette.ink, /^#[0-9a-f]{6}$/);
  assert.match(t.palette.accent, /^#[0-9a-f]{6}$/);
});

test("unreadable ink is swapped for black or white", () => {
  const t = sanitizeTemplate({ ...good, palette: { bg: "#222222", ink: "#252525", accent: "#ffffff" } })!;
  assert.ok(contrast(t.palette.bg, t.palette.ink) >= 4.5);
  const light = sanitizeTemplate({ ...good, palette: { bg: "#fafafa", ink: "#ffffff", accent: "#000000" } })!;
  assert.ok(contrast(light.palette.bg, light.palette.ink) >= 4.5);
});

test("text is trimmed, markup characters removed, lengths capped, at most 3 headline lines", () => {
  const t = sanitizeTemplate({
    ...good, headline: ["<b>hi</b>", "a".repeat(40), "two", "four"], kicker: "x".repeat(99), sticker: "line\none\u0000",
  })!;
  assert.equal(t.headline.length, 3);
  assert.ok(!t.headline.join("").includes("<"));
  assert.equal(t.headline[1].length, 14);
  assert.equal(t.kicker.length, 28);
  assert.equal(t.sticker, "LINE ONE");
});

test("motif must be an emoji; a ZWJ sequence stays whole", () => {
  assert.equal(sanitizeTemplate({ ...good, motif: "hello" })!.motif, defaultTemplate().motif);
  assert.equal(sanitizeTemplate({ ...good, motif: "👩‍👩‍👧 family" })!.motif, "👩‍👩‍👧");
});

test("fallbackTemplates gives 3 valid, differently laid-out options built from the title", () => {
  const ts = fallbackTemplates("Girls cabin weekend", ["nature"], "Maya");
  assert.equal(ts.length, 3);
  assert.equal(new Set(ts.map((t) => t.layout)).size, 3);
  for (const t of ts) {
    assert.equal(t.motif, "🌿");
    assert.equal(t.kicker, "MAYA'S CREW");
    assert.deepEqual(t.headline, ["Girls", "cabin", "weekend"]);
    assert.ok(contrast(t.palette.bg, t.palette.ink) >= 4.5);
  }
  assert.ok(fallbackTemplates("!!!", []).every((t) => t.headline.length > 0)); // a title with no words still works
});
