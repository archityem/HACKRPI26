import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

const Body = z.object({ memberId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.member.ready) return NextResponse.json({ error: "Not a ready member" }, { status: 403 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip?.proposal) return NextResponse.json({ error: "Nothing to approve yet" }, { status: 400 });
  const readyIds = (await store.listMembers(code)).filter((m) => m.ready).map((m) => m.id);
  // Insert and the unanimous phase decision commit together, and only for this proposal.
  const result = await store.approve(code, auth.member.id, trip.proposal, readyIds);
  if (!result.trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!result.applied) return NextResponse.json({ error: "That plan changed. Take another look." }, { status: 409 });
  return NextResponse.json(await snapshot(code, auth.member.id));
}
