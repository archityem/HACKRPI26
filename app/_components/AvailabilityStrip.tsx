import { dayDiff, hueVar, range, short, type PublicMember } from "@/lib/client";

/** One bar per person across the host's date window; the band where everyone overlaps is outlined. */
export function AvailabilityStrip({
  members, windowStart, windowEnd, shared, nights,
}: {
  members: PublicMember[];
  windowStart: string;
  windowEnd: string;
  shared: { start: string; end: string } | null;
  nights: number;
}) {
  const days = dayDiff(windowStart, windowEnd) + 1;
  const pos = (a: string, b: string) => ({
    left: `${(dayDiff(windowStart, a) / days) * 100}%`,
    width: `${((dayDiff(a, b) + 1) / days) * 100}%`,
  });
  const sharedStyle = shared ? pos(shared.start, shared.end) : null;
  const sharedDays = shared ? dayDiff(shared.start, shared.end) + 1 : 0;

  return (
    <section className="ew-avail" aria-label="Availability">
      <h3>When everyone’s free</h3>
      <div className="ew-avail-head">
        <span />
        <span className="ends"><span>{short(windowStart)}</span><span>{short(windowEnd)}</span></span>
      </div>
      {members.map((m, i) => (
        <div className="ew-avail-row" key={m.id}>
          <span className="ew-avail-name">
            <span className="ew-avail-dot" style={{ background: hueVar(m, i) }} data-waiting={!m.ready} aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span>
            {m.name}
          </span>
          <div className="ew-avail-track">
            {sharedStyle && <span className="ew-avail-shared" style={sharedStyle} />}
            {m.ready ? (
              <span className="ew-avail-bar" style={{ ...pos(m.start, m.end), background: hueVar(m, i) }} title={`${m.name}: ${range(m.start, m.end)}`} />
            ) : (
              <span className="ew-avail-wait">Not answered</span>
            )}
          </div>
        </div>
      ))}
      <p className="ew-avail-foot">
        {shared ? (
          <><strong>Everyone is free {range(shared.start, shared.end)}.</strong> <span className="ew-muted">{sharedDays} days, enough for {nights} nights.</span></>
        ) : (
          <span className="ew-muted">No shared window of {nights} nights yet. Someone may need to widen their dates.</span>
        )}
      </p>
    </section>
  );
}
