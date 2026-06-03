import type { DataCoverageReport } from "@/lib/types";

export function DataCoveragePanel({ report }: { report: DataCoverageReport }) {
  if (!report.ok || !report.pillars?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Pillar coverage unavailable — run scoring pipeline on Tab 10.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-x-auto">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-sm font-medium">Data pillar coverage</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Target {report.target_pct}%+ per pillar · Average {report.average_coverage_pct}%
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
            <th className="px-4 py-2">Pillar</th>
            <th className="px-4 py-2 text-right">Coverage</th>
            <th className="px-4 py-2 text-right">Stale</th>
            <th className="px-4 py-2 text-right">Null</th>
            <th className="px-4 py-2 text-right">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {report.pillars.map((p) => (
            <tr key={p.pillar} className="border-b border-border/30">
              <td className="px-4 py-2">{p.label}</td>
              <td className={`px-4 py-2 text-right tabular-nums ${p.meets_target ? "text-emerald-400" : "text-amber-300"}`}>
                {p.coverage_pct}%
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{p.stale_pct}%</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{p.null_pct}%</td>
              <td className="px-4 py-2 text-right tabular-nums">{p.confidence_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
