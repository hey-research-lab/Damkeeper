import type { Metadata } from "next";
import { listLaunches } from "@/lib/scouts";
import { LaunchesFeed } from "./launches-feed";

export const metadata: Metadata = {
  title: "Scouts — New Launches · Damkeeper",
  description: "Discover new token launches on Robinhood Chain eligible for Scout referral.",
};

export const dynamic = "force-dynamic";

export default async function ScoutsLaunchesPage() {
  const initialLaunches = await listLaunches();

  return <LaunchesFeed initialLaunches={initialLaunches} />;
}
