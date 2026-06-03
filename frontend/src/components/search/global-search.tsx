"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterSearchIndex, type SearchEntry } from "@/lib/search-index";
import { loadRecentSearches, pushRecentSearch } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = filterSearchIndex(q, 8);
  const flatRows: { type: "recent" | "suggest"; symbol: string; entry?: SearchEntry }[] = [];
  if (!q.trim()) {
    recent.slice(0, 6).forEach((s) => flatRows.push({ type: "recent", symbol: s }));
  }
  suggestions.forEach((e) => flatRows.push({ type: "suggest", symbol: e.symbol, entry: e }));

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [q, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (sym: string) => {
      const s = sym.trim().toUpperCase().replace(/\.NS$|\.BO$/i, "");
      if (!s) return;
      pushRecentSearch(s);
      setRecent(loadRecentSearches());
      setOpen(false);
      setQ("");
      router.push(`/stock/${s}`);
    },
    [router]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = flatRows[activeIndex];
    if (row) go(row.symbol);
    else go(q);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatRows.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && flatRows.length > 0) {
      e.preventDefault();
      go(flatRows[activeIndex].symbol);
    }
  }

  let rowIdx = -1;

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-xl w-full">
      <form onSubmit={onSubmit}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search symbol or company… (⌘K)"
          className="pl-9 pr-16 font-mono text-sm bg-muted/40 border-border/60 focus-visible:ring-cyan-500/40"
          aria-label="Search stocks"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <kbd className="hidden sm:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 font-mono">
          ⌘K
        </kbd>
      </form>
      {open && flatRows.length > 0 ? (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border/80 bg-card shadow-xl overflow-hidden max-h-[min(70vh,320px)] overflow-y-auto"
        >
          {!q.trim() && recent.length > 0 ? (
            <div className="p-2 border-b border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent
              </p>
            </div>
          ) : null}
          <div className="p-1">
            {flatRows.map((row) => {
              rowIdx += 1;
              const idx = rowIdx;
              const active = idx === activeIndex;
              const entry = row.entry;
              return (
                <button
                  key={`${row.type}-${row.symbol}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => go(row.symbol)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-md flex justify-between gap-2 items-center",
                    active ? "bg-cyan-500/15 text-foreground" : "hover:bg-muted/50"
                  )}
                >
                  <span className="font-mono text-sm text-cyan-300">{row.symbol}</span>
                  {entry ? (
                    <span className="text-xs text-muted-foreground truncate">{entry.company}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : open && q.trim() ? (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border/80 bg-card p-4 text-sm text-muted-foreground shadow-xl">
          No matches. Press Enter to open symbol directly.
        </div>
      ) : null}
    </div>
  );
}
