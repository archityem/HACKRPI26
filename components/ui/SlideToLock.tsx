"use client";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const THUMB = 48; // matches --tap (44) plus a little room; the track is --btn-primary (56) tall
const PAD = 4;
const COMMIT = 0.85; // how far (0..1) you have to slide before letting go counts

/** A padlock whose shackle lifts and tilts while `p` is near 0 and snaps shut at 1. */
function Padlock({ p, pop }: { p: number; pop: boolean }) {
  const open = 1 - p;
  return (
    <svg className={`slide__lock ${pop ? "slide__lock--pop" : ""}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: `rotate(${open * -24}deg)` }}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" style={{ transformOrigin: "8px 11px", transformBox: "view-box", transform: `translateY(${open * -3}px) rotate(${open * -32}deg)` }} />
    </svg>
  );
}

/**
 * Slide the thumb to the right to lock in; slide it back to take it back. The padlock turns as you drag and
 * snaps shut when it commits. Also a real switch for keyboards and screen readers (Space / Enter / arrows).
 * `onLock` / `onUnlock` resolve to whether it worked; if not, the thumb slides back.
 */
export function SlideToLock({ locked, onLock, onUnlock, disabled, label, lockedLabel }: {
  locked: boolean;
  onLock: () => Promise<boolean> | boolean;
  onUnlock: () => Promise<boolean> | boolean;
  disabled?: boolean;
  label: string; // shown while open, e.g. "Slide to lock in"
  lockedLabel: string; // shown while locked, e.g. "Locked in · slide back to change"
}) {
  const track = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [visual, setVisual] = useState(locked); // what we show right now; follows `locked` once the server agrees
  const [drag, setDrag] = useState<number | null>(null); // px while a finger/mouse is holding the thumb
  const [pop, setPop] = useState(0); // bumps each time the lock snaps shut, to replay its animation
  const start = useRef({ x: 0, from: 0 });
  const busy = useRef(false);

  useLayoutEffect(() => {
    const measure = () => track.current && setTravel(Math.max(0, track.current.clientWidth - THUMB - PAD * 2));
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (!busy.current) setVisual(locked); }, [locked]);

  async function commit(next: boolean) {
    if (busy.current) return;
    busy.current = true;
    setDrag(null);
    setVisual(next);
    if (next) setPop((n) => n + 1);
    let ok = false;
    try { ok = await (next ? onLock() : onUnlock()); } catch { ok = false; }
    busy.current = false;
    if (!ok) setVisual(!next); // it didn't take: slide back
  }

  function down(e: PointerEvent<HTMLButtonElement>) {
    if (disabled || busy.current || !travel) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, from: visual ? travel : 0 };
    setDrag(start.current.from);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (drag === null) return;
    setDrag(Math.min(travel, Math.max(0, start.current.from + e.clientX - start.current.x)));
  }
  function up() {
    if (drag === null) return;
    const frac = drag / travel;
    if (!visual && frac >= COMMIT) void commit(true);
    else if (visual && frac <= 1 - COMMIT) void commit(false);
    else setDrag(null); // not far enough: spring back
  }
  function key(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || (e.key === "ArrowRight" && !visual) || (e.key === "ArrowLeft" && visual)) {
      e.preventDefault();
      void commit(!visual);
    }
  }

  const pos = drag ?? (visual ? travel : 0);
  const p = travel ? pos / travel : visual ? 1 : 0; // 0 open … 1 locked
  return (
    <div ref={track} className="slide" data-locked={visual ? "" : undefined} data-dragging={drag !== null ? "" : undefined} data-disabled={disabled ? "" : undefined}>
      <div className="slide__fill" style={{ width: pos + THUMB / 2, opacity: pos > 2 ? 1 : 0 }} />
      <span className="slide__label t-label" style={{ opacity: visual ? 1 : Math.max(0, 1 - p * 1.6) }}>{visual ? lockedLabel : label}</span>
      <button
        type="button" role="switch" aria-checked={visual} aria-label={visual ? lockedLabel : label} disabled={disabled}
        className="slide__thumb" style={{ transform: `translateX(${pos}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} onKeyDown={key}
      >
        <Padlock key={pop} p={p} pop={pop > 0 && visual} />
      </button>
    </div>
  );
}
