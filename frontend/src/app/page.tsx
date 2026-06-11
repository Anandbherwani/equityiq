import Link from "next/link";
import { ArrowRight, BarChart2, TrendingUp } from "lucide-react";
import { ImmediateOpportunitiesSection } from "@/components/recommendations/immediate-opportunities-section";
import { MarketSummary } from "@/components/market/market-summary";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { DEMO_INDICES } from "@/lib/market-data";
import { isServerPreviewMode } from "@/lib/server-preview";

export default async function DashboardPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Hero */}
      <header className="flex flex-col gap-1 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              EquityIQ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Indian equity intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What to buy, why, and at what risk — updated from your research engine.
          </p>
        </div>
        <Link
          href="/brief"
          className="flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 transition-colors shrink-0 mt-1 font-medium"
        >
          Today&apos;s brief
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <DataSourceNotice source={preview ? "preview" : "live"} />

      {/* Market summary */}
      <MarketSummary indices={DEMO_INDICES} />

      {/* Top 10 immediate opportunities */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-primary shrink-0" />
              Top 10 immediate opportunities
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 ml-5.5">
              Highest conviction · analyst thesis · risk in one glance
            </p>
          </div>
          <Link
            href="/recommendations"
            className="text-[12px] text-primary hover:text-primary/80 transition-colors shrink-0 flex items-center gap-1"
          >
            All lists <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ImmediateOpportunitiesSection />
      </section>

      {/* Quick nav strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { href: "/screener",       label: "Daily screener",    desc: "Automated top 10 picks" },
          { href: "/watchlist",      label: "Watchlist",         desc: "Track your holdings" },
          { href: "/validation",     label: "Track record",      desc: "Alpha & accuracy metrics" },
          { href: "/compare",        label: "Compare stocks",    desc: "Side-by-side analysis" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-border bg-card px-3 py-3 card-lift"
          >
            <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
              {item.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* What changed today */}
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-foreground">What changed today</p>
          <p className="text-[11px] text-muted-foreground">Score movements, new picks, exits</p>
        </div>
        <Link
          href="/validation"
          className="text-[12px] text-primary hover:underline flex items-center gap-1"
        >
          Track record & alpha <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
