import { NextResponse } from "next/server";
import { z } from "zod";
import { groupOrder } from "@/lib/rank";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

const Body = z.object({ memberId: z.string(), ranking: z.array(z.string().min(1)).min(1).max(30), locked: z.boolean().default(false) });

// Save a member's full order. "Locked" means they're done; when every ready member has locked, the
// group's #1 becomes the proposal automatically (members then approve it on the plan screen).
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { memberId, locked } = parsed.data;
  const store = await getStore();
  const members = await store.listMembers(code);
  if (!members.some((m) => m.id === memberId && m.ready))
    return NextResponse.json({ error: "Add your details before ranking" }, { status: 403 });
  const snap = await snapshot(code, memberId);
  if (!snap) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (snap.trip.phase === "planning") return NextResponse.json({ error: "The trip is already locked" }, { status: 409 });
  const ids = snap.match.eligible.map((d) => d.id);
  const ranking = [...new Set(parsed.data.ranking)].filter((id) => ids.includes(id));
  if (!ranking.length) return NextResponse.json({ error: "Not current suggestions" }, { status: 400 });
  await store.setVote({ tripCode: code, memberId, destinationId: ranking[0], ranking, locked });

  const votes = await store.listVotes(code);
  const ready = members.filter((m) => m.ready).map((m) => m.id);
  const everyone = ready.every((id) => votes.find((v) => v.memberId === id)?.locked);
  if (everyone) {
    const top = groupOrder(votes, ids, ready)[0].id;
    await store.updateTrip(code, { proposal: top, approvals: snap.trip.proposal === top ? snap.trip.approvals : [], phase: "ideas" });
  } else if (!locked && snap.trip.proposal) {
    await store.updateTrip(code, { proposal: null, approvals: [], phase: "ideas" }); // someone took their lock back
  }
  return NextResponse.json(await snapshot(code, memberId));
}
