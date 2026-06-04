import {
  PipelineIconAiScoring,
  PipelineIconDataPull,
  PipelineIconDelivery,
  PipelineIconReport,
  PipelineIconSchedule,
  MacroTrendBar,
  ScreenerMarketBiasGauge,
} from "./screener-infographics";

const PIPELINE = [
  {
    icon: PipelineIconSchedule,
    tone: "green" as const,
    label: "1. Schedule Trigger",
    desc: "n8n cron fires at 8:00 AM IST every market day (Mon–Fri). No holidays on NSE = run skipped.",
  },
  {
    icon: PipelineIconDataPull,
    tone: "blue" as const,
    label: "2. Data Pull",
    desc: "Pulls NSE filings, bulk deals, insider disclosures, macro data via APIs and structured feeds.",
  },
  {
    icon: PipelineIconAiScoring,
    tone: "primary" as const,
    label: "3. AI Scoring",
    desc: "Perplexity Pro API receives enriched data + master prompt. Returns scored JSON for all 4,800+ stocks.",
  },
  {
    icon: PipelineIconReport,
    tone: "gold" as const,
    label: "4. Report Build",
    desc: "n8n parses AI output. Builds Top 10 card report, monitoring table, 7-day checklist.",
  },
  {
    icon: PipelineIconDelivery,
    tone: "green" as const,
    label: "5. Delivery",
    desc: "Telegram message + email + Google Sheets update. You receive on phone within minutes of wake-up.",
  },
];

const CHANNELS = [
  {
    emoji: "📱",
    tone: "blue" as const,
    title: "Telegram Bot",
    desc: "Top 10 cards with score, thesis, and action sent as a formatted message every morning. Instant mobile notification.",
  },
  {
    emoji: "📧",
    tone: "primary" as const,
    title: "Email (Resend/Zoho)",
    desc: "HTML-formatted daily briefing with full tables, macro summary, and monitoring checklist. Lands in inbox by 9 AM.",
  },
  {
    emoji: "📊",
    tone: "success" as const,
    title: "Google Sheets",
    desc: "Auto-updated watchlist, historical scores, price tracking and monitoring table. Always current — no manual entry.",
  },
  {
    emoji: "⚡",
    tone: "gold" as const,
    title: "Perplexity Tasks",
    desc: "Backup channel: Perplexity's built-in Tasks feature runs the screener prompt on schedule and saves to your Library.",
  },
];

const ICON_TONES: Record<string, string> = {
  green: "bg-[var(--scr-success-hl)] text-[var(--scr-success)]",
  blue: "bg-[var(--scr-blue-hl)] text-[var(--scr-blue)]",
  primary: "bg-[var(--scr-primary-hl)] text-[var(--scr-primary)]",
  gold: "bg-[var(--scr-gold-hl)] text-[var(--scr-gold)]",
  success: "bg-[var(--scr-success-hl)] text-[var(--scr-success)]",
};

export function ScreenerPipeline() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] overflow-hidden shadow-[var(--scr-shadow-sm)] mb-6">
      {PIPELINE.map((node, i) => {
        const Icon = node.icon;
        return (
          <div
            key={node.label}
            className={`p-4 relative ${i < PIPELINE.length - 1 ? "border-r border-[var(--scr-border)] max-lg:border-r-0 max-lg:border-b" : ""}`}
          >
            {i < PIPELINE.length - 1 ? (
              <span
                className="hidden lg:block absolute -right-[9px] top-1/2 -translate-y-1/2 text-[var(--scr-border)] z-[2] text-sm select-none"
                aria-hidden
              >
                →
              </span>
            ) : null}
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${ICON_TONES[node.tone]}`}
            >
              <Icon />
            </div>
            <div className="text-[0.7rem] font-semibold text-[var(--scr-text)] mb-0.5">
              {node.label}
            </div>
            <div className="text-[0.7rem] text-[var(--scr-muted)] leading-snug">{node.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ScreenerChannels() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {CHANNELS.map((ch) => (
        <div
          key={ch.title}
          className="flex items-start gap-3 rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)]"
        >
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-base ${ICON_TONES[ch.tone]}`}
          >
            {ch.emoji}
          </div>
          <div>
            <div className="text-[0.825rem] font-semibold text-[var(--scr-text)] mb-0.5">
              {ch.title}
            </div>
            <div className="text-[0.72rem] text-[var(--scr-muted)] leading-snug">{ch.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScreenerKpiGrid({
  kpis,
}: {
  kpis: {
    label: string;
    value: string;
    sub: string;
    tone: "primary" | "success" | "gold" | "warn" | "default";
  }[];
}) {
  const valueTone: Record<string, string> = {
    primary: "text-[var(--scr-primary)]",
    success: "text-[var(--scr-success)]",
    gold: "text-[var(--scr-gold)]",
    warn: "text-[var(--scr-warn)]",
    default: "text-[var(--scr-text)]",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] px-4 py-3.5 shadow-[var(--scr-shadow-sm)]"
        >
          <div className="text-[0.7rem] uppercase tracking-wide text-[var(--scr-muted)] font-medium mb-1">
            {kpi.label}
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight leading-none ${valueTone[kpi.tone]}`}
          >
            {kpi.value}
          </div>
          <div className="text-[0.7rem] text-[var(--scr-muted)] mt-1">{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}

function macroValueDisplay(metric: string, value: unknown, trend: string, bias: string): string {
  const val = String(value ?? "—");
  const b = bias.toLowerCase();
  const arrow = b.includes("bull") ? "↑" : b.includes("bear") ? "↓" : "";
  if (metric === "Overall Bias") {
    return b.includes("bull") ? "BULLISH ✓" : b.includes("bear") ? "BEARISH ✗" : val;
  }
  return [val, arrow, trend].filter(Boolean).join(" ").trim();
}

export function ScreenerMacroSectors({
  metrics,
  sectors,
  marketBias,
  loadingMacro,
}: {
  metrics: { metric: string; value: unknown; trend: string; bias: string }[];
  sectors: { hot: string[]; warm: string[]; cool: string[] };
  marketBias: string;
  loadingMacro?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(140px,160px)] gap-3">
        <div>
        <h3 className="text-sm font-semibold text-[var(--scr-text)] mb-3 flex items-center gap-2">
          🌍 Macro Snapshot <span className="text-[var(--scr-muted)] font-normal">— Auto-updated from live feeds</span>
        </h3>
        <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)]">
          {metrics.map((m) => {
            const bias = m.bias?.toLowerCase() ?? "";
            const valClass =
              bias.includes("bull") ? "text-[var(--scr-success)]" :
              bias.includes("bear") ? "text-[var(--scr-error)]" :
              "text-[var(--scr-text)]";
            return (
              <div
                key={m.metric}
                className="flex items-center justify-between py-2 border-b border-[var(--scr-divider)] last:border-0"
              >
                <span className="text-[0.78rem] text-[var(--scr-muted)]">{m.metric}</span>
                <span className={`text-[0.78rem] font-mono font-medium flex items-center ${valClass}`}>
                  {macroValueDisplay(m.metric, m.value, m.trend, m.bias)}
                  <MacroTrendBar bias={m.bias} />
                </span>
              </div>
            );
          })}
        </div>
        </div>
        {!loadingMacro ? <ScreenerMarketBiasGauge bias={marketBias} /> : null}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--scr-text)] mb-3">🏭 Hot Sectors Today</h3>
        <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)]">
          {(
            [
              { label: "🔥 Strong Tailwind", key: "hot" as const, cls: "hot" },
              { label: "🌤 Moderate Tailwind", key: "warm" as const, cls: "warm" },
              { label: "🧊 Caution", key: "cool" as const, cls: "cool" },
            ] as const
          ).map(({ label, key, cls }) => (
            <div key={key} className="mb-3 last:mb-0">
              <div className="text-[0.72rem] text-[var(--scr-muted)] font-semibold uppercase tracking-wide mb-2">
                {label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sectors[key].map((s) => (
                  <span
                    key={s}
                    className={
                      cls === "hot"
                        ? "px-3 py-1 rounded-full text-[0.72rem] font-medium border border-[var(--scr-success)] bg-[var(--scr-success-hl)] text-[var(--scr-success)]"
                        : cls === "warm"
                          ? "px-3 py-1 rounded-full text-[0.72rem] font-medium border border-[var(--scr-gold)] bg-[var(--scr-gold-hl)] text-[var(--scr-gold)]"
                          : "px-3 py-1 rounded-full text-[0.72rem] font-medium border border-[var(--scr-blue)] bg-[var(--scr-blue-hl)] text-[var(--scr-blue)]"
                    }
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenerSectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <h2 className="text-sm font-semibold text-[var(--scr-text)] mb-3 flex items-center gap-2 tracking-tight">
      {title}
      {subtitle ? <span className="text-[var(--scr-muted)] font-normal">{subtitle}</span> : null}
    </h2>
  );
}
