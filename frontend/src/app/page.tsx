import Link from "next/link";
import { ArrowRight, BarChart2, Rocket, TrendingUp, Zap } from "lucide-react";
import { ImmediateOpportunitiesSection } from "@/components/recommendations/immediate-opportunities-section";
import { MarketSummary } from "@/components/market/market-summary";
import { MarketPulseBar } from "@/components/market/market-pulse";
import { SectorHeatmap } from "@/components/market/sector-heatmap";
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

      {/* Market Pulse Bar */}
      <MarketPulseBar />

      <DataSourceNotice source={preview ? "preview" : "live"} />

      {/* Market summary (index cards) */}
      <MarketSummary indices={DEMO_INDICES} />

      {/* Top 10 immediate opportunities */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-primary shrink-0" />
              Top 10 immediate opportunities
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Highest conviction · analyst thesis · risk in one glance
            </p>
          </div>
          <Link
            href="/recommendations"
            className="text-[12px] text-primary hover:text-primary/80 transition-colors shrink-0 flex items-center gap-1"
          >
            All 6 lists <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ImmediateOpportunitiesSection />
      </section>

      {/* Sector heatmap */}
      <SectorHeatmap />

      {/* Quick nav strip — 8 links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { href: "/screener",    label: "Daily screener",    desc: "30 stocks, signal filters",    icon: BarChart2 },
          { href: "/watchlist",   label: "Watchlist",         desc: "Track & bucket symbols",        icon: TrendingUp },
          { href: "/ipo",         label: "IPO intel",         desc: "Ather · Leela · HDBFS",         icon: Rocket },
          { href: "/sme",         label: "SME alpha",         desc: "8 Emerge/SME opportunities",    icon: Zap },
          { href: "/validation",  label: "Track record",      desc: "87.5% success rate, +8.8% avg", icon: BarChart2 },
          { href: "/compare",     label: "Compare",           desc: "Side-by-side stock analysis",   icon: TrendingUp },
          { href: "/peers",       label: "Peer comparison",   desc: "Banking · IT · Metal groups",   icon: TrendingUp },
          { href: "/backtest",    label: "Performance",       desc: "Model portfolio +12.48%",        icon: BarChart2 },
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

      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Stocks scored",    value: "30+",     tone: "text-primary"  },
          { label: "Buy signals",      value: "12",      tone: "text-gain"     },
          { label: "Strong Buy",       value: "3",       tone: "text-gain"     },
          { label: "Success rate",     value: "87.5%",   tone: "text-gain"     },
          { label: "Avg return",       value: "+8.8%",   tone: "text-gain"     },
          { label: "Model alpha",      value: "+4.24%",  tone: "text-primary"  },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card/50 px-3 py-2.5 text-center">
            <p className={`font-mono text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
