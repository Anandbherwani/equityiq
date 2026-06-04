import { ResearchPicksTable } from "@/components/watchlist/research-picks-table";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { isServerPreviewMode } from "@/lib/server-preview";
import { WatchlistClient } from "./watchlist-client";

export default async function WatchlistPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-10 pb-24 lg:pb-8">
      <WatchlistClient />
      <section className="space-y-4 border-t border-border/40 pt-8">
        <div>
          <h2 className="text-xl font-semibold">Research picks (all lists)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Deduplicated symbols from all six Top 10 lists — sort, filter, export CSV.
          </p>
        </div>
        <DataSourceNotice source={preview ? "preview" : "live"} />
        <ResearchPicksTable />
      </section>
    </div>
  );
}
