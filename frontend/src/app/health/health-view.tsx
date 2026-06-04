"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchClientApi } from "@/lib/client-api";
import type {
  ApiError,
  DataCoverageReport,
  HealthResponse,
  SheetAuditDiagnosis,
  SheetAuditResponse,
  SystemAuditResponse,
} from "@/lib/types";
import { ApiErrorCard } from "@/components/shared/api-error-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function statusDot(ok: boolean, partial: boolean) {
  if (ok) return "bg-emerald-500";
  if (partial) return "bg-amber-400";
  return "bg-rose-500";
}

function nextRunIst() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const targets = [6, 8].map((h) => {
    const d = new Date(ist);
    d.setHours(h, 0, 0, 0);
    if (d <= ist) d.setDate(d.getDate() + 1);
    return d;
  });
  const next = targets.sort((a, b) => a.getTime() - b.getTime())[0];
  const mins = Math.max(0, Math.round((next.getTime() - ist.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function normalizeDiagnosis(
  raw: SheetAuditDiagnosis[] | string[] | undefined
): { message: string; severity?: string }[] {
  if (!raw?.length) return [];
  return raw.map((item) =>
    typeof item === "string"
      ? { message: item }
      : { message: item.message || "", severity: item.severity }
  );
}

export function HealthView() {
  const [health, setHealth] = useState<HealthResponse | ApiError | null>(null);
  const [audit, setAudit] = useState<SheetAuditResponse | ApiError | null>(null);
  const [coverage, setCoverage] = useState<DataCoverageReport | ApiError | null>(null);
  const [system, setSystem] = useState<SystemAuditResponse | ApiError | null>(null);

  const load = useCallback(async () => {
    const [h, a, c, s] = await Promise.all([
      fetchClientApi<HealthResponse>("health"),
      fetchClientApi<SheetAuditResponse>("sheet_audit"),
      fetchClientApi<DataCoverageReport>("data_coverage"),
      fetchClientApi<SystemAuditResponse>("system_audit"),
    ]);
    setHealth(h);
    setAudit(a);
    setCoverage(c);
    setSystem(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const diagnosis = useMemo(() => {
    const fromAudit =
      audit && "ok" in audit && audit.ok ? normalizeDiagnosis(audit.diagnosis) : [];
    const fromSystem =
      system && "ok" in system && system.ok && system.audit?.diagnosis
        ? normalizeDiagnosis(system.audit.diagnosis)
        : [];
    return [...fromAudit, ...fromSystem];
  }, [audit, system]);

  if (!health || !audit) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading system health…</p>;
  }
  if (!("ok" in health) || !health.ok) {
    return <ApiErrorCard message={health.error || "Health check failed"} onRetry={load} />;
  }

  const tab1 = audit && "ok" in audit && audit.ok ? audit.tab1_row_count ?? 0 : 0;
  const tab10 = audit && "ok" in audit && audit.ok ? audit.tab10_row_count ?? health.tab10Rows : 0;
  const tab11 = audit && "ok" in audit && audit.ok ? audit.tab11_row_count ?? health.tab11Rows : 0;
  const tab6 = audit && "ok" in audit && audit.ok ? audit.tab6_row_count ?? health.tab6Rows : 0;

  const cards = [
    {
      title: "Data ingestion",
      rows: tab1,
      detail: `Universe ${tab1} symbols`,
      ok: tab1 > 100,
      partial: tab1 > 0 && tab1 <= 100,
    },
    {
      title: "Scoring pipeline",
      rows: tab10,
      detail: `${audit && "ok" in audit && audit.ok ? audit.non_zero_conviction_scores : "—"} non-zero scores`,
      ok: tab10 > 100,
      partial: tab10 > 0,
    },
    {
      title: "Recommendations",
      rows: tab11,
      detail: `${tab11} list rows`,
      ok: tab11 >= 50,
      partial: tab11 > 0,
    },
    {
      title: "Fundamentals",
      rows: tab6,
      detail: `Tab 6 rows ${tab6}`,
      ok: tab6 > 100,
      partial: tab6 > 0,
    },
  ];

  const gauges =
    audit && "ok" in audit && audit.ok
      ? [
          {
            label: "Universe",
            pct: Math.min(100, Math.round(((audit.universe_symbols_loaded ?? 0) / 5000) * 100)),
          },
          { label: "Market cap", pct: audit.market_cap_coverage_pct ?? 0 },
          { label: "Themes", pct: audit.theme_coverage_pct ?? 0 },
          { label: "Sectors", pct: audit.sector_coverage_pct ?? 0 },
        ]
      : [];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="border-border/60">
            <CardContent className="pt-4 flex gap-3">
              <span
                className={cn(
                  "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                  statusDot(c.ok, c.partial)
                )}
              />
              <div>
                <p className="text-sm font-medium">{c.title}</p>
                <p className="font-mono text-xl tabular-nums mt-1">{c.rows}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {gauges.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {gauges.map((g) => (
            <Card key={g.label}>
              <CardContent className="pt-4 text-center">
                <p className="text-[11px] uppercase text-muted-foreground">{g.label}</p>
                <p className="font-mono text-2xl font-semibold tabular-nums mt-1">{g.pct}%</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${g.pct}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {coverage && "ok" in coverage && coverage.ok ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Data coverage by pillar</h2>
          <p className="text-sm text-muted-foreground">
            Average coverage {coverage.average_coverage_pct ?? "—"}% · target{" "}
            {coverage.target_pct}%
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.pillars.map((p) => (
              <div
                key={p.pillar}
                className="rounded-lg border border-border/50 px-3 py-2 flex justify-between items-center text-sm"
              >
                <span>{p.label}</span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    p.meets_target ? "text-emerald-400" : "text-amber-300"
                  )}
                >
                  {p.coverage_pct}%
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {diagnosis.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Audit diagnosis</h2>
          <ul className="space-y-2 text-sm">
            {diagnosis.map((d, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  d.severity === "error"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-border/50 bg-muted/20"
                )}
              >
                {d.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Automation schedule (IST)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground font-normal">6:00 AM</strong> — Data refresh, NSE
            ingestion, news pipeline, scoring rebuild
          </p>
          <p>
            <strong className="text-foreground font-normal">8:00 AM</strong> — Morning brief,
            recommendation snapshot, delivery channels
          </p>
          <p className="font-mono text-xs text-cyan-400/90">Next run in ~{nextRunIst()}</p>
          <p className="text-xs">
            API v{health.version} · {health.spreadsheetName}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
