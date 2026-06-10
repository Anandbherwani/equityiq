import { notFound } from "next/navigation";
import { StockDetailView } from "@/components/stock/stock-detail-view";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { RefreshButton } from "@/components/stock/refresh-button";
import { demoSymbol } from "@/lib/demo-data";
import { getSymbol } from "@/lib/sheets-api";
import { isServerPreviewMode } from "@/lib/server-preview";

type Props = { params: Promise<{ symbol: string }> };

export default async function StockPage({ params }: Props) {
  const { symbol } = await params;
  const key = symbol.toUpperCase();
  const preview = await isServerPreviewMode();

  if (preview) {
    return (
      <div className="space-y-4">
        <DataSourceNotice source="preview" />
        <StockDetailView data={demoSymbol(key)} />
      </div>
    );
  }

  const data = await getSymbol(key);
  if (!data.ok) {
    if (data.error.toLowerCase().includes("not found")) notFound();
    // Keep search usable when the live API is slow or unreachable.
    return (
      <div className="space-y-4">
        <DataSourceNotice source="live" error={data.error} />
        <StockDetailView data={demoSymbol(key)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {data.updated ? (
          <p className="text-[11px] text-muted-foreground">
            Analysis:{" "}
            {new Date(data.updated).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </p>
        ) : (
          <span />
        )}
        <RefreshButton />
      </div>
      <StockDetailView data={data} />
    </div>
  );
}
