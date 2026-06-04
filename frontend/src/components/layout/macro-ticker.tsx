"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClientApi } from "@/lib/client-api";
import type { ApiError, MacroResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function biasClass(bias?: string) {
  const b = (bias || "").toUpperCase();
  if (b.includes("BULL")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (b.includes("BEAR")) return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return "bg-amber-500/15 text-amber-200 border-amber-500/30";
}

export function MacroTicker() {
  const [macro, setMacro] = useState<MacroResponse | ApiError | null>(null);

  const load = useCallback(async () => {
    const data = await fetchClientApi<MacroResponse>("macro");
    setMacro(data);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (!macro || !("ok" in macro) || !macro.ok) return null;

  const nifty = macro.metrics?.find(
    (m) => /nifty\s*50/i.test(m.metric || "") || m.metric === "Nifty 50"
  );
  const bias = macro.macro_verdict?.bias || nifty?.bias || "NEUTRAL";
  const trendStr = String(nifty?.trend || "");
  const changeMatch = trendStr.match(/[+-]?\d+\.?\d*/);
  const change = changeMatch ? parseFloat(changeMatch[0]) : null;

  return (
    <div className="hidden md:flex items-center gap-2 shrink-0 text-xs">
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide",
          biasClass(String(bias))
        )}
      >
        {String(bias).slice(0, 12)}
      </span>
      {nifty ? (
        <span className="font-mono tabular-nums text-muted-foreground">
          Nifty{" "}
          <span className="text-foreground">
            {typeof nifty.value === "number"
              ? nifty.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })
              : String(nifty.value ?? "—")}
          </span>
          {change != null ? (
            <span className={change >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {" "}
              {change >= 0 ? "+" : ""}
              {Number(change).toFixed(2)}%
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
