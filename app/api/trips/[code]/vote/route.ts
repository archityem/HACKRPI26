import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string(), destinationId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { memberId, destinationId } = parsed.data;
  const store = await getStore();
  const members = await store.listMembers(code);
  if (!members.some((m) => m.id === memberId && m.ready))
    return NextResponse.json({ error: "Add your details before voting" }, { status: 403 });
  const snap = await snapshot(code, memberId);
  if (!snap?.match.eligible.some((d) => d.id === destinationId))
    return NextResponse.json({ error: "Not a current suggestion" }, { status: 400 });
  await store.setVote({ tripCode: code, memberId, destinationId });
  return NextResponse.json(await snapshot(code, memberId));
}
