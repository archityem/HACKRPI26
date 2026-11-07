import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

const Body = z.object({ memberId: z.string(), destinationId: z.string().nullable() });

// Any ready member can propose a destination; passing null reopens exploring.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { memberId, destinationId } = parsed.data;
  const store = await getStore();
  if (!(await store.listMembers(code)).some((m) => m.id === memberId && m.ready))
    return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  if (destinationId) {
    const snap = await snapshot(code, memberId);
    if (!snap?.match.eligible.some((d) => d.id === destinationId))
      return NextResponse.json({ error: "Not a current suggestion" }, { status: 400 });
  }
  await store.updateTrip(code, { proposal: destinationId, approvals: [], phase: "ideas" });
  return NextResponse.json(await snapshot(code, memberId));
}
