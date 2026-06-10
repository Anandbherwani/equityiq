import Link from "next/link";
import { ScreenerBadge } from "./screener-badge";
import {
  scoreBadgeVariant,
  stockCardActionLabel,
  stockCardHorizon,
  stockCardTags,
  stockCardThesis,
} from "@/lib/screener-data";
import type { EnrichedRecommendation } from "@/lib/types";

const TAG_VARIANTS = ["success", "primary", "blue", "gold", "warn"] as const;

export function ScreenerStockCard({
  item,
  rank,
  listName,
}: {
  item: EnrichedRecommendation;
  rank: number;
  listName: string;
}) {
  const score = item.conviction_total ?? item.score ?? 0;
  const tags = stockCardTags(item, listName);
  const actionVariant =
    score >= 75 ? "success" : score >= 70 ? "gold" : score >= 65 ? "primary" : "warn";

  return (
    <Link
      href={`/stock/${item.symbol}`}
      className="block rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)] transition-shadow hover:shadow-[var(--scr-shadow-md)]"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="font-semibold text-sm text-[var(--scr-text)] tracking-tight">
            {item.company_name}
          </div>
          <div className="text-[0.7rem] text-[var(--scr-muted)] font-mono mt-0.5">
            {item.symbol} · NSE · {item.sector || "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[0.7rem] text-[var(--scr-faint)] font-mono font-semibold">
            #{rank}
          </div>
          <div className="text-lg font-bold font-mono text-[var(--scr-primary)]">{score}</div>
        </div>
      </div>

      <p className="text-[0.775rem] text-[var(--scr-muted)] leading-relaxed mb-2.5">
        {stockCardThesis(item)}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {tags.map((tag, i) => (
          <ScreenerBadge key={tag} variant={TAG_VARIANTS[i % TAG_VARIANTS.length]}>
            {tag}
          </ScreenerBadge>
        ))}
      </div>

      <div className="h-[3px] rounded-full bg-[var(--scr-surface-off)] mt-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--scr-primary)] to-[var(--scr-success)]"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[var(--scr-divider)]">
        <span className="text-[0.7rem] text-[var(--scr-muted)] font-mono">
          ⏱ {stockCardHorizon(item)}
        </span>
        <ScreenerBadge variant={actionVariant}>{stockCardActionLabel(item)}</ScreenerBadge>
      </div>
    </Link>
  );
}

export function ScreenerMonitoringTable({
  rows,
}: {
  rows: {
    name: string;
    ticker: string;
    sector: string;
    score: number;
    change: number | null;
    trigger: string;
    action: string;
  }[];
}) {
  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] overflow-hidden shadow-[var(--scr-shadow-sm)] mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--scr-border)]">
        <span className="text-sm font-semibold text-[var(--scr-text)]">
          Active Watchlist — {rows.length} stocks
        </span>
        <ScreenerBadge variant="primary">Auto-refreshes each run</ScreenerBadge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Stock", "Ticker", "Sector", "Score", "Change", "Trigger", "Action"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--scr-muted)] px-4 py-2.5 bg-[var(--scr-surface-off)] border-b border-[var(--scr-border)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ticker} className="group hover:bg-[var(--scr-surface-off)]">
                <td className="px-4 py-2.5 text-sm font-medium text-[var(--scr-text)] border-b border-[var(--scr-divider)]">
                  {row.name}
                </td>
                <td className="px-4 py-2.5 text-[0.8rem] font-mono text-[var(--scr-text)] border-b border-[var(--scr-divider)]">
                  {row.ticker}
                </td>
                <td className="px-4 py-2.5 text-[0.8rem] font-mono text-[var(--scr-text)] border-b border-[var(--scr-divider)]">
                  {row.sector}
                </td>
                <td className="px-4 py-2.5 border-b border-[var(--scr-divider)]">
                  <ScreenerBadge variant={scoreBadgeVariant(row.score)}>{row.score}</ScreenerBadge>
                </td>
                <td
                  className={`px-4 py-2.5 text-[0.8rem] font-mono border-b border-[var(--scr-divider)] tabular-nums ${
                    row.change == null
                      ? "text-[var(--scr-muted)]"
                      : row.change >= 0
                        ? "text-[var(--scr-success)]"
                        : "text-[var(--scr-error)]"
                  }`}
                >
                  {row.change == null
                    ? "—"
                    : `${row.change >= 0 ? "+" : ""}${row.change.toFixed(1)}%`}
                </td>
                <td className="px-4 py-2.5 border-b border-[var(--scr-divider)]">
                  <ScreenerBadge variant="success">{row.trigger}</ScreenerBadge>
                </td>
                <td className="px-4 py-2.5 border-b border-[var(--scr-divider)]">
                  <ScreenerBadge
                    variant={
                      row.action.includes("Strong") ? "success" : row.action.includes("Watch") ? "gold" : "primary"
                    }
                  >
                    {row.action}
                  </ScreenerBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
