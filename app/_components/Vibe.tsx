"use client";
import { AIRPORTS, money, range, short } from "@/lib/client";
import { AlertCard, AvatarRow, CrewRow, DateDots, StatTile, VibeBars } from "@/components/trip";
import { Button, Card, Icon, IconButton, Meta, Text, useToast } from "@/components/ui";
import { nudgeMessage } from "@/lib/messages";
import { andList, prefShort, shareOrCopy, tripLink, windowShort, type Ctx } from "./common";

const DAY = 86_400_000;
const at = (d: string, n: number) => new Date(new Date(d + "T12:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);

export function VibeScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const m = snap.match;
  const toast = useToast();
  const ready = snap.members.filter((x) => x.ready);
  const pending = snap.members.filter((x) => !x.ready);
  const link = tripLink(ctx.code);

  // One dot per day of the host's window: dark = everyone free, gray = some, light = nobody.
  const total = Math.min(62, Math.max(1, Math.round((new Date(t.windowEnd).getTime() - new Date(t.windowStart).getTime()) / DAY) + 1));
  const days = Array.from({ length: total }, (_, i) => {
    const day = at(t.windowStart, i);
    const free = ready.filter((x) => x.start <= day && day <= x.end).length;
    return !ready.length || free === 0 ? "none" : free === ready.length ? "all" : "some";
  }) as ("all" | "some" | "none")[];
  const best: [number, number] | null = m.overlap && m.start && m.end
    ? [Math.max(0, Math.round((new Date(m.start).getTime() - new Date(t.windowStart).getTime()) / DAY)), Math.min(total - 1, Math.round((new Date(m.end).getTime() - new Date(t.windowStart).getTime()) / DAY))]
    : null;

  const origins = new Map<string, number>();
  ready.forEach((x) => origins.set(x.origin, (origins.get(x.origin) ?? 0) + 1));
  const from = [...origins.entries()].sort((a, b) => b[1] - a[1]);
  const prefs = new Map<string, number>();
  ready.forEach((x) => x.prefs.forEach((p) => prefs.set(p, (prefs.get(p) ?? 0) + 1)));
  const vibeRows = [...prefs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, count]) => ({ label: prefShort(id), count }));

  async function poke() {
    const r = await shareOrCopy(nudgeMessage({ title: t.title, names: pending.map((p) => p.name), link }));
    if (r === "copied") toast("Link copied. Poke them in the gc.");
    if (r === "failed") toast("Select the link and copy it.");
  }
  async function share() {
    const r = await shareOrCopy(`Where should we go? ${t.title}:`, link);
    if (r === "copied") toast("Link copied.");
  }

  return (
    <>
      <div className="topbar">
        <IconButton icon="back" label="Back to the invite" onClick={() => ctx.go("invite")} />
        <Meta>{t.title}</Meta>
        <IconButton icon="share" label="Share invite" onClick={share} />
      </div>
      <div className="titleblock">
        <Text as="h1" variant="display-lg">vibe check</Text>
        <Meta>Updates live · nobody waits on anybody</Meta>
      </div>

      <div className="stat" data-tone="sage" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text variant="numeral-lg">{ready.length}/{snap.members.length}</Text>
        <div className="col" style={{ alignItems: "flex-end", gap: 8 }}>
          <Meta>Answered</Meta>
          <AvatarRow ring="var(--sage)" names={ready.slice(0, 6).map((x) => ({ id: x.id, name: x.name }))} meId={me?.id} seats={Math.min(2, pending.length)} />
        </div>
      </div>

      <div className="grid2">
        <StatTile label={m.budgetRange ? "Budget range" : "Budget cap"} value={m.budgetRange ? `${money(m.budgetRange[0])}–${Math.round(m.budgetRange[1]).toLocaleString("en-US")}` : money(t.maxBudget)} sub="Per person" />
        <StatTile label="Flying from" value={from.length ? from.slice(0, 3).map(([a]) => a).join(" · ") : "—"} sub={from.length ? `${from.map(([, n]) => n).slice(0, 3).join(" · ")} ${ready.length === 1 ? "person" : "people"}` : "No answers yet"} />
      </div>

      <Card>
        <Meta className="muted">Best dates</Meta>
        <DateDots days={days} best={best} label={best && m.start && m.end ? `Availability from ${windowShort(t.windowStart, t.windowEnd)}. ${windowShort(m.start, m.end)} works for everyone who answered.` : "Availability across the trip window. No shared dates yet."} />
        <div className="row row--between t-meta">
          <span className="muted">{short(t.windowStart)}</span>
          <span>{best && m.start && m.end ? `${windowShort(m.start, m.end)} · ${ready.length} of ${ready.length} free` : ready.length ? `No ${t.nights}-night overlap yet` : "Waiting on answers"}</span>
          <span className="muted">{short(t.windowEnd)}</span>
        </div>
      </Card>

      {vibeRows.length > 0 && (
        <Card>
          <Meta className="muted">Vibe votes</Meta>
          <VibeBars rows={vibeRows} />
        </Card>
      )}

      <Card>
        <div className="row row--between"><Meta className="muted">The crew</Meta><Meta className="muted">{range(t.windowStart, t.windowEnd)}</Meta></div>
        {snap.members.map((x, i) => (
          <CrewRow key={x.id} name={x.name} index={i} you={x.id === me?.id} host={x.id === t.hostMemberId}
            meta={x.ready ? `${AIRPORTS[x.origin] ?? x.origin} · ${x.prefs.map(prefShort).join(", ")}` : "Hasn’t answered yet"}
            right={x.id === me?.id ? <Button kind="soft" onClick={() => ctx.go("answers")}>{x.ready ? "Edit" : "Answer"}</Button> : x.ready ? <Icon name="check" size={18} stroke={3} /> : undefined} />
        ))}
      </Card>

      {pending.length > 0 && (
        <AlertCard meta={`${pending.length} still out`} text={andList(pending.map((p) => p.name))} action="Poke them" onAction={poke} />
      )}

      <div className="cta">
        {me?.ready
          ? <Button kind="primary" onClick={() => ctx.go("rank")}>See trip ideas<Icon name="arrow" /></Button>
          : <Button kind="primary" onClick={() => ctx.go("answers")}>Add my answers<Icon name="arrow" /></Button>}
      </div>
    </>
  );
}
