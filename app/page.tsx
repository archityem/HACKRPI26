import { Shell } from "./_components/Shell";

export default function Home() {
  return (
    <Shell footerNote="Sample fares">
      <div className="ew-empty">
        <span className="ew-empty-icon">✳</span>
        <h1>Plan a trip everyone can say yes to.</h1>
        <p>Set the basics, send one link, and each friend adds their own dates, budget, and airport. We find the places that work for everyone.</p>
        <a className="ew-btn ew-primary" href="/new">Start a trip ↗</a>
      </div>
    </Shell>
  );
}
