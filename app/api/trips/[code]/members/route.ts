import { NextResponse } from "next/server";
import { z } from "zod";
import { compute } from "@/lib/matching";
import { getStore } from "@/lib/store";
import { destinationsFor, ensureCandidates, newId, resetAgreement, snapshot } from "@/lib/trips";
import type { Member } from "@/lib/types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z
  .object({
    memberId: z.string().optional(), // present when editing; absent when joining
    name: z.string().trim().min(1).max(40),
    origin: z.string().trim().toUpperCase().length(3),
    start: date,
    end: date,
    min: z.number().min(0).default(0),
    max: z.number().positive().max(100_000),
    prefs: z.array(z.string()).min(1),
    deals: z.array(z.enum(["nonstop", "domestic", "short", "red-eye", "visa"])).default([]),
  })
  .refine((b) => b.end >= b.start, { message: "end must be on/after start" })
  .refine((b) => b.min <= b.max, { message: "min must not exceed max" });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const b = parsed.data;
  const existing = b.memberId ? (await store.listMembers(code)).find((m) => m.id === b.memberId) : undefined;
  if (b.memberId && !existing) return NextResponse.json({ error: "Unknown member" }, { status: 404 });

  const member: Member = {
    id: existing?.id ?? newId(), tripCode: code, name: b.name, origin: b.origin, start: b.start, end: b.end,
    min: b.min, max: Math.min(b.max, trip.maxBudget), prefs: b.prefs, deals: b.deals, ready: true,
  };
  await store.upsertMember(member);

  // Constraints changed: clear proposal/approvals, refresh destination ideas in the background,
  // and drop votes for ideas that no longer fit (only once ideas exist; "pending" means none yet).
  await resetAgreement(trip);
  void ensureCandidates(code);
  const members = await store.listMembers(code);
  const { destinations, source } = destinationsFor((await store.getTrip(code))!, members);
  if (source !== "pending") {
    const eligible = new Set(compute(trip, members, destinations).eligible.map((d) => d.id));
    for (const v of await store.listVotes(code)) {
      if (!eligible.has(v.destinationId)) await store.deleteVote(code, v.memberId);
    }
  }
  return NextResponse.json({ memberId: member.id, ...(await snapshot(code, member.id)) });
}
