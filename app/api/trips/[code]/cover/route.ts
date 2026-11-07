import { NextResponse } from "next/server";
import { parseCover } from "@/lib/cover";
import { getStore } from "@/lib/store";

// The host's invite picture. It's set once when the trip is created, so browsers can cache it.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const trip = await (await getStore()).getTrip(code);
  const cover = trip?.cover ? parseCover(trip.cover) : null;
  if (!cover) return NextResponse.json({ error: "No invite picture" }, { status: 404 });
  return new Response(new Uint8Array(cover.bytes), {
    headers: {
      "content-type": cover.type,
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
