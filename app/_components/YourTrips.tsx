"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listTrips, type RememberedTrip } from "@/lib/client";
import { Card, Meta } from "@/components/ui";

/** Trips this device has opened. Stored on the device only. */
export function YourTrips() {
  const [trips, setTrips] = useState<RememberedTrip[]>([]);
  useEffect(() => setTrips(listTrips()), []);
  if (!trips.length) return null;
  return (
    <section aria-label="Your trips" className="col" style={{ marginTop: 8 }}>
      <Meta className="muted">Your trips on this device</Meta>
      {trips.map((t) => (
        <Link key={t.code} href={`/t/${t.code}`} style={{ textDecoration: "none" }}>
          <Card tight><div className="row row--between"><span className="t-label">{t.title}</span><Meta className="muted">{t.code}</Meta></div></Card>
        </Link>
      ))}
    </section>
  );
}
