import type { MarketIndex } from "@/lib/types";
import { formatPct, pctClass } from "@/lib/format";

export function IndexCards({ indices }: { indices: MarketIndex[] }) {
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
      {indices.map((idx) => (
        <IndexCard key={idx.id} idx={idx} />
      ))}
    </div>
  );
}

function IndexCard({ idx }: { idx: MarketIndex }) {
  const isPositive = (idx.daily ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 card-lift">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate">
        {idx.name}
      </p>
      <p className="font-mono text-base font-bold tabular-nums text-foreground mt-0.5">
        {idx.level.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono tabular-nums">
        <span
          className={
            isPositive ? "text-gain font-semibold" : "text-loss font-semibold"
          }
        >
          {formatPct(idx.daily)}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className={pctClass(idx.weekly)}>W {formatPct(idx.weekly)}</span>
        <span className="text-muted-foreground/60 hidden sm:inline">·</span>
        <span className={`${pctClass(idx.monthly)} hidden sm:inline`}>M {formatPct(idx.monthly)}</span>
      </div>
    </div>
  );
}
