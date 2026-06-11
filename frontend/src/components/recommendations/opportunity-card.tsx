import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedRecommendation } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { DataQualityBadge } from "@/components/shared/data-quality-badge";

export function OpportunityCard({ item }: { item: EnrichedRecommendation }) {
  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <Link
            href={`/stock/${item.symbol}`}
            className="font-mono text-lg font-bold text-primary hover:underline"
          >
            {item.symbol}
          </Link>
          <CardTitle className="text-sm font-normal text-muted-foreground mt-0.5">
            {item.company_name || "—"}
          </CardTitle>
        </div>
        <div className="text-right space-y-1">
          <DataQualityBadge pct={item.data_quality_pct} />
          <p className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
            {item.conviction_total}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">Score</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <div>
            <p className="text-muted-foreground">Price</p>
            <p>{formatPrice(item.current_price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Target</p>
            <p>{item.target || item.target_horizon || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Price target</p>
            <p>{formatPrice(item.target_price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Confidence</p>
            <p>{item.confidence}%</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{item.sector || "Sector N/A"}</Badge>
          <Badge variant="outline">Risk: {item.risk_rating}</Badge>
          {item.target_horizon ? (
            <Badge variant="outline" className="text-muted-foreground">
              {item.target_horizon}
            </Badge>
          ) : null}
        </div>
        <Section title="Thesis" body={item.thesis || item.why_recommended || item.bull_case} accent="gain" />
        <Section title="Catalyst" body={item.catalyst} />
        <Section title="Risk" body={item.risk || item.bear_case} accent="loss" />
        {item.target || item.target_horizon ? (
          <Section title="Target (timeline)" body={item.target || item.target_horizon} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent?: "gain" | "loss";
}) {
  if (!body?.trim()) return null;
  const border =
    accent === "gain"
      ? "border-l-emerald-500/50"
      : accent === "loss"
        ? "border-l-rose-500/50"
        : "border-l-border";
  return (
    <div className={`border-l-2 pl-3 ${border}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="text-muted-foreground leading-relaxed line-clamp-4">{body}</p>
    </div>
  );
}
