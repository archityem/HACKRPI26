import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TONE_HEX, type TripTone } from "./tone";

// The picture people see when a Tripflow link is texted: the invite ticket. Rendered by Satori (via next/og),
// which only does flexbox and inline SVG, so this is built from plain divs rather than the app's components.
// Fonts are read once at module load and must stay small (the whole image bundle is limited to 500KB).

export const OG_SIZE = { width: 1200, height: 630 };

const display = readFile(join(process.cwd(), "assets/fonts/ArchivoBlack-Regular.ttf"));
const mono = readFile(join(process.cwd(), "assets/fonts/SpaceMono-Regular.ttf"));
export async function ogFonts() {
  return [
    { name: "Archivo Black", data: await display, style: "normal" as const, weight: 400 as const },
    { name: "Space Mono", data: await mono, style: "normal" as const, weight: 400 as const },
  ];
}

const INK = "#22211F", PAPER = "#F4F0E8", MUTED = "#6E6A62";

function Mark({ size, cut }: { size: number; cut: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <rect x="6" y="24" width="108" height="72" rx="17" fill={INK} />
      <circle cx="6" cy="60" r="11" fill={cut} />
      <circle cx="114" cy="60" r="11" fill={cut} />
      <path d="M26 60C40 34 54 34 62 60S84 86 94 60" fill="none" stroke={cut} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export interface OgTicket { title: string; host?: string; window?: string; budget?: string; length?: string; tone: TripTone; footer: string }

const meta = { fontFamily: "Space Mono", fontSize: 24, letterSpacing: 1, textTransform: "uppercase" as const };
const bigValue = { fontFamily: "Archivo Black", fontSize: 46, letterSpacing: -2, lineHeight: 1 };

export function TicketCard({ title, host, window, budget, length, tone, footer }: OgTicket) {
  const { bg, fg } = TONE_HEX[tone];
  const cells = ([["Window", window], ["Length", length], ["Budget cap", budget]] as [string, string | undefined][]).filter((c): c is [string, string] => Boolean(c[1]));
  return (
    <div style={{ width: "100%", height: "100%", background: PAPER, display: "flex", flexDirection: "column", padding: "46px 60px 0", color: INK }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 1080, height: 470, background: bg, color: fg, borderRadius: 56, padding: "38px 46px", position: "relative" }}>
        <div style={{ ...meta, display: "flex", justifyContent: "space-between" }}>
          <span style={{ display: "flex", maxWidth: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{title}</span>
          {host ? <span style={{ display: "flex" }}>Host · {host}</span> : <span style={{ display: "flex" }}>No account</span>}
        </div>
        <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 146, letterSpacing: -7, lineHeight: 0.9, whiteSpace: "nowrap" }}>WHERE TO?</div>
        <div style={{ display: "flex", position: "relative", height: 60, width: "100%" }}>
          <div style={{ position: "absolute", left: -76, top: 0, width: 60, height: 60, borderRadius: 30, background: PAPER }} />
          <div style={{ position: "absolute", right: -76, top: 0, width: 60, height: 60, borderRadius: 30, background: PAPER }} />
          <div style={{ position: "absolute", left: 40, right: 40, top: 28, height: 0, borderTop: `4px dashed ${fg === "#FFFFFF" ? "rgba(255,255,255,0.45)" : "rgba(34,33,31,0.3)"}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {cells.length ? cells.map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ ...meta, display: "flex", fontSize: 20 }}>{k}</span>
              <span style={{ ...bigValue, display: "flex" }}>{v}</span>
            </div>
          )) : <span style={{ ...meta, display: "flex" }}>The group decides</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, width: 1080 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Mark size={64} cut={PAPER} />
          <span style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 52, letterSpacing: -2.4 }}>tripflow</span>
        </div>
        <span style={{ ...meta, display: "flex", fontSize: 22, color: MUTED }}>{footer}</span>
      </div>
    </div>
  );
}
