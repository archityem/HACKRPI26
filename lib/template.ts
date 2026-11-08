// AI-designed invite templates. A template is plain data: the poster renders it through CSS variables and a
// fixed set of layout classes, so nothing the model returns can inject markup or arbitrary CSS.

import type { Theme } from "./types";

export const LAYOUTS = ["poster", "stacked", "ticket", "centered"] as const;
export const FONTS = ["fraunces", "playfair", "space", "caveat"] as const;
export const DECOS = ["spark", "curves", "dots", "stripes"] as const;

export type Layout = (typeof LAYOUTS)[number];
export type FontKey = (typeof FONTS)[number];
export type Deco = (typeof DECOS)[number];

export interface InviteTemplate {
  layout: Layout;
  palette: { bg: string; ink: string; accent: string }; // #rrggbb
  font: FontKey;
  headline: string[]; // 1-3 short lines; the last is rendered italic
  kicker: string; // top strip
  footer: string; // bottom strip
  sticker: string; // round sticker text
  motif: string; // one emoji, repeated as decoration
  deco: Deco;
}

/** CSS font-family for each allowed headline font (loaded in app/layout.tsx). */
export const FONT_STACK: Record<FontKey, string> = {
  fraunces: "'Fraunces',serif",
  playfair: "'Playfair Display',serif",
  space: "'Space Grotesk','DM Sans',sans-serif",
  caveat: "'Caveat','Fraunces',cursive",
};

export const MOOD_PALETTES: Record<Theme, { bg: string; ink: string; accent: string }> = {
  pink: { bg: "#f3a8c9", ink: "#4b273d", accent: "#e5ed9c" },
  pool: { bg: "#b9dfe4", ink: "#194e53", accent: "#e5ed9c" },
  golden: { bg: "#f5b777", ink: "#633e20", accent: "#e5ed9c" },
};

const HEX = /^#[0-9a-f]{6}$/i;
const EMOJI = /\p{Extended_Pictographic}/u;

// ---- colour helpers ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Keep the model's ink if it's readable on the background; otherwise use black or white, whichever is clearer. */
function readableInk(bg: string, ink: string): string {
  if (contrast(bg, ink) >= 4.5) return ink;
  return contrast(bg, "#1b1b1b") >= contrast(bg, "#ffffff") ? "#1b1b1b" : "#ffffff";
}

// ---- sanitizing -------------------------------------------------------------------------------

const oneOf = <T extends string>(allowed: readonly T[], v: unknown, fallback: T): T => (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback;

// Printable text only: drop control characters and angle brackets, collapse whitespace, cap the length.
const text = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim() : "";

const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);

/** The first emoji in `v` (a whole grapheme, so skin tones and ZWJ sequences stay intact), or null. */
function firstEmoji(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  for (const { segment } of seg.segment(v)) if (EMOJI.test(segment)) return segment.slice(0, 16);
  return null;
}

export const defaultTemplate = (theme: Theme = "pink"): InviteTemplate => ({
  layout: "poster",
  palette: MOOD_PALETTES[theme],
  font: "fraunces",
  headline: ["spring", "break", "out."],
  kicker: "TRIPFLOW TRAVEL CLUB",
  footer: "DESTINATION: TOGETHER",
  sticker: "GOOD MEMORIES PENDING",
  motif: "✳",
  deco: "curves",
});

/**
 * Turn anything (model output, a request body) into a safe template, or null if it isn't one.
 * Never throws; unknown values fall back to the classic poster's, and colours are made readable.
 */
export function sanitizeTemplate(raw: unknown, theme: Theme = "pink"): InviteTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const base = defaultTemplate(theme);
  const headline = (Array.isArray(r.headline) ? r.headline : []).map((l) => text(l, 14)).filter(Boolean).slice(0, 3);
  if (!headline.length) return null; // a template with no headline isn't a design
  const p = (r.palette && typeof r.palette === "object" ? r.palette : {}) as Record<string, unknown>;
  const bg = color(p.bg, base.palette.bg);
  return {
    layout: oneOf(LAYOUTS, r.layout, "poster"),
    palette: { bg, ink: readableInk(bg, color(p.ink, base.palette.ink)), accent: color(p.accent, base.palette.accent) },
    font: oneOf(FONTS, r.font, "fraunces"),
    headline,
    kicker: text(r.kicker, 28).toUpperCase() || base.kicker,
    footer: text(r.footer, 28).toUpperCase() || base.footer,
    sticker: text(r.sticker, 24).toUpperCase() || base.sticker,
    motif: firstEmoji(r.motif) ?? base.motif,
    deco: oneOf(DECOS, r.deco, "curves"),
  };
}

// ---- deterministic fallback -------------------------------------------------------------------

const VIBE_MOTIF: Record<string, string> = { beach: "🐚", food: "🍜", nature: "🌿", nightlife: "🪩", culture: "🏛", city: "🏙" };
const SETS: Pick<InviteTemplate, "layout" | "font" | "deco" | "palette">[] = [
  { layout: "poster", font: "fraunces", deco: "spark", palette: { bg: "#f3a8c9", ink: "#4b273d", accent: "#e5ed9c" } },
  { layout: "stacked", font: "space", deco: "stripes", palette: { bg: "#1f3a2e", ink: "#f4f1e3", accent: "#dbef8c" } },
  { layout: "ticket", font: "playfair", deco: "dots", palette: { bg: "#f5b777", ink: "#4a2c12", accent: "#fff1c9" } },
  { layout: "centered", font: "caveat", deco: "curves", palette: { bg: "#b9dfe4", ink: "#12474d", accent: "#fff6cf" } },
];

/** Title -> up to 3 short headline lines, longest words trimmed to fit. */
function headlineFrom(title: string): string[] {
  const words = title.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'’&-]/gu, "")).filter(Boolean);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 12 && lines.length >= 3) lines[lines.length - 1] = last + " " + w;
    else if (lines.length < 3) lines.push(w.slice(0, 14));
  }
  return lines.length ? lines : ["let's", "go."];
}

/** Three varied templates without calling the AI: used when it's off or fails. */
export function fallbackTemplates(title: string, vibes: string[], hostName = ""): InviteTemplate[] {
  const motif = VIBE_MOTIF[vibes[0] ?? ""] ?? "✈";
  const head = headlineFrom(title);
  const start = (title.length + (vibes[0]?.length ?? 0)) % SETS.length; // vary which designs a title gets
  return [0, 1, 2]
    .map((i) => SETS[(start + i) % SETS.length])
    .map((s) =>
      sanitizeTemplate({
        ...s, headline: head, motif,
        kicker: hostName ? `${hostName}'s crew` : "Tripflow travel club",
        footer: "Destination: together", sticker: "You're invited",
      })!,
    );
}
