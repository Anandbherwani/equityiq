"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScreenerView } from "@/components/screener/screener-view";
import { fetchClientApi, hasClientSheetsApi } from "@/lib/client-api";
import { extractImmediatePicks } from "@/lib/screener-data";
import { isDemoMode } from "@/lib/storage";
import type { DataSource } from "@/lib/server-preview";
import type { HealthResponse, MacroResponse, Top10Response } from "@/lib/types";

export function ScreenerDashboard() {
  const [source, setSource] = useState<DataSource>("live");
  const [error, setError] = useState<string | undefined>();
  const [top10, setTop10] = useState<Top10Response | null>(null);
  const [macro, setMacro] = useState<MacroResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingTop10, setLoadingTop10] = useState(true);
  const [loadingMacro, setLoadingMacro] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const load = useCallback(async () => {
    setError(undefined);
    setLoadingTop10(true);
    setLoadingMacro(true);
    setLoadingHealth(true);

    if (isDemoMode()) {
      const [demoTop10, demoMacro, demoHealth] = await Promise.all([
        fetchClientApi<Top10Response>("top10"),
        fetchClientApi<MacroResponse>("macro"),
        fetchClientApi<HealthResponse>("health"),
      ]);
      if (demoTop10 && "ok" in demoTop10 && demoTop10.ok) {
        setTop10(demoTop10);
        setSource("preview");
      } else {
        setTop10(null);
        setError("Failed to load demo data");
      }
      if (demoMacro && "ok" in demoMacro && demoMacro.ok) setMacro(demoMacro);
      if (demoHealth && "ok" in demoHealth && demoHealth.ok) setHealth(demoHealth);
      setLoadingTop10(false);
      setLoadingMacro(false);
      setLoadingHealth(false);
      return;
    }

    if (!hasClientSheetsApi()) {
      setTop10(null);
      setMacro(null);
      setHealth(null);
      setLoadingTop10(false);
      setLoadingMacro(false);
      setLoadingHealth(false);
      return;
    }

    const macroPromise = fetchClientApi<MacroResponse>("macro").then((res) => {
      if (res && "ok" in res && res.ok) setMacro(res);
      setLoadingMacro(false);
      return res;
    });

    const healthPromise = fetchClientApi<HealthResponse>("health").then((res) => {
      if (res && "ok" in res && res.ok) setHealth(res);
      setLoadingHealth(false);
      return res;
    });

    const top10Promise = fetchClientApi<Top10Response>("top10").then((res) => {
      if (res && "ok" in res && res.ok) {
        setTop10(res);
        setSource("live");
        toast.success("Dashboard refreshed", { duration: 2000 });
      } else {
        setTop10(null);
        const errMsg = ("error" in (res ?? {}) ? (res as { error?: string }).error : null) || "Failed to load recommendations";
        setError(errMsg);
        toast.error(errMsg, { duration: 4000 });
      }
      setLoadingTop10(false);
      return res;
    });

    await Promise.all([macroPromise, healthPromise, top10Promise]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const picks = extractImmediatePicks(top10);
  const anyLoading = loadingTop10 || loadingMacro || loadingHealth;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        {anyLoading && hasClientSheetsApi() && !isDemoMode() ? (
          <div className="flex items-center gap-2 text-xs text-[var(--scr-muted)] font-mono">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--scr-primary)]" />
            Loading — picks may take up to 2 minutes on cold start…
          </div>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={anyLoading}
          className="h-7 gap-1.5 px-2 text-xs text-[var(--scr-muted)] hover:text-[var(--scr-text)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${anyLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <ScreenerView
        source={source}
        error={error}
        top10={top10}
        macro={macro}
        health={health}
        picks={picks}
        isDemo={isDemoMode()}
        loadingTop10={loadingTop10}
        loadingMacro={loadingMacro}
        loadingHealth={loadingHealth}
      />
    </>
  );
}
