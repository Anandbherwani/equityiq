"use client";

import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/10 px-4 py-2.5 text-sm">
      <FlaskConical className="h-4 w-4 text-violet-300 shrink-0" />
      <p>
        <span className="font-medium text-violet-200">Demo mode</span>
        <span className="text-muted-foreground">
          {" "}
          — sample data only. Turn off in Settings to use your live research API.
        </span>
      </p>
    </div>
  );
}
