export function ScreenerKpiSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] px-4 py-3.5 shadow-[var(--scr-shadow-sm)] animate-pulse">
      <div className="h-3 w-20 rounded bg-[var(--scr-surface-off)] mb-2" />
      <div className="h-7 w-16 rounded bg-[var(--scr-surface-off)] mb-1.5" />
      <div className="h-2.5 w-24 rounded bg-[var(--scr-surface-off)]" />
    </div>
  );
}

export function ScreenerStockCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)] animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-3 w-24 rounded bg-[var(--scr-surface-off)]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-6 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-6 w-8 rounded bg-[var(--scr-surface-off)]" />
        </div>
      </div>
      <div className="h-12 w-full rounded bg-[var(--scr-surface-off)] mb-3" />
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-16 rounded-full bg-[var(--scr-surface-off)]" />
        <div className="h-5 w-14 rounded-full bg-[var(--scr-surface-off)]" />
      </div>
      <div className="h-[3px] w-full rounded-full bg-[var(--scr-surface-off)]" />
      <div className="flex justify-between mt-3 pt-3 border-t border-[var(--scr-divider)]">
        <div className="h-3 w-16 rounded bg-[var(--scr-surface-off)]" />
        <div className="h-5 w-20 rounded-full bg-[var(--scr-surface-off)]" />
      </div>
    </div>
  );
}

export function ScreenerTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] overflow-hidden shadow-[var(--scr-shadow-sm)] mb-6 animate-pulse">
      <div className="h-12 border-b border-[var(--scr-border)] bg-[var(--scr-surface-off)]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--scr-divider)] last:border-0">
          <div className="h-4 flex-1 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-4 w-12 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-4 w-16 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-5 w-10 rounded-full bg-[var(--scr-surface-off)]" />
        </div>
      ))}
    </div>
  );
}

export function ScreenerMacroSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--scr-border)] bg-[var(--scr-surface)] p-4 shadow-[var(--scr-shadow-sm)] animate-pulse space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-between py-1">
          <div className="h-3 w-24 rounded bg-[var(--scr-surface-off)]" />
          <div className="h-3 w-28 rounded bg-[var(--scr-surface-off)]" />
        </div>
      ))}
    </div>
  );
}
