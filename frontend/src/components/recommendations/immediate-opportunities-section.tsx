"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { TerminalOpportunityCard } from "@/components/recommendations/terminal-opportunity-card";
import { ErrorState } from "@/components/shared/error-state";
import { RecommendationSkeleton } from "@/components/shared/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchClientApi } from "@/lib/client-api";
import { enrichRecommendation } from "@/lib/derivations";
import { isDemoMode } from "@/lib/storage";
import type { ApiError, EnrichedRecommendation, Top10Response } from "@/lib/types";

const IMMEDIATE_LIST = "Top 10 Immediate Opportunities";
const LOG_PREFIX = "[ImmediateOpportunities]";

function isApiError(v: unknown): v is ApiError {
  return typeof v === "object" && v !== null && "ok" in v && (v as ApiError).ok === false;
}

function picksFromTop10(top10: Top10Response): EnrichedRecommendation[] {
  const list = top10.lists?.find((l) => l.name === IMMEDIATE_LIST);
  return (list?.items.slice(0, 10) ?? []).map((item) =>
    enrichRecommendation(item, null, null, IMMEDIATE_LIST)
  );
}

function emptyDetailFromTop10(top10: Top10Response): string {
  const names = (top10.lists ?? []).map((l) => l.name).filter(Boolean);
  const list = top10.lists?.find((l) => l.name === IMMEDIATE_LIST);
  if (!list) {
    return names.length
      ? `top10 ok:true but "${IMMEDIATE_LIST}" not found. Lists returned: ${names.join(", ")}`
      : `top10 ok:true but lists[] is empty (listCount: ${top10.listCount ?? "n/a"})`;
  }
  if (!list.items?.length) {
    return `"${IMMEDIATE_LIST}" exists but has 0 items. Run Rebuild scoring pipeline in Tab 11.`;
  }
  return `"${IMMEDIATE_LIST}" returned no usable items after parsing.`;
}

export function ImmediateOpportunitiesSection() {
  const [items, setItems] = useState<EnrichedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyDetail, setEmptyDetail] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "preview">("live");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyDetail(null);
    setItems([]);

    const top10 = await fetchClientApi<Top10Response>("top10");

    if (!top10) {
      setError("No response from research API (null body).");
      setLoading(false);
      return;
    }

    if (isApiError(top10)) {
      setError(top10.error || "Research API returned ok:false");
      setLoading(false);
      return;
    }

    if (!("ok" in top10) || !top10.ok) {
      setError("Unexpected top10 payload (missing ok:true).");
      setLoading(false);
      return;
    }

    const picks = picksFromTop10(top10);
    if (picks.length === 0) {
      const detail = emptyDetailFromTop10(top10);
      setEmptyDetail(detail);
      setSource(isDemoMode() ? "preview" : "live");
      setLoading(false);
      return;
    }

    setItems(picks);
    setUpdatedAt(top10.updated ?? new Date().toISOString());
    setSource(isDemoMode() ? "preview" : "live");
    setLoading(false);
    toast.success(`${picks.length} picks loaded`, { duration: 2000 });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          Loading immediate picks from research engine… (can take up to 2 minutes)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <RecommendationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load immediate picks"
        message={error}
        retry={load}
      />
    );
  }

  if (items.length === 0 && emptyDetail) {
    return (
      <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-12 text-center text-sm space-y-3">
          <p className="font-medium text-foreground">
            {source === "preview"
              ? "No immediate picks in demo/preview data"
              : "Research API responded but returned no immediate picks"}
          </p>
          <p className="text-muted-foreground max-w-lg mx-auto text-xs leading-relaxed">
            {emptyDetail}
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Open the browser console and filter for {LOG_PREFIX} to inspect the raw top10 response.
          </p>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        {updatedAt ? (
          <span>
            Updated{" "}
            {new Date(updatedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </span>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          className="h-6 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        {items.map((item, i) => (
          <TerminalOpportunityCard
            key={item.symbol}
            item={item}
            listName={IMMEDIATE_LIST}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  );
}
