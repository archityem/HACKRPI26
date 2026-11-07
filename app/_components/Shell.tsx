import type { ReactNode } from "react";

export type View = "invite" | "onboard" | "crew" | "ideas" | "plan";
const NAV: [View, string][] = [["invite", "The invite"], ["crew", "The crew"], ["ideas", "Ideas & votes"], ["plan", "The plan"]];

export function Shell({
  view, onNav, toast, footerNote, children,
}: { view?: View; onNav?: (v: View) => void; toast?: string; footerNote?: string; children: ReactNode }) {
  return (
    <div id="elsewhere-app" aria-label="Elsewhere group trip planner">
      <header className="ew-header">
        <a className="ew-brand" href="/" aria-label="Elsewhere home" style={{ textDecoration: "none", color: "inherit" }}><span>✳</span> elsewhere</a>
        <span className="ew-season">GOOD COMPANY. GREAT ESCAPES.</span>
      </header>
      <nav className="ew-nav" aria-label="Trip navigation">
        {onNav && NAV.map(([v, t], i) => (
          <button key={v} type="button" aria-current={view === v || (view === "onboard" && v === "invite") ? "page" : undefined} onClick={() => onNav(v)}>
            <em>0{i + 1}</em>{t}
          </button>
        ))}
      </nav>
      <main className="ew-main">{children}</main>
      <footer className="ew-footer">
        <span>✳ Made for the “we should go somewhere” people.</span>
        <span>{footerNote ?? "Sample fares"}</span>
      </footer>
      <div className="ew-toast" role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

export function Btn({ children, kind, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: string }) {
  return <button type="button" {...p} className={`ew-btn ${kind ?? ""} cursor-interaction`}>{children}</button>;
}
