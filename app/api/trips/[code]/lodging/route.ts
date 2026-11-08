import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { LODGING } from "@/lib/lodging";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string().min(1), optionId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !LODGING.some((o) => o.id === parsed.data.optionId)) return NextResponse.json({ error: "Pick one of the stays" }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.member.ready) return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  const memberId = auth.member.id;
  await store.updateTrip(code, { lodgingVotes: { ...(trip.lodgingVotes ?? {}), [memberId]: parsed.data.optionId } });
  return NextResponse.json(await snapshot(code, memberId));
}
