import { cn } from "@/lib/utils";

export function dataQualityTone(pct: number | null | undefined): "high" | "mid" | "low" | "none" {
  if (pct == null || Number.isNaN(pct)) return "none";
  if (pct >= 70) return "high";
  if (pct >= 40) return "mid";
  return "low";
}

const TONE_CLASS = {
  high: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  mid: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  low: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  none: "border-border/50 bg-muted/20 text-muted-foreground",
};

export function DataQualityBadge({
  pct,
  size = "sm",
  className,
}: {
  pct: number | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = dataQualityTone(pct);
  const label = pct != null && !Number.isNaN(pct) ? `${Math.round(pct)}%` : "—";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-mono tabular-nums",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
        TONE_CLASS[tone],
        className
      )}
      title="Data Quality % — completeness, freshness, source reliability"
    >
      <span className="uppercase tracking-wider text-[9px] opacity-80">DQ</span>
      {label}
    </span>
  );
}
