import { Stub, TripTicket } from "@/components/trip";
import { YourTrips } from "./_components/YourTrips";
import { ButtonLink, Meta, Text } from "@/components/ui";

export default function Home() {
  return (
    <main className="screen">
      <div className="topbar">
        <Meta>Elsewhere</Meta>
        <Meta className="muted">Group trips</Meta>
      </div>
      <div className="titleblock" style={{ marginTop: 24 }}>
        <Text as="h1" variant="display-lg">a trip everyone can say yes to</Text>
        <p className="t-body-md muted">Set the basics, send one link. Each friend adds their dates, budget and airport. No app, no sign-up.</p>
      </div>
      <TripTicket tone="sage">
        <div className="ticket__top t-meta"><span>Elsewhere</span><span>No account</span></div>
        <Text variant="display-xxl">WHERE<br />TO?</Text>
        <Meta>The group decides</Meta>
        <Stub />
        <div className="stubgrid">
          <div><Meta>Step 1</Meta><Text variant="numeral-xs">SET THE BASICS</Text></div>
          <div><Meta>Step 2</Meta><Text variant="numeral-xs">SEND THE LINK</Text></div>
          <div><Meta>Step 3</Meta><Text variant="numeral-xs">RANK ’EM</Text></div>
          <div><Meta>Step 4</Meta><Text variant="numeral-xs">IT’S HAPPENING</Text></div>
        </div>
      </TripTicket>
      <YourTrips />
      <div className="cta">
        <ButtonLink kind="primary" href="/new" icon="arrow">Start a trip</ButtonLink>
      </div>
    </main>
  );
}
