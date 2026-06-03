import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketIndex } from "@/lib/types";
import { formatPct, pctClass } from "@/lib/format";

export function IndexCards({ indices }: { indices: MarketIndex[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {indices.map((idx) => (
        <Card
          key={idx.id}
          className="border-border/50 bg-card/90 shadow-sm hover:border-cyan-500/30 transition-colors"
        >
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {idx.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {idx.level.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] uppercase text-muted-foreground">
              <span>
                D{" "}
                <span className={pctClass(idx.daily)}>{formatPct(idx.daily)}</span>
              </span>
              <span>
                W{" "}
                <span className={pctClass(idx.weekly)}>{formatPct(idx.weekly)}</span>
              </span>
              <span>
                M{" "}
                <span className={pctClass(idx.monthly)}>{formatPct(idx.monthly)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
