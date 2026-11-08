import { twMerge } from "tailwind-merge";

/** Join Ticket Stack utilities. Later classes win when two utilities set the same property. */
export function cn(...values: Array<string | false | null | undefined>) {
  return twMerge(values.filter((value): value is string => Boolean(value)).join(" "));
}

/** Type styles from DESIGN.md. Applied on the elements, not as a parallel class system. */
export const type = {
  "display-xxl": "font-display text-[64px] font-black leading-[0.88] tracking-[-0.04em] [font-stretch:var(--stretch-expanded)]",
  "display-xl": "font-display text-[56px] font-black leading-[0.92] tracking-[-0.04em] [font-stretch:var(--stretch-expanded)]",
  "display-lg": "font-display text-[40px] font-black leading-[0.95] tracking-[-0.03em] [font-stretch:var(--stretch-expanded)]",
  "display-ticket": "font-display text-[48px] font-black leading-[0.9] tracking-[-0.04em] [font-stretch:var(--stretch-expanded)]",
  "display-sm": "font-display text-[24px] font-black leading-none tracking-[-0.03em]",
  "display-md": "font-display text-[28px] font-black leading-none tracking-[-0.03em] [font-stretch:var(--stretch-expanded)]",
  "display-row": "font-display text-[19px] font-black leading-[1.05] tracking-[-0.03em] [font-stretch:var(--stretch-expanded)]",
  numeral: "font-display text-[72px] font-black leading-[0.9] tracking-[-0.05em] [font-stretch:var(--stretch-condensed)]",
  "numeral-lg": "font-display text-[64px] font-black leading-[0.9] tracking-[-0.05em] [font-stretch:var(--stretch-condensed)]",
  "numeral-md": "font-display text-[48px] font-black leading-[0.9] tracking-[-0.05em] [font-stretch:var(--stretch-condensed)]",
  "numeral-sm": "font-display text-[34px] font-black leading-[0.95] tracking-[-0.04em] [font-stretch:var(--stretch-condensed)]",
  "numeral-xs": "font-display text-[24px] font-extrabold leading-none tracking-[-0.03em] [font-stretch:var(--stretch-condensed)]",
  "numeral-xxs": "font-display text-[18px] font-extrabold leading-none tracking-[-0.02em] [font-stretch:var(--stretch-condensed)]",
  title: "font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]",
  headline: "font-body text-[20px] font-bold leading-[1.2] tracking-[-0.01em]",
  "body-lg": "font-body text-[17px] font-normal leading-[1.4]",
  "body-md": "font-body text-[15px] font-normal leading-[1.4]",
  label: "font-body text-[15px] font-semibold leading-[1.2]",
  meta: "font-mono text-[12px] font-normal leading-[1.3] tracking-[0.04em] uppercase",
} as const;

export type TextStyle = keyof typeof type;

const press = "transition-transform duration-150 ease-spring enabled:active:-translate-y-1 enabled:active:scale-[1.02] motion-reduce:active:transform-none!";
const pressDown = "transition-transform duration-150 ease-spring active:-translate-y-1 active:scale-[1.02] motion-reduce:active:transform-none!";

export const toneClass = {
  surface: "bg-surface text-on-surface",
  ink: "bg-ink text-white",
  sage: "bg-sage text-on-sage",
  apricot: "bg-apricot text-on-apricot",
  dusk: "bg-dusk text-on-dusk",
  lavender: "bg-lavender text-on-lavender",
  rose: "bg-rose text-on-rose",
  butter: "bg-butter text-on-butter",
  sky: "bg-sky text-on-sky",
} as const;

export const screen = "group/screen mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-2 px-4 pt-5 pb-6";
export const screenTabsPad = "pb-[calc(var(--tab-bar)+2*var(--s-md)+8px)]";
export const topbar = "flex min-h-11 items-center justify-between gap-2 [&>[data-meta]]:flex-1 [&>[data-meta]]:text-center";
export const titleblock = "mt-1 mb-0.5 flex flex-col gap-1.5 [&_h1]:lowercase [&_[data-meta]]:text-muted";
// The page's main button sits at the end of the content (and at the bottom of the viewport on short pages), so it scrolls with the page.
export const cta = "mt-auto flex flex-col gap-2 pt-4";
export const row = "flex items-center gap-2";
export const col = "flex flex-col gap-2";
export const grid2 = "grid grid-cols-2 gap-2";
export const chips = "flex flex-wrap gap-2";
export const dates = "grid grid-cols-2 gap-2 [&_label]:min-w-0 [&_input]:min-w-0 [&_input]:text-[15px]!";
export const err = "rounded-md bg-danger px-3.5 py-2.5 font-body text-[15px] leading-[1.3] font-semibold text-on-danger empty:hidden";
export const center = "text-center";

export const iconBtn = "inline-flex size-11 shrink-0 appearance-none items-center justify-center rounded-full border-0 bg-surface p-0 no-underline";
export const iconSpacer = "size-11 shrink-0";

export const btn = `inline-flex appearance-none items-center justify-center gap-2 rounded-full border-0 font-body text-[15px] leading-[1.2] font-semibold whitespace-nowrap no-underline ${press}`;
export const btnKind = {
  primary: "h-14 w-full bg-primary px-5 text-[17px] text-on-primary",
  secondary: "h-12 min-h-11 bg-surface px-4 text-on-surface",
  soft: "h-11 bg-paper px-4 text-ink",
  ink: "h-11 bg-ink px-[18px] text-white",
  danger: "h-14 w-full bg-danger px-5 text-[17px] text-on-danger",
} as const;
export const btnSm = "px-3.5";

export const linkBtn = "min-h-11 appearance-none border-0 bg-transparent px-1 font-body text-[15px] font-semibold text-muted underline underline-offset-4";

export const chip = `inline-flex h-11 appearance-none items-center justify-center gap-1.5 rounded-full border-0 bg-paper px-4 font-body text-[15px] leading-none font-semibold text-ink ${press} aria-pressed:bg-ink aria-pressed:text-white aria-pressed:[&_svg]:text-sage`;
export const chipGrow = "flex-1 px-2 text-[14px] whitespace-nowrap";
export const chipSurface = "bg-surface";

export const card = "flex w-full flex-col gap-2 rounded-lg border-0 bg-surface p-4 text-left font-[inherit] text-on-surface";
export const cardTight = "py-3! pr-3! pl-4!";
export const cardPress = `cursor-pointer ${pressDown}`;

export const field = "flex min-h-[60px] flex-col justify-center gap-0.5 rounded-md bg-paper px-3.5 py-2.5 text-ink [&_[data-meta]]:text-muted [&_input]:w-full [&_input]:min-w-0 [&_input]:appearance-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:font-body [&_input]:text-[17px] [&_input]:leading-[1.3] [&_input]:font-semibold [&_input]:text-ink [&_input]:outline-offset-[6px] [&_input[type=date]]:min-h-6 [&_select]:w-full [&_select]:appearance-none [&_select]:border-0 [&_select]:bg-transparent [&_select]:p-0 [&_select]:font-body [&_select]:text-[17px] [&_select]:leading-[1.3] [&_select]:font-semibold [&_select]:text-ink [&_select]:outline-offset-[6px] [&_textarea]:min-h-[52px] [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:appearance-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:p-0 [&_textarea]:font-body [&_textarea]:text-[17px] [&_textarea]:leading-[1.3] [&_textarea]:font-normal [&_textarea]:text-ink [&_textarea]:outline-offset-[6px]";
export const fieldRow = "flex-row items-center gap-2 pr-1.5!";
export const fieldGrow = "flex min-w-0 flex-1 flex-col gap-0.5";

export const rangeInput = "my-1 min-h-7 w-full accent-sage";

export const ticket = "relative isolate flex flex-col gap-2.5 overflow-hidden rounded-xl p-5";
export const ticketCompact = "flex-row items-center justify-between gap-3 rounded-lg px-4! py-3.5!";
export const ticketPattern = "pointer-events-none absolute -right-1.5 bottom-14 -z-10 h-auto w-[210px] opacity-[0.14]";
export const ticketTop = "flex items-center justify-between gap-2";
export const ticketName = "overflow-hidden whitespace-nowrap";

export const stub = "relative my-1 -mx-5 h-6 shrink-0 before:absolute before:top-0 before:-left-3 before:size-6 before:rounded-full before:bg-background before:content-[''] after:absolute after:top-0 after:-right-3 after:size-6 after:rounded-full after:bg-background after:content-['']";
export const stubSm = "my-0 h-5 before:size-5 before:-left-2.5 after:size-5 after:-right-2.5";
export const stubLine = "absolute top-[11px] right-[22px] left-[22px] border-t-2 border-dashed border-perforation";
export const stubLineSm = "top-[9px] right-5 left-5";

export const stubGrid = "grid grid-cols-2 gap-3";
export const stubCell = "flex min-w-0 flex-col gap-0.5";
export const stubValue = "overflow-hidden text-ellipsis whitespace-nowrap";

export const avatars = "flex items-center -space-x-2";
export const avatarsGap = "flex items-center [&>*+*]:ml-1.5 [&>[data-seat]+[data-seat]]:ml-1";
export const avatar = "inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-body text-[11px] leading-none font-semibold";
export const avatarRing = "[border-color:var(--ring,var(--surface))]";
export const avatarMd = "size-9 text-[12px]";
export const avatarDashed = "border-dashed border-line bg-transparent";

export const pill = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 font-mono text-[12px] leading-none font-bold tracking-[0.04em] whitespace-nowrap uppercase";
export const pillVerdict = "bg-ink text-sage";
export const pillLocked = "bg-success text-on-success";
export const pillPending = "bg-surface text-ink";
export const rankBadge = "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-white";

export const why = "flex flex-col gap-0.5 rounded-md bg-surface px-3 py-2.5 text-ink [&_[data-meta]]:text-muted [&_span:last-child]:text-[14px] [&_span:last-child]:leading-[1.35]";

export const progress = "grid auto-cols-fr grid-flow-col gap-1";
export const progressBit = "h-1.5 rounded-full bg-line data-on:bg-ink";

export const q = "rounded-lg bg-surface text-ink";
export const qDone = "flex items-center justify-between gap-2 py-2.5 pr-2.5 pl-4";
export const qCheck = "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage";
export const qText = "flex min-w-0 flex-1 flex-col gap-0.5 [&_[data-meta]]:text-muted";
export const qUpcoming = "flex h-14 items-center justify-between px-4 text-muted";
export const qActive = "flex flex-col gap-2 p-4";
export const qBig = "whitespace-nowrap";
export const qFoot = "flex justify-between";

export const stat = "flex min-w-0 flex-col gap-1.5 rounded-lg bg-surface p-4";
export const statValue = "overflow-hidden text-ellipsis whitespace-nowrap";

export const dots = "relative flex h-[22px] items-center gap-[3px]";
export const dotsHl = "absolute inset-y-0 rounded-full bg-sage";
export const dot = "relative aspect-square max-w-3.5 flex-1 rounded-full bg-line";

export const bars = "grid grid-cols-[76px_minmax(0,1fr)_24px] items-center gap-x-2.5 gap-y-1.5";
export const barsTrack = "flex h-2.5 rounded-full bg-paper";
export const barsFill = "rounded-full bg-ink";

export const crew = "flex items-center gap-3 border-b-2 border-dashed border-line py-2 last:border-b-0";
export const crewText = "flex min-w-0 flex-1 flex-col gap-0.5 [&_[data-meta]]:text-muted";

export const rankRow = "relative flex h-[52px] touch-pan-y items-center rounded-[20px] text-ink transition-transform duration-150 ease-spring data-dragging:z-3 data-dragging:-translate-y-1 data-dragging:scale-[1.02] data-new:animate-pop";
export const rankMain = "flex h-full min-w-0 flex-1 cursor-pointer touch-pan-y appearance-none items-center gap-2.5 border-0 bg-transparent py-0 pr-2.5 pl-3 text-left text-inherit";
export const rankName = "flex min-w-0 flex-1 flex-col [&_[data-meta]]:text-[11px]";
export const rankNameText = "overflow-hidden text-ellipsis whitespace-nowrap";
export const rankPrice = "flex flex-col items-end whitespace-nowrap [&_[data-meta]]:text-[11px]";
export const rankHandle = "mr-1 inline-flex size-11 shrink-0 cursor-grab touch-none appearance-none items-center justify-center border-0 bg-transparent p-0";

export const rankItem = "group/item";
export const rankItemRow = "grid grid-rows-[1fr] transition-[grid-template-rows] duration-[280ms] ease-settle group-data-[open]/item:grid-rows-[0fr]";
export const rankItemTicket = "grid grid-rows-[0fr] transition-[grid-template-rows] duration-[280ms] ease-settle group-data-[open]/item:grid-rows-[1fr]";
export const rankItemInner = "min-h-0 overflow-hidden";
export const rankTicket = "relative data-dragging:-translate-y-1 data-dragging:scale-[1.02]";
export const rankHit = "absolute inset-0 z-[1] m-0 cursor-pointer touch-pan-y appearance-none rounded-xl border-0 bg-transparent p-0";
export const rankHandleWrap = "absolute top-5 right-5 z-[2] flex";
export const rankSpacer = "size-11 shrink-0";

export const addRow = "flex h-12 w-full appearance-none items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-line bg-transparent font-body text-[15px] font-semibold text-ink";
export const skeleton = "animate-skel bg-line";

export const dayTabs = "grid auto-cols-[minmax(52px,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]";
export const dayTab = "h-[52px] appearance-none rounded-full border-0 bg-surface text-ink transition-transform duration-150 ease-spring aria-selected:bg-ink aria-selected:text-white";

export const pass = "relative flex min-h-16 items-stretch rounded-lg bg-surface";
export const passStub = "flex w-[76px] shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-line text-center [&_span:first-child]:text-muted";
export const passBody = "flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-2.5 [&_[data-meta]]:text-muted";

export const optRow = "group flex w-full appearance-none items-center gap-3 rounded-md border-0 bg-paper p-3 text-left aria-pressed:bg-ink aria-pressed:text-white";
export const optText = "flex flex-1 flex-col gap-0.5 group-aria-pressed:[&_[data-meta]]:text-sage";

export const scrim = "fixed inset-0 z-40 animate-fade bg-scrim";
export const sheet = "fixed bottom-0 left-1/2 z-[41] flex max-h-[92dvh] w-[min(430px,100%)] animate-rise flex-col gap-3 overflow-y-auto rounded-t-xl bg-surface px-5 pt-3 pb-6 text-ink [transform:translateX(-50%)]";
export const sheetHandle = "mx-auto h-[5px] w-10 shrink-0 rounded-full bg-line";
export const sheetHead = "flex flex-col gap-1 [&_p]:text-muted";

export const toast = "fixed top-4 left-1/2 z-[60] flex min-h-11 max-w-[min(398px,calc(100%-32px))] animate-toast items-center gap-3 rounded-full bg-ink py-1.5 pr-2 pl-5 font-body text-[15px] leading-[1.2] font-semibold text-white [transform:translateX(-50%)] [&_span]:whitespace-nowrap";
export const toastBtn = "min-h-11 appearance-none rounded-full border-0 bg-transparent px-3.5 font-body text-[15px] font-bold text-sage";

export const tabbar = "fixed bottom-4 left-1/2 z-30 flex h-16 w-[min(398px,calc(100%-32px))] -translate-x-1/2 items-center gap-1 rounded-full bg-ink px-2 text-white";
export const tabBtn = "flex h-12 flex-1 appearance-none flex-col items-center justify-center gap-0.5 rounded-full border-0 bg-transparent p-0 text-white no-underline aria-[current=page]:bg-white aria-[current=page]:text-ink";
export const tabMeta = "text-[10px] tracking-[0.04em]";

export const promo = "flex-row items-center gap-3";
export const promoIcon = "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-paper";
export const promoText = "flex flex-1 flex-col gap-0.5";
export const promoSub = "text-[13px] leading-[1.35] text-muted";

export const swatches = "grid grid-cols-7 gap-1";
export const swatch = `inline-flex h-11 w-full appearance-none items-center justify-center rounded-full border-2 border-line p-0 ${pressDown} aria-pressed:border-ink`;

export const hint13 = "text-[13px] leading-[1.35]";
export const linkField = "min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[14px] font-normal text-ink";
