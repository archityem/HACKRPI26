import { NextResponse } from "next/server";
import { snapshot } from "@/lib/trips";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = new URL(req.url).searchParams.get("me");
  const snap = await snapshot(code, me);
  if (!snap) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(snap);
}
