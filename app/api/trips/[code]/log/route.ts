import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({
  memberId: z.string(),
  checks: z.array(z.string().max(40)).max(12).optional(),
  lodgingName: z.string().trim().max(80).optional(),
  lodgingNote: z.string().trim().max(280).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.phase !== "planning") return NextResponse.json({ error: "The log unlocks after everyone approves." }, { status: 400 });
  const members = await store.listMembers(code);
  if (!members.some((m) => m.id === parsed.data.memberId && m.ready))
    return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  const prev = trip.log ?? { checks: [], lodgingName: "", lodgingNote: "", updatedAt: "" };
  await store.updateTrip(code, {
    log: {
      checks: parsed.data.checks ?? prev.checks,
      lodgingName: parsed.data.lodgingName ?? prev.lodgingName,
      lodgingNote: parsed.data.lodgingNote ?? prev.lodgingNote,
      updatedAt: new Date().toISOString(),
    },
  });
  return NextResponse.json(await snapshot(code, parsed.data.memberId));
}
