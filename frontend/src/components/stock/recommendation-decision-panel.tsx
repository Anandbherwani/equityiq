"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePersona } from "@/components/shared/persona-provider";
import { DecisionExportLine, DecisionSections } from "@/components/recommendations/decision-sections";
import type { DecisionNarrative, SymbolResponse } from "@/lib/types";
import { buildDecisionFallback } from "@/lib/decision-narrative";

export function RecommendationDecisionPanel({
  data,
}: {
  data: SymbolResponse & { decision?: DecisionNarrative | null };
}) {
  const { persona } = usePersona();
  const listRows = (data.lists ?? []).filter(
    (l): l is NonNullable<SymbolResponse["lists"]>[number] =>
      typeof l === "object" && l !== null && "list_name" in l
  );
  const rec = data.recommendation || listRows[0];
  const listName = rec?.list_name || listRows[0]?.list_name || "";

  const decision: DecisionNarrative =
    data.decision ||
    rec?.decision ||
    (rec
      ? buildDecisionFallback(
          {
            conviction_total: rec.conviction_total,
            bull_case: rec.bull_case,
            bear_case: rec.bear_case,
            catalyst: rec.catalyst,
            target_horizon: rec.target_horizon,
            evidence: rec.evidence,
          },
          listName,
          data.scoring
        )
      : buildDecisionFallback(
          {
            conviction_total: data.scoring?.conviction_total ?? 0,
            bull_case: "",
            bear_case: "",
            catalyst: "",
            target_horizon: "",
            evidence: data.scoring?.action_label || "",
          },
          "",
          data.scoring
        ));

  return (
    <Card className="border-cyan-500/20 bg-gradient-to-br from-card to-cyan-950/10">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Investment decision</CardTitle>
          {listRows.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {listRows.map((l) => (
                <Badge key={`${l.list_name}-${l.rank}`} variant="secondary" className="text-[10px]">
                  #{l.rank} {l.list_name.replace("Top 10 ", "")}
                </Badge>
              ))}
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Not on Tab 11 lists
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Narratives from Sheets scoring — not recomputed in the browser.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DecisionSections decision={decision} persona={persona} />
        {persona === "portfolio_manager" ? (
          <DecisionExportLine symbol={data.symbol} decision={decision} />
        ) : null}
      </CardContent>
    </Card>
  );
}
