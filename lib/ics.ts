// Minimal RFC 5545 calendar file for one all-day trip, so the confirmed plan can go on everyone's calendar.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compact = (d: string) => d.replace(/-/g, "");
const plusDay = (d: string) => new Date(Date.parse(d + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);

/** RFC 5545 lines are limited to 75 octets; continuation lines start with one space. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export interface IcsInput {
  uid: string;
  title: string;
  location: string;
  start: string; // first day, YYYY-MM-DD
  end: string; // last day (departure), YYYY-MM-DD, inclusive
  description: string;
  now?: Date;
}

export function buildIcs(i: IcsInput): string {
  const stamp = (i.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elsewhere//Group trip//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${i.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(i.start)}`,
    `DTEND;VALUE=DATE:${compact(plusDay(i.end))}`, // all-day end dates are exclusive
    `SUMMARY:${esc(i.title)}`,
    `LOCATION:${esc(i.location)}`,
    `DESCRIPTION:${esc(i.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
