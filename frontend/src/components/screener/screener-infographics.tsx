"use client";

import type { EnrichedRecommendation } from "@/lib/types";

/** Inline SVG icons from indian-stock-screener.html pipeline nodes */
export function PipelineIconSchedule() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

export function PipelineIconDataPull() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function PipelineIconAiScoring() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

export function PipelineIconReport() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}

export function PipelineIconDelivery() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.87a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  );
}

/** Horizontal conviction spread — complements per-card score bars in reference */
export function ScreenerScoreDistribution({ picks }: { picks: EnrichedRecommendation[] }) {
  if (picks.length === 0) return null;

  const scores = picks.map((p) => p.conviction_total ?? p.score ?? 0);
  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, 0);

  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)] mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--scr-muted)]">
          Conviction spread
        </span>
        <span className="text-[0.72rem] font-mono text-[var(--scr-faint)]">
          {min}–{max} · {picks.length} picks
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-16" role="img" aria-label="Score distribution bar chart">
        {scores.map((score, i) => {
          const h = Math.max(12, Math.round((score / 100) * 100));
          return (
            <div key={`${i}-${score}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-[var(--scr-primary)] to-[var(--scr-success)] transition-all"
                style={{ height: `${h}%` }}
                title={`#${i + 1}: ${score}`}
              />
              <span className="text-[0.6rem] font-mono text-[var(--scr-faint)] truncate w-full text-center">
                {score}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-[3px] rounded-full bg-[var(--scr-surface-off)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--scr-primary)] via-[var(--scr-gold)] to-[var(--scr-success)]"
          style={{ width: `${(max / 100) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Semi-circle market bias gauge (reference KPI “Market Bias” visual) */
export function ScreenerMarketBiasGauge({ bias }: { bias: string }) {
  const label = String(bias).toUpperCase();
  const isBear = label.includes("BEAR");
  const isBull = !isBear;
  const score = isBull ? 72 : 28;
  const stroke = isBull ? "var(--scr-success)" : "var(--scr-error)";
  const circumference = Math.PI * 52;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)] flex flex-col items-center justify-center min-h-[140px]">
      <span className="text-[0.7rem] uppercase tracking-wide text-[var(--scr-muted)] font-medium mb-2 self-start">
        Market bias
      </span>
      <svg viewBox="0 0 120 70" className="w-full max-w-[140px]" aria-hidden>
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="var(--scr-surface-off)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={`text-xl font-bold font-mono tracking-tight -mt-2 ${
          isBull ? "text-[var(--scr-success)]" : "text-[var(--scr-error)]"
        }`}
      >
        {isBull ? "BULL" : "BEAR"}
      </span>
      <span className="text-[0.65rem] text-[var(--scr-muted)] mt-0.5">From macro feed</span>
    </div>
  );
}

/** Mini trend bar beside macro row (reference uses ↑/↓ color cues) */
export function MacroTrendBar({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  const pct =
    b.includes("bull") ? 78 : b.includes("bear") ? 22 : b.includes("neutral") ? 50 : 55;
  const color = b.includes("bull")
    ? "bg-[var(--scr-success)]"
    : b.includes("bear")
      ? "bg-[var(--scr-error)]"
      : "bg-[var(--scr-gold)]";

  return (
    <div className="w-12 h-1 rounded-full bg-[var(--scr-surface-off)] overflow-hidden shrink-0 ml-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
