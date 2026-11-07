"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREFS, api, dayDiff, money, saveMemberId } from "@/lib/client";
import type { InviteTemplate } from "@/lib/template";
import type { Theme } from "@/lib/types";
import { Btn, Shell } from "@/app/_components/Shell";
import { CoverPicker } from "./CoverPicker";

export default function NewTrip() {
  const router = useRouter();
  const [f, setF] = useState({
    hostName: "", title: "Spring break, somewhere.", note: "", theme: "pink" as Theme, cover: "", template: null as InviteTemplate | null,
    windowStart: "2027-03-01", windowEnd: "2027-03-31", nights: 5, maxBudget: 1200, vibes: [] as string[],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError(""); };

  async function submit() {
    if (!f.hostName.trim()) return setError("Tell your friends who’s hosting.");
    if (!f.title.trim()) return setError("Give the trip a title.");
    if (!f.windowStart || !f.windowEnd || f.windowEnd < f.windowStart) return setError("Choose a date window that ends after it starts.");
    if (dayDiff(f.windowStart, f.windowEnd) < f.nights) return setError(`Your window needs room for ${f.nights} nights.`);
    if (!(f.maxBudget > 0)) return setError("Set a maximum budget above $0.");
    setBusy(true);
    try {
      const r = await api<{ code: string; memberId: string }>("/api/trips", {
        ...f, hostName: f.hostName.trim(), title: f.title.trim(), note: f.note.trim(), cover: f.cover || undefined, template: f.template ?? undefined,
      });
      saveMemberId(r.code, r.memberId);
      router.push(`/t/${r.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the trip.");
      setBusy(false);
    }
  }

  return (
    <Shell footerNote="Sample fares">
      <div className="ew-intro"><div><div className="ew-kicker ew-muted" style={{ marginBottom: 9 }}>STEP ONE: THE HOST</div><h1>Start a trip.</h1><p>Set the basics, then send the link to your friends. They’ll add their own dates, budget, and airport.</p></div></div>
      <section className="ew-form">
        <div className="ew-grid2">
          <label className="ew-label">Your name<input maxLength={40} value={f.hostName} placeholder="Who’s hosting?" onChange={(e) => set({ hostName: e.target.value })} /></label>
          <label className="ew-label">Trip title<input maxLength={65} value={f.title} onChange={(e) => set({ title: e.target.value })} /></label>
        </div>
        <label className="ew-label">A note to the crew<textarea maxLength={250} value={f.note} placeholder="One beach. Good people." onChange={(e) => set({ note: e.target.value })} /></label>
        <CoverPicker
          theme={f.theme} cover={f.cover} template={f.template} onChange={set}
          brief={{ title: f.title, note: f.note, vibes: f.vibes, hostName: f.hostName, windowStart: f.windowStart }}
        />
        <div className="ew-grid2 ew-date-grid">
          <label className="ew-label">Earliest departure<input type="date" value={f.windowStart} onChange={(e) => set({ windowStart: e.target.value })} /></label>
          <label className="ew-label">Latest return<input type="date" value={f.windowEnd} onChange={(e) => set({ windowEnd: e.target.value })} /></label>
        </div>
        <div className="ew-grid2">
          <label className="ew-label">Trip length (nights)<input type="number" min={1} max={30} value={f.nights} onChange={(e) => set({ nights: Number(e.target.value) })} /></label>
          <label className="ew-label">Max budget per person ($)<input type="number" min={1} value={f.maxBudget} onChange={(e) => set({ maxBudget: Number(e.target.value) })} /></label>
        </div>
        <p className="ew-note">{money(f.maxBudget || 0)} is a ceiling for the whole group. Friends can set a lower limit, never a higher one.</p>
        <div><span className="ew-label">The vibe (pick up to 2)</span>
          <div className="ew-row" style={{ marginTop: 10 }}>{PREFS.map(([v, e, t]) => (
            <button key={v} className="ew-chip" aria-pressed={f.vibes.includes(v)} onClick={() => set({ vibes: f.vibes.includes(v) ? f.vibes.filter((x) => x !== v) : f.vibes.length < 2 ? [...f.vibes, v] : f.vibes })}>{e} {t}</button>
          ))}</div>
        </div>
        <div className="ew-error" role="alert">{error}</div>
        <div className="ew-form-bottom"><span /><Btn kind="ew-primary" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create the invite ↗"}</Btn></div>
      </section>
    </Shell>
  );
}
