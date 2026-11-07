import TripApp from "@/app/_components/TripApp";

export default async function TripPage({
  params, searchParams,
}: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ code }, q] = await Promise.all([params, searchParams]);
  return <TripApp code={code} justCreated={q.new === "1"} />;
}
