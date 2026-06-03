import { ListSection } from "@/components/recommendations/list-section";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { RECOMMENDATION_LIST_NAMES } from "@/lib/constants";
import { enrichRecommendation } from "@/lib/derivations";
import { getSymbol } from "@/lib/sheets-api";
import { loadTop10 } from "@/lib/server-preview";
import type { EnrichedRecommendation, RecommendationList } from "@/lib/types";

async function enrichList(
  items: RecommendationList["items"],
  listName: string,
  useLiveEnrich: boolean
): Promise<EnrichedRecommendation[]> {
  return Promise.all(
    items.map(async (item) => {
      if (useLiveEnrich) {
        const sym = await getSymbol(item.symbol);
        if (sym && "ok" in sym && sym.ok) {
          return enrichRecommendation(item, sym.price, sym.scoring, listName);
        }
      }
      return enrichRecommendation(item, null, null, listName);
    })
  );
}

export default async function RecommendationsPage() {
  const { source, data: top10, error } = await loadTop10();

  const byName = new Map<string, EnrichedRecommendation[]>();
  if (top10?.ok) {
    for (const list of top10.lists) {
      byName.set(
        list.name,
        await enrichList(list.items.slice(0, 10), list.name, source === "live")
      );
    }
  }

  return (
    <div className="space-y-10 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recommendations</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Six curated lists ranked by conviction. Each pick includes a full analyst note — thesis,
          bull and bear case, catalysts, risks, valuation, peers, themes, confidence, and timeline.
        </p>
      </div>

      <DataSourceNotice source={source} error={error} />

      <nav className="flex flex-wrap gap-2 text-xs">
        {RECOMMENDATION_LIST_NAMES.map((name) => (
          <a
            key={name}
            href={`#${slug(name)}`}
            className="rounded-full border border-border/60 px-3 py-1 hover:bg-muted/40"
          >
            {shortName(name)}
          </a>
        ))}
      </nav>

      {RECOMMENDATION_LIST_NAMES.map((name) => (
        <ListSection
          key={name}
          id={slug(name)}
          title={name}
          items={byName.get(name) ?? []}
        />
      ))}
    </div>
  );
}

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function shortName(name: string) {
  return name.replace("Top 10 ", "");
}
