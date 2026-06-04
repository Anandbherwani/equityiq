"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SymbolResponse } from "@/lib/types";
import { buildDecisionFallback } from "@/lib/decision-narrative";

function Section({ title, body, tone }: { title: string; body?: string; tone?: "default" | "bull" | "bear" | "risk" }) {
  const border =
    tone === "bull"
      ? "border-emerald-500/25"
      : tone === "bear" || tone === "risk"
        ? "border-rose-500/25"
        : "border-border/50";
  return (
    <Card className={border}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
        {body?.trim() || "—"}
      </CardContent>
    </Card>
  );
}

export function StockThesisStack({ data }: { data: SymbolResponse }) {
  const rec = data.recommendation || data.lists?.[0];
  const note = rec?.decision?.analyst_note;
  const decision =
    rec?.decision ||
    buildDecisionFallback(
      {
        conviction_total: rec?.conviction_total ?? data.scoring?.conviction_total ?? 0,
        bull_case: rec?.bull_case,
        bear_case: rec?.bear_case,
        catalyst: rec?.catalyst,
        target_horizon: rec?.target_horizon,
        evidence: rec?.evidence,
      },
      rec?.list_name || "",
      data.scoring
    );

  const thesis =
    note?.investment_thesis ||
    decision.analyst_note?.investment_thesis ||
    decision.why ||
    rec?.bull_case?.replace(/^INVESTMENT THESIS\s*/i, "") ||
    "—";
  const bull = note?.bull_case || rec?.bull_case || "—";
  const bear = note?.bear_case || rec?.bear_case || "—";
  const catalysts = note?.catalysts || rec?.catalyst || decision.catalyst || "—";
  const risks = note?.risks || decision.risk || bear;
  const peers = note?.peer_comparison || "—";
  const theme = note?.theme_exposure || data.universe?.theme_tags || "—";

  return (
    <section className="space-y-3" aria-label="Investment thesis">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-cyan-400/90">
        Research narrative
      </h2>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Section title="Investment thesis" body={thesis} />
        </div>
        <Section title="Bull case" body={bull} tone="bull" />
        <Section title="Bear case" body={bear} tone="bear" />
        <Section title="Catalysts" body={catalysts} />
        <Section title="Risks" body={risks} tone="risk" />
        <Section title="Peer comparison" body={peers} />
        <Section title="Theme exposure" body={theme} />
      </div>
    </section>
  );
}
