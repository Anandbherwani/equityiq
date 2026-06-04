/** Must match backend/automation/Code.gs RECOMMENDATION_LIST_DEFS */
/** Maps Tab 37 recommendation_category → display label */
export const RECOMMENDATION_CATEGORY_LABELS: Record<string, string> = {
  immediate: "Immediate opportunities",
  three_month: "3-month opportunities",
  compounders: "12-month compounders",
  monopoly: "Monopoly businesses",
  gov_beneficiary: "Government beneficiaries",
  turnaround: "Turnarounds",
  theme: "Top themes",
  theme_winner: "Theme winners",
  theme_stock: "Theme stocks",
  sme_compounder: "SME compounders",
  sme_migration: "SME migration",
  sme_export: "SME export",
  sme_gov: "SME government",
  ipo: "IPO intelligence",
};

export const RECOMMENDATION_LIST_NAMES = [
  "Top 10 Immediate Opportunities",
  "Top 10 3-Month Opportunities",
  "Top 10 12-Month Compounders",
  "Top 10 Monopoly Businesses",
  "Top 10 Government Beneficiaries",
  "Top 10 Turnarounds",
] as const;

export const ACCEPTANCE_LIST_NAMES = [
  "Top 10 Immediate Opportunities",
  "Top 10 3-Month Opportunities",
  "Top 10 12-Month Compounders",
  "Top 10 Government Beneficiaries",
  "Top 10 Turnarounds",
] as const;

export const APP_NAME = "Indian Stock Intelligence";
export const APP_TAGLINE = "Equity research terminal";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "LayoutDashboard", short: "Home" },
  { href: "/screener", label: "Daily screener", icon: "LineChart", short: "Screen" },
  { href: "/recommendations", label: "Recommendations", icon: "Sparkles", short: "Picks" },
  { href: "/themes", label: "Sectors & themes", icon: "Layers", short: "Themes" },
  { href: "/watchlist", label: "Watchlist", icon: "Eye", short: "Watch" },
  { href: "/portfolio", label: "Portfolio", icon: "Briefcase", short: "Port" },
  { href: "/ipo", label: "IPO intel", icon: "Rocket", short: "IPO" },
  { href: "/sme", label: "SME alpha", icon: "Zap", short: "SME" },
  { href: "/history", label: "History", icon: "History", short: "Hist" },
  { href: "/validation", label: "Track record", icon: "BarChart3", short: "Track" },
  { href: "/compare", label: "Compare", icon: "GitCompare", short: "Compare" },
  { href: "/peers", label: "Peer comparison", icon: "Users", short: "Peers" },
  { href: "/alerts", label: "Alerts", icon: "Bell", short: "Alerts" },
  { href: "/backtest", label: "Performance", icon: "FlaskConical", short: "Perf" },
  { href: "/health", label: "System health", icon: "Activity", short: "Health" },
  { href: "/settings", label: "Settings", icon: "Settings", short: "Set" },
] as const;

export const QUICK_SYMBOLS = ["RELIANCE", "TCS", "HAL", "BEL", "INFY", "HDFCBANK", "LT", "SBIN"];

export const MAX_COMPARE_SYMBOLS = 3;
