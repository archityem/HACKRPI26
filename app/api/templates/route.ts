import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled, designInvites } from "@/lib/ai";
import { fallbackTemplates } from "@/lib/template";

const Body = z.object({
  title: z.string().trim().min(1).max(65),
  note: z.string().trim().max(250).default(""),
  hostName: z.string().trim().max(40).default(""),
  vibes: z.array(z.string().max(20)).max(2).default([]),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default("2027-03-01"),
});

// This runs before a trip exists, so there's no member to rate-limit: a short per-client cooldown
// keeps a stuck button or a script from running up Gemini calls.
const COOLDOWN_MS = 3000;
const last = new Map<string, number>();

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const b = parsed.data;

  const who = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  if (now - (last.get(who) ?? 0) < COOLDOWN_MS) return NextResponse.json({ error: "Give it a few seconds before trying again." }, { status: 429 });
  last.set(who, now);
  if (last.size > 500) for (const [k, t] of last) if (now - t > COOLDOWN_MS) last.delete(k);

  const fallback = fallbackTemplates(b.title, b.vibes, b.hostName);
  if (!aiEnabled()) return NextResponse.json({ templates: fallback, source: "fallback" });
  try {
    const designed = await designInvites(b);
    return NextResponse.json({ templates: [...designed, ...fallback].slice(0, 3), source: "gemini" });
  } catch (e) {
    console.error("[ai] designInvites failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ templates: fallback, source: "fallback" });
  }
}
