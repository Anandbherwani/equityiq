import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { isServerPreviewMode } from "@/lib/server-preview";
import { ThemesView } from "./themes-view";

export default async function ThemesPage() {
  const preview = await isServerPreviewMode();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sectors &amp; themes</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Sector conviction from Top 10 lists plus theme strength, momentum, and government support
          from the theme intelligence engine.
        </p>
      </div>
      <DataSourceNotice source={preview ? "preview" : "live"} />
      <ThemesView />
    </div>
  );
}
