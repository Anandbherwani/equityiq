import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DataQualityBadge } from "@/components/shared/data-quality-badge";
import type { ScoringRow } from "@/lib/types";

export function DataQualityPanel({ scoring }: { scoring: ScoringRow | null }) {
  if (!scoring) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          No scoring row — rebuild Tab 10 in Sheets.
        </CardContent>
      </Card>
    );
  }

  const dq = scoring.data_quality;
  const pct = scoring.data_quality_pct ?? dq?.data_quality_pct ?? 0;
  const missing = dq?.missing_data_flags ?? [];
  const stale = dq?.stale_data_flags ?? [];

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Data Quality</CardTitle>
        <DataQualityBadge pct={pct} size="md" />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <MetricBar label="Completeness" value={scoring.data_completeness_pct} />
        <MetricBar
          label="Source reliability"
          value={scoring.source_reliability_pct ?? dq?.source_reliability_pct}
        />
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Staleness penalty</span>
            <span className="font-mono">
              {((scoring.staleness_penalty ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Fundamentals age:{" "}
            {formatAge(scoring.fundamentals_age_days)}
            {scoring.data_gate_flag ? " · Gate pass" : " · Gate fail"}
          </p>
        </div>
        {missing.length > 0 ? (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Missing
            </p>
            <p className="font-mono text-xs text-rose-300/90 break-all">{missing.join(", ")}</p>
          </div>
        ) : (
          <p className="text-xs text-emerald-400/90">No missing flags on last rebuild.</p>
        )}
        {stale.length > 0 ? (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Stale
            </p>
            <p className="font-mono text-xs text-amber-300/90 break-all">{stale.join(", ")}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatAge(v: number | string | undefined): string {
  if (v === "" || v == null || v === undefined) return "—";
  return `${v}d`;
}

function MetricBar({ label, value }: { label: string; value?: number }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono">{v}%</span>
      </div>
      <Progress value={v} className="h-1.5" />
    </div>
  );
}
