import { NextResponse } from "next/server";
import { z } from "zod";
import { LODGING } from "@/lib/lodging";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string(), optionId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !LODGING.some((o) => o.id === parsed.data.optionId)) return NextResponse.json({ error: "Pick one of the stays" }, { status: 400 });
  const { memberId, optionId } = parsed.data;
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!(await store.listMembers(code)).some((m) => m.id === memberId && m.ready)) return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  await store.updateTrip(code, { lodgingVotes: { ...(trip.lodgingVotes ?? {}), [memberId]: optionId } });
  return NextResponse.json(await snapshot(code, memberId));
}
