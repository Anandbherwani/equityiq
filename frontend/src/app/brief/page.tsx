import Link from "next/link";
import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMorningBrief } from "@/lib/server-preview";
import type { MorningBriefSections } from "@/lib/types";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function BriefSections({ s }: { s: MorningBriefSections }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard title="1. Market Outlook">
        <p className="text-foreground">{s.market_outlook?.summary || "—"}</p>
        {s.market_outlook?.breadth?.label ? (
          <p>
            <Badge variant="outline">{s.market_outlook.breadth.label}</Badge>
            {s.market_outlook.breadth.conviction_above_50_pct != null
              ? ` · ${s.market_outlook.breadth.conviction_above_50_pct}% names ≥50 conviction`
              : null}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="2. Top 10 Opportunities">
        <ul className="space-y-1">
          {(s.top10_opportunities?.immediate || []).map((t) => (
            <li key={t.symbol}>
              <Link href={`/stock/${t.symbol}`} className="text-cyan-400 hover:underline">
                {t.rank}. {t.symbol}
              </Link>{" "}
              — {t.conviction_total}/100
            </li>
          ))}
          {!(s.top10_opportunities?.immediate || []).length ? (
            <li>Tab 11 empty — run 6 AM + 8 AM pipeline</li>
          ) : null}
        </ul>
      </SectionCard>

      <SectionCard title="3. Sector Winners">
        <ul className="list-disc pl-4">
          {(s.sector_winners?.items || []).map((x) => (
            <li key={x.sector}>
              {x.sector} (rank {x.rank ?? "—"})
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="4. Sector Losers">
        <ul className="list-disc pl-4">
          {(s.sector_losers?.items || []).map((x) => (
            <li key={x.sector}>
              {x.sector} (rank {x.rank ?? "—"})
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="5. Government Themes">
        <ul className="list-disc pl-4">
          {(s.government_themes?.items || []).map((g, i) => (
            <li key={`${g.theme}-${i}`}>
              {g.theme}
              {g.symbols?.length ? ` — ${g.symbols.join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="5b. Investment Themes">
        {s.investment_themes?.summary ? (
          <p className="text-sm text-muted-foreground mb-2">{s.investment_themes.summary}</p>
        ) : null}
        <ul className="space-y-2">
          {(s.investment_themes?.items || []).map((t) => (
            <li key={t.id} className="text-sm">
              <span className="font-medium text-foreground">{t.label}</span>
              <span className="text-muted-foreground"> ({t.symbol_count ?? 0} names)</span>
              {(t.top_symbols || []).length ? (
                <span className="font-mono text-cyan-400/90 text-xs ml-1">
                  — {(t.top_symbols || []).map((x) => x.symbol).join(", ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="6. Macro Themes">
        <p className="text-foreground">{s.macro_themes?.headline || "—"}</p>
        <ul className="list-disc pl-4">
          {(s.macro_themes?.items || []).slice(0, 6).map((m) => (
            <li key={m.metric}>
              {m.metric}: {String(m.value ?? "—")} ({m.bias || "—"})
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="7. Risk Alerts">
        <p className="text-foreground">{s.risk_alerts?.summary || "—"}</p>
        <ul className="list-disc pl-4">
          {(s.risk_alerts?.sheet_alerts || []).slice(0, 6).map((a, i) => (
            <li key={`${a.trigger_type}-${i}`}>
              {a.symbol || "—"}: {a.trigger_type}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="8. Watchlist Changes">
        {s.watchlist_changes?.added?.length ? (
          <p>Added: {s.watchlist_changes.added.join(", ")}</p>
        ) : null}
        {s.watchlist_changes?.removed?.length ? (
          <p>Removed: {s.watchlist_changes.removed.join(", ")}</p>
        ) : null}
        {(s.watchlist_changes?.rank_moves || []).map((m) => (
          <p key={m.symbol}>
            {m.symbol}: #{m.from_rank} → #{m.to_rank}
          </p>
        ))}
        {!s.watchlist_changes?.added?.length &&
        !s.watchlist_changes?.removed?.length &&
        !(s.watchlist_changes?.rank_moves || []).length ? (
          <p>{s.watchlist_changes?.note || "No changes vs prior snapshot"}</p>
        ) : null}
      </SectionCard>

      <SectionCard title="9. Portfolio Actions">
        <p className="text-xs italic">{s.portfolio_actions?.disclaimer}</p>
        <ul className="space-y-1">
          {(s.portfolio_actions?.items || []).map((p) => (
            <li key={p.symbol}>
              <strong className="text-foreground">{p.symbol}</strong>: {p.action}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export default async function MorningBriefPage() {
  const { source, data, error } = await loadMorningBrief();
  const ok = data?.ok;
  const brief = ok ? data.brief : null;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Morning Brief</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Institutional 8 AM IST brief — nine sections from Google Sheets (Tab 8, 11, 19, 20, 12, 10).
        </p>
        {brief?.date_ist ? (
          <p className="text-xs text-muted-foreground mt-2">
            As of {brief.date_ist} IST
            {ok && data.cached ? " · cached from last 8 AM run" : ""}
            {source === "preview" ? " · preview data" : ""}
          </p>
        ) : null}
      </div>

      <DataSourceNotice source={source} error={error} />

      {brief?.sections ? <BriefSections s={brief.sections} /> : null}

      {brief?.spreadsheet_url ? (
        <p className="text-xs text-muted-foreground">
          <a href={brief.spreadsheet_url} className="text-cyan-400 hover:underline" target="_blank" rel="noreferrer">
            Open source sheet
          </a>
          {" · "}Not investment advice.
        </p>
      ) : null}
    </div>
  );
}
