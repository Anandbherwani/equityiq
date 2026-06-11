import { IndexCards } from "./index-cards";
import type { MarketIndex } from "@/lib/types";

export function MarketSummary({ indices }: { indices: MarketIndex[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Market overview
        </h2>
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Live when API connected · demo data otherwise
        </p>
      </div>
      <IndexCards indices={indices} />
    </section>
  );
}
