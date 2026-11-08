"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadSession, rememberTrip, saveSession, type Snapshot } from "@/lib/client";
import { ButtonLink, Card, Meta, TabBar, Text, ToastProvider, useToast } from "@/components/ui";
import { cn, cta, screen, screenTabsPad, skeleton, titleblock } from "@/components/ui/tw";
import { AnswersScreen } from "./Answers";
import { InviteScreen, LandingScreen } from "./Invite";
import { PlanScreen } from "./Plan";
import { RankScreen } from "./Rank";
import { VibeScreen } from "./Vibe";
import type { Ctx, View } from "./common";

const POLL_MS = 4000;
const VIEWS: View[] = ["invite", "answers", "vibe", "rank", "plan"];
const fromHash = (): View | null => {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  return (VIEWS as string[]).includes(h) ? (h as View) : null;
};

export default function TripApp({ code }: { code: string }) {
  return <ToastProvider><Trip code={code} /></ToastProvider>;
}

function Trip({ code }: { code: string }) {
  const toast = useToast();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [tick, setTick] = useState(0);
  const settled = useRef(false);
  const epoch = useRef(0);

  // Load, then poll so results update as friends respond. The credential, when this device has one, rides on the request.
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      const mine = epoch.current;
      try {
        const s = await api<Snapshot>(`/api/trips/${code}`);
        if (!stop && mine === epoch.current) { setSnap(s); setError(""); }
      } catch (e) { if (!stop && mine === epoch.current) setError(e instanceof Error ? e.message : "Couldn’t load this trip."); }
    };
    load();
    const iv = setInterval(load, POLL_MS);
    return () => { stop = true; clearInterval(iv); };
  }, [code, tick]);

  const me = snap?.me ? snap.members.find((m) => m.id === snap.me) : undefined;

  // Open on the right screen once: where the link says, else where this person left off.
  useEffect(() => {
    if (!snap || settled.current) return;
    settled.current = true;
    if (me) rememberTrip(code, snap.trip.title);
    setView(fromHash() ?? (me?.ready ? (snap.trip.proposal ? "rank" : "vibe") : "invite"));
  }, [snap, me]);

  const go = useCallback((v: View) => {
    setView(v);
    window.history.replaceState(null, "", `#${v}`);
    window.scrollTo({ top: 0 });
  }, []);

  const run: Ctx["run"] = async (fn, okMsg) => {
    try { setSnap(await fn()); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e instanceof Error ? e.message : "Something went wrong."); return false; }
  };

  if (!snap || !view) {
    return (
      <main className={screen}>
        {error ? (
          <>
            <div className={cn(titleblock, "mt-10")}><Text as="h1" variant="display-lg">lost trip</Text><Meta>We couldn’t find that one</Meta></div>
            <Card><Text variant="body-md">{error}. Check the invite link, or start a new trip.</Text></Card>
            <div className={cta}><ButtonLink kind="primary" href="/new">Start a trip</ButtonLink></div>
          </>
        ) : (
          <>
            <div className={cn(skeleton, "mt-14 h-[300px] rounded-xl")} />
            <Meta className="text-muted" aria-live="polite">opening your trip…</Meta>
          </>
        )}
      </main>
    );
  }

  const ctx: Ctx = {
    code, snap, me, go, run,
    apply: setSnap,
    refresh: () => setTick((n) => n + 1),
    onJoined: (id, fresh, token) => {
      epoch.current += 1;
      const kept = token ?? loadSession(code)?.token;
      if (kept) saveSession(code, { memberId: id, token: kept });
      rememberTrip(code, fresh.trip.title);
      const { token: _token, memberId: _memberId, ...rest } = fresh as Snapshot & { token?: string; memberId?: string };
      void _token; void _memberId;
      setSnap(rest);
    },
  };

  const isHost = me?.id === snap.trip.hostMemberId;
  // A friend who hasn't answered yet only gets the landing page and the questions, nothing else.
  const gated = !me?.ready && view !== "invite" && view !== "answers";
  const shown: View = gated ? "invite" : view;
  const tabs = !!me?.ready && shown !== "answers";
  const Screen = {
    invite: isHost ? InviteScreen : LandingScreen, answers: AnswersScreen, vibe: VibeScreen, rank: RankScreen, plan: PlanScreen,
  }[shown];

  return (
    <main className={cn(screen, tabs && screenTabsPad)} data-tabs={tabs ? "" : undefined}>
      <Screen key={shown} {...ctx} />
      {tabs && (
        <TabBar current={shown} tabs={[
          { id: "invite", label: "Invite", icon: "ticket", onClick: () => go("invite") },
          { id: "vibe", label: "Vibe", icon: "pulse", onClick: () => go("vibe") },
          { id: "rank", label: "Rank", icon: "rank", onClick: () => go("rank") },
          { id: "plan", label: "Plan", icon: "plan", onClick: () => go("plan") },
        ]} />
      )}
    </main>
  );
}
