import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadPortfolio } from "@/lib/server-preview";
import { PortfolioClient } from "./portfolio-client";
import { PortfolioConstructionView } from "./portfolio-construction-view";

export default async function PortfolioPage() {
  const { source, data, error } = await loadPortfolio();

  return (
    <div className="space-y-10 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Construction engine for ₹1L, ₹5L, ₹10L, and ₹1Cr — Core / Growth / Opportunistic
          allocation, sector limits, position sizing, estimated max drawdown, and portfolio
          conviction from your research engine. Refresh models from the Sheets menu when
          capital or lists change.
        </p>
      </div>

      <DataSourceNotice source={source} error={error} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Suggested portfolio</h2>
        <PortfolioConstructionView
          data={data && "ok" in data && data.ok ? data : null}
        />
      </section>

      <PortfolioClient />
    </div>
  );
}
