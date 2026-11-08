"use client";
import { useEffect, useRef, useState } from "react";
import { api, money, short, type Snapshot } from "@/lib/client";
import { buildIcs } from "@/lib/ics";
import { LODGING } from "@/lib/lodging";
import { itineraryText } from "@/lib/messages";
import { placeTone, AlertCard, AvatarRow, BoardingPass, DayTabs, DecisionCard, StatTile, Stub, TripTicket } from "@/components/trip";
import { Button, Card, Confetti, Field, Icon, IconButton, LinkButton, Meta, Sheet, Text, useToast } from "@/components/ui";
import { clock, mmdd, shareOrCopy, tripLink, weekday, type Ctx } from "./common";

const DAY = 86_400_000;
const addDay = (d: string, n: number) => new Date(new Date(d + "T12:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);
const SLOTS: [keyof { morning: 1; afternoon: 1; evening: 1 }, string, string][] = [["morning", "09:00", "Morning"], ["afternoon", "13:00", "Afternoon"], ["evening", "19:00", "Evening"]];
const CHECKS: [string, string][] = [["flights", "Compare flights"], ["stay", "Lock a stay"], ["days", "Leave room to wander"]];

// ---------------------------------------------------------------- 08 · Trip plan
export function PlanScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const m = snap.match;
  const toast = useToast();
  const d = m.eligible.find((x) => x.id === t.proposal);
  const ready = snap.members.filter((x) => x.ready);
  const planning = t.phase === "planning";
  const [day, setDay] = useState(0);
  const [stay, setStay] = useState(false);
  const [add, setAdd] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const [burst, setBurst] = useState(false);
  const was = useRef(planning);

  // One confetti burst, only when the trip locks while you're watching.
  useEffect(() => {
    if (planning && !was.current) { setBurst(true); const x = setTimeout(() => setBurst(false), 1400); return () => clearTimeout(x); }
    was.current = planning;
  }, [planning]);

  const reconsider = async () => {
    if (await ctx.run(() => api(`/api/trips/${ctx.code}/proposal`, { memberId: me!.id, destinationId: null }))) ctx.go("rank");
  };

  if (!d || !m.start || !m.tripEnd) {
    return (
      <>
        <div className="topbar">
          <IconButton icon="back" label="Back to ranking" onClick={() => ctx.go("rank")} />
          <Meta>Trip plan</Meta>
          <span className="iconbtn--spacer" />
        </div>
        <div className="titleblock"><Text as="h1" variant="display-lg">no pick yet</Text><Meta>The top-ranked place lands here</Meta></div>
        <Card>
          <span className="t-label">Rank first, then it’s happening.</span>
          <span className="t-body-md muted">When everyone locks in their ranking, the group’s #1 becomes the plan. The host can also close the ranking early.</span>
        </Card>
        <div className="cta"><Button kind="primary" onClick={() => ctx.go("rank")}>Back to ranking<Icon name="arrow" /></Button></div>
      </>
    );
  }

  const tone = placeTone(d.id);
  const mine = me ? d.perMember[me.id] : undefined;
  const approvals = t.approvals;
  const iAmIn = !!me && approvals.includes(me.id);
  const nightsCount = t.nights + 1;
  const date = addDay(m.start, day);
  const lodgingVotes = t.lodgingVotes ?? {};
  const votedCount = ready.filter((x) => lodgingVotes[x.id]).length;
  const tally = LODGING.map((o) => ({ ...o, n: Object.values(lodgingVotes).filter((v) => v === o.id).length }));
  const leader = [...tally].sort((a, b) => b.n - a.n)[0];
  const it = t.itinerary && t.itinerary.destinationId === d.id ? t.itinerary : null;
  const aiDay = it?.days[day];

  type Row = { id: string; time: string; title: string; meta: string; mine?: boolean };
  const rows: Row[] = [
    ...(aiDay ? SLOTS.map(([k, time, label]) => ({ id: `ai-${k}`, time, title: aiDay[k], meta: `${label} · AI draft` })) : []),
    ...(t.planItems ?? []).filter((p) => p.day === day).map((p) => ({
      id: p.id, time: p.time, title: p.title, meta: `Added by ${snap.members.find((x) => x.id === p.addedBy)?.name ?? "a friend"}`, mine: p.addedBy === me?.id,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  async function approve() { if (me) await ctx.run(() => api(`/api/trips/${ctx.code}/approve`, { memberId: me.id }), "You’re in."); }
  async function vote(optionId: string) {
    if (me && (await ctx.run(() => api(`/api/trips/${ctx.code}/lodging`, { memberId: me.id, optionId })))) toast("Stay vote saved.");
  }
  async function removeItem(id: string, title: string, time: string) {
    if (!me) return;
    if (await ctx.run(() => api(`/api/trips/${ctx.code}/plan`, { memberId: me.id, remove: id })))
      toast("Removed.", { undo: () => void ctx.run(() => api(`/api/trips/${ctx.code}/plan`, { memberId: me.id, add: { day, time, title } })) });
  }
  async function share() {
    const r = await shareOrCopy(`${planning ? "It’s happening" : "Leading the vote"}: ${d!.name}, ${short(m.start!)} – ${short(m.tripEnd!)}.`, tripLink(ctx.code));
    if (r === "copied") toast("Link copied.");
  }

  async function copyItinerary() {
    if (!it) return;
    const r = await shareOrCopy(itineraryText({ destination: d!.name, start: m.start!, end: m.tripEnd!, itinerary: it }));
    if (r === "copied") toast("Itinerary copied.");
  }
  function addToCalendar() {
    const ics = buildIcs({
      uid: `${ctx.code}@elsewhere`, title: `${d!.name} trip`, location: `${d!.name}, ${d!.country}`,
      start: m.start!, end: m.tripEnd!, description: `${t.title}. ${it?.summary ?? ""} ${tripLink(ctx.code)}`.trim(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d!.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-trip.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const retry = () => ctx.run(() => api(`/api/trips/${ctx.code}/retry`, { memberId: me!.id }), "Trying again.");

  // Add-to-plan form
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("12:00");
  const [formErr, setFormErr] = useState("");
  async function submitItem() {
    if (!me) return;
    if (!title.trim()) return setFormErr("Name the stop first.");
    const ok = await ctx.run(() => api<Snapshot>(`/api/trips/${ctx.code}/plan`, { memberId: me.id, add: { day, time, title: title.trim() } }), `Added to day ${day + 1}.`);
    if (ok) { setAdd(false); setTitle(""); setFormErr(""); } else setFormErr("Couldn’t add that. Try again.");
  }

  return (
    <>
      <div className="topbar">
        <IconButton icon="back" label="Back to ranking" onClick={() => ctx.go("rank")} />
        <Meta>Trip plan</Meta>
        <IconButton icon="share" label="Share the plan" onClick={share} />
      </div>

      <TripTicket tone={tone}>
        <div className="ticket__top">
          <Meta>{t.title}</Meta>
          {planning
            ? <span className="pill pill--locked stamp"><Icon name="lock" size={12} stroke={3} />Locked · {ready.length} going</span>
            : <span className="pill pill--pending">{approvals.length} of {ready.length} in</span>}
        </div>
        <Text variant="display-ticket" className="ticket__name">{d.name.toUpperCase()}</Text>
        <Text variant="numeral-sm">{mmdd(m.start)} → {mmdd(m.tripEnd)}</Text>
        <Stub />
        <div className="row row--between">
          <AvatarRow ring={`var(--${tone})`} names={ready.map((x) => ({ id: x.id, name: x.name }))} meId={me?.id} />
          <Meta>{t.nights} nights</Meta>
        </div>
      </TripTicket>
      {burst && <Confetti />}

      {!planning && <AlertCard meta="Almost there" text={ready.length === approvals.length ? "Everyone’s in." : `${ready.length - approvals.length} still to say yes`} />}

      <div className="grid2">
        <DecisionCard meta="Lodging · vote" title={leader && leader.n ? leader.name : `${LODGING.length} stays`} sub={`${votedCount} of ${ready.length} voted`} onOpen={() => setStay(true)} />
        <StatTile tone="dusk" label="Est. per person" value={mine ? money(mine.total) : money(m.readyCount ? d.groupTotal / m.readyCount : 0)} sub="Flights + stay" size="md" />
      </div>

      <div className="col" style={{ marginTop: 2 }}>
        <Meta className="muted">Rough itinerary</Meta>
        <DayTabs count={nightsCount} selected={day} onSelect={setDay} />
      </div>

      {rows.length === 0 && (
        <Card>
          {snap.ai.itinerary === "generating" && !it
            ? <><span className="t-label">Writing your itinerary…</span><span className="t-body-md muted">This usually takes 10–20 seconds, and this page updates by itself.</span></>
            : <><span className="t-label">Nothing planned for {weekday(date)} yet.</span><span className="t-body-md muted">{snap.ai.itinerary === "off" ? "Add your own stops, or turn on the AI key for a drafted itinerary." : snap.ai.itinerary === "failed" ? "The AI service is overloaded. Your plan is safe, and you can add your own stops." : "Add a stop to get it started."}</span>{snap.ai.itinerary === "failed" && me && <Button kind="soft" onClick={retry}>Try again</Button>}</>}
        </Card>
      )}
      {rows.map((r) => (
        <BoardingPass key={r.id} day={weekday(date)} time={clock(r.time)} title={r.title} meta={r.meta} onRemove={r.mine ? () => removeItem(r.id, r.title, r.time) : undefined} />
      ))}

      {it && it.tips.length > 0 && (
        <Card>
          <Meta className="muted">Good to know</Meta>
          <span className="t-body-md">{it.tips.join(" · ")}</span>
          <Meta className="muted">AI drafted · check hours and prices · nothing is booked</Meta>
        </Card>
      )}

      {planning && (
        <Card>
          <Meta className="muted">Take it with you</Meta>
          <div className="chips">
            <Button kind="soft" onClick={addToCalendar}>Add to calendar</Button>
            {it && snap.ai.itinerary === "ready" && <Button kind="soft" onClick={copyItinerary}>Copy itinerary</Button>}
          </div>
        </Card>
      )}

      {planning && (
        <Card>
          <Meta className="muted">Next up · on this device</Meta>
          <div className="chips">{CHECKS.map(([id, label]) => (
            <button key={id} type="button" className="chip" aria-pressed={checks.includes(id)} onClick={() => setChecks(checks.includes(id) ? checks.filter((c) => c !== id) : [...checks, id])}>
              {checks.includes(id) && <Icon name="check" size={16} stroke={3} />}{label}
            </button>
          ))}</div>
        </Card>
      )}

      <div className="center" style={{ marginTop: 4 }}><LinkButton onClick={reconsider}>Back to ranking</LinkButton></div>

      <div className="cta">
        {planning ? (
          <Button kind="primary" icon="plus" onClick={() => setAdd(true)}>Add to the plan</Button>
        ) : iAmIn ? (
          <Button kind="primary" disabled>You’re in · waiting on {ready.length - approvals.length}</Button>
        ) : (
          <Button kind="primary" onClick={approve}>I’m in<Icon name="arrow" /></Button>
        )}
      </div>

      <Sheet open={stay} onClose={() => setStay(false)} label="Where should we stay?">
        <div className="sheet__head"><Text as="h2" variant="display-md">where do we stay?</Text><p>Pick one. The most votes wins. Prices are per person, per night.</p></div>
        {tally.map((o) => (
          <button key={o.id} type="button" className="optrow" aria-pressed={me ? lodgingVotes[me.id] === o.id : false} onClick={() => vote(o.id)}>
            <span className="optrow__text"><span className="t-label">{o.name}</span><Meta>{o.note}</Meta></span>
            <span className="col" style={{ alignItems: "flex-end", gap: 2 }}><Text variant="numeral-xxs" className="">~{money(d.night * o.mult)}</Text><Meta>{o.n} {o.n === 1 ? "vote" : "votes"}</Meta></span>
          </button>
        ))}
        <Button kind="primary" onClick={() => setStay(false)}>Done</Button>
      </Sheet>

      <Sheet open={add} onClose={() => setAdd(false)} label="Add to the plan">
        <div className="sheet__head"><Text as="h2" variant="display-md">add to day {day + 1}</Text><p>{weekday(date)}, {short(date)}. Everyone sees it.</p></div>
        <Field label="What’s the stop?"><input value={title} maxLength={60} autoFocus placeholder="Dinner in the old town" onChange={(e) => { setTitle(e.target.value); setFormErr(""); }} /></Field>
        <Field label="Around what time?"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <div className="err" role="alert">{formErr}</div>
        <Button kind="primary" onClick={submitItem}>Add to the plan</Button>
      </Sheet>
    </>
  );
}
