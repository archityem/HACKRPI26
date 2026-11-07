import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { retryAi, snapshot } from "@/lib/trips";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

const Body = z.object({ memberId: z.string() });

// After an AI outage, any ready member can ask for another attempt.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { memberId } = parsed.data;
  const store = await getStore();
  if (!(await store.getTrip(code))) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!(await store.listMembers(code)).some((m) => m.id === memberId && m.ready))
    return NextResponse.json({ error: "Add your details first" }, { status: 403 });
  await retryAi(code);
  return NextResponse.json(await snapshot(code, memberId));
}
