import { Stub, TripTicket } from "@/components/trip";
import { YourTrips } from "./_components/YourTrips";
import { ButtonLink, Meta, Text } from "@/components/ui";
import { cn, cta, screen, stubGrid, ticketTop, titleblock, topbar, type } from "@/components/ui/tw";

export default function Home() {
  return (
    <main className={screen}>
      <div className={topbar}>
        <Meta>Elsewhere</Meta>
        <Meta className="text-muted">Group trips</Meta>
      </div>
      <div className={cn(titleblock, "mt-6")}>
        <Text as="h1" variant="display-lg">a trip everyone can say yes to</Text>
        <Text as="p" variant="body-md" className="text-muted">Set the basics, send one link. Each friend adds their dates, budget and airport. No app, no sign-up.</Text>
      </div>
      <TripTicket tone="sage">
        <div className={cn(ticketTop, type.meta)}><span>Elsewhere</span><span>No account</span></div>
        <Text variant="display-xxl">WHERE<br />TO?</Text>
        <Meta>The group decides</Meta>
        <Stub />
        <div className={stubGrid}>
          <div className="flex min-w-0 flex-col gap-0.5"><Meta>Step 1</Meta><Text variant="numeral-xs" className="truncate">SET THE BASICS</Text></div>
          <div className="flex min-w-0 flex-col gap-0.5"><Meta>Step 2</Meta><Text variant="numeral-xs" className="truncate">SEND THE LINK</Text></div>
          <div className="flex min-w-0 flex-col gap-0.5"><Meta>Step 3</Meta><Text variant="numeral-xs" className="truncate">RANK ’EM</Text></div>
          <div className="flex min-w-0 flex-col gap-0.5"><Meta>Step 4</Meta><Text variant="numeral-xs" className="truncate">IT’S HAPPENING</Text></div>
        </div>
      </TripTicket>
      <YourTrips />
      <div className={cta}>
        <ButtonLink kind="primary" href="/new" icon="arrow">Start a trip</ButtonLink>
      </div>
    </main>
  );
}
