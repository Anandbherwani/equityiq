import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { isServerPreviewMode } from "@/lib/server-preview";
import { HealthView } from "./health-view";

export default async function HealthPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Pipeline row counts, coverage gauges, pillar data quality, and audit diagnosis from your
          research spreadsheet.
        </p>
      </div>
      <DataSourceNotice source={preview ? "preview" : "live"} />
      <HealthView />
    </div>
  );
}
