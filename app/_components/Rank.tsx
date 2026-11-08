"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Snapshot } from "@/lib/client";
import { groupOrder, orderOf, verdictFor } from "@/lib/rank";
import { EstimateCard, type Estimate } from "@/components/trip";
import { RankList, type RankItem } from "@/components/trip/RankList";
import { Button, Icon, IconButton, LinkButton, Meta, Sheet, Text, useToast } from "@/components/ui";
import { addRow, center, cn, col, cta, err, field, fieldGrow, fieldRow, sheetHead, skeleton, titleblock, topbar, type, why } from "@/components/ui/tw";
import { andList, monthName, prefShort, windowShort, type Ctx } from "./common";

// ---------------------------------------------------------------- 07 · Propose your own
function ProposeSheet({ ctx, open, onClose }: { ctx: Ctx; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<{ estimate: Estimate; source: "gemini" | "sample" } | null>(null);
  const me = ctx.me;

  useEffect(() => { if (open) { setName(""); setRes(null); setError(""); } }, [open]);

  async function price() {
    if (!me || !name.trim()) return setError("Type a place first.");
    setBusy(true); setError(""); setRes(null);
    try { setRes(await api<{ estimate: Estimate; source: "gemini" | "sample" }>(`/api/trips/${ctx.code}/estimate`, { memberId: me.id, name: name.trim() })); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t price that. Try again."); }
    finally { setBusy(false); }
  }
  async function add() {
    if (!me || !res) return;
    setAdding(true);
    const ok = await ctx.run(() => api(`/api/trips/${ctx.code}/custom`, { memberId: me.id }));
    setAdding(false);
    if (ok) { toast(`${res.estimate.name} is on the list. Lock in again to count it.`); onClose(); }
    else setError("Couldn’t add that. Try again.");
  }
  const e = res?.estimate;

  return (
    <Sheet open={open} onClose={onClose} label="Suggest your own place">
      <div className={sheetHead}>
        <Text as="h2" variant="display-md">got a better idea?</Text>
        <p>Name a place. {ctx.snap.ai.enabled ? "AI prices it for the group." : "We’ll estimate it for the group."}</p>
      </div>
      <form className={cn(field, fieldRow)} onSubmit={(ev) => { ev.preventDefault(); void price(); }}>
        <span className={fieldGrow}>
          <Meta>Where to?</Meta>
          <input value={name} maxLength={60} autoFocus placeholder="Chicago" aria-label="Where to?" onChange={(ev) => { setName(ev.target.value); setError(""); }} />
        </span>
        <Button kind="ink" disabled={busy || name.trim().length < 2} onClick={price}>{busy ? "Pricing…" : "Price it"}</Button>
      </form>
      <div className={err} role="alert">{error}</div>
      {busy && (
        <div aria-live="polite">
          <div className={cn(skeleton, "h-[210px] rounded-[20px]")} />
          <Meta className="text-muted">pricing {name.trim().toLowerCase()}…</Meta>
        </div>
      )}
      {e && res && <EstimateCard e={e} source={res.source} dates={windowShort(e.start, new Date(new Date(e.start + "T12:00:00Z").getTime() + e.nights * 86_400_000).toISOString().slice(0, 10))} month={monthName(e.start)} />}
      {e && <Button kind="primary" disabled={adding} onClick={add}>{adding ? "Adding…" : "Add to the ranking"}</Button>}
    </Sheet>
  );
}

// ---------------------------------------------------------------- 06 · Rank 'em
export function RankScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const m = snap.match;
  const toast = useToast();
  const [propose, setPropose] = useState(false);
  const eligible = m.eligible;
  const ids = useMemo(() => eligible.map((d) => d.id), [eligible]);
  const myVote = snap.votes.find((v) => v.memberId === me?.id);
  const saved = myVote ? orderOf(myVote, ids) : [];
  const base = useMemo(() => [...saved, ...ids.filter((id) => !saved.includes(id))], [saved.join(), ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [order, setOrder] = useState<string[]>(base);
  const [fresh, setFresh] = useState<string | null>(null);
  const seq = useRef(0);
  const inflight = useRef(0);
  const known = useRef(new Set(ids));

  // Follow the server unless we've just changed the order ourselves.
  useEffect(() => { if (inflight.current === 0) setOrder(base); }, [base]);
  // A place that just showed up gets a short pop.
  useEffect(() => {
    const added = ids.find((id) => !known.current.has(id));
    ids.forEach((id) => known.current.add(id));
    if (added && known.current.size > 1) { setFresh(added); const x = setTimeout(() => setFresh(null), 1500); return () => clearTimeout(x); }
  }, [ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = !!myVote?.locked;
  const readyIds = snap.members.filter((x) => x.ready).map((x) => x.id);
  const lockedCount = snap.votes.filter((v) => v.locked && readyIds.includes(v.memberId)).length;
  const isHost = me?.id === t.hostMemberId;
  const proposal = t.proposal;
  const group = groupOrder(snap.votes, ids, readyIds);
  const haveVotes = snap.votes.some((v) => readyIds.includes(v.memberId));
  const leader = haveVotes ? eligible.find((d) => d.id === group[0]?.id) : undefined;
  const month = m.start ? monthName(m.start) : "";
  const source: "AI" | "Est." = snap.ai.source === "gemini" ? "AI" : "Est.";

  const items: RankItem[] = order.map((id) => {
    const d = eligible.find((x) => x.id === id)!;
    const mine = me ? d.perMember[me.id] : undefined;
    const avg = m.readyCount ? Math.round(d.groupTotal / m.readyCount) : 0;
    const per = mine ? mine.total : avg;
    const proposer = d.proposedBy ? snap.members.find((x) => x.id === d.proposedBy) : undefined;
    const why = d.proposedBy
      ? (d.reasons.length ? `Heads up: ${d.reasons.join("; ").toLowerCase()}.` : d.reason || "Added by the group and priced the same way as the rest.")
      : `Under everyone’s budget${d.stops === 0 ? ", nonstop flights" : ""}.${d.matched.length ? ` Matches ${andList(d.matched.map(prefShort)).toLowerCase()}.` : ""}`;
    return {
      id, name: d.name, per, total: d.groupTotal, verdict: verdictFor(avg || per, t.maxBudget), why, isNew: id === fresh,
      sub: d.proposedBy ? `${proposer ? proposer.name + "’s" : "A friend’s"} idea · ${snap.ai.source === "gemini" ? "AI priced" : "est. price"}` : undefined,
    };
  });

  function save(next: string[], lock: boolean, msg?: string, undo?: () => void) {
    if (!me) return;
    const mine = ++seq.current;
    inflight.current++;
    api<Snapshot>(`/api/trips/${ctx.code}/rank`, { memberId: me.id, ranking: next, locked: lock })
      .then((s) => { if (mine === seq.current) ctx.apply(s); if (msg) toast(msg, { undo }); })
      .catch((e) => toast(e instanceof Error ? e.message : "Couldn’t save your ranking."))
      .finally(() => { inflight.current--; });
  }
  const retry = () => ctx.run(() => api(`/api/trips/${ctx.code}/retry`, { memberId: me!.id }), "Trying again.");
  const reorder = (next: string[]) => { setOrder(next); save(next, false); };
  const lockIn = () => save(order, true, "Ranking locked.", () => save(order, false));
  const unlock = () => save(order, false);
  const pickNow = async () => {
    if (!me || !group[0]) return;
    await ctx.run(() => api(`/api/trips/${ctx.code}/proposal`, { memberId: me.id, destinationId: group[0].id }), "Ranking closed. Time to say yes.");
    ctx.go("plan");
  };

  let body;
  if (!me?.ready) {
    body = (
      <>
        <div className={cn(why, "rounded-lg p-4")}><Meta>Answer first</Meta><span>Ideas are priced from everyone’s airports and budgets. Add yours to start ranking.</span></div>
        <div className={cta}><Button kind="primary" onClick={() => ctx.go("answers")}>Add my answers<Icon name="arrow" /></Button></div>
      </>
    );
  } else if (snap.ai.source === "pending" && m.overlap) {
    body = (
      <>
        <div className={cn(skeleton, "h-[250px] rounded-[20px]")} />
        {[0, 1, 2].map((i) => <div key={i} className={cn(skeleton, "h-[52px] rounded-[20px]")} />)}
        <Meta className="text-muted" aria-live="polite">pricing destinations for your group…</Meta>
      </>
    );
  } else if (snap.ai.source === "fallback" && m.overlap && !eligible.length) {
    body = (
      <>
        <div className={cn(why, "rounded-lg p-4")}>
          <Meta>Ideas aren’t available right now</Meta>
          <span>The AI service that suggests places is overloaded, so we couldn’t build your list. Your answers are saved. Try again in a minute.</span>
        </div>
        <div className={cta}><Button kind="primary" onClick={retry}>Try again</Button></div>
      </>
    );
  } else if (!m.overlap || !eligible.length) {
    body = (
      <>
        <div className={cn(why, "rounded-lg p-4")}>
          <Meta>{!m.overlap ? "No shared dates yet" : "Nothing fits yet"}</Meta>
          <span>{!m.overlap ? `There isn’t a shared ${t.nights}-night window yet. Check the vibe check, or edit your dates.` : "No place meets every budget and hard no. Check why below, or loosen something."}</span>
        </div>
        {m.excluded.length > 0 && (
          <details className={cn(why, "rounded-lg p-4")}>
            <summary className={type.label}>Why {m.excluded.length} places didn’t make it</summary>
            <ul className="mt-2 grid list-disc gap-1.5 pl-[18px]">{m.excluded.map((d) => <li key={d.id}><strong>{d.name}:</strong> {d.reasons.join("; ")}.</li>)}</ul>
          </details>
        )}
        <button type="button" className={addRow} onClick={() => setPropose(true)}><Icon name="plus" size={18} stroke={2.6} />Suggest your own place</button>
        <div className={cta}><Button kind="primary" onClick={() => ctx.go(m.overlap ? "answers" : "vibe")}>{m.overlap ? "Edit my answers" : "Open the vibe check"}</Button></div>
      </>
    );
  } else {
    body = (
      <>
        {snap.ai.source === "fallback" && (
          <div className={cn(why, "flex-row items-center justify-between gap-3 rounded-lg bg-apricot px-4 py-3")} role="status">
            <span className={cn(col, "gap-0.5")}><Meta>AI ideas unavailable</Meta><span>These are sample places that may not suit your group.</span></span>
            <Button kind="ink" onClick={retry}>Try again</Button>
          </div>
        )}
        <RankList items={items} onReorder={reorder} shared={{ month, source, travelers: m.readyCount, meta: `${m.start && m.tripEnd ? windowShort(m.start, m.tripEnd) : ""} · ${t.nights} nights · ${(t.vibes.length ? t.vibes : eligible.find((d) => d.id === order[0])?.matched.slice(0, 2) ?? []).map(prefShort).join(" + ") || "Anything goes"}` }} />
        <button type="button" className={addRow} onClick={() => setPropose(true)}><Icon name="plus" size={18} stroke={2.6} />Suggest your own place</button>
        {m.excluded.length > 0 && (
          <details className="px-1 text-muted">
            <summary className={cn(type.meta, "min-h-8 cursor-pointer")}>Why {m.excluded.length} other {m.excluded.length === 1 ? "place" : "places"} didn’t make it</summary>
            <ul className="mt-1.5 grid list-disc gap-1 pl-[18px]">{m.excluded.map((d) => <li key={d.id}><strong>{d.name}:</strong> {d.reasons.join("; ")}.</li>)}</ul>
          </details>
        )}
        {/* Extra ranking actions, in the page flow just above the main button. */}
        {(proposal || (isHost && lockedCount > 0)) && (
          <div className={cn(col, center)}>
            {proposal && <LinkButton onClick={unlock}>Change my ranking</LinkButton>}
            {isHost && !proposal && lockedCount > 0 && <LinkButton onClick={pickNow}>Close ranking and pick #1</LinkButton>}
          </div>
        )}
        <div className={cta}>
          <Meta className="text-center text-muted">
            {proposal ? "Everyone locked in" : `${lockedCount} of ${readyIds.length} locked in${haveVotes && leader ? ` · group #1: ${leader.name}` : ""}`}
          </Meta>
          {proposal ? (
            <Button kind="primary" onClick={() => ctx.go("plan")}>See the plan<Icon name="arrow" /></Button>
          ) : locked ? (
            // One button does both jobs: it shows you're locked in, and tapping it unlocks so you can reorder.
            <Button kind="primary" icon="lock" aria-pressed="true" aria-label="Locked in. Tap to unlock and change your ranking." onClick={unlock}>
              Locked in · tap to change
            </Button>
          ) : (
            <Button kind="primary" onClick={lockIn}>Lock in my ranking</Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={topbar}>
        <IconButton icon="back" label="Back to the vibe check" onClick={() => ctx.go("vibe")} />
        <Meta>Trip ideas · {eligible.length}</Meta>
        <IconButton icon="refresh" label="Refresh ideas" onClick={() => { ctx.refresh(); toast("Checking for new ideas…"); }} />
      </div>
      <div className={titleblock}>
        <Text as="h1" variant="display-lg">rank ’em</Text>
        <Meta>{leader ? `Tap to open · group #1 so far: ${leader.name}` : "Tap to open · drag the handle to reorder"}</Meta>
      </div>
      {body}
      <ProposeSheet ctx={ctx} open={propose} onClose={() => setPropose(false)} />
    </>
  );
}
