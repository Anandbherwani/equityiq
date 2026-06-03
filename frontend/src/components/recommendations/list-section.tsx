import { RecommendationDecisionCard } from "./recommendation-decision-card";
import type { EnrichedRecommendation } from "@/lib/types";

export function ListSection({
  title,
  items,
  id,
}: {
  title: string;
  items: EnrichedRecommendation[];
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-end justify-between border-b border-border/60 pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground font-mono">{items.length} picks</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center rounded-lg border border-dashed border-border">
          No rows yet — rebuild Tab 11 in Sheets.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <RecommendationDecisionCard
              key={`${title}-${item.rank}-${item.symbol}`}
              item={item}
              listName={title}
            />
          ))}
        </div>
      )}
    </section>
  );
}
