import Link from "next/link";
import { MarketSummary } from "@/components/market/market-summary";
import { TerminalOpportunityCard } from "@/components/recommendations/terminal-opportunity-card";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { Card, CardContent } from "@/components/ui/card";
import { getSymbol } from "@/lib/sheets-api";
import { DEMO_INDICES } from "@/lib/market-data";
import { enrichRecommendation } from "@/lib/derivations";
import { loadTop10 } from "@/lib/server-preview";
import type { EnrichedRecommendation } from "@/lib/types";

const IMMEDIATE_LIST = "Top 10 Immediate Opportunities";

export default async function DashboardPage() {
  const { source, data: top10, error } = await loadTop10();

  let immediate: EnrichedRecommendation[] = [];
  if (top10?.ok) {
    const list = top10.lists.find((l) => l.name === IMMEDIATE_LIST);
    const items = list?.items.slice(0, 10) ?? [];
    const useLiveEnrich = source === "live";
    immediate = await Promise.all(
      items.map(async (item) => {
        if (useLiveEnrich) {
          const sym = await getSymbol(item.symbol);
          if (sym && "ok" in sym && sym.ok) {
            return enrichRecommendation(item, sym.price, sym.scoring, IMMEDIATE_LIST);
          }
        }
        return enrichRecommendation(item, null, null, IMMEDIATE_LIST);
      })
    );
  }

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

      <DataSourceNotice source={source} error={error} />

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

        {immediate.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No immediate picks yet. Connect your API in Settings or enable Demo mode.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {immediate.map((item, i) => (
              <TerminalOpportunityCard
                key={item.symbol}
                item={item}
                listName={IMMEDIATE_LIST}
                rank={i + 1}
              />
            ))}
          </div>
        )}
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
