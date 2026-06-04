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
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";

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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground terminal-grid">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <LineChart className="h-7 w-7 text-cyan-400" />
          <div>
            <p className="text-sm font-semibold tracking-wide text-cyan-100">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {APP_TAGLINE}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-4 py-4 text-[10px] text-muted-foreground border-t border-sidebar-border leading-relaxed">
          Scores and picks come from your research engine — this app only displays results.
        </p>
      </aside>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-safe">
        {NAV_ITEMS.filter((n) => !["/backtest", "/peers", "/compare"].includes(n.href)).map(
          (item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
                  active ? "text-cyan-400" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.short}</span>
              </Link>
            );
          }
        )}
      </nav>
    </>
  );
}
