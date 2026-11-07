import { test } from "node:test";
import assert from "node:assert/strict";
import { COVER_MAX_BYTES, parseCover } from "../lib/cover.ts";

const url = (type: string, bytes: number[] | Buffer) => `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
const pad = (head: number[], n = 64) => [...head, ...Array(n).fill(0)];
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = pad([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

test("accepts real JPEG, PNG and WebP data URLs", () => {
  assert.equal(parseCover(url("image/jpeg", JPEG))?.type, "image/jpeg");
  assert.equal(parseCover(url("image/png", PNG))?.type, "image/png");
  assert.equal(parseCover(url("image/webp", WEBP))?.type, "image/webp");
  assert.equal(parseCover(url("image/jpeg", JPEG))?.bytes.length, JPEG.length);
});

test("rejects a declared type that doesn't match the bytes", () => {
  assert.equal(parseCover(url("image/png", JPEG)), null);
  assert.equal(parseCover(url("image/jpeg", pad([...Buffer.from("<html><script>")]))), null);
});

test("rejects other types, malformed input, and oversized images", () => {
  assert.equal(parseCover(url("image/svg+xml", JPEG)), null);
  assert.equal(parseCover(url("text/html", JPEG)), null);
  assert.equal(parseCover("https://example.com/a.jpg"), null);
  assert.equal(parseCover("data:image/jpeg;base64,not base64!"), null);
  assert.equal(parseCover(url("image/jpeg", [0xff, 0xd8, 0xff])), null); // truncated
  assert.equal(parseCover(url("image/jpeg", pad([0xff, 0xd8, 0xff], COVER_MAX_BYTES))), null);
});
