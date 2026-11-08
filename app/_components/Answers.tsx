"use client";
import { useState } from "react";
import { PREFS, airportsFor, api, dayDiff, money, range, type Snapshot } from "@/lib/client";
import type { Deal } from "@/lib/types";
import { QuestionCard, tripTone } from "@/components/trip";
import { Button, Chip, Field, Icon, Meta, Progress, Text, useToast } from "@/components/ui";
import { EditableAmount } from "./EditableAmount";
import { InstallSheet } from "./Invite";
import { prefShort, useInstall, windowLabel, type Ctx } from "./common";

const STEPS = [
  { key: "airport", label: "Home airport" },
  { key: "budget", label: "Your max budget" },
  { key: "dates", label: "Dates you can do" },
  { key: "passport", label: "Passport good to go?" },
  { key: "vibe", label: "Your vibe" },
] as const;
const HARD_NOS: [Deal, string][] = [["nonstop", "Nonstop only"], ["short", "Under 5 hrs"], ["red-eye", "No red-eyes"]];

export function AnswersScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const toast = useToast();
  const { install, help, closeHelp } = useInstall();
  const airports = airportsFor(snap.ai.enabled);
  const cap = t.maxBudget;
  const last = STEPS.length - 1;

  const [d, setD] = useState(() => ({
    name: me?.name ?? "",
    origin: me?.origin && airports[me.origin] ? me.origin : "BOS",
    max: Math.min(me?.ready ? (me.max ?? cap) : Math.round((cap * 0.7) / 25) * 25, cap),
    start: me?.ready ? me.start : t.windowStart,
    end: me?.ready ? me.end : t.windowEnd,
    passport: !(me?.deals ?? []).includes("domestic"),
    deals: (me?.deals ?? []).filter((x) => x !== "domestic") as Deal[],
    prefs: me?.prefs?.length ? me.prefs : [...t.vibes],
  }));
  const [step, setStep] = useState(me?.ready ? last : 0);
  const [reached, setReached] = useState(me?.ready ? last : 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<typeof d>) => { setD((x) => ({ ...x, ...p })); setError(""); };

  function validate(i: number): string {
    if (i === 0 && !d.name.trim()) return "What should we call you?";
    if (i === 1 && !(d.max > 0)) return "Set a maximum above $0.";
    if (i === 1 && d.max > cap) return `The host set a ceiling of ${money(cap)} per person.`;
    if (i === 2) {
      if (!d.start || !d.end) return "Choose both dates.";
      if (d.start < t.windowStart || d.end > t.windowEnd) return `This trip is for ${range(t.windowStart, t.windowEnd)}.`;
      if (d.end < d.start) return "Your return date should be after your start date.";
      if (dayDiff(d.start, d.end) < t.nights) return `Choose a window with room for at least ${t.nights} nights.`;
    }
    if (i === 4 && !d.prefs.length) return "Pick at least one thing you’d enjoy.";
    return "";
  }

  async function save() {
    setSaving(true);
    try {
      const deals: Deal[] = [...d.deals, ...(d.passport ? [] : (["domestic"] as Deal[]))];
      const res = await api<Snapshot & { memberId: string; token?: string }>(`/api/trips/${ctx.code}/members`, {
        memberId: me?.id, name: d.name.trim(), origin: d.origin, start: d.start, end: d.end, min: 0, max: d.max, prefs: d.prefs, deals,
      });
      ctx.onJoined(res.memberId, res, res.token);
      toast("You’re in. Ideas now include your answers.");
      ctx.go("vibe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Try again.");
    } finally { setSaving(false); }
  }

  function next() {
    const e = validate(step);
    if (e) return setError(e);
    if (step < reached) return setStep(reached); // finished editing an earlier card
    if (step < last) { setReached(step + 1); return setStep(step + 1); }
    void save();
  }
  const edit = (i: number) => { setStep(i); setError(""); };
  const state = (i: number) => (i === step ? "active" : i <= reached ? "done" : "upcoming") as "active" | "done" | "upcoming";
  const num = (i: number) => String(i + 1).padStart(2, "0");

  const values = [
    `${d.name || "…"} · ${d.origin}`,
    `${money(d.max)} max`,
    `${range(d.start, d.end)}`,
    d.passport ? "Passport ready" : "No passport",
    d.prefs.map(prefShort).join(" + "),
  ];
  const primary = step < reached ? "Update" : step === last ? (saving ? "Saving…" : me?.ready ? "Save" : "I’m in") : "Next";

  return (
    <>
      <div className="topbar">
        <Meta>{me?.ready ? "Your answers" : "On the web · no account"}</Meta>
        <Button kind="secondary" icon="phone" onClick={install}>Get the app</Button>
      </div>
      <InstallSheet open={help} onClose={closeHelp} />

      <div className="ticket ticket--compact" data-tone={tripTone(ctx.code, t.tone)}>
        <div className="col" style={{ gap: 2 }}>
          <Meta>{t.title}</Meta>
          <Text variant="display-md">WHERE TO?</Text>
        </div>
        <div className="col t-meta" style={{ alignItems: "flex-end", gap: 2 }}><span>{windowLabel(t.windowStart, t.windowEnd)}</span><span>${t.maxBudget.toLocaleString("en-US")} cap</span></div>
      </div>

      <div className="titleblock" style={{ marginTop: 4 }}>
        <Text as="h1" variant="display-lg">{me?.ready ? "your answers" : "you in?"}</Text>
        <Progress total={STEPS.length} done={step + 1} />
        <Meta>{Math.min(step + 1, STEPS.length)} of {STEPS.length} · takes 30 seconds</Meta>
      </div>

      {/* 01 airport */}
      <QuestionCard number={num(0)} label={STEPS[0].label} value={values[0]} state={state(0)} onEdit={() => edit(0)}>
        <Meta>{num(0)} · {STEPS[0].label}</Meta>
        <Field label="First name"><input maxLength={28} value={d.name} autoComplete="given-name" placeholder="What should we call you?" onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Flying from">
          <select value={d.origin} onChange={(e) => set({ origin: e.target.value })}>{Object.entries(airports).map(([v, tx]) => <option key={v} value={v}>{tx}</option>)}</select>
        </Field>
      </QuestionCard>

      {/* 02 budget */}
      <QuestionCard number={num(1)} label={STEPS[1].label} value={values[1]} state={state(1)} tone="dusk" onEdit={() => edit(1)}>
        <label htmlFor="mybudget" className="t-meta">{STEPS[1].label}</label>
        <EditableAmount id="mybudget-amount" label="Your max budget in dollars. Type your own amount." value={d.max} onChange={(n) => set({ max: n })} />
        <input id="mybudget" type="range" min={0} max={Math.min(5000, cap)} step={cap > 400 ? 25 : 5} value={Math.min(d.max, 5000, cap)} onChange={(e) => set({ max: Number(e.target.value) })} />
        <div className="q__foot t-meta"><span>Private</span><span>Trip cap {money(cap)}</span></div>
        <span style={{ fontSize: 13, lineHeight: 1.35 }}>The group only sees a range, never your number. Flights, {t.nights} nights and daily spending all count.</span>
      </QuestionCard>

      {/* 03 dates */}
      <QuestionCard number={num(2)} label={STEPS[2].label} value={values[2]} state={state(2)} onEdit={() => edit(2)}>
        <Meta>{num(2)} · {STEPS[2].label}</Meta>
        <div className="chips"><Chip selected={d.start === t.windowStart && d.end === t.windowEnd} onClick={() => set({ start: t.windowStart, end: t.windowEnd })}>Free the whole window</Chip></div>
        <div className="dates">
          <Field label="Free from"><input type="date" min={t.windowStart} max={t.windowEnd} value={d.start} onChange={(e) => set({ start: e.target.value })} /></Field>
          <Field label="Back by"><input type="date" min={t.windowStart} max={t.windowEnd} value={d.end} onChange={(e) => set({ end: e.target.value })} /></Field>
        </div>
        <span className="t-body-md muted">Window is {range(t.windowStart, t.windowEnd)}. Pick days you could go, not a booking.</span>
      </QuestionCard>

      {/* 04 passport + hard nos */}
      <QuestionCard number={num(3)} label={STEPS[3].label} value={values[3]} state={state(3)} onEdit={() => edit(3)}>
        <Meta>{num(3)} · {STEPS[3].label}</Meta>
        <div className="chips">
          <Chip grow selected={d.passport} onClick={() => set({ passport: true })}>Yes, passport ready</Chip>
          <Chip grow selected={!d.passport} onClick={() => set({ passport: false })}>No passport</Chip>
        </div>
        <Meta className="muted">Any hard nos?</Meta>
        <div className="chips">{HARD_NOS.map(([v, tx]) => (
          <Chip key={v} selected={d.deals.includes(v)} onClick={() => set({ deals: d.deals.includes(v) ? d.deals.filter((x) => x !== v) : [...d.deals, v] })}>{tx}</Chip>
        ))}</div>
      </QuestionCard>

      {/* 05 vibe */}
      <QuestionCard number={num(4)} label={STEPS[4].label} value={values[4]} state={state(4)} onEdit={() => edit(4)}>
        <div className="row row--between"><Meta>{num(4)} · {STEPS[4].label}</Meta><Meta className="muted">Pick up to 3 · {d.prefs.length}/3</Meta></div>
        <div className="chips">{PREFS.map(([v]) => (
          <Chip key={v} selected={d.prefs.includes(v)} onClick={() => {
            if (d.prefs.includes(v)) set({ prefs: d.prefs.filter((x) => x !== v) });
            else if (d.prefs.length < 3) set({ prefs: [...d.prefs, v] });
            else toast("Top 3 only. Tap one to swap it out.");
          }}>{prefShort(v)}</Chip>
        ))}</div>
      </QuestionCard>

      <div className="err" role="alert">{error}</div>
      <div className="cta">
        <Button kind="primary" disabled={saving} onClick={next}>{primary}{primary !== "Saving…" && <Icon name="arrow" />}</Button>
        {me?.ready && <Button kind="secondary" onClick={() => ctx.go("vibe")}>Back to the trip</Button>}
      </div>
    </>
  );
}
