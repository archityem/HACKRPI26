"use client";
import { dayDiff, hueVar, range, short, type PublicMember } from "@/lib/client";
import { dateUnlock, type DateUnlock } from "@/lib/matching";
import { dateAskLine, dateAskMessage, dateUnlockHeadline } from "@/lib/messages";

/** One bar per person across the host's date window; the band where everyone overlaps is outlined. */
export function AvailabilityStrip({
  members, windowStart, windowEnd, shared, nights, meId, title, link, onCopy,
}: {
  members: PublicMember[];
  windowStart: string;
  windowEnd: string;
  shared: { start: string; end: string } | null;
  nights: number;
  meId?: string;
  title?: string;
  link?: string;
  onCopy?: (text: string) => void;
}) {
  const days = dayDiff(windowStart, windowEnd) + 1;
  const pos = (a: string, b: string) => ({
    left: `${(dayDiff(windowStart, a) / days) * 100}%`,
    width: `${((dayDiff(a, b) + 1) / days) * 100}%`,
  });
  const sharedStyle = shared ? pos(shared.start, shared.end) : null;
  const sharedDays = shared ? dayDiff(shared.start, shared.end) + 1 : 0;
  const unlock = shared ? null : dateUnlock(
    { windowStart, windowEnd, nights },
    members.filter((m) => m.ready).map((m) => ({ id: m.id, name: m.name, start: m.start, end: m.end })),
  );

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
      <div className="ew-avail-foot">
        {shared ? (
          <p><strong>Everyone is free {range(shared.start, shared.end)}.</strong> <span className="ew-muted">{sharedDays} days, enough for {nights} nights.</span></p>
        ) : unlock ? (
          <DateGap unlock={unlock} meId={meId} title={title} link={link} onCopy={onCopy} />
        ) : (
          <p className="ew-muted">No shared window of {nights} nights yet. Someone may need to widen their dates.</p>
        )}
      </div>
    </section>
  );
}

/** The specific calendar move that would let this trip happen. Dates are not changed from here. */
export function DateGap({
  unlock, meId, title, link, onCopy,
}: {
  unlock: DateUnlock;
  meId?: string;
  title?: string;
  link?: string;
  onCopy?: (text: string) => void;
}) {
  const lines = unlock.windowTooShort ? [] : unlock.asks.slice(0, 3);
  return (
    <div className="ew-gap">
      <p><strong>{dateUnlockHeadline(unlock)}</strong></p>
      {lines.length > 0 && (
        <ul>
          {lines.map((a) => <li key={`${a.memberId}-${a.edge}`}>{dateAskLine(a, meId)}</li>)}
        </ul>
      )}
      {!unlock.windowTooShort && unlock.asks.length === 0 && (
        <p>One person changing their dates isn’t enough. The windows pull apart inside the host dates.</p>
      )}
      {onCopy && title && link && (
        <div>
          <button type="button" className="ew-link" onClick={() => onCopy(dateAskMessage({
            title, nights: unlock.need, shortfall: unlock.shortfall, windowTooShort: unlock.windowTooShort, asks: unlock.asks, link,
          }))}>Copy a date note</button>
        </div>
      )}
    </div>
  );
}
