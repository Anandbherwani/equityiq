"use client";

import { useEffect, useState } from "react";

export function ScreenerClock() {
  const [time, setTime] = useState("--:--:-- IST");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = String(ist.getHours()).padStart(2, "0");
      const m = String(ist.getMinutes()).padStart(2, "0");
      const s = String(ist.getSeconds()).padStart(2, "0");
      setTime(`${h}:${m}:${s} IST`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="text-xs text-[var(--scr-muted)] font-mono">{time}</span>;
}
