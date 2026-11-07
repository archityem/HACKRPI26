import { NextResponse } from "next/server";
import { snapshot } from "@/lib/trips";

// AI work runs via after() once the response is sent; give it room to finish (Gemini can take ~20s).
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = new URL(req.url).searchParams.get("me");
  const snap = await snapshot(code, me);
  if (!snap) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(snap);
}
