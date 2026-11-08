import type { CSSProperties } from "react";

/**
 * The Tripflow mark: a notched ticket whose tear line is a wave.
 * The notches and wave are "cut" out of the ticket, so they take the color of whatever it sits on (`cut`).
 */
export function LogoMark({ size = 32, cut = "var(--background)", className }: { size?: number; cut?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true" style={{ color: "inherit", flex: "none" }}>
      <rect x="6" y="24" width="108" height="72" rx="17" fill="currentColor" />
      <circle cx="6" cy="60" r="11" fill={cut} />
      <circle cx="114" cy="60" r="11" fill={cut} />
      <path d="M26 60C40 34 54 34 62 60S84 86 94 60" fill="none" stroke={cut} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

const WORD: CSSProperties = {
  fontFamily: "var(--font-display)", fontWeight: 900, fontStretch: "var(--stretch-expanded)", letterSpacing: "-0.045em", lineHeight: 0.9, textTransform: "none",
};

/** The mark plus the wordmark. `size` is the mark's height in px; the word scales with it. */
export function Logo({ size = 28, cut, wordmark = true, className }: { size?: number; cut?: string; wordmark?: boolean; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.28 }} role="img" aria-label="Tripflow">
      <LogoMark size={size} cut={cut} />
      {wordmark && <span aria-hidden="true" style={{ ...WORD, fontSize: size * 0.82 }}>tripflow</span>}
    </span>
  );
}
