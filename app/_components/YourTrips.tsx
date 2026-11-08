"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listTrips, type RememberedTrip } from "@/lib/client";
import { Card, Meta, Text } from "@/components/ui";
import { cn, col, row } from "@/components/ui/tw";

/** Trips this device has opened. Stored on the device only. */
export function YourTrips() {
  const [trips, setTrips] = useState<RememberedTrip[]>([]);
  useEffect(() => setTrips(listTrips()), []);
  if (!trips.length) return null;
  return (
    <section aria-label="Your trips" className={cn(col, "mt-2")}>
      <Meta className="text-muted">Your trips on this device</Meta>
      {trips.map((t) => (
        <Link key={t.code} href={`/t/${t.code}`} className="no-underline">
          <Card tight><div className={cn(row, "justify-between")}><Text variant="label">{t.title}</Text><Meta className="text-muted">{t.code}</Meta></div></Card>
        </Link>
      ))}
    </section>
  );
}
