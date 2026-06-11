import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricChart } from "./metric-chart";
import { ScoreRadarChart, ScoreDimensionBar } from "./score-radar-chart";
import type { SymbolResponse } from "@/lib/types";
import { formatCr, formatNum, formatPct, formatPrice } from "@/lib/format";
import { trendFromPrice } from "@/lib/derivations";
import { computeCompositeScore } from "@/lib/scoring/composite";
import { DataQualityPanel } from "./data-quality-panel";
import { RecommendationDecisionPanel } from "./recommendation-decision-panel";
import { StockHero } from "./stock-hero";
import { StockThesisStack } from "./stock-thesis-stack";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function scoreColorClass(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 65) return "text-gain";
  if (score >= 45) return "text-warn";
  return "text-loss";
}

function generateProsCons(
  f: SymbolResponse["fundamentals"],
  p: SymbolResponse["price"],
  safetyScore: number
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  if (f?.rev_yoy != null) {
    if (f.rev_yoy > 20) pros.push(`Revenue growing ${f.rev_yoy.toFixed(1)}% YoY — strong topline momentum`);
    else if (f.rev_yoy < -5) cons.push(`Revenue declining ${Math.abs(f.rev_yoy).toFixed(1)}% YoY — topline pressure`);
  }
  if (f?.roe != null) {
    if (f.roe > 20) pros.push(`ROE ${f.roe.toFixed(1)}% — excellent return on equity`);
    else if (f.roe < 8 && f.roe > 0) cons.push(`Weak ROE of ${f.roe.toFixed(1)}% — capital efficiency concern`);
  }
  if (f?.roce != null) {
    if (f.roce > 20) pros.push(`ROCE ${f.roce.toFixed(1)}% — efficient capital deployment`);
    else if (f.roce < 8 && f.roce > 0) cons.push(`ROCE ${f.roce.toFixed(1)}% — below typical cost of capital`);
  }
  if (f?.debt_equity != null) {
    if (f.debt_equity < 0.3) pros.push(`Conservative balance sheet — D/E ratio ${f.debt_equity.toFixed(2)}x`);
    else if (f.debt_equity > 1.5) cons.push(`High leverage — D/E ratio ${f.debt_equity.toFixed(2)}x`);
  }
  if (f?.pe != null && f.pe > 0) {
    if (f.pe < 15) pros.push(`Attractively valued at P/E ${f.pe.toFixed(1)}x — below market average`);
    else if (f.pe > 45) cons.push(`Premium valuation P/E ${f.pe.toFixed(1)}x — high expectations priced in`);
  }
  if (f?.promoter_holding != null) {
    if (f.promoter_holding > 55) pros.push(`High promoter confidence — ${f.promoter_holding.toFixed(1)}% stake`);
    else if (f.promoter_holding < 25) cons.push(`Low promoter holding ${f.promoter_holding.toFixed(1)}% — limited insider conviction`);
  }
  if (p?.rsi14 != null) {
    if (p.rsi14 < 35) pros.push(`RSI ${p.rsi14.toFixed(0)} — technically oversold, potential reversal`);
    else if (p.rsi14 > 75) cons.push(`RSI ${p.rsi14.toFixed(0)} — overbought, near-term pullback risk`);
  }
  if (f?.pat_yoy != null) {
    if (f.pat_yoy > 25) pros.push(`PAT growing ${f.pat_yoy.toFixed(1)}% YoY — strong earnings expansion`);
    else if (f.pat_yoy < -10) cons.push(`Earnings declining ${Math.abs(f.pat_yoy).toFixed(1)}% YoY — profitability pressure`);
  }
  // Use normalized safety score (0-100) from composite engine
  if (safetyScore >= 72) pros.push(`Strong financial health score ${safetyScore}/100`);
  else if (safetyScore < 35) cons.push(`Weak financial health score ${safetyScore}/100`);

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}

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
    { label: "ROE",     value: f?.roe ?? 0 },
    { label: "ROCE",    value: f?.roce ?? 0 },
  ];
  const balanceChart = [
    { label: "D/E",   value: f?.debt_equity ?? 0 },
    { label: "Curr",  value: (f?.current_ratio ?? 0) * 10 },
    { label: "Div %", value: f?.dividend_yield ?? 0 },
  ];

  const scored = computeCompositeScore({ fundamentals: f, price: p, universe: u, scoring: s });
  const totalScore = scored.composite > 0 ? scored.composite : (s?.conviction_total ?? null);
  const convictionTarget = scored.targetPrice;
  const { pros, cons } = generateProsCons(f, p, scored.pillars.safety);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <StockHero data={data} />
      <StockThesisStack data={data} />

      {/* KPI strip — desktop */}
      <div className="hidden lg:grid gap-3 grid-cols-4">
        <KpiCard label="Market cap"    value={formatCr(u?.market_cap_cr ?? f?.market_cap_cr)} />
        <KpiCard label="Segment"       value={u?.market_cap_bucket || u?.cap_segment || "—"} />
        <KpiCard label="Quality rank"  value={formatNum(s?.quality_rank, 0)} />
        <KpiCard label="Data quality"  value={s?.data_quality_pct != null ? `${s.data_quality_pct}%` : "—"} />
      </div>

      <DataQualityPanel scoring={s} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-auto flex flex-wrap gap-0.5 bg-card border border-border rounded-lg p-1">
          {["overview","fundamentals","valuation","technicals","peers","news","ai"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded px-3 py-1.5 text-xs font-medium capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
            >
              {tab === "ai" ? "Research note" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Radar + key metrics */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Radar chart */}
            <Card className="border-border">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Score analysis</CardTitle>
                {totalScore != null && (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-2xl font-bold font-mono tabular-nums score-reveal ${scoreColorClass(totalScore)}`}>
                      {totalScore}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pb-3 space-y-4">
                {s || f ? (
                  <>
                    <ScoreRadarChart
                      value={scored.pillars.valuation}
                      quality={scored.pillars.quality}
                      growth={scored.pillars.growth}
                      safety={scored.pillars.safety}
                      momentum={scored.pillars.momentum}
                    />
                    <div className="space-y-2 pt-1">
                      <ScoreDimensionBar label="Value"    score={scored.pillars.valuation} />
                      <ScoreDimensionBar label="Quality"  score={scored.pillars.quality} />
                      <ScoreDimensionBar label="Growth"   score={scored.pillars.growth} />
                      <ScoreDimensionBar label="Safety"   score={scored.pillars.safety} />
                      <ScoreDimensionBar label="Momentum" score={scored.pillars.momentum} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Score data not available — run scoring pipeline.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Key metrics */}
            <div className="space-y-3">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Key metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <MetricCell label="P/E ratio"     value={formatNum(f?.pe)} />
                  <MetricCell label="P/B ratio"     value={formatNum(f?.pb)} />
                  <MetricCell label="ROE"           value={formatPct(f?.roe)} color={f?.roe != null ? (f.roe > 15 ? "gain" : f.roe < 8 ? "loss" : "warn") : undefined} />
                  <MetricCell label="ROCE"          value={formatPct(f?.roce)} color={f?.roce != null ? (f.roce > 15 ? "gain" : f.roce < 8 ? "loss" : "warn") : undefined} />
                  <MetricCell label="Rev growth"    value={formatPct(f?.rev_yoy)} color={f?.rev_yoy != null ? (f.rev_yoy > 10 ? "gain" : f.rev_yoy < 0 ? "loss" : "warn") : undefined} />
                  <MetricCell label="PAT growth"    value={formatPct(f?.pat_yoy)} color={f?.pat_yoy != null ? (f.pat_yoy > 10 ? "gain" : f.pat_yoy < 0 ? "loss" : "warn") : undefined} />
                  <MetricCell label="Debt/Equity"   value={formatNum(f?.debt_equity)} color={f?.debt_equity != null ? (f.debt_equity < 0.5 ? "gain" : f.debt_equity > 1.5 ? "loss" : "warn") : undefined} />
                  <MetricCell label="Promoter %"    value={formatPct(f?.promoter_holding)} />
                </CardContent>
              </Card>

              {/* Company overview */}
              <Card className="border-border">
                <CardContent className="pt-4 text-[13px] text-muted-foreground leading-relaxed">
                  <p>
                    <span className="text-foreground font-medium">{u?.company_name}</span>{" "}
                    trades on <span className="font-mono text-foreground">{u?.exchange || "NSE"}</span>.
                    {u?.cap_segment ? ` ${u.cap_segment} cap.` : ""}
                    {u?.theme_tags ? ` Themes: ${u.theme_tags}.` : ""}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pros / Cons — Screener.in pattern */}
          {(pros.length > 0 || cons.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {pros.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gain">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pros.map((pro, i) => (
                      <div key={i} className="flex gap-2.5 text-[13px]">
                        <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gain" />
                        <span className="text-foreground/90 leading-snug">{pro}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {cons.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-loss">Risks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cons.map((con, i) => (
                      <div key={i} className="flex gap-2.5 text-[13px]">
                        <TrendingDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-loss" />
                        <span className="text-foreground/90 leading-snug">{con}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Recommendation decision */}
          <RecommendationDecisionPanel data={data} />
        </TabsContent>

        {/* ── Fundamentals ── */}
        <TabsContent value="fundamentals" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Growth & returns</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart data={finChart} />
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Balance sheet & yield</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart data={balanceChart} color="#a371f7" />
              </CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 font-mono text-sm">
              <Cell label="ROE"          v={formatPct(f?.roe)} />
              <Cell label="ROCE"         v={formatPct(f?.roce)} />
              <Cell label="Rev growth"   v={formatPct(f?.rev_yoy)} />
              <Cell label="PAT growth"   v={formatPct(f?.pat_yoy)} />
              <Cell label="Debt/Equity"  v={formatNum(f?.debt_equity)} />
              <Cell label="Promoter %"   v={formatPct(f?.promoter_holding)} />
              <Cell label="FII %"        v={formatPct(f?.fii_holding)} />
              <Cell label="Data stale"   v={f?.stale_flag ? "Yes" : "No"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Valuation ── */}
        <TabsContent value="valuation" className="mt-4">
          <Card className="border-border">
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 font-mono">
              <Cell label="P/E"             v={formatNum(f?.pe)} />
              <Cell label="P/B"             v={formatNum(f?.pb)} />
              <Cell label="Valuation score" v={formatNum(s?.valuation, 0)} />
              <Cell label="vs sector"       v={f?.sector_normalized || "—"} />
              <Cell
                label="PEG (est.)"
                v={f?.pe && f?.pat_yoy ? formatNum(f.pe / Math.max(f.pat_yoy, 1)) : "—"}
              />
              <Cell label="EV/EBITDA" v="—" hint="When available in fundamentals feed" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Technicals ── */}
        <TabsContent value="technicals" className="mt-4">
          <Card className="border-border">
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 font-mono">
              <Cell label="50 DMA"    v={formatPrice(p?.dma50)} />
              <Cell label="200 DMA"   v={formatPrice(p?.dma200)} />
              <Cell label="RSI (14)"  v={formatNum(p?.rsi14)} />
              <Cell label="Volume"    v={p?.vol ? p.vol.toLocaleString("en-IN") : "—"} />
              <Cell label="vs 50 DMA" v={formatPct(p?.vs_50dma)} />
              <Cell label="Trend"     v={trendFromPrice(p)} />
              <Cell label="Setup"     v={p?.tech_setup || "—"} />
              <Cell label="MACD"      v={p?.macd_signal || "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── News ── */}
        <TabsContent value="news" className="space-y-3 mt-4">
          {news.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No recent headlines in the news feed.
            </div>
          ) : (
            news.map((n, i) => (
              <Card key={i} className="border-border card-lift">
                <CardContent className="pt-4">
                  <div className="flex justify-between gap-2 text-[11px] text-muted-foreground mb-1">
                    <span>{n.source_name}</span>
                    <span>{n.published_at}</span>
                  </div>
                  <p className="font-medium text-[13px] leading-snug">{n.headline}</p>
                  {n.summary ? (
                    <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                      {n.summary}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-2.5">
                    {n.sentiment ? <Badge variant="outline" className="text-[10px]">{n.sentiment}</Badge> : null}
                    {n.materiality ? (
                      <Badge variant="secondary" className="text-[10px]">Impact: {n.materiality}</Badge>
                    ) : null}
                    {n.url ? (
                      <Link href={n.url} target="_blank" className="text-[11px] text-primary hover:underline ml-auto">
                        Source →
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Peers ── */}
        <TabsContent value="peers" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm">vs Sector peers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {s?.relative_quality_score != null ? (
                <div className="grid grid-cols-3 gap-4">
                  <MetricCell label="Relative quality" value={`${s.relative_quality_score}/100`} />
                  <MetricCell label="Relative value"   value={s.relative_valuation_score != null ? `${s.relative_valuation_score}/100` : "—"} />
                  <MetricCell label="Relative growth"  value={s.relative_growth_score != null ? `${s.relative_growth_score}/100` : "—"} />
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">Peer scores not available for this symbol.</p>
              )}
              <div className="rounded-md bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground font-mono space-x-3">
                <span>Sector P/E {formatNum(s?.sector_median_pe, 1)}</span>
                <span>ROE {formatNum(s?.sector_median_roe, 1)}%</span>
                <span>ROCE {formatNum(s?.sector_median_roce, 1)}%</span>
              </div>
              <Link href={`/peers?symbol=${data.symbol}`} className="text-primary text-[12px] hover:underline inline-flex items-center gap-1">
                Open peer comparison tool →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI / Research note ── */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <RecommendationDecisionPanel data={data} />
          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium hover:bg-muted/20 transition-colors rounded-lg">
              Extended narrative — bull / bear / evidence
            </summary>
            <div className="border-t border-border p-4 space-y-4">
              <AiBlock title="Evidence"  body={rec?.evidence} />
              <AiBlock title="Bull case" body={rec?.bull_case} />
              <AiBlock title="Bear case" body={rec?.bear_case} />
            </div>
          </details>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Conviction-implied target</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl text-warn font-bold tabular-nums">
                  {formatPrice(convictionTarget)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  price × (1 + conviction/200), capped at 35% upside. Indicative only — not a DCF.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Outlook</CardTitle>
              </CardHeader>
              <CardContent className="text-[13px] space-y-2">
                <div className="flex gap-2">
                  <Minus className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">3M: </span>
                    {rec?.target_horizon || "See recommendation horizon"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Minus className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">12M: </span>
                    {s && s.conviction_total >= 60
                      ? "Constructive if data gate passes and sector macro holds."
                      : "Neutral — monitor fundamentals refresh."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Corporate events, bulk deals, and promoter activity surface via Sheets scoring columns.
            Optional AI enrichment can be added server-side.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "gain" | "loss" | "warn";
}) {
  const colorClass =
    color === "gain" ? "text-gain" : color === "loss" ? "text-loss" : color === "warn" ? "text-warn" : "";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-[13px] font-medium mt-0.5 tabular-nums ${colorClass || "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function Cell({ label, v, hint }: { label: string; v: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-base mt-0.5 tabular-nums">{v}</p>
      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
  );
}

function AiBlock({ title, body }: { title: string; body?: string }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-[13px] text-muted-foreground leading-relaxed">
        {body?.trim() || "Run Sync recommendations / scoring pipeline in Sheets."}
      </CardContent>
    </Card>
  );
}
