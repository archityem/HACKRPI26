import { test } from "node:test";
import assert from "node:assert/strict";
import { FAILED_TTL_MS, RUNNING_TTL_MS, jobFresh } from "../lib/jobs.ts";
import type { JobState } from "../lib/types.ts";

const T0 = Date.parse("2026-11-07T12:00:00Z");
const job = (state: JobState["state"], ageMs: number, key = "k"): JobState => ({ key, state, at: new Date(T0 - ageMs).toISOString() });

test("no job, or a job for different inputs: free to start", () => {
  assert.equal(jobFresh(undefined, "k", T0), null);
  assert.equal(jobFresh(job("running", 1000, "other"), "k", T0), null);
});
test("a recent running job blocks duplicates; a stale one (dead instance) can be retaken", () => {
  assert.equal(jobFresh(job("running", 1000), "k", T0), "running");
  assert.equal(jobFresh(job("running", RUNNING_TTL_MS + 1), "k", T0), null);
});
test("a recent failure backs off; after the cool-down it may retry", () => {
  assert.equal(jobFresh(job("failed", 1000), "k", T0), "failed");
  assert.equal(jobFresh(job("failed", FAILED_TTL_MS + 1), "k", T0), null);
});
