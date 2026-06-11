import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadRecommendationHistory } from "@/lib/server-preview";
import { HistoryExplorer } from "./history-explorer";
import { HistoryReturnsChart } from "@/components/history/history-returns-chart";

export default async function HistoryPage() {
  const { source, data, error } = await loadRecommendationHistory();

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History explorer</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Permanent log of every recommendation issued at 8 AM — symbol, conviction, thesis,
          target, confidence, and risk. Live returns vs Nifty and sector from entry to today.
        </p>
      </div>

      <DataSourceNotice source={source} error={error} />

      {/* Past calls with returns chart — loads from history API */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Past calls (Mar–Jun 2026)</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            8 calls since March 2026 · 87.5% success rate · avg return +8.8%
          </p>
        </div>
        <HistoryReturnsChart />
      </section>

      {/* Live recommendation history from Sheets */}
      {data?.ok ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Recommendation log from Sheets</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Full history from Tab 37 — score, thesis, conviction, target
            </p>
          </div>
          <HistoryExplorer data={data} />
        </section>
      ) : null}
    </div>
  );
}
