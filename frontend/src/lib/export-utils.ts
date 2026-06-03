import type { EnrichedRecommendation, SymbolResponse } from "./types";

export function exportAsJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function exportAsText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function recommendationToText(item: EnrichedRecommendation, listName = ""): string {
  const note = item.analyst_note;
  const lines = [
    `${item.symbol} — ${item.company_name}`,
    listName ? `List: ${listName}` : "",
    `Conviction: ${item.conviction_total}/100 · Confidence: ${item.confidence ?? "—"}%`,
    item.target_price ? `Target: ₹${item.target_price} · Upside: ${item.upside_pct ?? "—"}%` : "",
    "",
    note?.investment_thesis ? `INVESTMENT THESIS\n${note.investment_thesis}` : item.why_recommended,
    "",
    note?.bull_case ? `BULL CASE\n${note.bull_case}` : "",
    note?.bear_case ? `BEAR CASE\n${note.bear_case}` : "",
    note?.catalysts ? `CATALYSTS\n${note.catalysts}` : "",
    note?.risks ? `RISKS\n${note.risks}` : "",
    note?.valuation_summary || note?.valuation
      ? `VALUATION\n${note.valuation_summary ?? note.valuation}`
      : "",
    note?.peer_comparison ? `PEERS\n${note.peer_comparison}` : "",
    note?.theme_exposure ? `THEMES\n${note.theme_exposure}` : "",
    "",
    "— Indian Stock Intelligence (research engine output, not investment advice)",
  ];
  return lines.filter(Boolean).join("\n");
}

export function symbolToText(data: SymbolResponse): string {
  const s = data.scoring;
  return [
    `${data.symbol} — ${data.universe?.company_name ?? ""}`,
    `Price: ${data.price?.price ?? "—"} · Conviction: ${s?.conviction_total ?? "—"}/100`,
    `Quality ${s?.quality_score ?? "—"} · Valuation ${s?.valuation_score ?? "—"} · Risk grade ${s?.risk_grade ?? "—"}`,
    "",
    "— Indian Stock Intelligence",
  ].join("\n");
}

export function printPage(): void {
  if (typeof window !== "undefined") window.print();
}
