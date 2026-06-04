import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { isServerPreviewMode } from "@/lib/server-preview";
import { IpoView } from "./ipo-view";

export default async function IpoPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IPO intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Subscribe / watch / avoid verdicts from Tab 38 and the IPO Intelligence list — GMP,
          subscription, and thesis from your research engine.
        </p>
      </div>
      <DataSourceNotice source={preview ? "preview" : "live"} />
      <IpoView />
    </div>
  );
}
