import { NextResponse } from "next/server";
import { hashToken, readToken } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { snapshot } from "@/lib/trips";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // Budgets follow the private credential. ?me= is a public id and is not consulted.
  const token = readToken(req);
  const member = token ? await (await getStore()).memberByToken(code, hashToken(token)) : null;
  const snap = await snapshot(code, member?.id ?? null);
  if (!snap) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(snap);
}
