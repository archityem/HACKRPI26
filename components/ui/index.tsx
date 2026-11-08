"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { avatar, avatarDashed, avatarMd, avatarRing, btn, btnKind, btnSm, card, cardPress, cardTight, chip, chipGrow, chipSurface, cn, field, iconBtn, linkBtn, progress, progressBit, scrim, sheet, sheetHandle, tabbar, tabBtn, tabMeta, toast, toastBtn, toneClass, type, type TextStyle } from "./tw";

// ---------- Icons (inline, bold stroke; decorative unless the parent button has a label) ----------
const PATHS = {
  close: "M6 6l12 12M18 6L6 18",
  back: "M15 5l-7 7 7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  plus: "M12 5v14M5 12h14",
  share: "M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  send: "M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z",
  copy: "M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
  calendar: "M5 5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4",
  phone: "M9 2.5h6a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-13a3 3 0 0 1 3-3zM11 18h2",
  passport: "M7.5 3h9A2.5 2.5 0 0 1 19 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 16h6",
  lock: "M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  drag: "M5 8h14M5 12h14M5 16h14",
  ticket: "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10",
  pulse: "M3 12h4l2.5-6 4 12 2.5-6H21",
  rank: "M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  plan: "M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7zM9 4v13M15 7v12.5",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 2.5 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---------- Text ----------
export type { TextStyle };
export function Text({ as: Tag = "span", variant, className = "", children, ...rest }: { as?: "span" | "p" | "h1" | "h2" | "h3" | "div"; variant: TextStyle; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const T = Tag as "span";
  return <T className={cn(type[variant], className)} {...rest}>{children}</T>;
}
export const Meta = ({ children, className = "" }: { children: ReactNode; className?: string }) => <span data-meta="" className={cn(type.meta, className)}>{children}</span>;

// ---------- Button ----------
type Kind = "primary" | "secondary" | "soft" | "ink" | "danger";
export function Button({ kind = "secondary", icon, small, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; icon?: IconName; small?: boolean }) {
  return (
    <button type="button" className={cn(btn, btnKind[kind], small && btnSm, className)} {...rest}>
      {icon && <Icon name={icon} size={icon === "arrow" || icon === "plus" ? 20 : 18} />}{children}
    </button>
  );
}
export function ButtonLink({ href, kind = "secondary", icon, children }: { href: string; kind?: Kind; icon?: IconName; children: ReactNode }) {
  return <Link href={href} className={cn(btn, btnKind[kind])}>{icon && <Icon name={icon} />}{children}</Link>;
}
export const LinkButton = ({ children, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" className={linkBtn} {...p}>{children}</button>;

export function IconButton({ icon, label, onClick, href }: { icon: IconName; label: string; onClick?: () => void; href?: string }) {
  if (href) return <Link href={href} className={iconBtn} aria-label={label}><Icon name={icon} /></Link>;
  return <button type="button" className={iconBtn} aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

// ---------- Chip ----------
export function Chip({ selected, grow, surface, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; grow?: boolean; surface?: boolean }) {
  return (
    <button type="button" aria-pressed={selected ?? false} className={cn(chip, grow && chipGrow, surface && chipSurface)} {...rest}>
      {selected && <Icon name="check" size={16} stroke={3} />}{children}
    </button>
  );
}

// ---------- Card ----------
export type Tone = "surface" | "ink" | "sage" | "apricot" | "dusk" | "lavender" | "rose" | "butter" | "sky";
export function Card({ tone = "surface", tight, as, className = "", children, ...rest }: { tone?: Tone; tight?: boolean; as?: "button" | "div"; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement> & { onClick?: () => void }) {
  const cls = cn(card, tight && cardTight, as === "button" && cardPress, toneClass[tone], className);
  if (as === "button") return <button type="button" data-tone={tone} className={cls} {...(rest as object)}>{children}</button>;
  return <div data-tone={tone} className={cls} {...rest}>{children}</div>;
}

// ---------- Input: a label above the value, set into a white card ----------
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={field}><Meta>{label}</Meta>{children}</label>;
}

// ---------- Avatar ----------
const AVATAR_TONES: [string, string][] = [["var(--ink)", "var(--white)"], ["var(--dusk)", "var(--white)"], ["var(--butter)", "var(--ink)"], ["var(--rose)", "var(--ink)"], ["var(--sage)", "var(--ink)"], ["var(--apricot)", "var(--ink)"], ["var(--sky)", "var(--ink)"], ["var(--lavender)", "var(--ink)"]];
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

export function Avatar({ name, index = 0, you, ring, size }: { name: string; index?: number; you?: boolean; ring?: string; size?: "md" }) {
  // "You" is ink on a white card, and white when the avatar sits on a colored ticket (ring is that color).
  const [bg, fg] = you ? (ring ? ["var(--white)", "var(--ink)"] : ["var(--ink)", "var(--white)"]) : AVATAR_TONES[index % AVATAR_TONES.length];
  return (
    <span className={cn(avatar, avatarRing, size === "md" && avatarMd)} role="img" aria-label={you ? `${name} (you)` : name} style={{ background: bg, color: fg, ["--ring" as string]: ring }}>
      {you ? "YOU" : initials(name)}
    </span>
  );
}
export const EmptySeat = () => <span data-seat="" className={cn(avatar, avatarMd, avatarDashed)} aria-hidden="true" />;

// ---------- Progress ----------
export function Progress({ total, done }: { total: number; done: number }) {
  return <div className={progress} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>{Array.from({ length: total }, (_, i) => <i key={i} className={progressBit} data-on={i < done ? "" : undefined} />)}</div>;
}

// ---------- Sheet: a bottom sheet with a scrim ----------
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className={scrim} onClick={onClose} aria-hidden="true" />
      <div className={sheet} role="dialog" aria-modal="true" aria-label={label}>
        <div className={sheetHandle} aria-hidden="true" />
        {children}
      </div>
    </>
  );
}

// ---------- Tab bar ----------
export function TabBar({ tabs, current }: { tabs: { id: string; label: string; icon: IconName; onClick: () => void }[]; current: string }) {
  return (
    <nav className={tabbar} aria-label="Trip">
      {tabs.map((t) => (
        <button key={t.id} type="button" className={tabBtn} aria-current={t.id === current ? "page" : undefined} onClick={t.onClick}>
          <Icon name={t.icon} size={20} stroke={2.4} /><Meta className={tabMeta}>{t.label}</Meta>
        </button>
      ))}
    </nav>
  );
}

// ---------- Toast with Undo ----------
interface ToastOpts { undo?: () => void }
const ToastCtx = createContext<(msg: string, o?: ToastOpts) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; undo?: () => void; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((msg: string, o?: ToastOpts) => {
    clearTimeout(timer.current);
    setT({ msg, undo: o?.undo, n: Date.now() });
    timer.current = setTimeout(() => setT(null), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        {t && (
          <div className={toast} key={t.n}>
            <span>{t.msg}</span>
            {t.undo && <button type="button" className={toastBtn} onClick={() => { t.undo?.(); setT(null); }}>Undo</button>}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confetti: one burst, used once when a trip locks ----------
export function Confetti() {
  const colors = ["var(--sage)", "var(--apricot)", "var(--dusk)", "var(--lavender)", "var(--rose)", "var(--butter)", "var(--sky)"];
  return (
    <div className="pointer-events-none fixed top-[30%] left-1/2 z-[70] h-0 w-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const d = 120 + ((i * 37) % 140);
        return <i key={i} className="absolute h-3.5 w-2 animate-confetti rounded-[2px]" style={{ background: colors[i % colors.length], ["--dx" as string]: `${Math.cos(a) * d}px`, ["--dy" as string]: `${Math.sin(a) * d + 80}px`, ["--rot" as string]: `${(i * 53) % 360}deg` }} />;
      })}
    </div>
  );
}

// ---------- Count-up for prices (<= 600ms, instant with Reduce Motion) ----------
export function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
