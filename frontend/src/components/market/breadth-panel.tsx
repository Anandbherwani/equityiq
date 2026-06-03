import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketBreadth } from "@/lib/types";

export function BreadthPanel({ breadth }: { breadth: MarketBreadth }) {
  const total = breadth.advancers + breadth.decliners + breadth.unchanged;
  const advPct = total ? Math.round((breadth.advancers / total) * 100) : 0;

  return (
    <Card className="border-border/60 bg-card/80 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Market Breadth</CardTitle>
        <p className="text-xs text-muted-foreground">
          {advPct}% advancers · {total.toLocaleString()} issues
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Advancers" value={breadth.advancers} tone="gain" />
        <Stat label="Decliners" value={breadth.decliners} tone="loss" />
        <Stat label="52W Highs" value={breadth.highs52w} />
        <Stat label="52W Lows" value={breadth.lows52w} tone="loss" />
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "gain" | "loss";
}) {
  const color =
    tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-2xl font-semibold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
