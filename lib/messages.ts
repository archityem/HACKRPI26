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

export function itineraryText(i: { destination: string; start: string; end: string; itinerary: Itinerary }) {
  const lines = [`${i.destination}, ${day(i.start)} to ${day(i.end)}`, "", i.itinerary.summary, ""];
  i.itinerary.days.forEach((d, n) => {
    lines.push(`Day ${n + 1} (${day(d.date)}): ${d.title}`, `- Morning: ${d.morning}`, `- Afternoon: ${d.afternoon}`, `- Evening: ${d.evening}`, "");
  });
  if (i.itinerary.tips.length) lines.push("Good to know:", ...i.itinerary.tips.map((t) => `- ${t}`));
  return lines.join("\n").trim();
}
