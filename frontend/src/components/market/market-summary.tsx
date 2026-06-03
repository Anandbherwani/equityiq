import { IndexCards } from "./index-cards";
import type { MarketIndex } from "@/lib/types";

export function MarketSummary({ indices }: { indices: MarketIndex[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-cyan-400/90">
          Market summary
        </h2>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Live indices when API connected · demo data otherwise
        </p>
      </div>
      <IndexCards indices={indices} />
    </section>
  );
}
