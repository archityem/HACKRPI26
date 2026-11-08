import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, hashToken, newToken } from "@/lib/auth";
import { compute } from "@/lib/matching";
import { getStore } from "@/lib/store";
import { background } from "@/lib/background";
import { destinationsFor, ensureCandidates, invalidatesAgreement, newId, pruneVotes, resetAgreement, snapshot } from "@/lib/trips";
import type { Member } from "@/lib/types";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z
  .object({
    memberId: z.string().min(1).optional(), // echoed by the device; ignored unless it matches the credential
    name: z.string().trim().min(1).max(40),
    origin: z.string().trim().toUpperCase().length(3),
    start: date,
    end: date,
    min: z.number().min(0).default(0),
    max: z.number().positive().max(100_000),
    prefs: z.array(z.string()).min(1),
    deals: z.array(z.enum(["nonstop", "domestic", "short", "red-eye"])).default([]),
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
  // No credential and no claimed id: accountless join. A claimed id or a bad credential is not a join.
  let existing: Member | undefined;
  if (req.headers.get("authorization") || b.memberId) {
    const auth = await authenticate(req, code, b.memberId);
    if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
    existing = auth.member;
  }

  // A new traveler gets the lowest unused color; editing keeps the one they have.
  const taken = new Set((await store.listMembers(code)).map((x) => x.hue));
  let hue = 0;
  while (taken.has(hue)) hue++;
  const member: Member = {
    id: existing?.id ?? newId(), tripCode: code, name: b.name, origin: b.origin, start: b.start, end: b.end,
    min: b.min, max: Math.min(b.max, trip.maxBudget), prefs: b.prefs, deals: b.deals, ready: true, hue: existing?.hue ?? hue,
  };
  const changed = invalidatesAgreement(existing, member);
  await store.upsertMember(member);
  let token: string | undefined;
  if (!existing) {
    token = newToken();
    await store.putCredential(code, member.id, hashToken(token));
  }

  // A new person or a real constraint change drops the agreement and releases locks.
  // Saving the same answers again (a rename included) leaves the approved plan and locked rankings alone.
  if (changed) {
    await resetAgreement(trip);
    background(() => ensureCandidates(code));
  }
  const members = await store.listMembers(code);
  const fresh = (await store.getTrip(code)) ?? trip;
  const { destinations, source } = destinationsFor(fresh, members);
  if (source !== "pending") {
    const eligible = new Set(compute(fresh, members, destinations).eligible.map((d) => d.id));
    await pruneVotes(code, eligible, changed);
  }
  return NextResponse.json({ memberId: member.id, ...(token ? { token } : {}), ...(await snapshot(code, member.id)) });
}
