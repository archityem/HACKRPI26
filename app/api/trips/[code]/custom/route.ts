import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string().min(1) });

// "Add to the ranking": move the member's priced draft onto the shortlist. Everyone's lock is released
// so the new place gets a fair look from the whole group.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.member.ready) return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  const memberId = auth.member.id;
  if (trip.phase === "planning") return NextResponse.json({ error: "The trip is already locked" }, { status: 409 });
  const draft = trip.drafts?.[memberId];
  if (!draft) return NextResponse.json({ error: "Price a place first" }, { status: 400 });
  const before = await snapshot(code, memberId);
  if (before?.match.eligible.some((d) => d.id === draft.id)) return NextResponse.json({ error: "That place is already on the list" }, { status: 409 });
  const drafts = { ...(trip.drafts ?? {}) };
  delete drafts[memberId];
  await store.updateTrip(code, { custom: [...(trip.custom ?? []).filter((d) => d.id !== draft.id), draft], drafts, proposal: null, approvals: [], phase: "ideas" });
  for (const v of await store.listVotes(code)) if (v.locked) await store.setVote({ ...v, locked: false });
  return NextResponse.json(await snapshot(code, memberId));
}
