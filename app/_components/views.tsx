"use client";
import { useMemo, useState } from "react";
import type { Suggestion } from "@/lib/matching";
import {
  AIRPORTS, DEALS, PREFS, api, dayDiff, money, prefLabel, range, type PublicMember, type Snapshot,
} from "@/lib/client";
import type { Deal } from "@/lib/types";
import { Btn, type View } from "./Shell";

export interface Ctx {
  code: string;
  snap: Snapshot;
  me?: PublicMember;
  go: (v: View) => void;
  run: (fn: () => Promise<Snapshot>, okMsg?: string) => Promise<boolean>;
  toast: (s: string) => void;
  onJoined: (id: string, snap: Snapshot) => void;
}

const Avatar = ({ m }: { m: PublicMember }) => <span className="ew-avatar" aria-label={m.name}>{m.name.slice(0, 1)}</span>;

export function Poster({ theme }: { theme: string }) {
  return (
    <div className="ew-poster" data-theme={theme} aria-label="Trip invitation">
      <div className="ew-poster-top"><span>ELSEWHERE TRAVEL CLUB</span><span>✳ 2027</span></div>
      <span className="ew-spark" aria-hidden="true">✳</span>
      <div className="ew-poster-title">spring<br />break<i>out.</i></div>
      <div className="ew-sticker">GOOD<br />MEMORIES<br />PENDING ↗</div>
      <div className="ew-poster-bottom"><span>DESTINATION: TOGETHER</span><span>✈ &nbsp; VOL. 01</span></div>
      <div className="ew-curve" />
    </div>
  );
}

function Art({ d }: { d: Suggestion }) {
  return (
    <div className="ew-art" data-art={d.id}>
      <span className="ew-stamp">{d.country.toUpperCase()}</span><span className="ew-sun" />
      <div className="ew-art-title">{d.name}</div><span className="ew-art-emoji" aria-hidden="true">{d.emoji}</span>
    </div>
  );
}

function Summary({ ctx }: { ctx: Ctx }) {
  const { snap } = ctx;
  return (
    <div className="ew-summary-strip">
      <div><span className="ew-muted">The crew</span><strong>{snap.match.readyCount}/{snap.members.length} preferences added</strong></div>
      <div><span className="ew-muted">Shared availability</span><strong>{snap.match.overlap && snap.match.start && snap.match.end ? range(snap.match.start, snap.match.end) : `No ${snap.trip.nights}-night overlap yet`}</strong></div>
      <div><span className="ew-muted">Trip length</span><strong>{snap.trip.nights} nights · {snap.trip.nights + 1} days</strong></div>
      <Btn onClick={() => ctx.go("onboard")}>Edit my details</Btn>
    </div>
  );
}

// ---------------------------------------------------------------- Invite
export function InviteView(ctx: Ctx) {
  const { snap, me } = ctx;
  const host = snap.members.find((m) => m.id === snap.trip.hostMemberId);
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : window.location.href.split("?")[0];
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); ctx.toast("Invite link copied."); }
    catch { ctx.toast("Select the link and copy it."); }
  }
  return (
    <div className="ew-invite">
      <div><Poster theme={snap.trip.theme} /></div>
      <div className="ew-invite-copy">
        <span className="ew-badge"><span className="ew-dot" /> You’re on the list</span>
        <div><div className="ew-kicker ew-muted" style={{ marginBottom: 10 }}>HOSTED BY {(host?.name ?? "").toUpperCase()}</div><h1>{snap.trip.title}</h1></div>
        {snap.trip.note && <p className="ew-muted">{snap.trip.note}</p>}
        <div className="ew-invite-details">
          <div className="ew-invite-detail"><span aria-hidden="true">☀</span><div><strong>Somewhere together.</strong><p>We’ll find the place that works for everyone{snap.trip.vibes.length ? ` · ${snap.trip.vibes.map(prefLabel).join(" + ")}` : ""}.</p></div></div>
          <div className="ew-invite-detail"><span aria-hidden="true">▦</span><div><strong>{range(snap.trip.windowStart, snap.trip.windowEnd)}</strong><p>{snap.trip.nights} nights, up to {money(snap.trip.maxBudget)} per person. Add your dates and we’ll find the overlap.</p></div></div>
        </div>
        <div className="ew-ready">
          <div className="ew-avatars">{snap.members.map((m) => <Avatar key={m.id} m={m} />)}</div>
          <span><strong>{snap.match.readyCount} of {snap.members.length}</strong> have added their details</span>
        </div>
        <Btn kind="ew-primary" onClick={() => ctx.go("onboard")}>{me?.ready ? "Edit my trip preferences ↗" : "I’m interested. Let’s do this ↗"}</Btn>
        <div className="ew-row" style={{ justifyContent: "space-between" }}>
          <span className="ew-note">Dates, budget, vibes. About a minute.</span>
          <button className="ew-link" onClick={() => ctx.go("ideas")}>Peek at the ideas</button>
        </div>
        <div className="ew-row" style={{ gap: 8 }}>
          <input readOnly value={link} aria-label="Invite link" style={{ flex: 1, minWidth: 0 }} onFocus={(e) => e.currentTarget.select()} />
          <Btn onClick={copy}>{copied ? "Copied ✓" : "Copy invite link"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Onboarding
interface Draft { name: string; origin: string; start: string; end: string; mode: "max" | "range"; min: number; max: number; prefs: string[]; deals: Deal[] }

export function OnboardView(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Draft>(() => ({
    name: me?.name ?? "",
    origin: me?.origin && AIRPORTS[me.origin] ? me.origin : "BOS",
    start: me?.ready ? me.start : t.windowStart,
    end: me?.ready ? me.end : t.windowEnd,
    mode: (me?.min ?? 0) > 0 ? "range" : "max",
    min: me?.min ?? 0,
    max: Math.min(me?.max ?? 900, t.maxBudget),
    prefs: me?.prefs?.length ? me.prefs : [...t.vibes],
    deals: me?.deals ?? [],
  }));
  const set = (p: Partial<Draft>) => { setD((x) => ({ ...x, ...p })); setError(""); };
  const steps = ["Your dates", "Your budget", "Your vibe"];

  // Live preview: only dates are public, so preview the date overlap with everyone already in.
  const fit = useMemo(() => {
    if (!d.start || !d.end) return "";
    const others = snap.members.filter((m) => m.ready && m.id !== me?.id);
    const start = [t.windowStart, d.start, ...others.map((m) => m.start)].sort().at(-1)!;
    const end = [t.windowEnd, d.end, ...others.map((m) => m.end)].sort()[0];
    return dayDiff(start, end) >= t.nights
      ? `${range(start, end)} works for everyone so far.`
      : `The dates don’t overlap for ${t.nights} nights yet.`;
  }, [d.start, d.end, snap.members, me?.id, t]);

  function validate(): string {
    if (step === 0) {
      if (!d.name.trim()) return "Tell the crew your name first.";
      if (!d.start || !d.end) return "Choose both dates.";
      if (d.start < t.windowStart || d.end > t.windowEnd) return `This trip is for ${range(t.windowStart, t.windowEnd)}.`;
      if (d.end < d.start) return "Your return date should be after your start date.";
      if (dayDiff(d.start, d.end) < t.nights) return `Choose a window with room for at least ${t.nights} nights.`;
    }
    if (step === 1) {
      if (!Number.isFinite(d.max) || d.max <= 0) return "Enter a maximum budget above $0.";
      if (d.max > t.maxBudget) return `The host set a ceiling of ${money(t.maxBudget)} per person.`;
      if (d.mode === "range" && (!Number.isFinite(d.min) || d.min <= 0 || d.min > d.max)) return "Your range should start above $0 and below your maximum.";
    }
    if (step === 2 && !d.prefs.length) return "Pick at least one thing you’d enjoy.";
    return "";
  }

  async function next() {
    const e = validate();
    if (e) return setError(e);
    if (step < 2) return setStep(step + 1);
    setSaving(true);
    try {
      const res = await api<Snapshot & { memberId: string }>(`/api/trips/${ctx.code}/members`, {
        memberId: me?.id, name: d.name.trim(), origin: d.origin, start: d.start, end: d.end,
        min: d.mode === "range" ? d.min : 0, max: d.max, prefs: d.prefs, deals: d.deals,
      });
      ctx.onJoined(res.memberId, res);
      ctx.toast("You’re in. Suggestions now include your dates, budget, and preferences.");
      ctx.go("ideas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save. Try again.");
    } finally { setSaving(false); }
  }

  let form;
  if (step === 0) form = (
    <>
      <div><h2>When can you escape?</h2><p className="ew-subtitle">Add your available window. We’ll fit a {t.nights}-night trip inside it.</p></div>
      <div className="ew-grid2">
        <label className="ew-label">Your name<input maxLength={28} value={d.name} placeholder="What should we call you?" autoComplete="given-name" onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="ew-label">Flying from<select value={d.origin} onChange={(e) => set({ origin: e.target.value })}>{Object.entries(AIRPORTS).map(([v, tx]) => <option key={v} value={v}>{tx}</option>)}</select></label>
      </div>
      <div className="ew-stack" style={{ gap: 9 }}>
        <span className="ew-label">Free the whole time?</span>
        <div className="ew-row"><button className="ew-chip" aria-pressed={d.start === t.windowStart && d.end === t.windowEnd} onClick={() => set({ start: t.windowStart, end: t.windowEnd })}>{range(t.windowStart, t.windowEnd)} is wide open</button></div>
      </div>
      <div className="ew-grid2 ew-date-grid">
        <label className="ew-label">Available from<input type="date" min={t.windowStart} max={t.windowEnd} value={d.start} onChange={(e) => set({ start: e.target.value })} /></label>
        <label className="ew-label">Back by<input type="date" min={t.windowStart} max={t.windowEnd} value={d.end} onChange={(e) => set({ end: e.target.value })} /></label>
      </div>
      <p className="ew-note">Exact break dates work too. These are the days you’re free, not a booking commitment.</p>
    </>
  );
  else if (step === 1) form = (
    <>
      <div><h2>Your trip. Your comfort zone.</h2><p className="ew-subtitle">A total budget per person, in USD.</p></div>
      <div className="ew-pillbar">
        <button aria-pressed={d.mode === "max"} onClick={() => set({ mode: "max", min: 0 })}>My maximum</button>
        <button aria-pressed={d.mode === "range"} onClick={() => set({ mode: "range", min: d.min || Math.round(d.max * 0.6) })}>A comfortable range</button>
      </div>
      <div><div className="ew-budget-big"><span>{money(d.max)}</span><span style={{ fontSize: 18 }}> max</span></div><p className="ew-budget-caption">Round-trip flights + {t.nights} nights + daily spending</p></div>
      <input type="range" min={200} max={Math.max(400, t.maxBudget)} step={25} value={Math.min(d.max, Math.max(400, t.maxBudget))} aria-label="Maximum total budget" onChange={(e) => set({ max: Number(e.target.value) })} />
      <div className="ew-grid2">
        {d.mode === "range" && <label className="ew-label">Comfortable from ($)<input type="number" min={1} value={d.min} onChange={(e) => set({ min: Number(e.target.value) })} /></label>}
        <label className="ew-label">Hard maximum ($)<input type="number" min={1} max={t.maxBudget} value={d.max} onChange={(e) => set({ max: Number(e.target.value) })} /></label>
      </div>
      <p className="ew-note">The host capped this trip at {money(t.maxBudget)} per person. Your upper amount is a firm limit; cheaper trips can still appear below your comfortable range. Your exact budget stays in your own view.</p>
    </>
  );
  else form = (
    <>
      <div><h2>What’s your kind of trip?</h2><p className="ew-subtitle">Pick up to 3 things you’d love. We’ll look for the overlap.</p></div>
      <div className="ew-row">{PREFS.map(([v, e, tx]) => (
        <button key={v} className="ew-chip" aria-pressed={d.prefs.includes(v)} onClick={() => {
          if (d.prefs.includes(v)) set({ prefs: d.prefs.filter((x) => x !== v) });
          else if (d.prefs.length < 3) set({ prefs: [...d.prefs, v] });
          else ctx.toast("Pick your top 3. Remove one to swap it.");
        }}>{e} {tx}</button>
      ))}</div>
      <div className="ew-divider" />
      <div><h3>Anything that’s a hard no?</h3><p className="ew-subtitle">These are requirements, not just preferences.</p></div>
      <div className="ew-row">{DEALS.map(([v, tx]) => (
        <button key={v} className="ew-chip" aria-pressed={d.deals.includes(v)} onClick={() => set({ deals: d.deals.includes(v) ? d.deals.filter((x) => x !== v) : [...d.deals, v] })}>{d.deals.includes(v) ? "✓" : "+"} {tx}</button>
      ))}</div>
      <p className="ew-note">You can change these any time. If nothing fits, we’ll show the conflict instead of ignoring a dealbreaker.</p>
    </>
  );

  return (
    <div className="ew-onboard">
      <aside className="ew-aside">
        <span className="ew-kicker ew-muted">YOUR SEAT AT THE TABLE</span>
        <h2>Good trips start<br />with your input.</h2>
        <p className="ew-note">A few details. A plan that actually works for you.</p>
        <div className="ew-step-list">{steps.map((s, i) => (
          <div key={s} className={`ew-step-item ${i === step ? "active" : ""}`} aria-current={i === step ? "step" : undefined}><span className="ew-step-num">{i < step ? "✓" : i + 1}</span>{s}</div>
        ))}</div>
        <div className="ew-preview"><strong>✳ The crew is taking shape</strong><div aria-live="polite" style={{ marginTop: 6 }}>{fit}</div></div>
      </aside>
      <section className="ew-form" aria-label={steps[step]}>
        {form}
        <div className="ew-error" role="alert">{error}</div>
        <div className="ew-form-bottom">
          <button className="ew-link" onClick={() => (step ? setStep(step - 1) : ctx.go("invite"))}>← {step ? "Back" : "The invite"}</button>
          <Btn kind="ew-primary" disabled={saving} onClick={next}>{step === 2 ? (saving ? "Saving…" : "Find our somewhere ↗") : "Keep going →"}</Btn>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Ideas & votes
export function IdeasView(ctx: Ctx) {
  const { snap, me } = ctx;
  const m = snap.match;
  const pending = snap.members.filter((x) => !x.ready);
  const votesFor = (id: string) => snap.votes.filter((v) => v.destinationId === id);
  const ranked = [...m.eligible].sort((a, b) => votesFor(b.id).length - votesFor(a.id).length);
  const lead = ranked[0];
  const myVote = snap.votes.find((v) => v.memberId === me?.id)?.destinationId;
  const nameOf = (id: string) => snap.members.find((x) => x.id === id)?.name ?? "";

  const vote = (id: string) => ctx.run(() => api(`/api/trips/${ctx.code}/vote`, { memberId: me!.id, destinationId: id }));
  const propose = async (id: string) => { if (await ctx.run(() => api(`/api/trips/${ctx.code}/proposal`, { memberId: me!.id, destinationId: id }))) ctx.go("plan"); };

  let cards;
  if (m.overlap && m.eligible.length) {
    cards = (
      <div className="ew-destinations">{m.eligible.map((d, i) => {
        const mine = (me && d.perMember[me.id]) || null;
        const avg = m.readyCount ? Math.round(d.groupTotal / m.readyCount) : 0;
        const voters = votesFor(d.id);
        return (
          <article className="ew-destination" key={d.id}>
            <Art d={d} />
            <div className="ew-dest-body">
              <div className="ew-row" style={{ justifyContent: "space-between", gap: 5 }}>
                <span className="ew-badge">{i === 0 ? "✳ Best group fit" : "↗ In the running"}</span>
                <span className="ew-small ew-muted">{voters.length} {voters.length === 1 ? "vote" : "votes"}</span>
              </div>
              <div><h3>{d.name}</h3><p className="ew-note" style={{ marginTop: 4 }}>{d.caption}</p></div>
              <div className="ew-price">{money(mine ? mine.total : avg)} <small>/ person {mine ? `from ${me!.origin}` : "(group average)"}</small></div>
              {mine && <div className="ew-cost-breakdown">✈ {money(mine.flight)} flight &nbsp; · &nbsp; ⌂ {money(mine.stay)} stay<br />+ {money(mine.daily)} daily spend · {range(m.start!, m.tripEnd!)}</div>}
              <div className="ew-cost-breakdown">Group total {money(d.groupTotal)} · {m.readyCount} {m.readyCount === 1 ? "traveler" : "travelers"}</div>
              <div className="ew-match">✓ Within every submitted budget<br />✓ {d.matched.map(prefLabel).slice(0, 3).join(" · ") || "Meets your requirements"}</div>
              <Btn kind="ew-vote" aria-pressed={myVote === d.id} disabled={!me?.ready} onClick={() => vote(d.id)}>{myVote === d.id ? "✓ Your vote" : "This gets my vote"}</Btn>
              <div className="ew-voters">{voters.length ? voters.map((v) => nameOf(v.memberId)).join(" + ") + " voted" : "Be the first to vote"}</div>
            </div>
          </article>
        );
      })}</div>
    );
  } else {
    cards = (
      <div className="ew-empty">
        <span className="ew-empty-icon">☁</span>
        <h2>{!m.overlap && m.readyCount ? "Let’s find some common ground." : m.readyCount ? "A little adjustment could go a long way." : "No one’s added details yet."}</h2>
        <p>{!m.readyCount ? "Add your details to see the first ideas." : !m.overlap ? `There isn’t a shared ${snap.trip.nights}-night window yet. Review the crew’s dates, or edit your availability.` : "None of the sample trips meet every budget and dealbreaker. Review the reasons below, then choose what you’re comfortable changing."}</p>
        <Btn kind="ew-primary" onClick={() => ctx.go(m.readyCount ? "crew" : "onboard")}>{m.readyCount ? "Review the crew" : "Add my details"}</Btn>
      </div>
    );
  }

  return (
    <>
      <div className="ew-intro">
        <div>
          <div className="ew-kicker ew-muted" style={{ marginBottom: 8 }}>THE POSSIBILITIES ARE LOOKING GOOD</div>
          <h1>Find your somewhere.</h1>
          <p>{pending.length ? `Early ideas based on ${m.readyCount} ${m.readyCount === 1 ? "traveler" : "travelers"}. Suggestions will update as the crew joins.` : "A shortlist that respects everyone’s dates, budgets, and hard nos."}</p>
        </div>
        <span className="ew-badge"><span className="ew-dot" /> {m.eligible.length} matching ideas</span>
      </div>
      <Summary ctx={ctx} />
      <p className="ew-note" style={{ margin: "-9px 0 17px" }}>Illustrative fares & lodging estimates · totals include {snap.trip.nights} nights and daily spending.</p>
      {!me?.ready && (
        <div className="ew-proposal" style={{ margin: "0 0 20px" }}>
          <div><strong>Your preferences are missing.</strong><p>Add your details to shape these ideas and join the vote.</p></div>
          <Btn kind="ew-lime" onClick={() => ctx.go("onboard")}>Add my details</Btn>
        </div>
      )}
      {cards}
      {lead && (
        <div className="ew-proposal">
          <div>
            <strong>{pending.length ? `Still saving a seat for ${pending.map((x) => x.name).join(", ")}` : `Feeling good about ${lead.name}?`}</strong>
            <p>{pending.length ? "Everyone adds their preferences before the group confirms a plan." : "Voting picks the favorite. Each traveler still gets a final say."}</p>
          </div>
          <Btn kind="ew-primary" disabled={!!pending.length || !me?.ready} onClick={() => propose(lead.id)}>Propose {lead.name} →</Btn>
        </div>
      )}
      {m.excluded.length > 0 && (
        <details className="ew-disclosure">
          <summary>Why {m.excluded.length} other {m.excluded.length === 1 ? "place didn’t" : "places didn’t"} make the cut</summary>
          <ul>{m.excluded.map((d) => <li key={d.id}><strong>{d.name}:</strong> {d.reasons.join("; ")}.</li>)}</ul>
        </details>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Crew
export function CrewView(ctx: Ctx) {
  const { snap, me } = ctx;
  const m = snap.match;
  return (
    <>
      <div className="ew-intro">
        <div><div className="ew-kicker ew-muted" style={{ marginBottom: 9 }}>GOOD PEOPLE, GREAT PLANS</div><h1>The travel club.</h1><p>Everyone gets a say. Here’s what’s coming together.</p></div>
        <Btn onClick={() => ctx.go("invite")}>Invite link ↗</Btn>
      </div>
      <Summary ctx={ctx} />
      <div className="ew-member-list">{snap.members.map((x) => (
        <article className="ew-member" key={x.id}>
          <Avatar m={x} />
          <div className="ew-member-content">
            <strong>{x.name} {x.id === snap.trip.hostMemberId && <span className="ew-small ew-muted">· host</span>} {x.id === me?.id && <span className="ew-small ew-muted">· you</span>}</strong>
            <p>{x.ready ? `${range(x.start, x.end)} · ${AIRPORTS[x.origin] ?? x.origin}` : "Saving you a spot. Add your dates, budget, and vibe."}</p>
            {x.ready && <p>{x.prefs.map(prefLabel).join(" · ")}{x.id === me?.id && x.max != null ? ` · Up to ${money(x.max)}` : " · Budget shared privately"}</p>}
          </div>
          {x.id === me?.id ? <Btn kind="ew-lime" onClick={() => ctx.go("onboard")}>{x.ready ? "Edit" : "Add details"}</Btn> : <span className="ew-badge">{x.ready ? "✓ Ready" : "Awaiting details"}</span>}
        </article>
      ))}</div>
      <div className="ew-proposal">
        <div>
          <strong>{m.overlap ? "We have an overlap. That’s a start." : m.readyCount ? "Your calendars need a little teamwork." : "Waiting on the first answers."}</strong>
          <p>{m.overlap && m.start && m.end ? `${range(m.start, m.end)} works for everyone who’s responded.` : "Compare the available windows above. No one’s dates will be changed automatically."}</p>
        </div>
        <Btn kind="ew-primary" onClick={() => ctx.go("ideas")}>See trip ideas →</Btn>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Plan (approval + planning)
export function PlanView(ctx: Ctx) {
  const { snap, me } = ctx;
  const m = snap.match;
  const d = m.eligible.find((x) => x.id === snap.trip.proposal);
  const ready = snap.members.filter((x) => x.ready);
  const [checks, setChecks] = useState<string[]>([]);
  const mine = d && me ? d.perMember[me.id] : null;
  const approvals = snap.trip.approvals;

  if (!d || !m.start || !m.tripEnd) {
    return (
      <div className="ew-empty">
        <span className="ew-empty-icon">✳</span><h1>First, find your people’s place.</h1>
        <p>Once everyone adds their preferences, propose a destination from the ideas board. Each traveler gets to approve the same plan.</p>
        <Btn kind="ew-primary" onClick={() => ctx.go("ideas")}>Back to the ideas →</Btn>
      </div>
    );
  }
  const reconsider = async () => { if (await ctx.run(() => api(`/api/trips/${ctx.code}/proposal`, { memberId: me!.id, destinationId: null }))) ctx.go("ideas"); };

  if (snap.trip.phase === "planning") {
    const tasks: [string, string, string][] = [["flights", "Compare flights", "Check departure times and baggage."], ["stay", "Choose our home base", "Shortlist a shared stay everyone likes."], ["days", "Make room for the fun", "Add a few must-dos and leave room to wander."]];
    return (
      <>
        <div className="ew-celebrate"><span aria-hidden="true">✳</span><div><h2>It made it out of the group chat.</h2><p>All {ready.length} travelers approved {d.name}. {range(m.start, m.tripEnd)} is the plan.</p></div></div>
        <div className="ew-intro"><div><div className="ew-kicker ew-muted" style={{ marginBottom: 8 }}>THE NEXT CHAPTER</div><h1>Let’s make it a trip.</h1><p>A shared checklist for the details that come next.</p></div></div>
        <div className="ew-grid2">
          <div className="ew-stack">
            {tasks.map(([id, title, note]) => (
              <button key={id} className="ew-check" aria-pressed={checks.includes(id)} onClick={() => setChecks(checks.includes(id) ? checks.filter((c) => c !== id) : [...checks, id])}>
                <span className="ew-box">{checks.includes(id) ? "✓" : ""}</span><span><strong>{title}</strong><small>{note}</small></span>
              </button>
            ))}
            <p className="ew-note">Checklist progress only on this device. No bookings or payments have been made.</p>
          </div>
          <aside className="ew-plan-card ew-stack">
            <span className="ew-badge">✓ EVERYONE’S ON BOARD</span>
            <h2>{d.name}</h2>
            <p>{range(m.start, m.tripEnd)}<br /><span className="ew-muted">{snap.trip.nights} nights · {ready.length} friends</span></p>
            <div className="ew-row">{ready.map((x) => <Avatar key={x.id} m={x} />)}</div>
            <div className="ew-divider" />
            <h3>Group checkout comes next.</h3>
            <p className="ew-note">After choosing flights and a stay, everyone reviews the final price before approving a payment.</p>
            <button className="ew-link" onClick={reconsider}>Reopen destination planning</button>
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ew-intro">
        <div><div className="ew-kicker ew-muted" style={{ marginBottom: 9 }}>ONE LAST “ARE WE DOING THIS?”</div><h1>{d.name}. All aboard?</h1><p>Confirm this destination, these dates, and your estimated share. This doesn’t book or charge anything.</p></div>
        <span className="ew-badge">{approvals.length} of {ready.length} approved</span>
      </div>
      <div className="ew-grid2">
        <div className="ew-destination">
          <Art d={d} />
          <div className="ew-dest-body">
            <h3>{range(m.start, m.tripEnd)} · {snap.trip.nights} nights</h3>
            {mine && <><div className="ew-price">{money(mine.total)} <small>your estimated total from {me!.origin}</small></div>
              <p className="ew-note">{money(mine.flight)} round-trip flight + {money(mine.stay)} shared stay + {money(mine.daily)} daily spending.</p></>}
            <p className="ew-note">Sample prices. Final quotes and payment approval come later.</p>
          </div>
        </div>
        <div className="ew-plan-card">
          <h3>Same plan. Everyone’s yes.</h3>
          <p className="ew-note" style={{ margin: "8px 0 12px" }}>A vote is a favorite. This is your green light to start planning.</p>
          {ready.map((x) => (
            <div className="ew-confirm-row" key={x.id}>
              <div className="ew-row"><Avatar m={x} /><span>{x.name}</span></div>
              {approvals.includes(x.id) ? <span className="ew-badge">✓ All in</span>
                : x.id === me?.id ? <Btn kind="ew-lime" onClick={() => ctx.run(() => api(`/api/trips/${ctx.code}/approve`, { memberId: me.id }))}>I’m in!</Btn>
                : <span className="ew-muted">Waiting for a yes</span>}
            </div>
          ))}
          <div className="ew-divider" style={{ margin: "17px 0" }} />
          <p className="ew-note">The next chapter unlocks when all {ready.length} approve. Editing travel preferences asks everyone to approve again.</p>
          <button className="ew-link" onClick={reconsider}>← Keep exploring instead</button>
        </div>
      </div>
    </>
  );
}
