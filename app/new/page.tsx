"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREFS, THEMES, api, dayDiff, money, saveMemberId } from "@/lib/client";
import { Btn, Shell } from "@/app/_components/Shell";
import { Poster } from "@/app/_components/views";
import type { Theme } from "@/lib/types";

export default function NewTrip() {
  const router = useRouter();
  const [f, setF] = useState({
    hostName: "", title: "Spring break, somewhere.", note: "", theme: "pink" as Theme,
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
      const r = await api<{ code: string; memberId: string }>("/api/trips", { ...f, hostName: f.hostName.trim(), title: f.title.trim(), note: f.note.trim() });
      saveMemberId(r.code, r.memberId);
      router.push(`/t/${r.code}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the trip.");
      setBusy(false);
    }
  }

  return (
    <Shell footerNote="Send one link. Skip the group-chat spiral.">
      <div className="ew-intro">
        <div>
          <div className="ew-kicker ew-muted" style={{ marginBottom: 9 }}>STEP ONE: THE HOST</div>
          <h1>Start a trip.</h1>
          <p>Set the ceiling, pick a mood, then drop the invite in the chat. Friends add their own dates, budget, and airport.</p>
        </div>
      </div>
      <div className="ew-create">
        <aside className="ew-create-preview">
          <Poster theme={f.theme} title={f.title} year={f.windowStart.slice(0, 4)} />
          <div>
            <span className="ew-label">Cover mood</span>
            <div className="ew-row" style={{ marginTop: 10, gap: 17 }}>
              {THEMES.map((t) => (
                <button key={t.id} type="button" className="ew-theme" style={{ background: t.color }} aria-label={t.label} aria-pressed={f.theme === t.id} onClick={() => set({ theme: t.id })} />
              ))}
            </div>
            <p className="ew-note" style={{ marginTop: 8 }}>{THEMES.find((t) => t.id === f.theme)?.label}. This is what your friends see first.</p>
          </div>
        </aside>
        <section className="ew-form">
          <div className="ew-grid2">
            <label className="ew-label">Your name<input maxLength={40} value={f.hostName} placeholder="Who’s hosting?" onChange={(e) => set({ hostName: e.target.value })} /></label>
            <label className="ew-label">Trip title<input maxLength={65} value={f.title} onChange={(e) => set({ title: e.target.value })} /></label>
          </div>
          <label className="ew-label">A note to the crew<textarea maxLength={250} value={f.note} placeholder="One beach. Good people." onChange={(e) => set({ note: e.target.value })} /></label>
          <div className="ew-grid2 ew-date-grid">
            <label className="ew-label">Earliest departure<input type="date" value={f.windowStart} onChange={(e) => set({ windowStart: e.target.value })} /></label>
            <label className="ew-label">Latest return<input type="date" value={f.windowEnd} onChange={(e) => set({ windowEnd: e.target.value })} /></label>
          </div>
          <div className="ew-grid2">
            <label className="ew-label">Trip length (nights)<input type="number" min={1} max={30} value={f.nights} onChange={(e) => set({ nights: Number(e.target.value) })} /></label>
            <label className="ew-label">Max budget per person ($)<input type="number" min={1} value={f.maxBudget} onChange={(e) => set({ maxBudget: Number(e.target.value) })} /></label>
          </div>
          <p className="ew-note">{money(f.maxBudget || 0)} is a ceiling, not a target. Friends can go lower, never higher — and you can always move this down later by keeping cheaper ideas.</p>
          <div>
            <span className="ew-label">The vibe (pick up to 2)</span>
            <div className="ew-row" style={{ marginTop: 10 }}>{PREFS.map(([v, e, t]) => (
              <button key={v} type="button" className="ew-chip" aria-pressed={f.vibes.includes(v)} onClick={() => set({ vibes: f.vibes.includes(v) ? f.vibes.filter((x) => x !== v) : f.vibes.length < 2 ? [...f.vibes, v] : f.vibes })}>{e} {t}</button>
            ))}</div>
          </div>
          <div className="ew-error" role="alert">{error}</div>
          <div className="ew-form-bottom"><span className="ew-note">No account needed.</span><Btn kind="ew-primary" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create the invite ↗"}</Btn></div>
        </section>
      </div>
    </Shell>
  );
}
