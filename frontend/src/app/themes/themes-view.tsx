"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchClientApi } from "@/lib/client-api";
import type {
  ApiError,
  MacroResponse,
  ThemeIntelItem,
  ThemeIntelligenceResponse,
  Top10Response,
} from "@/lib/types";
import { ApiErrorCard } from "@/components/shared/api-error-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SectorTile = {
  sector: string;
  count: number;
  avgConviction: number;
  lists: Set<string>;
  symbols: string[];
};

function buildSectorTiles(top10: Top10Response): SectorTile[] {
  const map = new Map<string, SectorTile>();
  for (const list of top10.lists) {
    for (const item of list.items) {
      const sec = item.sector || "Other";
      let tile = map.get(sec);
      if (!tile) {
        tile = { sector: sec, count: 0, avgConviction: 0, lists: new Set(), symbols: [] };
        map.set(sec, tile);
      }
      tile.count += 1;
      tile.avgConviction += item.conviction_total ?? 0;
      tile.lists.add(list.name);
      if (tile.symbols.length < 3 && !tile.symbols.includes(item.symbol)) {
        tile.symbols.push(item.symbol);
      }
    }
  }
  return Array.from(map.values())
    .map((t) => ({ ...t, avgConviction: t.count ? Math.round(t.avgConviction / t.count) : 0 }))
    .sort((a, b) => b.avgConviction - a.avgConviction);
}

function tailLabel(avg: number) {
  if (avg >= 75) return "🔥 Strong";
  if (avg >= 55) return "🌤 Moderate";
  return "🧊 Caution";
}

export function ThemesView() {
  const [themes, setThemes] = useState<ThemeIntelligenceResponse | ApiError | null>(null);
  const [top10, setTop10] = useState<Top10Response | ApiError | null>(null);
  const [macro, setMacro] = useState<MacroResponse | ApiError | null>(null);

  const load = useCallback(async () => {
    const [t, p, m] = await Promise.all([
      fetchClientApi<ThemeIntelligenceResponse>("theme_intelligence"),
      fetchClientApi<Top10Response>("top10"),
      fetchClientApi<MacroResponse>("macro"),
    ]);
    setThemes(t);
    setTop10(p);
    setMacro(m);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const themeRows: ThemeIntelItem[] = useMemo(() => {
    if (!themes || !("ok" in themes) || !themes.ok) return [];
    const intel = themes.intelligence;
    return intel.top_themes || intel.top10_themes || intel.themes || [];
  }, [themes]);

  const sectors = useMemo(() => {
    if (!top10 || !("ok" in top10) || !top10.ok) return [];
    return buildSectorTiles(top10);
  }, [top10]);

  const tailwinds = useMemo(() => {
    if (!macro || !("ok" in macro) || !macro.ok) return [];
    return macro.metrics.filter((m) => /positive|bull/i.test(m.bias || ""));
  }, [macro]);

  const headwinds = useMemo(() => {
    if (!macro || !("ok" in macro) || !macro.ok) return [];
    return macro.metrics.filter((m) => /negative|bear/i.test(m.bias || ""));
  }, [macro]);

  const loading = !themes || !top10;
  if (loading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading themes & sectors…</p>;
  }
  if (!("ok" in themes) || !themes.ok) {
    return <ApiErrorCard message={themes.error || "Theme intelligence unavailable"} onRetry={load} />;
  }

  return (
    <div className="space-y-8">
      {sectors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Sector conviction heatmap</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <Card
                key={s.sector}
                className="border-border/60"
                style={{
                  background: `rgba(0, 200, 150, ${Math.min(0.15, (s.avgConviction / 100) * 0.12 + 0.03)})`,
                }}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">{s.sector}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {s.count} picks · {s.lists.size} lists · {tailLabel(s.avgConviction)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${s.avgConviction}%` }}
                    />
                  </div>
                  <p className="font-mono text-sm tabular-nums">Avg conviction {s.avgConviction}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.symbols.map((sym) => (
                      <span
                        key={sym}
                        className="text-[10px] font-mono rounded bg-muted/60 px-1.5 py-0.5"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Theme intelligence</h2>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3">#</th>
                <th className="p-3">Theme</th>
                <th className="p-3 text-right">Strength</th>
                <th className="p-3 text-right">Momentum</th>
                <th className="p-3 text-right">Gov</th>
                <th className="p-3 text-right">Conviction</th>
              </tr>
            </thead>
            <tbody>
              {themeRows.map((t, i) => (
                <tr key={t.theme_id} className="border-t border-border/40">
                  <td className="p-3 font-mono text-muted-foreground">{t.rank ?? i + 1}</td>
                  <td className="p-3">{t.theme_label}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{t.theme_strength}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{t.theme_momentum}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{t.government_support}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-violet-500"
                          style={{ width: `${t.theme_conviction_score}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums">{t.theme_conviction_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(tailwinds.length > 0 || headwinds.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-emerald-300">Macro tailwinds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tailwinds.map((m) => (
                <div key={m.metric} className="flex justify-between gap-2">
                  <span>{m.metric}</span>
                  <span className="font-mono text-muted-foreground">{String(m.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-rose-300">Macro headwinds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {headwinds.map((m) => (
                <div key={m.metric} className="flex justify-between gap-2">
                  <span>{m.metric}</span>
                  <span className="font-mono text-muted-foreground">{String(m.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

    </div>
  );
}
