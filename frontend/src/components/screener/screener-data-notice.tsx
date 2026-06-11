"use client";

import Link from "next/link";
import { ApiBanner } from "@/components/shared/api-banner";
import { hasClientSheetsApi } from "@/lib/client-api";
import { isDemoMode } from "@/lib/storage";
import type { DataSource } from "@/lib/server-preview";

export function ScreenerDataNotice({
  source,
  error,
}: {
  source: DataSource;
  error?: string;
}) {
  const connected = hasClientSheetsApi() || isDemoMode();

  if (!connected) {
    return <ApiBanner message={error} />;
  }

  if (error) {
    return <ApiBanner message={error} variant="error" />;
  }

  if (source === "preview") {
    return (
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200/90">
        Showing preview data (demo mode).{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Turn off demo
        </Link>{" "}
        to load live research engine data.
      </div>
    );
  }

  return null;
}
