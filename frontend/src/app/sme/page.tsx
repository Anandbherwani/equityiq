import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { isServerPreviewMode } from "@/lib/server-preview";
import { SmeView } from "./sme-view";

export default async function SmePage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SME alpha</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          High-conviction SME &amp; Emerge names from the ranked watchlist — alpha score and track
          from your engine.
        </p>
      </div>
      <DataSourceNotice source={preview ? "preview" : "live"} />
      <SmeView />
    </div>
  );
}
