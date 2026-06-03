"use client";

import type { ApiError } from "./types";
import { getDemoPayload } from "./demo-fetch";
import { getStoredApiUrl } from "./storage";

export async function fetchClientApi<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T | ApiError> {
  const demo = getDemoPayload(action, params);
  if (demo) return demo as T;

  const base = getStoredApiUrl().replace(/\/$/, "");
  if (!base) {
    return { ok: false, error: "Connect your research API in Settings to load live data." };
  }

  const qs = new URLSearchParams({ action, ...params });
  try {
    const res = await fetch(`${base}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Research API returned HTTP ${res.status}` };
    }
    try {
      return (await res.json()) as T | ApiError;
    } catch {
      return { ok: false, error: "Research API returned invalid JSON" };
    }
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, error: "Research API request timed out" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
