import { ImageResponse } from "next/og";
import { getStore } from "@/lib/store";
import { OG_SIZE, TicketCard, ogFonts } from "@/lib/ogCard";
import { tripToneFor } from "@/lib/tone";

export const alt = "Your invite to a Tripflow trip";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic"; // reflects the host's ticket color and the trip's current details

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function windowLabel(a: string, b: string) {
  const [am, ad, bm, bd] = [Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10))];
  return am === bm ? `${MONTHS[am]} ${ad}–${bd}` : `${MONTHS[am]} ${ad}–${MONTHS[bm]} ${bd}`;
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let card: Parameters<typeof TicketCard>[0] = { title: "Plan a trip together", tone: tripToneFor(code), footer: "No app · no account" };
  try {
    const store = await getStore();
    const trip = await store.getTrip(code);
    if (trip) {
      const host = (await store.listMembers(code)).find((m) => m.id === trip.hostMemberId);
      card = {
        title: trip.title, host: host?.name, tone: tripToneFor(code, trip.tone),
        window: windowLabel(trip.windowStart, trip.windowEnd), length: `${trip.nights} NIGHTS`, budget: `$${trip.maxBudget.toLocaleString("en-US")} / PP`,
        footer: "Answer in 30 sec · no account",
      };
    }
  } catch {
    /* storage unreachable: fall back to the generic ticket rather than a broken preview */
  }
  return new ImageResponse(<TicketCard {...card} />, { ...OG_SIZE, fonts: await ogFonts() });
}
