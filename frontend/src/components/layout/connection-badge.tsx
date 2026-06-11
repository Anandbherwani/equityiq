"use client";

import { useEffect, useState } from "react";
import { isDemoMode } from "@/lib/storage";

export function ConnectionBadge() {
  const [mode, setMode] = useState<"live" | "demo" | null>(null);

  useEffect(() => {
    setMode(isDemoMode() ? "demo" : "live");
  }, []);

  if (!mode) return null;

  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
        mode === "live"
          ? "text-gain border-gain/30 bg-gain/10"
          : "text-warn border-warn/30 bg-warn/10"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          mode === "live" ? "bg-gain animate-pulse" : "bg-warn"
        }`}
      />
      {mode === "live" ? "Live" : "Demo"}
    </span>
  );
}
