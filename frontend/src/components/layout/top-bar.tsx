"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/search/global-search";
import { PersonaSwitcher } from "@/components/shared/persona-switcher";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <GlobalSearch />
      <PersonaSwitcher className="hidden md:flex" />
      <Link href="/recommendations" className="hidden sm:inline-flex shrink-0">
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
          Top picks
        </Button>
      </Link>
      <Link href="/settings" className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground">
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}
