"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { COVER_MAX_BYTES, COVER_MAX_EDGE } from "@/lib/cover";
import type { InviteTemplate } from "@/lib/template";
import type { Theme } from "@/lib/types";
import { Btn } from "@/app/_components/Shell";
import { Poster } from "@/app/_components/views";

const MOODS: [Theme, string, string][] = [["pink", "#f3a8c9", "Pink postcard"], ["pool", "#b9dfe4", "Pool club"], ["golden", "#f5b777", "Golden hour"]];
const MAX_INPUT_BYTES = 30_000_000; // refuse to even decode anything bigger than a big phone photo

/** Downscale in the browser and re-encode as JPEG small enough for the server's limit. */
async function shrink(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn’t an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is over 30 MB. Try a smaller one.");
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } // applies the photo's EXIF rotation
  catch { throw new Error("Couldn’t read that image. Try a JPEG or PNG."); }
  const scale = Math.min(1, COVER_MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff"; // JPEG has no transparency
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (const q of [0.85, 0.75, 0.6, 0.45]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if ((url.length - url.indexOf(",") - 1) * 0.75 <= COVER_MAX_BYTES) return url;
  }
  throw new Error("That image is too detailed to fit. Try another.");
}

export interface InviteBrief { title: string; note: string; vibes: string[]; hostName: string; windowStart: string }

export function CoverPicker({ theme, cover, template, brief, onChange }: {
  theme: Theme;
  cover: string;
  template: InviteTemplate | null;
  brief: InviteBrief;
  onChange: (p: { theme?: Theme; cover?: string; template?: InviteTemplate | null }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [options, setOptions] = useState<InviteTemplate[]>([]);
  const [designing, setDesigning] = useState(false);
  const [designError, setDesignError] = useState("");
  const [source, setSource] = useState<"gemini" | "fallback" | null>(null);
  const request = useRef(0);

  async function design() {
    const mine = ++request.current;
    setDesigning(true); setDesignError("");
    try {
      const r = await api<{ templates: InviteTemplate[]; source: "gemini" | "fallback" }>("/api/templates", {
        title: brief.title.trim(), note: brief.note.trim(), vibes: brief.vibes, hostName: brief.hostName.trim(), windowStart: brief.windowStart || undefined,
      });
      if (mine !== request.current) return;
      setOptions(r.templates); setSource(r.source);
      onChange({ template: r.templates[0] ?? null });
    } catch (e) {
      if (mine === request.current) setDesignError(e instanceof Error ? e.message : "Couldn’t design an invite. Try again.");
    } finally {
      if (mine === request.current) setDesigning(false);
    }
  }

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try { onChange({ cover: await shrink(file) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t use that image."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <div className="ew-cover-editor">
      <div
        className="ew-cover-preview" data-dragging={dragging || undefined}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files[0]); }}
      >
        <Poster theme={theme} photo={cover || null} template={template} />
      </div>
      <div className="ew-cover-controls">
        <div>
          <span className="ew-label">Invite picture</span>
          <p className="ew-note" style={{ marginTop: 6 }}>This is the first thing your friends see. Let AI design it from your title and note, add your own photo, or keep the classic card.</p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="ew-row" style={{ gap: 10 }}>
            <Btn disabled={designing || !brief.title.trim()} onClick={design}>{designing ? "Designing…" : options.length ? "Try 3 more ✨" : "Design my invite ✨"}</Btn>
            {template && !designing && <button type="button" className="ew-link" onClick={() => onChange({ template: null })}>Back to classic</button>}
          </div>
          {(designing || options.length > 0) && (
            <div className="ew-tpl-row" role="group" aria-label="Invite designs" aria-busy={designing}>
              {designing
                ? [0, 1, 2].map((i) => <div key={i} className="ew-tpl-skel" />)
                : options.map((t, i) => (
                  <button key={i} type="button" className="ew-tpl" aria-pressed={template === t} aria-label={`Design ${i + 1}: ${t.headline.join(" ")}`} onClick={() => onChange({ template: t })}>
                    <div className="ew-tpl-thumb" aria-hidden="true"><div className="ew-tpl-inner"><Poster theme={theme} photo={cover || null} template={t} /></div></div>
                  </button>
                ))}
            </div>
          )}
          {!designing && source === "fallback" && options.length > 0 && <p className="ew-note">The AI designer is unavailable right now, so these are quick designs built from your title.</p>}
          <div className="ew-error" role="alert">{designError}</div>
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
        <div className="ew-row" style={{ gap: 10 }}>
          <Btn disabled={busy} onClick={() => input.current?.click()}>{busy ? "Preparing…" : cover ? "Change photo" : "Upload a photo"}</Btn>
          {cover && !busy && <button type="button" className="ew-link" onClick={() => onChange({ cover: "" })}>Remove photo</button>}
        </div>
        <div className="ew-error" role="alert">{error}</div>
        {!template && <div>
          <span className="ew-label">Pick a mood</span>
          <div className="ew-row" aria-label="Invite mood" style={{ marginTop: 12, gap: 17 }}>
            {MOODS.map(([v, c, t]) => (
              <button key={v} type="button" className="ew-theme" style={{ background: c }} aria-label={t} aria-pressed={theme === v} onClick={() => onChange({ theme: v })} />
            ))}
          </div>
          <p className="ew-note" style={{ marginTop: 12 }}>{MOODS.find((m) => m[0] === theme)?.[2]}{cover ? " · tints your photo" : ""}</p>
        </div>}
      </div>
    </div>
  );
}
