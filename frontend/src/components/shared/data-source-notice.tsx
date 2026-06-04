import Link from "next/link";
import { ApiBanner } from "./api-banner";
import { hasServerSheetsApi } from "@/lib/sheets-api";
import type { DataSource } from "@/lib/server-preview";

/** API / preview messaging for server-rendered pages. */
export async function DataSourceNotice({
  source,
  error,
}: {
  source: DataSource;
  error?: string;
}) {
  const connected = await hasServerSheetsApi();

  if (!connected) {
    return <ApiBanner message={error} />;
  }

  if (error) {
    return <ApiBanner message={error} variant="error" />;
  }

  if (source === "preview") {
    return (
      <div className="mb-6 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200/90">
        Showing preview data (demo mode).{" "}
        <Link href="/settings" className="text-cyan-400 hover:underline">
          Turn off demo
        </Link>{" "}
        to load live research engine data.
      </div>
    );
  }

  return null;
}
