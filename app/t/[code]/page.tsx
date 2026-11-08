import type { Metadata } from "next";
import TripApp from "@/app/_components/TripApp";
import { getStore } from "@/lib/store";

type Params = { params: Promise<{ code: string }> };

// What a message app shows under the link. The picture comes from ./opengraph-image.tsx (the invite ticket).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  try {
    const store = await getStore();
    const trip = await store.getTrip(code);
    if (!trip) return {};
    const host = (await store.listMembers(code)).find((m) => m.id === trip.hostMemberId)?.name;
    const title = host ? `${host} invited you: ${trip.title}` : trip.title;
    const description = `Where should we go? Add your dates, budget and airport in about 30 seconds. No app or account needed.`;
    return { title, description, openGraph: { title, description, type: "website", siteName: "Tripflow" }, twitter: { card: "summary_large_image", title, description } };
  } catch {
    return {}; // storage unreachable: the page itself still works with the site-wide tags
  }
}

export default async function TripPage({ params }: Params) {
  const { code } = await params;
  return <TripApp code={code} />;
}
