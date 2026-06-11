import { Bell, TrendingUp, BarChart2, Rocket, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AlertConfig = {
  id: string;
  type: string;
  title: string;
  description: string;
  condition: string;
  status: "active" | "triggered" | "pending";
  icon: typeof Bell;
  color: string;
};

const CONFIGURED_ALERTS: AlertConfig[] = [
  {
    id: "sbin-target",
    type: "Price Target",
    title: "SBIN crosses ₹850",
    description: "State Bank of India target alert — current ₹812, target ₹850 (+4.7%)",
    condition: "SBIN > ₹850",
    status: "active",
    icon: TrendingUp,
    color: "text-gain border-gain/30 bg-gain/5",
  },
  {
    id: "nifty-correction",
    type: "Market Alert",
    title: "Nifty drops 2% in a day",
    description: "Market correction alert — monitor for buying opportunities in high-conviction picks",
    condition: "Nifty 1-day change < -2%",
    status: "active",
    icon: AlertTriangle,
    color: "text-loss border-loss/30 bg-loss/5",
  },
  {
    id: "score-change",
    type: "Score Alert",
    title: "Top 10 score changes by 10+ pts",
    description: "Any stock in current Top 10 Immediate Opportunities changes conviction score by ≥10",
    condition: "Score delta ≥ 10 points",
    status: "active",
    icon: BarChart2,
    color: "text-primary border-primary/30 bg-primary/5",
  },
  {
    id: "ipo-open",
    type: "IPO Alert",
    title: "New IPO subscription opens",
    description: "HDB Financial Services IPO opens soon — SUBSCRIBE verdict, score 74/100",
    condition: "IPO status = UPCOMING → OPEN",
    status: "pending",
    icon: Rocket,
    color: "text-warn border-warn/30 bg-warn/5",
  },
  {
    id: "vix-spike",
    type: "Volatility Alert",
    title: "VIX crosses 20",
    description: "High volatility warning — India VIX currently 14.2, well below threshold",
    condition: "India VIX > 20",
    status: "active",
    icon: Activity,
    color: "text-muted-foreground border-border bg-muted/10",
  },
];

const STATUS_STYLES = {
  active:    "bg-gain/15 text-gain",
  triggered: "bg-loss/15 text-loss",
  pending:   "bg-warn/15 text-warn",
};

export function AlertsConfigured() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-400" />
          Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          5 pre-configured alerts monitoring price targets, market conditions, score changes, IPO
          events, and volatility. Plus dynamic risk flags from your research engine below.
        </p>
      </div>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">
          Configured alerts ({CONFIGURED_ALERTS.length} active)
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONFIGURED_ALERTS.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card key={alert.id} className={`border ${alert.color}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{alert.title}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_STYLES[alert.status]}`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1.5">
                  <p>{alert.description}</p>
                  <div className="font-mono text-[10px] bg-muted/20 rounded px-2 py-1 border border-border/50">
                    Condition: {alert.condition}
                  </div>
                  <p className="text-[10px] opacity-60">{alert.type}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
