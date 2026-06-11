import { ScreenerClock } from "@/components/screener/screener-clock";
import { ScreenerDataNotice } from "@/components/screener/screener-data-notice";
import { ScreenerScoreDistribution } from "@/components/screener/screener-infographics";
import {
  ScreenerKpiSkeleton,
  ScreenerMacroSkeleton,
  ScreenerStockCardSkeleton,
  ScreenerTableSkeleton,
} from "@/components/screener/screener-skeletons";
import { ScreenerStockCard, ScreenerMonitoringTable } from "@/components/screener/screener-table-cards";
import {
  ScreenerChannels,
  ScreenerKpiGrid,
  ScreenerMacroSectors,
  ScreenerPipeline,
  ScreenerSectionHeading,
} from "@/components/screener/screener-sections";
import { ScreenerBadge } from "@/components/screener/screener-badge";
import {
  buildKpis,
  buildMonitoringRows,
  lastRunLabel,
  nextRunLabel,
  resolveMacroMetrics,
  SCREENER_DEMO_SECTORS,
} from "@/lib/screener-data";
import type { DataSource } from "@/lib/server-preview";
import type {
  EnrichedRecommendation,
  HealthResponse,
  MacroResponse,
  Top10Response,
} from "@/lib/types";

const IMMEDIATE_LIST = "Top 10 Immediate Opportunities";

type Props = {
  source: DataSource;
  error?: string;
  top10: Top10Response | null;
  macro: MacroResponse | null;
  health: HealthResponse | null;
  picks: EnrichedRecommendation[];
  isDemo?: boolean;
  loadingTop10?: boolean;
  loadingMacro?: boolean;
  loadingHealth?: boolean;
};

export function ScreenerView({
  source,
  error,
  top10,
  macro,
  health,
  picks,
  isDemo = false,
  loadingTop10 = false,
  loadingMacro = false,
  loadingHealth = false,
}: Props) {
  const kpis = buildKpis(health, picks, macro, isDemo);
  const monitoringRows = buildMonitoringRows(picks);
  const macroMetrics = resolveMacroMetrics(macro);
  const sectors = SCREENER_DEMO_SECTORS;
  const marketBias =
    macro?.macro_verdict?.bias ?? macro?.macro_verdict?.trend ?? kpis.find((k) => k.label === "Market Bias")?.value ?? "BULL";

  return (
    <div className="screener-root -mx-4 -my-6 sm:-mx-6 lg:-mx-8 px-4 py-6 sm:px-6 lg:px-8 min-h-[calc(100dvh-3.5rem)] bg-[var(--scr-bg)] text-[var(--scr-text)]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--scr-border)]">
        <div className="flex items-center gap-2">
          <svg aria-label="India Stock Intelligence" viewBox="0 0 28 28" width="28" height="28" fill="none">
            <rect width="28" height="28" rx="6" fill="var(--scr-primary)" opacity="0.15" />
            <path
              d="M7 20 L11 13 L15 17 L19 9 L22 13"
              stroke="var(--scr-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="22" cy="9" r="2" fill="var(--scr-success)" />
          </svg>
          <span className="font-semibold text-sm tracking-tight">India Stock Intelligence</span>
          <ScreenerBadge variant={source === "live" ? "success" : "warn"}>
            {source === "live" ? "LIVE" : "DEMO"}
          </ScreenerBadge>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--scr-success)] shadow-[0_0_6px_var(--scr-success)] animate-pulse" />
          <ScreenerClock />
        </div>
      </div>

      <div className="mb-4">
        <ScreenerDataNotice source={source} error={error} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--scr-divider)]">
        <span className="text-[0.72rem] text-[var(--scr-faint)] font-mono">
          {lastRunLabel(top10?.updated)} | {nextRunLabel()}
        </span>
        <ScreenerBadge variant="success">Auto-pilot ON</ScreenerBadge>
      </div>

      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--scr-text)]">
          Daily Intelligence Dashboard
        </h1>
        <p className="text-[0.8rem] text-[var(--scr-muted)] font-mono mt-1">
          Fully automated · No manual input required · Runs every market day at 8:00 AM IST
        </p>
      </header>

      {loadingHealth || loadingMacro ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScreenerKpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ScreenerKpiGrid kpis={kpis} />
      )}

      <div className="rounded-xl border border-[var(--scr-primary)] bg-[var(--scr-primary-hl)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-[0.75rem] text-[var(--scr-primary)] font-medium">
            ⚡ Automation Status — Everything runs on its own. You just read the output.
          </div>
          <div className="text-[0.72rem] text-[var(--scr-primary)] opacity-80 mt-0.5">
            n8n workflow → Perplexity Pro API → Google Sheets → Telegram → Email
          </div>
        </div>
        <div className="font-mono text-sm text-[var(--scr-primary)] font-semibold">
          {nextRunLabel()}
        </div>
      </div>

      <ScreenerSectionHeading
        title="🏆 Today's Top 10 Picks"
        subtitle="— Ranked by conviction score"
      />

      {loadingTop10 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <ScreenerStockCardSkeleton key={i} />
          ))}
        </div>
      ) : picks.length > 0 ? (
        <>
          <ScreenerScoreDistribution picks={picks} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {picks.map((item, i) => (
              <ScreenerStockCard key={item.symbol} item={item} rank={i + 1} listName={IMMEDIATE_LIST} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--scr-border)] p-8 text-center mb-6">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-medium text-[var(--scr-text)] mb-1">
            No picks loaded yet
          </p>
          <p className="text-xs text-[var(--scr-muted)] mb-3 max-w-xs mx-auto">
            {isDemo
              ? "Demo picks are loading. If you see this, try refreshing."
              : "Connect your Google Sheets URL in Settings to see live picks, or enable Demo Mode for sample data."}
          </p>
          <a
            href="/settings"
            className="inline-block text-xs px-3 py-1.5 rounded-md border border-[var(--scr-primary)] text-[var(--scr-primary)] hover:bg-[var(--scr-primary-hl)] transition-colors"
          >
            {isDemo ? "Refresh" : "Open Settings →"}
          </a>
        </div>
      )}

      <ScreenerSectionHeading
        title="⚙️ Automation Pipeline"
        subtitle="— Runs daily at 8:00 AM IST with zero manual input"
      />
      <ScreenerPipeline />

      <ScreenerSectionHeading
        title="📲 Delivery Channels"
        subtitle="— You receive it, you don't fetch it"
      />
      <ScreenerChannels />

      <ScreenerSectionHeading
        title="👁 Monitoring Watchlist"
        subtitle="— Auto-tracked, score updated daily"
      />
      {loadingTop10 ? (
        <ScreenerTableSkeleton rows={8} />
      ) : (
        <ScreenerMonitoringTable rows={monitoringRows} />
      )}

      {loadingMacro ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          <ScreenerMacroSkeleton />
          <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 animate-pulse">
            <div className="h-3 w-32 rounded bg-[var(--scr-surface-off)] mb-4" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 w-20 rounded-full bg-[var(--scr-surface-off)]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ScreenerMacroSectors
          metrics={macroMetrics}
          sectors={sectors}
          marketBias={String(marketBias)}
          loadingMacro={loadingMacro}
        />
      )}

      <hr className="border-0 border-t border-[var(--scr-divider)] my-5" />
      <p className="text-[0.72rem] text-[var(--scr-faint)] font-mono text-center pb-4">
        India Stock Intelligence · Fully automated via n8n + Perplexity Pro API · Data from
        NSE/BSE/SEBI/News APIs · For informational purposes only — not investment advice
      </p>
    </div>
  );
}
