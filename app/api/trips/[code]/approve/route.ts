import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { memberId } = parsed.data;
  const store = await getStore();
  const trip = await store.getTrip(code);
  const members = await store.listMembers(code);
  if (!trip?.proposal) return NextResponse.json({ error: "Nothing to approve yet" }, { status: 400 });
  if (!members.some((m) => m.id === memberId && m.ready))
    return NextResponse.json({ error: "Not a ready member" }, { status: 403 });
  const approvals = [...new Set([...trip.approvals, memberId])];
  // Planning unlocks only when every ready member has approved.
  const everyone = members.filter((m) => m.ready).every((m) => approvals.includes(m.id));
  await store.updateTrip(code, { approvals, phase: everyone ? "planning" : "ideas" });
  return NextResponse.json(await snapshot(code, memberId));
}
