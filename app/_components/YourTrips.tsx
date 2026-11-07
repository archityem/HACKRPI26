"use client";
import { useEffect, useState } from "react";
import { listTrips, type RememberedTrip } from "@/lib/client";

export function YourTrips() {
  const [trips, setTrips] = useState<RememberedTrip[]>([]);
  useEffect(() => setTrips(listTrips()), []);
  if (!trips.length) return null;
  return (
    <section aria-label="Your trips" style={{ marginTop: 18 }}>
      <h3>Your trips on this device</h3>
      <div className="ew-trips">
        {trips.map((t) => (
          <a key={t.code} href={`/t/${t.code}`}><strong>{t.title}</strong><span className="ew-small ew-muted">{t.code}</span></a>
        ))}
      </div>
    </section>
  );
}
