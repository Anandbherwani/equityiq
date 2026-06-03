import { notFound } from "next/navigation";
import { StockDetailView } from "@/components/stock/stock-detail-view";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
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
    if (data.error.includes("not found")) notFound();
    return (
      <div>
        <DataSourceNotice source="live" error={data.error} />
      </div>
    );
  }

  return <StockDetailView data={data} />;
}
