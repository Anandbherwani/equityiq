import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadBacktest } from "@/lib/server-preview";
import { BacktestView } from "./backtest-view";

export default async function BacktestPage() {
  const { source, data, error } = await loadBacktest();

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recommendation performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Backtest v3 uses <strong className="font-normal text-foreground">only Tab 22 historical snapshots</strong>{" "}
          (no synthetic cohorts). Six Tab 11 lists vs{" "}
          <strong className="font-normal text-foreground">Nifty 50</strong> and{" "}
          <strong className="font-normal text-foreground">sector benchmarks</strong> over 1M, 3M, 6M, and 12M.
          Metrics: hit rate, alpha, Sharpe, Sortino, max drawdown. Snapshot daily via 8 AM automation; run{" "}
          <strong className="font-normal text-foreground">
            Stock Tracker → Backtest → Run backtest engine
          </strong>{" "}
          in Sheets.
        </p>
      </div>

      <DataSourceNotice source={source} error={error} />

      {data?.ok ? <BacktestView data={data} /> : null}
    </div>
  );
}
