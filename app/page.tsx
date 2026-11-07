import { Shell } from "./_components/Shell";
import { YourTrips } from "./_components/YourTrips";

export default function Home() {
  return (
    <Shell footerNote="No login. One link.">
      <div className="ew-empty" style={{ maxWidth: 640, marginTop: 12 }}>
        <span className="ew-empty-icon">✳</span>
        <h1>Plan a trip everyone can say yes to.</h1>
        <p>Group trips die in the chat because planning falls on one person. Set a ceiling, send a link, and let each friend add their real dates, budget, and airport. We shortlist the places that already work.</p>
        <a className="ew-btn ew-primary" href="/new">Start a trip ↗</a>
        <YourTrips />
      </div>
      <div className="ew-beats">
        <article><em>01</em><strong>Host the invite</strong><p>Name, dates, length, a budget ceiling, and a vibe. That’s the whole brief.</p></article>
        <article><em>02</em><strong>Friends fill themselves in</strong><p>No login. Suggestions update as people answer — nobody waits on the last reply.</p></article>
        <article><em>03</em><strong>Pick, then plan</strong><p>A shortlist of 3–8 places with honest costs. Vote, approve, get a shared itinerary.</p></article>
      </div>
    </Shell>
  );
}
