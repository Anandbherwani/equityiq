"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchClientApi } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type PeerStock = {
  sym: string;
  name: string;
  pe: number;
  roe: number;
  roce: number;
  de: number;
  score: number;
  verdict: string;
};

type PeersResponse = {
  ok: boolean;
  sector?: string;
  peers?: PeerStock[];
};

function verdictColor(verdict: string) {
  if (verdict === "STRONG BUY") return "text-emerald-400";
  if (verdict === "BUY")        return "text-green-400";
  if (verdict === "ACCUMULATE") return "text-teal-400";
  if (verdict === "HOLD")       return "text-amber-400";
  return "text-muted-foreground";
}

const SECTORS = ["Banking", "IT", "Metal"];

export function PeersTable() {
  const [sector, setSector] = useState("Banking");
  const [data, setData] = useState<PeersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetchClientApi<PeersResponse>("peers", {});
      if (res && "ok" in res && res.ok) setData(res);
      setLoading(false);
    })();
  }, []);

  const peers = (data?.peers ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {SECTORS.map((s) => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={cn(
              "px-3 py-1.5 rounded text-[12px] font-medium border transition-colors",
              sector === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
        <span className="text-[11px] text-muted-foreground ml-2">(switch sector by searching a symbol above)</span>
      </div>

      {loading ? (
        <div className="h-40 rounded-lg bg-muted/20 animate-pulse" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">PE</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">ROE%</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">ROCE%</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">D/E</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {peers.map((p) => {
                const bestPE = Math.min(...peers.map((x) => x.pe));
                const bestROE = Math.max(...peers.map((x) => x.roe));
                const bestScore = Math.max(...peers.map((x) => x.score));
                return (
                  <tr key={p.sym} className="hover:bg-muted/10">
                    <td className="px-3 py-2.5">
                      <Link href={`/stock/${p.sym}`} className="hover:text-primary transition-colors">
                        <span className="font-mono font-bold">{p.sym}</span>
                        <span className="block text-[10px] text-muted-foreground">{p.name}</span>
                      </Link>
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", p.pe === bestPE ? "text-gain font-bold" : "text-foreground")}>
                      {p.pe}x
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", p.roe === bestROE ? "text-gain font-bold" : "text-foreground")}>
                      {p.roe}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">{p.roce}%</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">{p.de}x</td>
                    <td className={cn("px-3 py-2.5 text-right font-mono font-bold tabular-nums", p.score === bestScore ? "text-primary" : "text-foreground")}>
                      {p.score}
                    </td>
                    <td className={cn("px-3 py-2.5 text-center font-medium", verdictColor(p.verdict))}>
                      {p.verdict}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
            Green = best in peer group for that metric
          </p>
        </div>
      )}
    </div>
  );
}
