"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREFS, api, dayDiff, money, rememberTrip, saveSession } from "@/lib/client";
import { Button, Card, Chip, Field, Icon, IconButton, Meta, Text } from "@/components/ui";
import { chips, cn, cta, dates, err, hint13, iconSpacer, rangeInput, row, screen, titleblock, topbar, type } from "@/components/ui/tw";
import { prefShort } from "../_components/common";
import { EditableAmount } from "../_components/EditableAmount";

const LENGTHS: [number, string][] = [[3, "2–3 nights"], [5, "4–5 nights"], [7, "A week"]];

export default function NewTrip() {
  const router = useRouter();
  const [f, setF] = useState({
    hostName: "", title: "Spring Break ’27", note: "",
    windowStart: "2027-03-06", windowEnd: "2027-03-22", nights: 5, maxBudget: 900, vibes: [] as string[],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError(""); };

  async function submit() {
    if (!f.hostName.trim()) return setError("Tell your friends who’s hosting.");
    if (!f.title.trim()) return setError("Give the trip a name.");
    if (!f.windowStart || !f.windowEnd || f.windowEnd < f.windowStart) return setError("Choose dates that end after they start.");
    if (dayDiff(f.windowStart, f.windowEnd) < f.nights) return setError(`Your dates need room for ${f.nights} nights.`);
    if (!(f.maxBudget > 0)) return setError("Set a budget above $0.");
    if (f.maxBudget > 1_000_000) return setError("Keep the budget at $1,000,000 or less.");
    setBusy(true);
    try {
      const r = await api<{ code: string; memberId: string; token: string }>("/api/trips", {
        ...f, hostName: f.hostName.trim(), title: f.title.trim(), note: f.note.trim(),
      });
      if (!r.token) throw new Error("Couldn’t sign this device in.");
      saveSession(r.code, { memberId: r.memberId, token: r.token });
      rememberTrip(r.code, f.title.trim());
      router.push(`/t/${r.code}#invite`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t make the invite.");
      setBusy(false);
    }
  }

  return (
    <main className={screen}>
      <div className={topbar}>
        <IconButton icon="close" label="Close" href="/" />
        <Meta>New trip</Meta>
        <span className={iconSpacer} />
      </div>
      <div className={titleblock}>
        <Text as="h1" variant="display-lg">start a trip</Text>
        <Text as="p" variant="body-md" className="text-muted">Set the basics. Your friends fill in the rest.</Text>
      </div>

      <Card>
        <Field label="Your first name"><input maxLength={40} value={f.hostName} autoComplete="given-name" placeholder="Who’s hosting?" onChange={(e) => set({ hostName: e.target.value })} /></Field>
        <Field label="Trip name"><input maxLength={65} value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <div className={dates}>
          <Field label="Earliest out"><input type="date" value={f.windowStart} onChange={(e) => set({ windowStart: e.target.value })} /></Field>
          <Field label="Latest back"><input type="date" value={f.windowEnd} onChange={(e) => set({ windowEnd: e.target.value })} /></Field>
        </div>
        <div className={row} role="group" aria-label="Trip length">
          {LENGTHS.map(([n, label]) => <Chip key={n} grow selected={f.nights === n} onClick={() => set({ nights: n })}>{label}</Chip>)}
        </div>
        <Field label="A note to the crew (optional)"><textarea maxLength={250} value={f.note} placeholder="One beach. Good people." onChange={(e) => set({ note: e.target.value })} /></Field>
      </Card>

      <Card tone="dusk">
        <div className={cn(row, "justify-between")}><label htmlFor="budget" className={type.meta}>Max budget / person</label><Meta>Ceiling</Meta></div>
        <EditableAmount id="budget-amount" label="Max budget per person, in dollars. Type your own amount." size="numeral-lg" value={f.maxBudget} onChange={(n) => set({ maxBudget: n })} />
        <input id="budget" className={rangeInput} type="range" min={0} max={5000} step={50} value={Math.min(f.maxBudget, 5000)} onChange={(e) => set({ maxBudget: Number(e.target.value) })} />
      </Card>

      <Card>
        <div className={cn(row, "justify-between")}><Meta>Vibe</Meta><Meta className="text-muted">Pick 2 · {f.vibes.length}/2</Meta></div>
        <div className={chips}>{PREFS.map(([v]) => (
          <Chip key={v} selected={f.vibes.includes(v)} onClick={() => set({ vibes: f.vibes.includes(v) ? f.vibes.filter((x) => x !== v) : f.vibes.length < 2 ? [...f.vibes, v] : f.vibes })}>{prefShort(v)}</Chip>
        ))}</div>
      </Card>

      <div className={err} role="alert">{error}</div>
      <div className={cta}>
        <Button kind="primary" disabled={busy} onClick={submit}>{busy ? "Making it…" : "Make the invite"}{!busy && <Icon name="arrow" />}</Button>
      </div>
    </main>
  );
}
