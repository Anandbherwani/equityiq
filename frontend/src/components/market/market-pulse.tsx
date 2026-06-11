"use client";

import { cn } from "@/lib/utils";

type PulseItem = {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
};

const PULSE_DATA: PulseItem[] = [
  { label: "Nifty 50",   value: "24,892",  change: "+0.42%", up: true  },
  { label: "Sensex",     value: "81,876",  change: "+0.38%", up: true  },
  { label: "Bank Nifty", value: "52,104",  change: "-0.21%", up: false },
  { label: "India VIX",  value: "14.2",    change: "Low",    up: true  },
  { label: "FII Flow",   value: "+₹2,840 Cr", up: true  },
  { label: "DII Flow",   value: "+₹1,120 Cr", up: true  },
  { label: "Fear & Greed", value: "62 — Bullish", up: true },
  { label: "Crude",      value: "$78.4",   change: "-0.8%",  up: false },
  { label: "INR/USD",    value: "83.52",   change: "+0.1%",  up: false },
];

export function MarketPulseBar() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-stretch divide-x divide-border overflow-x-auto scrollbar-hide">
        {PULSE_DATA.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center px-4 py-2.5 shrink-0 min-w-[90px]"
          >
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium whitespace-nowrap">
              {item.label}
            </span>
            <span className="font-mono text-[13px] font-bold tabular-nums text-foreground mt-0.5 whitespace-nowrap">
              {item.value}
            </span>
            {item.change && (
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums font-medium mt-0.5",
                  item.up ? "text-gain" : "text-loss"
                )}
              >
                {item.change}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
