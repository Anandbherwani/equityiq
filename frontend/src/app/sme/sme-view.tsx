"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchClientApi } from "@/lib/client-api";
import type { ApiError, SmeAlphaResponse } from "@/lib/types";
import { ApiErrorCard } from "@/components/shared/api-error-card";
export function SmeView() {
  const [data, setData] = useState<SmeAlphaResponse | ApiError | null>(null);

  const load = useCallback(async () => {
    setData(await fetchClientApi<SmeAlphaResponse>("sme_alpha"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    if (!data || !("ok" in data) || !data.ok) return [];
    return [...data.items].sort((a, b) => b.sme_alpha_score - a.sme_alpha_score);
  }, [data]);

  if (!data) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading SME alpha…</p>;
  }
  if (!("ok" in data) || !data.ok) {
    return <ApiErrorCard message={data.error || "SME alpha unavailable"} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        SME &amp; Emerge stocks carry higher risk. Verify liquidity before entry. Minimum lot sizes
        apply. These are high-conviction, high-risk plays.
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Symbol</th>
              <th className="p-3 text-right">Alpha score</th>
              <th className="p-3">Track</th>
              <th className="p-3 text-right">Rank</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.symbol} className="border-t border-border/40 hover:bg-muted/20">
                <td className="p-3">
                  <Link
                    href={`/stock/${row.symbol}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {row.symbol}
                  </Link>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${Math.min(100, row.sme_alpha_score)}%` }}
                      />
                    </div>
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {row.sme_alpha_score}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{row.sme_track}</td>
                <td className="p-3 text-right font-mono tabular-nums">#{row.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
