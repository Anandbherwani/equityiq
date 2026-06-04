import Link from "next/link";
import { ImmediateOpportunitiesSection } from "@/components/recommendations/immediate-opportunities-section";
import { MarketSummary } from "@/components/market/market-summary";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { DEMO_INDICES } from "@/lib/market-data";
import { isServerPreviewMode } from "@/lib/server-preview";

export default async function DashboardPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8 terminal-grid">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 font-medium">
            EquityIQ
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Indian equity intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            What to buy, why, and risk — updated from your research engine.
          </p>
        </div>
        <Link
          href="/brief"
          className="text-sm text-cyan-400 hover:text-cyan-300 shrink-0 font-medium"
        >
          Today&apos;s brief →
        </Link>
      </header>

      <DataSourceNotice source={preview ? "preview" : "live"} />

      <MarketSummary indices={DEMO_INDICES} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Top 10 immediate opportunities
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Highest conviction · analyst thesis · risk in one glance
            </p>
          </div>
          <Link
            href="/recommendations"
            className="text-xs text-cyan-400 hover:underline shrink-0"
          >
            All lists →
          </Link>
        </div>

        <ImmediateOpportunitiesSection />
      </section>

      <section className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>What changed today</span>
        <Link href="/validation" className="text-cyan-400 hover:underline">
          Track record & alpha →
        </Link>
      </section>
    </div>
  );
}
