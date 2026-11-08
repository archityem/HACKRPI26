"use client";
import type { ReactNode } from "react";
import { Avatar, Button, Card, EmptySeat, Icon, Meta, Text, useCountUp, type Tone } from "../ui";
import { avatars, avatarsGap, bars, barsFill, barsTrack, cn, col, crew, crewText, dayTab, dayTabs, dot, dots, dotsHl, iconBtn, pass, passBody, passStub, pill, pillVerdict, promo, promoIcon, promoSub, promoText, q, qActive, qCheck, qDone, qText, qUpcoming, row, stat, statValue, stub, stubCell, stubGrid, stubLine, stubLineSm, stubSm, stubValue, ticket, ticketName, ticketPattern, toneClass, type, why } from "../ui/tw";
import type { Verdict } from "@/lib/rank";

// ---------- Trip colors ----------
// Every trip gets one color, chosen from its code so the same trip always looks the same.
// Trip colors only (no dusk for the ticket by default: it is the one dark color, used for money).
export const TRIP_TONES: Tone[] = ["sage", "apricot", "lavender", "rose", "butter", "sky", "dusk"];
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
export const tripTone = (code: string, chosen?: Tone): Tone => chosen ?? TRIP_TONES[hash(code) % TRIP_TONES.length];
/** Suggestion rows: a stable color per place, never dusk (that one is for money). */
export const placeTone = (id: string): Tone => (["apricot", "lavender", "butter", "rose", "sky", "sage"] as Tone[])[hash(id) % 6];

// ---------- TripTicket ----------
/** The notched stub line between a ticket's headline and its details. */
export const Stub = ({ small = false }: { small?: boolean }) => (
  <div className={cn(stub, small && stubSm)} aria-hidden="true"><i className={cn(stubLine, small && stubLineSm)} /></div>
);

/**
 * A quiet line drawing in the ticket's corner, chosen by the trip's first vibe.
 * One stroke color (the ticket's own text color), no fills.
 */
const PATTERNS: Record<string, ReactNode> = {
  beach: <><circle cx="150" cy="40" r="22" /><path d="M20 120c20-16 40-16 60 0s40 16 60 0 40-16 60 0" /><path d="M20 146c20-16 40-16 60 0s40 16 60 0 40-16 60 0" /></>,
  food: <><circle cx="110" cy="90" r="58" /><circle cx="110" cy="90" r="36" /><path d="M200 20v50M190 20v22a10 10 0 0 0 20 0V20" /></>,
  nature: <><path d="M10 150l50-90 36 60 24-34 70 64z" /><path d="M96 120l-14 30M120 86l-8 20" /></>,
  nightlife: <><path d="M60 40l6 14 14 6-14 6-6 14-6-14-14-6 14-6zM150 90l5 11 11 5-11 5-5 11-5-11-11-5 11-5zM190 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></>,
  culture: <><path d="M20 60h180M30 60v90M80 60v90M130 60v90M180 60v90M20 150h180M20 40l90-24 90 24" /></>,
  city: <><path d="M10 150V80h40v70M50 150V40h44v110M94 150V70h36v80M130 150V100h40v70M170 150V60h40v90" /><path d="M0 150h220" /></>,
  none: <><circle cx="60" cy="60" r="4" /><circle cx="110" cy="60" r="4" /><circle cx="160" cy="60" r="4" /><circle cx="60" cy="110" r="4" /><circle cx="110" cy="110" r="4" /><circle cx="160" cy="110" r="4" /></>,
};
export function TicketPattern({ vibe }: { vibe?: string }) {
  return (
    <svg className={ticketPattern} viewBox="0 0 220 170" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATTERNS[vibe && PATTERNS[vibe] ? vibe : "none"]}
    </svg>
  );
}

export function TripTicket({ tone, vibe, pattern, children }: { tone: Tone; vibe?: string; pattern?: boolean; children: ReactNode }) {
  return (
    <section data-tone={tone} className={cn(ticket, toneClass[tone])}>
      {pattern && <TicketPattern vibe={vibe} />}
      {children}
    </section>
  );
}

export function StubGrid({ items }: { items: [string, string][] }) {
  return (
    <div className={stubGrid}>
      {items.map(([k, v]) => <div key={k} className={stubCell}><Meta>{k}</Meta><Text variant="numeral-xs" className={stubValue}>{v}</Text></div>)}
    </div>
  );
}

export function AvatarRow({ names, meId, seats = 0, ring, gap }: { names: { id: string; name: string }[]; meId?: string; seats?: number; ring?: string; gap?: boolean }) {
  return (
    <div className={gap ? avatarsGap : avatars}>
      {names.map((m, i) => <Avatar key={m.id} name={m.name} index={i} you={m.id === meId} ring={ring} size={gap ? "md" : undefined} />)}
      {Array.from({ length: seats }, (_, i) => <EmptySeat key={i} />)}
    </div>
  );
}

// ---------- AI verdict ----------
export function AIVerdictPill({ verdict, month, source }: { verdict: Verdict; month?: string; source: "AI" | "Est." }) {
  const text = verdict === "Pricey" ? `Pricey${month ? ` for ${month}` : ""}` : verdict;
  return <span className={cn(pill, pillVerdict)}>{source} · {text}</span>;
}
export const verdictText = (v: Verdict, month?: string) => (v === "Pricey" ? `Pricey${month ? ` for ${month}` : ""}` : v);

// ---------- Survey ----------
export function QuestionCard({ state, tone = "surface", label, value, onEdit, children, number }: {
  state: "done" | "active" | "upcoming"; tone?: Tone; label: string; value?: string; number: string; onEdit?: () => void; children?: ReactNode;
}) {
  if (state === "done") {
    return (
      <div className={cn(q, qDone)}>
        <div className={cn(row, "min-w-0 flex-1 gap-3")}>
          <span className={qCheck}><Icon name="check" size={16} stroke={3} /></span>
          <span className={qText}><Meta>{label}</Meta><span className={cn(type.label, "truncate text-[17px]")}>{value}</span></span>
        </div>
        <Button kind="soft" onClick={onEdit} aria-label={`Edit ${label}`}>Edit</Button>
      </div>
    );
  }
  if (state === "upcoming") {
    return <div className={cn(q, qUpcoming)}><Meta>{number} · {label}</Meta></div>;
  }
  return <div className={cn(q, qActive, toneClass[tone])} data-tone={tone}>{children}</div>;
}

// ---------- Pulse tiles ----------
export function StatTile({ label, value, sub, tone = "surface", size = "sm" }: { label: string; value: string; sub?: string; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "numeral-lg" : size === "md" ? "numeral-md" : "numeral-sm";
  const quiet = tone !== "dusk" && tone !== "sage" && tone !== "lavender";
  return (
    <div className={cn(stat, toneClass[tone])} data-tone={tone}>
      <Meta className={quiet ? "text-muted" : undefined}>{label}</Meta>
      <Text variant={cls} className={statValue}>{value}</Text>
      {sub && <Meta className={quiet ? "text-muted" : undefined}>{sub}</Meta>}
    </div>
  );
}

/** One dot per day of the host's window. Dark = everyone free, gray = some, light = nobody. The best range is circled in sage. */
export function DateDots({ days, best, label }: { days: ("all" | "some" | "none")[]; best?: [number, number] | null; label: string }) {
  const n = days.length || 1;
  return (
    <div className={dots} role="img" aria-label={label}>
      {best && <span className={dotsHl} style={{ left: `${(best[0] / n) * 100}%`, width: `${((best[1] - best[0] + 1) / n) * 100}%` }} />}
      {days.map((d, i) => <span key={i} className={cn(dot, d === "some" && "bg-muted", d === "all" && "bg-ink")} />)}
    </div>
  );
}

export function VibeBars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className={bars}>
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <span className={cn(type.label, "truncate")}>{r.label}</span>
          <span className={barsTrack}><i className={barsFill} style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className={cn(type.meta, "text-right")}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AlertCard({ meta, text, action, onAction }: { meta: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <Card tone="apricot" tight as="div">
      <div className={cn(row, "justify-between")}>
        <span className={cn(col, "gap-0.5")}><Meta>{meta}</Meta><Text variant="label">{text}</Text></span>
        {action && <Button kind="ink" onClick={onAction}>{action}</Button>}
      </div>
    </Card>
  );
}

export function CrewRow({ name, index, you, host, meta, right }: { name: string; index: number; you?: boolean; host?: boolean; meta: string; right?: ReactNode }) {
  return (
    <div className={crew}>
      <Avatar name={name} index={index} you={you} size="md" />
      <span className={crewText}><Text variant="label">{name}{host ? " · host" : ""}</Text><Meta>{meta}</Meta></span>
      {right}
    </div>
  );
}

// ---------- Propose-your-own ----------
export interface Estimate {
  name: string; country: string; emoji: string; perPerson: number; groupTotal: number; flights: number; stay: number; food: number;
  verdict: Verdict; reason: string; over: string[]; travelers: number; origins: string[]; nights: number; start: string;
}

export function EstimateCard({ e, dates, source, month }: { e: Estimate; dates: string; source: "gemini" | "sample"; month?: string }) {
  const per = useCountUp(e.perPerson);
  const total = useCountUp(e.groupTotal);
  return (
    <Card tone="lavender">
      <div className={cn(row, "justify-between")}>
        <Meta>{source === "gemini" ? "AI estimate" : "Sample estimate"}</Meta>
        <AIVerdictPill verdict={e.verdict} month={month} source={source === "gemini" ? "AI" : "Est."} />
      </div>
      <Text variant="display-lg" className={ticketName}>{e.name.toUpperCase()}</Text>
      <Meta>{dates} · {e.nights} nights · from {e.origins.join(" + ")}</Meta>
      <div className={cn(row, "mt-1 items-end justify-between")}>
        <div className={cn(col, "gap-0.5")}><Meta>Per person</Meta><Text variant="numeral-md">${per.toLocaleString("en-US")}</Text></div>
        <div className={cn(col, "items-end gap-0.5")}><Meta>Group of {e.travelers}</Meta><Text variant="numeral-xs">${total.toLocaleString("en-US")} total</Text></div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {([["Flights", e.flights], ["Stay", e.stay], ["Food + fun", e.food]] as const).map(([k, v]) => (
          <div key={k} className={cn(why, "rounded-[14px] px-2.5 py-2")}><Meta>{k}</Meta><Text variant="numeral-xxs">~${v}</Text></div>
        ))}
      </div>
      <span className="text-[14px] leading-[1.35]">
        {e.over.length ? `Over ${e.over.join(" and ")}’s budget. ` : "Fits everyone’s budget. "}{e.reason}
      </span>
    </Card>
  );
}

// ---------- App promo ----------
export function AppPromo({ onGet }: { onGet: () => void }) {
  return (
    <Card className={promo}>
      <span className={promoIcon}><Icon name="phone" size={22} stroke={2.2} /></span>
      <span className={promoText}><Text variant="label">Rather use the app?</Text><span className={promoSub}>Your answers come with you. Still no account.</span></span>
      <Button kind="soft" onClick={onGet}>Get it</Button>
    </Card>
  );
}

// ---------- Plan ----------
export function DecisionCard({ meta, title, sub, onOpen }: { meta: string; title: string; sub: string; onOpen: () => void }) {
  return (
    <Card tone="lavender" as="button" onClick={onOpen} aria-label={`${meta}: ${title}. ${sub}`}>
      <Meta>{meta}</Meta>
      <Text variant="display-sm">{title}</Text>
      <Meta>{sub}</Meta>
    </Card>
  );
}

export function DayTabs({ count, selected, onSelect }: { count: number; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className={dayTabs} role="tablist" aria-label="Days">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" role="tab" className={dayTab} aria-selected={i === selected} aria-label={`Day ${i + 1}`} onClick={() => onSelect(i)}>
          <Text variant="numeral-xs" className="">{String(i + 1).padStart(2, "0")}</Text>
        </button>
      ))}
    </div>
  );
}

export function BoardingPass({ day, time, title, meta, onRemove }: { day: string; time: string; title: string; meta: string; onRemove?: () => void }) {
  return (
    <div className={pass}>
      <div className={cn(passStub, type.meta)}><span>{day}</span><span>{time}</span></div>
      <div className={passBody}><Text variant="label">{title}</Text><Meta>{meta}</Meta></div>
      {onRemove && <button type="button" className={cn(iconBtn, "mr-1.5 self-center bg-paper")} aria-label={`Remove ${title}`} onClick={onRemove}><Icon name="trash" size={18} stroke={2.2} /></button>}
    </div>
  );
}
