"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/search/global-search";
import { MacroTicker } from "@/components/layout/macro-ticker";
import { PersonaSwitcher } from "@/components/shared/persona-switcher";
import { ConnectionBadge } from "@/components/layout/connection-badge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <GlobalSearch />
      <MacroTicker />
      <div className="flex items-center gap-2 ml-auto">
        <ConnectionBadge />
        <PersonaSwitcher className="hidden md:flex" />
        <Link href="/recommendations" className="hidden sm:inline-flex shrink-0">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 px-3 text-xs btn-press"
          >
            Top picks
          </Button>
        </Link>
        <Link
          href="/settings"
          className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>
      </div>
    </header>
  );
}
