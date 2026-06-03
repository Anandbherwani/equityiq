import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadRecommendationHistory } from "@/lib/server-preview";
import { HistoryExplorer } from "./history-explorer";

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

      {data?.ok ? <HistoryExplorer data={data} /> : null}
    </div>
  );
}
