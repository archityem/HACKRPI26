import { after } from "next/server";

/**
 * Run work that should outlive the response. The task starts immediately; `after` tells the host to keep the
 * invocation alive until it settles (on serverless hosts, work is otherwise cut off once the response is sent).
 * Outside a request (scripts, tests) `after` throws, and the task simply runs on its own.
 */
export function background(task: () => Promise<unknown>) {
  const running = task().catch((e) => console.error("[background]", e instanceof Error ? e.message : e));
  try {
    after(() => running);
  } catch {
    /* not in a request scope */
  }
}
