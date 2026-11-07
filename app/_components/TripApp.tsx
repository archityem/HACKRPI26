"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadMemberId, rememberTrip, saveMemberId, type Snapshot } from "@/lib/client";
import { Shell, type View } from "./Shell";
import { CrewView, IdeasView, InviteView, OnboardView, PlanView, type Ctx } from "./views";

const POLL_MS = 4000;

export default function TripApp({ code, justCreated }: { code: string; justCreated?: boolean }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [meId, setMeId] = useState<string | null | undefined>(undefined); // undefined = not read from storage yet
  const [view, setView] = useState<View>("invite");
  const [toastMsg, setToastMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const greeted = useRef(false);

  const toast = useCallback((s: string) => {
    setToastMsg(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 4200);
  }, []);

  useEffect(() => { setMeId(loadMemberId(code)); }, [code]);

  // Load, then poll so results update as friends respond.
  useEffect(() => {
    if (meId === undefined) return;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const s = await api<Snapshot>(`/api/trips/${code}${meId ? `?me=${meId}` : ""}`);
        if (!stop) { setSnap(s); setError(""); }
      } catch (e) { if (!stop) setError(e instanceof Error ? e.message : "Couldn’t load this trip."); }
    };
    load();
    const iv = setInterval(load, POLL_MS);
    return () => { stop = true; clearInterval(iv); };
  }, [code, meId]);

  const me = snap?.members.find((m) => m.id === meId);

  // After creating a trip, stay on the invite so the host can copy the link first.
  useEffect(() => {
    if (snap && !greeted.current) {
      greeted.current = true;
      if (me) rememberTrip(code, snap.trip.title);
      if (justCreated) toast("Your invite is live. Send the link, then add your own details.");
      else if (me && !me.ready && me.id === snap.trip.hostMemberId) setView("onboard");
    }
  }, [snap, justCreated, toast, me, code]);

  const run: Ctx["run"] = async (fn, okMsg) => {
    try { setSnap(await fn()); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e instanceof Error ? e.message : "Something went wrong."); return false; }
  };

  if (!snap) {
    return (
      <Shell>
        <div className="ew-empty">
          <span className="ew-empty-icon">☁</span>
          <h2>{error ? "We couldn’t find that trip." : "Loading your trip…"}</h2>
          {error && <><p>{error}. Check the invite link, or start a new trip.</p><a className="ew-btn ew-primary" href="/new">Start a trip</a></>}
        </div>
      </Shell>
    );
  }

  const ctx: Ctx = {
    code, snap, me, run, toast,
    go: setView,
    onJoined: (id, fresh) => { saveMemberId(code, id); rememberTrip(code, fresh.trip.title); setMeId(id); setSnap(fresh); },
  };
  // Render as components (not plain calls) so each view keeps its own hooks.
  const View = { invite: InviteView, onboard: OnboardView, ideas: IdeasView, crew: CrewView, plan: PlanView }[view];

  return <Shell view={view} onNav={setView} toast={toastMsg} footerNote={`Trip ${code} · ${snap.ai.source === "gemini" ? "AI-estimated fares" : "sample fares"}`}><View key={view} {...ctx} /></Shell>;
}
