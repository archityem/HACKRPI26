"use client";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/components/ui";
import type { PublicMember, Snapshot } from "@/lib/client";

export type View = "invite" | "answers" | "vibe" | "rank" | "plan";

export interface Ctx {
  code: string;
  snap: Snapshot;
  me?: PublicMember;
  go: (v: View) => void;
  /** Run an API call that returns a fresh snapshot, show it, and report whether it worked. */
  run: (fn: () => Promise<Snapshot>, okMsg?: string) => Promise<boolean>;
  apply: (s: Snapshot) => void;
  refresh: () => void;
  onJoined: (id: string, snap: Snapshot) => void;
}

// ---------- labels ----------
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const parts = (d: string) => ({ m: Number(d.slice(5, 7)) - 1, d: Number(d.slice(8, 10)) });
/** "MAR 6–22", or "MAR 28–APR 3" across months. */
export function windowLabel(a: string, b: string) {
  const x = parts(a), y = parts(b);
  return x.m === y.m ? `${MONTHS[x.m]} ${x.d}–${y.d}` : `${MONTHS[x.m]} ${x.d}–${MONTHS[y.m]} ${y.d}`;
}
/** "Mar 12–16" in sentence case, for meta lines that read better that way. */
export const windowShort = (a: string, b: string) => windowLabel(a, b).replace(/\b([A-Z])([A-Z]{2})\b/g, (_, f, r) => f + r.toLowerCase());
export const mmdd = (d: string) => `${d.slice(5, 7)}/${d.slice(8, 10)}`;
export const monthName = (d: string) => new Date(d + "T12:00:00").toLocaleString("en-US", { month: "long" });
export const weekday = (d: string) => new Date(d + "T12:00:00").toLocaleString("en-US", { weekday: "short" });
export const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const PREF_SHORT: Record<string, string> = { beach: "Beach", food: "Food", nature: "Outdoors", nightlife: "Nightlife", culture: "Culture", city: "City" };
export const prefShort = (id: string) => PREF_SHORT[id] ?? id;
export const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);
export { initials };

// ---------- link, sharing, install ----------
export const tripLink = (code: string) => (typeof window === "undefined" ? `/t/${code}` : `${window.location.origin}/t/${code}`);

/** Share with the system sheet where there is one, otherwise copy. Resolves to what happened. */
export async function shareOrCopy(text: string, url: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") { await navigator.share({ text, url }); return "shared"; }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "failed"; // closed the sheet: not an error worth a message
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return "copied"; } catch { return "failed"; }
}

interface InstallEvent extends Event { prompt: () => Promise<void> }
/** "Get the app": the browser's install prompt when it offers one, otherwise a how-to for the home screen. */
export function useInstall() {
  const evt = useRef<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); evt.current = e as InstallEvent; };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const install = async () => { if (evt.current) { await evt.current.prompt(); evt.current = null; } else setHelp(true); };
  return { install, help, closeHelp: () => setHelp(false) };
}
