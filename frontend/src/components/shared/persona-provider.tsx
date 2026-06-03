"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Persona } from "@/lib/persona";
import { loadPersona, savePersona } from "@/lib/persona";

type PersonaContextValue = {
  persona: Persona;
  setPersona: (p: Persona) => void;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>("professional");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonaState(loadPersona());
    setReady(true);
  }, []);

  function setPersona(p: Persona) {
    setPersonaState(p);
    savePersona(p);
  }

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>{children}</PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    return {
      persona: "professional",
      setPersona: () => {},
    };
  }
  return ctx;
}
