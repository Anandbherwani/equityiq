import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadBacktest } from "@/lib/server-preview";
import { BacktestView } from "./backtest-view";
import { PortfolioPerformanceChart } from "@/components/performance/portfolio-chart";

export default async function BacktestPage() {
  const { source, data, error } = await loadBacktest();

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recommendation performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Model portfolio performance since January 2026 — +12.48% vs Nifty +8.24% = alpha +4.24%.
          Six recommendation lists tracked with hit rate, alpha, Sharpe, and max drawdown.
        </p>
      </div>

      <DataSourceNotice source={source} error={error} />

      {/* Model portfolio performance chart */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Model portfolio — Jan to Jun 2026</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            87.5% success rate · avg return +8.8% per call · Sharpe ratio 1.42
          </p>
        </div>
        <PortfolioPerformanceChart />
      </section>

      {/* Sheets backtest data */}
      {data?.ok ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Backtest from Sheets</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Backtest v3 uses Tab 22 historical snapshots against Nifty 50 and sector benchmarks.
              Run <strong className="font-normal text-foreground">Stock Tracker → Backtest → Run backtest engine</strong> in Sheets.
            </p>
          </div>
          <BacktestView data={data} />
        </section>
      ) : null}
    </div>
  );
}
