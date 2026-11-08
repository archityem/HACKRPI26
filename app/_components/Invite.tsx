"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { AppPromo, AvatarRow, Stub, StubGrid, TRIP_TONES, TripTicket, tripTone } from "@/components/trip";
import { Button, Card, Icon, IconButton, Meta, Sheet, Text, useToast } from "@/components/ui";
import { prefShort, shareOrCopy, tripLink, useInstall, windowLabel, type Ctx } from "./common";

const vibeLabel = (vibes: string[]) => (vibes.length ? vibes.map(prefShort).join(" + ").toUpperCase() : "ANYTHING");

/** The host's color for the ticket, falling back to one chosen from the trip code. */
const toneOf = (ctx: Ctx) => tripTone(ctx.code, ctx.snap.trip.tone);
const firstVibe = (ctx: Ctx) => ctx.snap.trip.vibes[0];

function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Get the app">
      <div className="sheet__head"><Text as="h2" variant="display-md">get the app</Text><p>Add this trip to your home screen. Your answers come with you, and there’s still no account.</p></div>
      <Card tone="surface" className="">
        <Meta>On iPhone</Meta><span>Tap Share, then “Add to Home Screen”.</span>
        <Meta>On Android</Meta><span>Open the browser menu, then “Install app”.</span>
      </Card>
      <Button kind="primary" onClick={onClose}>Got it</Button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- 02 · Invite (host)
export function InviteScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const toast = useToast();
  const link = tripLink(ctx.code);
  const host = snap.members.find((m) => m.id === t.hostMemberId);
  const shown = link.replace(/^https?:\/\//, "");

  async function send() {
    const r = await shareOrCopy(`Where should we go? ${t.title}. Answer in 30 sec, no app needed:`, link);
    if (r === "copied") toast("Link copied. Paste it in the gc.");
    if (r === "failed") toast("Select the link and copy it.");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); toast("Link copied."); } catch { toast("Select the link and copy it."); }
  }
  async function pickTone(tone: string) {
    if (me) await ctx.run(() => api(`/api/trips/${ctx.code}/ticket`, { memberId: me.id, tone }));
  }
  const joined = snap.members.length;
  const others = snap.members.filter((m) => m.id !== me?.id);

  return (
    <>
      <div className="topbar">
        <IconButton icon="back" label="Back" href="/" />
        <Meta>Your trip is live</Meta>
        <span className="iconbtn--spacer" />
      </div>
      <TripTicket tone={toneOf(ctx)} vibe={firstVibe(ctx)} pattern>
        <div className="ticket__top t-meta"><span>{t.title}</span><span>Host · {me?.id === host?.id ? "You" : host?.name}</span></div>
        <Text variant="display-xxl">WHERE<br />TO?</Text>
        <Meta>The group decides</Meta>
        <Stub />
        <StubGrid items={[["Window", windowLabel(t.windowStart, t.windowEnd)], ["Length", `${t.nights} NIGHTS`], ["Budget cap", `$${t.maxBudget.toLocaleString("en-US")} / PP`], ["Vibe", vibeLabel(t.vibes)]]} />
      </TripTicket>
      {t.note && <p className="muted" style={{ padding: "0 4px" }}>{t.note}</p>}

      <Card>
        <div className="row row--between"><Meta>Make it yours</Meta><Meta className="muted">Ticket color</Meta></div>
        <div className="swatches" role="group" aria-label="Ticket color">
          {TRIP_TONES.map((c) => (
            <button key={c} type="button" className="swatch" data-tone={c} aria-label={c} aria-pressed={toneOf(ctx) === c} onClick={() => pickTone(c)}>
              {toneOf(ctx) === c && <Icon name="check" size={18} stroke={3} />}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="row row--between"><Meta>Who’s in</Meta><Meta className="muted">{joined} so far</Meta></div>
        <AvatarRow gap names={snap.members.map((m) => ({ id: m.id, name: m.name }))} meId={me?.id} seats={Math.max(0, 6 - joined)} />
        <span className="t-body-md muted">
          {others.length === 0 ? "Nobody yet. Send it to the gc. No app or account needed to join." : `${snap.match.readyCount} of ${joined} answered. Nobody waits on anybody.`}
        </span>
      </Card>

      {me && !me.ready && (
        <Card>
          <div className="row row--between">
            <span className="col" style={{ gap: 2 }}><Meta>Your answers</Meta><span className="t-label">Add yours · 30 sec</span></span>
            <Button kind="soft" onClick={() => ctx.go("answers")}>Answer</Button>
          </div>
        </Card>
      )}

      <Card className="" tight>
        <div className="row" style={{ gap: 8 }}>
          <Meta className="muted">Link</Meta>
          <input readOnly value={shown} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", font: "400 14px var(--font-mono)", color: "var(--ink)", padding: 0 }} />
          <Button kind="soft" icon="copy" onClick={copy}>Copy</Button>
        </div>
      </Card>

      <div className="cta">
        <Button kind="primary" icon="send" onClick={send}>Send to the gc</Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 03 · Link landing (web)
export function LandingScreen(ctx: Ctx) {
  const { snap, me } = ctx;
  const t = snap.trip;
  const host = snap.members.find((m) => m.id === t.hostMemberId);
  const answered = snap.members.filter((m) => m.ready);
  const { install, help, closeHelp } = useInstall();
  const ring = "var(--sage)";
  const hello = host ? `${host.name} invited you` : "You’re invited";

  return (
    <>
      <div className="topbar">
        <Meta>{hello}</Meta>
        <Meta className="muted">/t/{ctx.code}</Meta>
      </div>
      <TripTicket tone={toneOf(ctx)} vibe={firstVibe(ctx)} pattern>
        <div className="ticket__top t-meta"><span>{t.title}</span><span>Host · {host?.name ?? "?"}</span></div>
        <Text variant="display-xxl">WHERE<br />TO?</Text>
        <Meta>The group decides{me?.ready ? "" : " · you’re part of it"}</Meta>
        <Stub />
        <StubGrid items={[["Window", windowLabel(t.windowStart, t.windowEnd)], ["Budget cap", `$${t.maxBudget.toLocaleString("en-US")} / PP`]]} />
        <div className="row" style={{ gap: 10, marginTop: 2 }}>
          {answered.length > 0 && <AvatarRow names={answered.slice(0, 5).map((m) => ({ id: m.id, name: m.name }))} meId={me?.id} ring={ring} />}
          <Meta>{answered.length === 0 ? "Be the first to answer" : `${answered.length} ${answered.length === 1 ? "friend" : "friends"} already answered`}</Meta>
        </div>
      </TripTicket>
      {t.note && <p className="muted" style={{ padding: "0 4px" }}>{t.note}</p>}
      <AppPromo onGet={install} />
      <InstallSheet open={help} onClose={closeHelp} />

      <div className="cta">
        <Meta className="muted center">No account · no password · just your first name</Meta>
        {me?.ready
          ? <Button kind="primary" onClick={() => ctx.go("vibe")}>See the trip<Icon name="arrow" /></Button>
          : <Button kind="primary" onClick={() => ctx.go("answers")}>Answer here · 30 sec<Icon name="arrow" /></Button>}
      </div>
    </>
  );
}

export { InstallSheet };
