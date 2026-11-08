import type { Itinerary } from "./types";

// Plain-text messages meant to be pasted into a group chat. No emoji, no hype; just what someone needs to act.

const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function inviteMessage(i: { title: string; windowStart: string; windowEnd: string; nights: number; maxBudget: number; link: string }) {
  return [
    `${i.title}`,
    `${i.nights} nights sometime ${day(i.windowStart)} to ${day(i.windowEnd)}, up to ${money(i.maxBudget)} each.`,
    `Add your airport, dates, and budget (about a minute) and it finds places that work for all of us:`,
    i.link,
  ].join("\n");
}

export function nudgeMessage(i: { title: string; names: string[]; link: string }) {
  const who = i.names.length > 2 ? `${i.names.slice(0, -1).join(", ")}, and ${i.names.at(-1)}` : i.names.join(" and ");
  return [
    `${who}: we still need your dates, airport, and budget for ${i.title}.`,
    `It takes about a minute, and the destination ideas get better with each person who answers:`,
    i.link,
  ].join("\n");
}

const nightsWord = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;
const daysWord = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export interface DateAskCopy {
  memberId: string;
  name: string;
  edge: "earlier" | "later";
  to: string;
  days: number;
}

export function dateUnlockHeadline(u: {
  have: number;
  need: number;
  shortfall: number;
  windowTooShort: boolean;
  windowNights: number;
}): string {
  if (u.windowTooShort) return `The host dates only cover ${nightsWord(u.windowNights)}. This trip needs ${nightsWord(u.need)}.`;
  if (u.have <= 0) return `No shared nights yet. A ${u.need}-night trip needs ${daysWord(u.shortfall)} of movement.`;
  const overlap = u.have === 1 ? "1 night overlaps" : `${u.have} nights overlap`;
  const more = u.shortfall === 1 ? "1 more night" : `${u.shortfall} more nights`;
  return `${overlap} so far. ${more} would fit this ${u.need}-night trip.`;
}

export function dateAskLine(a: DateAskCopy, meId?: string): string {
  const you = meId != null && a.memberId === meId;
  const when = a.edge === "later" ? `be free through ${day(a.to)}` : `start on ${day(a.to)}`;
  return `${you ? "You" : a.name} could ${when} (${daysWord(a.days)} ${a.edge}).`;
}

/** One sentence for the form that is collecting this person's dates. Prefers a change they can make themselves. */
export function dateUnlockHint(
  u: {
    have: number;
    need: number;
    shortfall: number;
    windowTooShort: boolean;
    windowNights: number;
    asks: DateAskCopy[];
  },
  meId?: string,
): string {
  if (u.windowTooShort) return dateUnlockHeadline(u);
  const ask = (meId ? u.asks.find((a) => a.memberId === meId) : undefined) ?? u.asks[0];
  if (!ask) return `${dateUnlockHeadline(u)} One person changing their dates isn’t enough.`;
  return `${dateAskLine(ask, meId).replace(/\.$/, "")}, and a ${u.need}-night trip fits.`;
}

export function dateAskMessage(i: {
  title: string;
  nights: number;
  shortfall: number;
  windowTooShort: boolean;
  asks: { name: string; edge: "earlier" | "later"; to: string }[];
  link: string;
}): string {
  const lines = [i.nights === 1
    ? `${i.title}: we still need 1 night that works for everyone.`
    : `${i.title}: we still need ${i.nights} nights that work for everyone.`];
  if (i.windowTooShort) lines.push("The host dates aren’t long enough for that.");
  else if (i.asks.length) {
    const bits = i.asks.slice(0, 3).map((a) =>
      a.edge === "later" ? `${a.name} staying through ${day(a.to)}` : `${a.name} starting ${day(a.to)}`,
    );
    lines.push(`One change that would do it: ${bits.join(", or ")}.`);
  } else lines.push(`We’re ${daysWord(i.shortfall)} short, and one person moving their dates isn’t enough.`);
  lines.push(i.link);
  return lines.join("\n");
}

export function itineraryText(i: { destination: string; start: string; end: string; itinerary: Itinerary }) {
  const lines = [`${i.destination}, ${day(i.start)} to ${day(i.end)}`, "", i.itinerary.summary, ""];
  i.itinerary.days.forEach((d, n) => {
    lines.push(`Day ${n + 1} (${day(d.date)}): ${d.title}`, `- Morning: ${d.morning}`, `- Afternoon: ${d.afternoon}`, `- Evening: ${d.evening}`, "");
  });
  if (i.itinerary.tips.length) lines.push("Good to know:", ...i.itinerary.tips.map((t) => `- ${t}`));
  return lines.join("\n").trim();
}
