import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string().min(1), tone: z.enum(["sage", "apricot", "dusk", "lavender", "rose", "butter", "sky"]) });

// The host picks the color of the trip's ticket. Everyone sees it.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick one of the colors" }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (trip.hostMemberId !== auth.member.id) return NextResponse.json({ error: "Only the host can change the ticket" }, { status: 403 });
  await store.updateTrip(code, { tone: parsed.data.tone });
  return NextResponse.json(await snapshot(code, auth.member.id));
}
