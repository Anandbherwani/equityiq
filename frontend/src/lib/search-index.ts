/** Static search index for autocomplete (symbols + company names). */

export type SearchEntry = { symbol: string; company: string; sector?: string };

export const SEARCH_INDEX: SearchEntry[] = [
  { symbol: "RELIANCE", company: "Reliance Industries", sector: "Oil & Gas" },
  { symbol: "TCS", company: "Tata Consultancy Services", sector: "IT" },
  { symbol: "INFY", company: "Infosys", sector: "IT" },
  { symbol: "HDFCBANK", company: "HDFC Bank", sector: "BFSI" },
  { symbol: "ICICIBANK", company: "ICICI Bank", sector: "BFSI" },
  { symbol: "SBIN", company: "State Bank of India", sector: "BFSI" },
  { symbol: "LT", company: "Larsen & Toubro", sector: "Industrials" },
  { symbol: "HAL", company: "Hindustan Aeronautics", sector: "Defence" },
  { symbol: "BEL", company: "Bharat Electronics", sector: "Defence" },
  { symbol: "BHARTIARTL", company: "Bharti Airtel", sector: "Telecom" },
  { symbol: "ITC", company: "ITC", sector: "FMCG" },
  { symbol: "MARUTI", company: "Maruti Suzuki", sector: "Auto" },
  { symbol: "TITAN", company: "Titan Company", sector: "Consumer" },
  { symbol: "AXISBANK", company: "Axis Bank", sector: "BFSI" },
  { symbol: "WIPRO", company: "Wipro", sector: "IT" },
];

export function filterSearchIndex(query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCH_INDEX.slice(0, limit);
  return SEARCH_INDEX.filter(
    (e) =>
      e.symbol.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      (e.sector?.toLowerCase().includes(q) ?? false)
  ).slice(0, limit);
}
