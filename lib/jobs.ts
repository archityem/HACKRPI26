import type { JobState } from "./types";

// Background AI jobs are recorded on the trip. On serverless hosts several instances can serve the same
// trip, so per-process memory can't tell us "someone is already generating this".
export const RUNNING_TTL_MS = 90_000; // a run older than this is presumed dead (instance recycled) and may be retaken
export const FAILED_TTL_MS = 300_000; // after a failure, don't hammer the API for this long

/** "running" / "failed" if a live record exists for exactly these inputs, else null (free to start). */
export function jobFresh(job: JobState | undefined, key: string, now = Date.now()): "running" | "failed" | null {
  if (!job || job.key !== key) return null;
  const age = now - Date.parse(job.at);
  if (job.state === "running") return age < RUNNING_TTL_MS ? "running" : null;
  return age < FAILED_TTL_MS ? "failed" : null;
}
