import { ImageResponse } from "next/og";
import { OG_SIZE, TicketCard, ogFonts } from "@/lib/ogCard";

export const alt = "Tripflow: plan a group trip everyone can say yes to";
export const size = OG_SIZE;
export const contentType = "image/png";

// The preview for the home page itself (a trip link gets its own, in app/t/[code]).
export default async function Image() {
  return new ImageResponse(<TicketCard title="Group trips" tone="sage" footer="Pick the place together" />, { ...OG_SIZE, fonts: await ogFonts() });
}
