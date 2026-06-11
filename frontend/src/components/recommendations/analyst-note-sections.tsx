"use client";

import type { AnalystNote } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTIONS: { key: keyof AnalystNote; label: string; accent: string }[] = [
  { key: "investment_thesis", label: "Investment thesis", accent: "border-primary/30" },
  { key: "bull_case", label: "Bull case", accent: "border-emerald-500/50" },
  { key: "bear_case", label: "Bear case", accent: "border-rose-500/50" },
  { key: "catalysts", label: "Catalysts", accent: "border-amber-500/50" },
  { key: "risks", label: "Risks", accent: "border-orange-500/50" },
  { key: "valuation_summary", label: "Valuation summary", accent: "border-violet-500/50" },
  { key: "peer_comparison", label: "Peer comparison", accent: "border-blue-500/50" },
  { key: "theme_exposure", label: "Theme exposure", accent: "border-lime-500/50" },
  { key: "confidence", label: "Confidence", accent: "border-fuchsia-500/50" },
  { key: "timeline", label: "Timeline", accent: "border-slate-500/50" },
];

export function AnalystNoteSections({
  note,
  compact = false,
  className,
}: {
  note: AnalystNote;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {SECTIONS.map(({ key, label, accent }) => {
        const body =
          key === "confidence"
            ? `${note.confidence}/100${note.confidence_rationale ? `\n\n${note.confidence_rationale}` : ""}`
            : key === "valuation_summary"
              ? String(note.valuation_summary ?? note.valuation ?? "").trim()
              : String(note[key] ?? "").trim();
        if (!body) return null;
        return (
          <section
            key={key}
            className={cn(
              "rounded-md border-l-2 pl-3",
              accent,
              compact ? "text-xs" : "text-sm"
            )}
          >
            <h4 className="font-semibold text-foreground/90 mb-1">{label}</h4>
            <p className="text-foreground/85 leading-relaxed whitespace-pre-wrap">{body}</p>
          </section>
        );
      })}
    </div>
  );
}
