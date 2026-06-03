export type Persona = "beginner" | "professional" | "portfolio_manager";

export const PERSONA_KEY = "equityiq_persona_v1";

export const PERSONA_LABELS: Record<Persona, string> = {
  beginner: "Beginner",
  professional: "Professional",
  portfolio_manager: "Portfolio Manager",
};

export const PERSONA_DESCRIPTIONS: Record<Persona, string> = {
  beginner: "Plain-language decisions with fewer numbers",
  professional: "Narratives plus conviction and data metrics",
  portfolio_manager: "Compact, export-friendly summaries",
};

export function isPersona(value: string): value is Persona {
  return value === "beginner" || value === "professional" || value === "portfolio_manager";
}

export function loadPersona(): Persona {
  if (typeof window === "undefined") return "professional";
  try {
    const raw = localStorage.getItem(PERSONA_KEY);
    return raw && isPersona(raw) ? raw : "professional";
  } catch {
    return "professional";
  }
}

export function savePersona(persona: Persona): void {
  localStorage.setItem(PERSONA_KEY, persona);
}
