import type { Metadata } from "next";
import { ScoutDashboard } from "./scout-dashboard";

export const metadata: Metadata = {
  title: "Scout Dashboard · Damkeeper",
};

export default function ScoutsDashboardPage() {
  return <ScoutDashboard />;
}
