"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredApiUrl } from "@/lib/storage";
import { getApiUrlFromEnv } from "@/lib/api-url";

export function DemoBanner() {
  const [isAuto, setIsAuto] = useState(false);

  useEffect(() => {
    const hasUrl = getStoredApiUrl() || getApiUrlFromEnv();
    setIsAuto(!hasUrl);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-4 py-2.5 text-sm">
      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
      <p className="flex-1">
        <span className="font-medium text-primary">
          {isAuto ? "Demo mode (auto)" : "Demo mode"}
        </span>
        <span className="text-muted-foreground">
          {isAuto
            ? " — no Sheets URL configured. Showing sample Indian market data."
            : " — sample data only. Turn off in Settings to use your live research API."}
        </span>
      </p>
      <Link href="/settings" className="text-[11px] text-primary hover:underline shrink-0">
        {isAuto ? "Connect →" : "Settings →"}
      </Link>
    </div>
  );
}
