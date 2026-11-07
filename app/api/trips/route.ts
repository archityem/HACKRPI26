import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCover } from "@/lib/cover";
import { getStore } from "@/lib/store";
import { sanitizeTemplate } from "@/lib/template";
import { newCode, newId } from "@/lib/trips";
import type { Member, Trip } from "@/lib/types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z
  .object({
    hostName: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(65),
    note: z.string().trim().max(250).default(""),
    theme: z.enum(["pink", "pool", "golden"]).default("pink"),
    template: z.unknown().optional(), // sanitized below; never stored as sent
    cover: z
      .string()
      .refine((s) => parseCover(s) !== null, { message: "Invite picture must be a JPEG, PNG or WebP under 600 KB" })
      .optional(),
    windowStart: date,
    windowEnd: date,
    nights: z.number().int().min(1).max(30),
    maxBudget: z.number().positive().max(100_000),
    vibes: z.array(z.string()).max(2).default([]),
  })
  .refine((b) => b.windowEnd >= b.windowStart, { message: "windowEnd must be on/after windowStart" });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const code = newCode();
  const memberId = newId();
  const template = b.template == null ? null : sanitizeTemplate(b.template, b.theme);
  if (b.template != null && !template) return NextResponse.json({ error: "Invalid invite design" }, { status: 400 });
  const trip: Trip = {
    code,
    hostMemberId: memberId,
    title: b.title,
    note: b.note,
    theme: b.theme,
    ...(template ? { template } : {}),
    ...(b.cover ? { cover: b.cover } : {}),
    windowStart: b.windowStart,
    windowEnd: b.windowEnd,
    nights: b.nights,
    maxBudget: b.maxBudget,
    vibes: b.vibes,
    phase: "collecting",
    proposal: null,
    approvals: [],
    createdAt: new Date().toISOString(),
  };
  // Host starts as a member who still has to answer the individual questions.
  const host: Member = {
    id: memberId, tripCode: code, name: b.hostName, origin: "", start: b.windowStart, end: b.windowEnd,
    min: 0, max: b.maxBudget, prefs: b.vibes, deals: [], ready: false, hue: 0,
  };
  await (await getStore()).createTrip(trip, host);
  return NextResponse.json({ code, memberId }, { status: 201 });
}
