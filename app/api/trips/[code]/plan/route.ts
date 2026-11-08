import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { newId, snapshot } from "@/lib/trips";

const Body = z.object({
  memberId: z.string().min(1),
  add: z.object({ day: z.number().int().min(0).max(40), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), title: z.string().trim().min(1).max(60) }).optional(),
  remove: z.string().optional(), // a plan item id (used by "undo")
});

// Members add their own stops to the itinerary; the AI's draft stays as it was.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.add && !parsed.data.remove)) return NextResponse.json({ error: "Add a title and a time" }, { status: 400 });
  const { add, remove } = parsed.data;
  const store = await getStore();
  const trip = await store.getTrip(code);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const auth = await authenticate(req, code, parsed.data.memberId);
  if (!("member" in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.member.ready) return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  const memberId = auth.member.id;
  let items = trip.planItems ?? [];
  if (remove) items = items.filter((i) => i.id !== remove);
  let addedId: string | undefined;
  if (add) {
    if (items.length >= 100) return NextResponse.json({ error: "That's a lot of plans. Remove one first." }, { status: 400 });
    addedId = newId();
    items = [...items, { id: addedId, addedBy: memberId, ...add }];
  }
  await store.updateTrip(code, { planItems: items });
  return NextResponse.json({ ...(await snapshot(code, memberId)), addedId });
}
