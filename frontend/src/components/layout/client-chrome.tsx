"use client";

import { useEffect, useState } from "react";
import { DemoBanner } from "@/components/shared/demo-banner";
import { isDemoMode } from "@/lib/storage";

export function ClientChrome() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(isDemoMode());
    const onStorage = () => setDemo(isDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  if (!demo) return null;
  return <div className="mb-4"><DemoBanner /></div>;
}
