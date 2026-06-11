import Link from "next/link";
import { cn } from "@/lib/utils";

type Sector = {
  name: string;
  momentum: number;
  outlook: string;
  topStock: string;
  ytd: number;
};

const SECTORS: Sector[] = [
  { name: "Banking",       momentum: 72, outlook: "BULLISH",    topStock: "SBIN",       ytd: 14.2 },
  { name: "Metal",         momentum: 78, outlook: "BULLISH",    topStock: "HINDALCO",   ytd: 18.4 },
  { name: "Auto",          momentum: 68, outlook: "BULLISH",    topStock: "TATAMOTORS", ytd: 12.4 },
  { name: "Capital Goods", momentum: 64, outlook: "ACCUMULATE", topStock: "LT",         ytd: 9.2  },
  { name: "Utilities",     momentum: 65, outlook: "ACCUMULATE", topStock: "POWERGRID",  ytd: 10.4 },
  { name: "Pharma",        momentum: 62, outlook: "ACCUMULATE", topStock: "DRREDDY",    ytd: 8.2  },
  { name: "Energy",        momentum: 58, outlook: "ACCUMULATE", topStock: "COALINDIA",  ytd: 6.8  },
  { name: "Finance",       momentum: 58, outlook: "ACCUMULATE", topStock: "BAJFINANCE", ytd: 7.2  },
  { name: "IT",            momentum: 48, outlook: "NEUTRAL",    topStock: "TCS",        ytd: 2.1  },
  { name: "FMCG",          momentum: 42, outlook: "NEUTRAL",    topStock: "HINDUNILVR", ytd: 1.2  },
  { name: "Cement",        momentum: 44, outlook: "NEUTRAL",    topStock: "ULTRACEMCO", ytd: 2.8  },
];

function sectorBg(momentum: number) {
  if (momentum >= 70) return "bg-gain/20 border-gain/40 text-gain";
  if (momentum >= 60) return "bg-gain/10 border-gain/20 text-gain/80";
  if (momentum >= 50) return "bg-primary/10 border-primary/20 text-primary";
  if (momentum >= 40) return "bg-warn/10 border-warn/20 text-warn";
  return "bg-muted/30 border-border text-muted-foreground";
}

export function SectorHeatmap() {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Sector heatmap
        </h2>
        <Link
          href="/themes"
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          Full analysis →
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5">
        {SECTORS.sort((a, b) => b.momentum - a.momentum).map((s) => (
          <Link
            key={s.name}
            href={`/themes`}
            className={cn(
              "rounded-lg border px-2.5 py-2 flex flex-col gap-0.5 hover:opacity-80 transition-opacity",
              sectorBg(s.momentum)
            )}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide truncate opacity-80">
              {s.name}
            </span>
            <span className="text-[13px] font-bold font-mono tabular-nums leading-none">
              {s.momentum}
            </span>
            <span className="text-[8px] opacity-60 truncate">{s.topStock}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
