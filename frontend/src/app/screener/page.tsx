import { ScreenerDashboard } from "@/components/screener/screener-dashboard";

export const metadata = {
  title: "Daily Screener — India Stock Intelligence",
  description:
    "Automated daily intelligence dashboard — Top 10 picks, monitoring watchlist, macro snapshot, and pipeline status.",
};

/** Shell renders immediately; slow top10/macro/health load client-side (no SSR block). */
export default function ScreenerPage() {
  return <ScreenerDashboard />;
}
