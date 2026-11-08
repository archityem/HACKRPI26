import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled, priceDestination } from "@/lib/ai";
import { authenticate } from "@/lib/auth";
import { costs } from "@/lib/matching";
import { verdictFor } from "@/lib/rank";
import { getStore } from "@/lib/store";
import { sampleEstimate } from "@/lib/trips";
import type { Destination } from "@/lib/types";

const Body = z.object({ memberId: z.string().min(1), name: z.string().trim().min(2).max(60) });

const COOLDOWN_MS = 3000; // one pricing call at a time per member
const last = new Map<string, number>();

// "Price it": estimate one place for the group. The result is kept as the member's draft until they add it.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type a place to price" }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.member.ready) return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  const memberId = auth.member.id;
  const { name } = parsed.data;
  const members = await store.listMembers(code);
  const now = Date.now();
  if (now - (last.get(memberId) ?? 0) < COOLDOWN_MS) return NextResponse.json({ error: "Give it a few seconds before pricing another place." }, { status: 429 });
  last.set(memberId, now);

  let found: Destination | undefined;
  let source: "gemini" | "sample" = "sample";
  try {
    if (aiEnabled()) { found = await priceDestination(trip, members, name); source = "gemini"; }
  } catch (e) {
    console.error(`[ai] priceDestination failed for ${code}:`, e instanceof Error ? e.message : e);
  }
  const draft: Destination = { ...(found ?? sampleEstimate(trip, members, name)), proposedBy: memberId };
  await store.updateTrip(code, { drafts: { ...(trip.drafts ?? {}), [memberId]: draft } });

  const ready = members.filter((m) => m.ready);
  const start = [trip.windowStart, ...ready.map((m) => m.start)].sort().at(-1)!;
  const per = ready.map((m) => ({ m, c: costs(draft, m, start, trip.nights) })).filter((x): x is { m: typeof x.m; c: NonNullable<typeof x.c> } => x.c !== null);
  const avg = (f: (c: (typeof per)[number]["c"]) => number) => (per.length ? Math.round(per.reduce((n, x) => n + f(x.c), 0) / per.length) : 0);
  const perPerson = avg((c) => c.total);
  return NextResponse.json({
    source,
    estimate: {
      name: draft.name, country: draft.country, emoji: draft.emoji, perPerson, groupTotal: per.reduce((n, x) => n + x.c.total, 0),
      flights: avg((c) => c.flight), stay: avg((c) => c.stay), food: avg((c) => c.daily),
      verdict: verdictFor(perPerson, trip.maxBudget), reason: draft.reason ?? "",
      over: per.filter((x) => x.c.total > Math.min(x.m.max, trip.maxBudget)).map((x) => x.m.name),
      travelers: ready.length, origins: [...new Set(ready.map((m) => m.origin))], nights: trip.nights, start,
    },
  });
}
