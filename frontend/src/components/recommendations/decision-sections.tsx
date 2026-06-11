"use client";

import type { Persona } from "@/lib/persona";
import type { DecisionNarrative } from "@/lib/types";
import { cn } from "@/lib/utils";

const FIELD_META: Partial<
  Record<keyof DecisionNarrative, { label: string; beginnerLabel: string; pmLabel: string; accent: string }>
> = {
  why: {
    label: "Why",
    beginnerLabel: "Why we like it",
    pmLabel: "Conviction",
    accent: "border-primary/30",
  },
  what: {
    label: "What",
    beginnerLabel: "What to do",
    pmLabel: "Action",
    accent: "border-emerald-500/50",
  },
  risk: {
    label: "Risk",
    beginnerLabel: "What could go wrong",
    pmLabel: "Risk",
    accent: "border-rose-500/50",
  },
  catalyst: {
    label: "Catalyst",
    beginnerLabel: "What could move the stock",
    pmLabel: "Catalyst",
    accent: "border-amber-500/50",
  },
  timeline: {
    label: "Timeline",
    beginnerLabel: "How long to hold",
    pmLabel: "Horizon",
    accent: "border-violet-500/50",
  },
  why_now: {
    label: "Why now?",
    beginnerLabel: "Why act now",
    pmLabel: "Why now",
    accent: "border-amber-500/50",
  },
  why_stock: {
    label: "Why this stock?",
    beginnerLabel: "Why this company",
    pmLabel: "Why stock",
    accent: "border-primary/30",
  },
  why_peers: {
    label: "Why vs peers?",
    beginnerLabel: "Why better than others",
    pmLabel: "Vs peers",
    accent: "border-emerald-500/50",
  },
  upside: {
    label: "Upside",
    beginnerLabel: "Upside potential",
    pmLabel: "Upside",
    accent: "border-lime-500/50",
  },
  reward_risk: {
    label: "Reward/Risk",
    beginnerLabel: "Reward vs risk",
    pmLabel: "Reward/Risk",
    accent: "border-orange-500/50",
  },
};

const ENGINE3_ORDER: (keyof DecisionNarrative)[] = ["why_now", "why_stock", "why_peers"];
const RISK_REWARD_ORDER: (keyof DecisionNarrative)[] = ["upside", "risk", "reward_risk"];
const ORDER: (keyof DecisionNarrative)[] = ["why", "what", "risk", "catalyst", "timeline"];

const ENGINE3_META: Record<string, { label: string; beginnerLabel: string; pmLabel: string; accent: string }> = {
  why_now: {
    label: "Why now?",
    beginnerLabel: "Why act now",
    pmLabel: "Why now",
    accent: "border-amber-500/50",
  },
  why_stock: {
    label: "Why this stock?",
    beginnerLabel: "Why this company",
    pmLabel: "Why stock",
    accent: "border-primary/30",
  },
  why_peers: {
    label: "Why vs peers?",
    beginnerLabel: "Why better than others",
    pmLabel: "Vs peers",
    accent: "border-emerald-500/50",
  },
  upside: {
    label: "Upside",
    beginnerLabel: "Upside potential",
    pmLabel: "Upside",
    accent: "border-lime-500/50",
  },
  reward_risk: {
    label: "Reward/Risk",
    beginnerLabel: "Reward vs risk",
    pmLabel: "Reward/Risk",
    accent: "border-orange-500/50",
  },
};

export function DecisionSections({
  decision,
  persona,
  compact = false,
  className,
}: {
  decision: DecisionNarrative;
  persona: Persona;
  compact?: boolean;
  className?: string;
}) {
  const fieldText = (k: keyof DecisionNarrative) => {
    const v = decision[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const hasEngine3 = ENGINE3_ORDER.some((k) => fieldText(k));
  const hasRiskReward = RISK_REWARD_ORDER.some((k) => fieldText(k));
  const tailOrder: (keyof DecisionNarrative)[] = hasRiskReward
    ? ["why", "what", "catalyst", "timeline"]
    : ORDER;
  const displayOrder = hasEngine3
    ? ([...ENGINE3_ORDER, ...(hasRiskReward ? RISK_REWARD_ORDER : []), ...tailOrder] as (keyof DecisionNarrative)[])
    : ORDER;

  if (persona === "portfolio_manager") {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <table className="w-full text-xs border-collapse">
          <tbody>
            {displayOrder.map((key) => (
              <tr key={key} className="border-b border-border/40">
                <td className="py-1.5 pr-3 font-medium text-muted-foreground whitespace-nowrap align-top w-20">
                  {(ENGINE3_META[key] || FIELD_META[key])?.pmLabel ?? key}
                </td>
                <td className="py-1.5 text-foreground/90 leading-snug">{fieldText(key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2", className)}>
      {displayOrder.map((key) => {
        const meta = ENGINE3_META[key] || FIELD_META[key];
        if (!meta) return null;
        const label = persona === "beginner" ? meta.beginnerLabel : meta.label;
        const body = fieldText(key);
        if (!body) return null;
        return (
          <div
            key={key}
            className={cn("border-l-2 pl-3", meta.accent, compact && "text-xs")}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              {label}
            </p>
            <p
              className={cn(
                "leading-relaxed text-muted-foreground",
                persona === "beginner" ? "text-sm text-foreground/85" : "text-sm",
                compact && "line-clamp-3"
              )}
            >
              {body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function DecisionExportLine({
  symbol,
  decision,
}: {
  symbol: string;
  decision: DecisionNarrative;
}) {
  const keys = ENGINE3_ORDER.some((k) => typeof decision[k] === "string" && decision[k]?.trim())
    ? ([...ENGINE3_ORDER, ...ORDER] as (keyof DecisionNarrative)[])
    : ORDER;
  const parts = keys
    .filter((k) => typeof decision[k] === "string" && String(decision[k]).trim())
    .map((k) => `${(ENGINE3_META[k] || FIELD_META[k])?.pmLabel ?? k}: ${decision[k]}`);
  return (
    <p className="font-mono text-[10px] text-muted-foreground break-all">
      {symbol} | {parts.join(" | ")}
    </p>
  );
}
