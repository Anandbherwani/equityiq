"use client";

import { Users } from "lucide-react";
import { PERSONA_DESCRIPTIONS, PERSONA_LABELS, type Persona } from "@/lib/persona";
import { usePersona } from "./persona-provider";
import { cn } from "@/lib/utils";

const PERSONAS: Persona[] = ["beginner", "professional", "portfolio_manager"];

export function PersonaSwitcher({ className }: { className?: string }) {
  const { persona, setPersona } = usePersona();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Users className="h-4 w-4 text-muted-foreground hidden sm:block" aria-hidden />
      <div
        className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5"
        role="group"
        aria-label="Investor persona"
      >
        {PERSONAS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPersona(p)}
            title={PERSONA_DESCRIPTIONS[p]}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] sm:text-xs font-medium transition-colors",
              persona === p
                ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span className="hidden md:inline">{PERSONA_LABELS[p]}</span>
            <span className="md:hidden">{PERSONA_LABELS[p].split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
