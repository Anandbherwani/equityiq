"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiBanner } from "@/components/shared/api-banner";
import { ErrorState } from "@/components/shared/error-state";
import { RecommendationSkeleton } from "@/components/shared/skeletons";
import { fetchClientApi } from "@/lib/client-api";
import { RECOMMENDATION_LIST_NAMES } from "@/lib/constants";
import { isDemoMode } from "@/lib/storage";
import type { SymbolResponse, Top10Response } from "@/lib/types";

type AlertItem = {
  symbol: string;
  company_name: string;
  list_name: string;
  severity: "high" | "medium";
  title: string;
  detail: string;
};

export function AlertsClient() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const top = await fetchClientApi<Top10Response>("top10");
    if (!top || !("ok" in top) || !top.ok) {
      setError(("error" in top ? top.error : null) || "Could not load recommendations");
      setLoading(false);
      return;
    }

    const found: AlertItem[] = [];
    for (const listName of RECOMMENDATION_LIST_NAMES) {
      const list = top.lists.find((l) => l.name === listName);
      if (!list) continue;
      for (const item of list.items.slice(0, 10)) {
        const sym = await fetchClientApi<SymbolResponse>("symbol", { symbol: item.symbol });
        if (!sym || !("ok" in sym) || !sym.ok) continue;
        const sc = sym.scoring;
        if (sc?.risk_grade === "F" || sc?.risk_grade === "D") {
          found.push({
            symbol: item.symbol,
            company_name: item.company_name,
            list_name: listName,
            severity: "high",
            title: `Risk grade ${sc.risk_grade}`,
            detail: `Safety score ${sc.risk_score ?? "—"}/100 — review before sizing.`,
          });
        } else if (sc && sc.risk_score != null && sc.risk_score < 45) {
          found.push({
            symbol: item.symbol,
            company_name: item.company_name,
            list_name: listName,
            severity: "medium",
            title: "Below-average risk score",
            detail: `Safety ${sc.risk_score}/100 on current research model.`,
          });
        }
        if (sc?.data_gate_flag === false) {
          found.push({
            symbol: item.symbol,
            company_name: item.company_name,
            list_name: listName,
            severity: "medium",
            title: "Incomplete research data",
            detail: "Fundamentals gate not passed — verify before acting on thesis.",
          });
        }
      }
    }

    const seen = new Set<string>();
    setAlerts(
      found.filter((a) => {
        const k = `${a.symbol}-${a.title}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const high = alerts.filter((a) => a.severity === "high");
  const med = alerts.filter((a) => a.severity === "medium");

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-400" />
          Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Risk and data-quality flags on current top recommendations — derived from your research
          engine, not a separate alert system.
        </p>
      </div>

      {!loading && !alerts.length && !isDemoMode() ? <ApiBanner /> : null}
      {error ? <ErrorState message={error} retry={load} /> : null}
      {loading ? (
        <div className="space-y-3">
          <RecommendationSkeleton />
          <RecommendationSkeleton />
        </div>
      ) : null}

      {!loading && !error && alerts.length === 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No high-priority flags on current recommendation lists.
          </CardContent>
        </Card>
      ) : null}

      {high.length > 0 ? (
        <AlertSection title="High priority" items={high} icon={ShieldAlert} tone="high" />
      ) : null}
      {med.length > 0 ? (
        <AlertSection title="Review suggested" items={med} icon={AlertTriangle} tone="medium" />
      ) : null}
    </div>
  );
}

function AlertSection({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: AlertItem[];
  icon: typeof Bell;
  tone: "high" | "medium";
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => (
          <Card
            key={`${a.symbol}-${a.title}`}
            className={
              tone === "high"
                ? "border-rose-500/35 bg-rose-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-start gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 mt-0.5 ${tone === "high" ? "text-rose-400" : "text-amber-400"}`}
                />
                <span>
                  <Link href={`/stock/${a.symbol}`} className="font-mono text-primary hover:underline">
                    {a.symbol}
                  </Link>
                  {" — "}
                  {a.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>{a.detail}</p>
              <p>
                {a.company_name} · {a.list_name.replace("Top 10 ", "")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
