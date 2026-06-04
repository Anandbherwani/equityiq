import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricChart } from "./metric-chart";
import type { SymbolResponse } from "@/lib/types";
import { formatCr, formatNum, formatPct, formatPrice } from "@/lib/format";
import { trendFromPrice } from "@/lib/derivations";
import { DataQualityPanel } from "./data-quality-panel";
import { RecommendationDecisionPanel } from "./recommendation-decision-panel";
import { StockHero } from "./stock-hero";
import { StockThesisStack } from "./stock-thesis-stack";

export function StockDetailView({ data }: { data: SymbolResponse }) {
  const u = data.universe;
  const s = data.scoring;
  const f = data.fundamentals;
  const p = data.price;
  const news = data.news ?? [];
  const listRows = (data.lists ?? []).filter(
    (l): l is NonNullable<SymbolResponse["lists"]>[number] =>
      typeof l === "object" && l !== null && "list_name" in l
  );
  const rec = data.recommendation || listRows[0];

  const finChart = [
    { label: "Rev YoY", value: f?.rev_yoy ?? 0 },
    { label: "PAT YoY", value: f?.pat_yoy ?? 0 },
    { label: "ROE", value: f?.roe ?? 0 },
    { label: "ROCE", value: f?.roce ?? 0 },
  ];

  const marginChart = [
    { label: "D/E", value: f?.debt_equity ?? 0 },
    { label: "Curr", value: (f?.current_ratio ?? 0) * 10 },
    { label: "Div %", value: f?.dividend_yield ?? 0 },
  ];

  const fairValue =
    p?.price && s?.conviction_total
      ? Math.round(p.price * (1 + s.conviction_total / 250) * 100) / 100
      : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <StockHero data={data} />
      <StockThesisStack data={data} />

      <details className="group rounded-lg border border-border/50 bg-muted/10 lg:hidden">
        <summary className="px-4 py-2 text-xs text-muted-foreground cursor-pointer">
          Market cap & data quality
        </summary>
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-border/40">
          <MiniStat label="Market cap" value={formatCr(u?.market_cap_cr ?? f?.market_cap_cr)} />
          <MiniStat label="Quality" value={formatNum(s?.quality_rank, 0)} />
        </div>
      </details>

      <div className="hidden lg:grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Market cap" value={formatCr(u?.market_cap_cr ?? f?.market_cap_cr)} />
        <MiniStat label="Bucket" value={u?.market_cap_bucket || "—"} />
        <MiniStat label="Quality rank" value={formatNum(s?.quality_rank, 0)} />
        <MiniStat
          label="Data quality"
          value={s?.data_quality_pct != null ? `${s.data_quality_pct}%` : "—"}
        />
      </div>

      <DataQualityPanel scoring={s} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="technicals">Technicals</TabsTrigger>
          <TabsTrigger value="peers">Peers</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="ai">Research note</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <RecommendationDecisionPanel data={data} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Company overview</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                {u?.company_name} trades on {u?.exchange || "NSE"} with cap segment{" "}
                {u?.cap_segment || "—"}. Theme tags: {u?.theme_tags || "—"}.
              </p>
            </CardContent>
          </Card>
          {s ? (
            <details className="group rounded-lg border border-border/60 bg-muted/10">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                Conviction breakdown
                <span className="text-xs text-muted-foreground group-open:hidden">View details</span>
              </summary>
              <Card className="border-0 shadow-none rounded-t-none">
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm font-mono pt-0">
                  {[
                    ["Fundamentals", s.fundamentals],
                    ["Growth", s.growth],
                    ["Financial", s.financial_strength],
                    ["Valuation", s.valuation],
                    ["Sector", s.sector_strength],
                    ["News/Events", s.news_events],
                    ["Technical", s.technical_momentum],
                    ["Institutional", s.institutional_flow],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <p className="text-muted-foreground text-xs">{k}</p>
                      <p className="text-lg">{v}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </details>
          ) : null}
        </TabsContent>

        <TabsContent value="fundamentals" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Growth & returns</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart data={finChart} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Balance sheet & yield</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart data={marginChart} color="#a78bfa" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 font-mono text-sm">
              <Cell label="ROE" v={formatPct(f?.roe)} />
              <Cell label="ROCE" v={formatPct(f?.roce)} />
              <Cell label="Rev growth" v={formatPct(f?.rev_yoy)} />
              <Cell label="PAT growth" v={formatPct(f?.pat_yoy)} />
              <Cell label="Debt/Eq" v={formatNum(f?.debt_equity)} />
              <Cell label="Promoter %" v={formatPct(f?.promoter_holding)} />
              <Cell label="FII %" v={formatPct(f?.fii_holding)} />
              <Cell label="Stale" v={f?.stale_flag ? "Yes" : "No"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="mt-4">
          <Card>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 font-mono">
              <Cell label="P/E" v={formatNum(f?.pe)} />
              <Cell label="P/B" v={formatNum(f?.pb)} />
              <Cell label="Valuation score" v={formatNum(s?.valuation, 0)} />
              <Cell label="vs sector" v={f?.sector_normalized || "—"} />
              <Cell label="PEG (est.)" v={f?.pe && f?.pat_yoy ? formatNum(f.pe / Math.max(f.pat_yoy, 1)) : "—"} />
              <Cell label="EV/EBITDA" v="—" hint="When available in fundamentals feed" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicals" className="mt-4">
          <Card>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 font-mono">
              <Cell label="50 DMA" v={formatPrice(p?.dma50)} />
              <Cell label="200 DMA" v={formatPrice(p?.dma200)} />
              <Cell label="RSI (14)" v={formatNum(p?.rsi14)} />
              <Cell label="Volume" v={p?.vol ? p.vol.toLocaleString() : "—"} />
              <Cell label="vs 50 DMA" v={formatPct(p?.vs_50dma)} />
              <Cell label="Trend" v={trendFromPrice(p)} />
              <Cell label="Setup" v={p?.tech_setup || "—"} />
              <Cell label="MACD" v={p?.macd_signal || "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-3 mt-4">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent headlines in the news feed.</p>
          ) : (
            news.map((n, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>{n.source_name}</span>
                    <span>{n.published_at}</span>
                  </div>
                  <p className="font-medium mt-1">{n.headline}</p>
                  {n.summary ? (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{n.summary}</p>
                  ) : null}
                  <div className="flex gap-2 mt-2">
                    {n.sentiment ? <Badge variant="outline">{n.sentiment}</Badge> : null}
                    {n.materiality ? (
                      <Badge variant="secondary">Impact: {n.materiality}</Badge>
                    ) : null}
                  </div>
                  {n.url ? (
                    <Link href={n.url} target="_blank" className="text-xs text-cyan-400 mt-2 inline-block">
                      Source →
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="peers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vs sector</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {s?.relative_quality_score != null ? (
                <p>
                  Relative quality <span className="font-mono text-cyan-300">{s.relative_quality_score}</span>/100
                  · Valuation {s.relative_valuation_score ?? "—"} · Growth{" "}
                  {s.relative_growth_score ?? "—"}
                </p>
              ) : (
                <p className="text-muted-foreground">Peer scores not available for this symbol.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Sector medians — P/E {formatNum(s?.sector_median_pe, 1)} · ROE{" "}
                {formatNum(s?.sector_median_roe, 1)}% · ROCE {formatNum(s?.sector_median_roce, 1)}%
              </p>
              <Link href={`/peers?symbol=${data.symbol}`} className="text-cyan-400 text-xs hover:underline">
                Open peer comparison tool →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
              <p>
                News sentiment is aggregated from recent headlines. Materiality reflects potential
                price impact from the research pipeline.
              </p>
              {news.length > 0 ? (
                <p className="font-mono text-foreground">
                  Latest: {news[0].sentiment || "neutral"} · Impact{" "}
                  {news[0].materiality || "—"}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <RecommendationDecisionPanel data={data} />
          <details className="group rounded-lg border border-border/60">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
              Extended narrative (bull / bear / evidence)
            </summary>
            <div className="border-t border-border/40 p-4 space-y-4">
              <AiBlock title="Evidence" body={rec?.evidence} />
              <AiBlock title="Bull case" body={rec?.bull_case} />
              <AiBlock title="Bear case" body={rec?.bear_case} />
            </div>
          </details>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fair value estimate</CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-2xl text-amber-300">
                {formatPrice(fairValue)}
                <p className="text-xs text-muted-foreground mt-2 font-sans">
                  Display estimate from price and conviction — not a separate model.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Outlook</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">3M: </span>
                  {rec?.target_horizon || "See recommendation horizon"}
                </p>
                <p>
                  <span className="text-muted-foreground">12M: </span>
                  {s && s.conviction_total >= 60
                    ? "Constructive if data gate passes and sector macro holds."
                    : "Neutral — monitor fundamentals refresh."}
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Corporate events, bulk deals, and promoter activity surface via Sheets scoring columns
            (filings, promoter, institutional). Optional Perplexity enrichment can be added server-side.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className="font-mono text-sm mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function Cell({ label, v, hint }: { label: string; v: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg mt-1">{v}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AiBlock({ title, body }: { title: string; body?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground leading-relaxed">
        {body?.trim() || "Run Sync recommendations / scoring pipeline in Sheets."}
      </CardContent>
    </Card>
  );
}
