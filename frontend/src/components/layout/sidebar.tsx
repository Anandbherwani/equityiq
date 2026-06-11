"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Eye,
  FlaskConical,
  GitCompare,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Rocket,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";

const ICONS = {
  LayoutDashboard,
  LineChart,
  Sparkles,
  Layers,
  History,
  BarChart3,
  GitCompare,
  Users,
  Eye,
  Briefcase,
  Rocket,
  Zap,
  Bell,
  FlaskConical,
  Activity,
  Settings,
} as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-foreground">EquityIQ</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {APP_TAGLINE}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-100",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer disclaimer */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            For research only — not investment advice.
          </p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {NAV_ITEMS.filter((n) => !["/backtest", "/peers", "/compare", "/health", "/validation", "/settings"].includes(n.href))
          .slice(0, 5)
          .map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium uppercase tracking-wide transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.short}</span>
              </Link>
            );
          })}
      </nav>
    </>
  );
}
