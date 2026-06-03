import type { RecommendationHistoryHealth } from "@/lib/types";

export function HistoryHealthPanel({ health }: { health: RecommendationHistoryHealth }) {
  const items = [
    { label: "Tab 37 exists", value: health.tab37_exists ? "Yes" : "No" },
    { label: "Snapshot engine deployed", value: health.snapshot_engine_deployed ? "Yes" : "No" },
    { label: "Last snapshot date", value: health.last_snapshot_date || "—" },
    { label: "Rows added today", value: String(health.rows_added_today ?? 0) },
    { label: "Total history rows", value: String(health.total_history_rows ?? 0) },
    { label: "Last 8 AM run OK", value: health.last_8am_run_ok ? "Yes" : "No" },
    { label: "Monitor status", value: health.status || "—" },
  ];

  if (health.blank_category_rows != null && health.blank_category_rows > 0) {
    items.push({
      label: "Blank categories (legacy)",
      value: String(health.blank_category_rows),
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-medium mb-3">Recommendation history health</h2>
      <dl className="grid gap-2 sm:grid-cols-2 text-sm">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-muted-foreground text-xs">{item.label}</dt>
            <dd className="font-medium tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
