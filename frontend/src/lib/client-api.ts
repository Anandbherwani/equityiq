"use client";

import type { ApiError } from "./types";
import {
  getApiUrlFromEnv,
  normalizeApiUrl,
  SHEETS_API_PROXY_PATH,
} from "./api-url";
import { getDemoPayload } from "./demo-fetch";
import { getStoredApiUrl, isDemoMode } from "./storage";

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const TOP10_FETCH_TIMEOUT_MS = 180_000;

const ACTION_TIMEOUT_MS: Record<string, number> = {
  top10: TOP10_FETCH_TIMEOUT_MS,
};

/** Settings override hits exec directly; otherwise use same-origin `/api/sheets` proxy. */
function resolveClientApiUrl(): string {
  const stored = getStoredApiUrl();
  if (stored) return normalizeApiUrl(stored);
  return SHEETS_API_PROXY_PATH;
}

function fetchTimeoutMs(action: string): number {
  return ACTION_TIMEOUT_MS[action] ?? DEFAULT_FETCH_TIMEOUT_MS;
}

export function getClientApiFetchUrl(
  action: string,
  params: Record<string, string> = {}
): string {
  const base = resolveClientApiUrl();
  const qs = new URLSearchParams({ action, ...params });
  return `${base}?${qs}`;
}

function snippet(text: string, max = 500): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export type FetchClientApiOptions = {
  /** When set, logs URL, raw body, and fetch errors to the browser console. */
  logPrefix?: string;
};

export function hasClientSheetsApi(): boolean {
  if (isDemoMode()) return true;
  return Boolean(getStoredApiUrl() || getApiUrlFromEnv());
}

export async function fetchClientApi<T>(
  action: string,
  params: Record<string, string> = {},
  options?: FetchClientApiOptions
): Promise<T | ApiError> {
  const demo = getDemoPayload(action, params);
  if (demo) return demo as T;

  const base = resolveClientApiUrl();
  if (!base) {
    return { ok: false, error: "Connect your research API in Settings to load live data." };
  }

  const url = getClientApiFetchUrl(action, params);
  const prefix = options?.logPrefix;
  if (prefix) {
    console.log(`${prefix} fetch URL:`, url);
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(fetchTimeoutMs(action)),
    });
    const raw = await res.text();
    if (prefix) {
      console.log(
        `${prefix} raw response (${res.status}, ${raw.length} chars):`,
        raw.length > 8000 ? `${raw.slice(0, 8000)}…` : raw
      );
    }
    if (!res.ok) {
      const body = snippet(raw);
      if (prefix) {
        console.error(`${prefix} HTTP error`, { status: res.status, url, body });
      }
      const detail = body ? ` — ${body}` : "";
      return { ok: false, error: `Research API returned HTTP ${res.status}${detail}` };
    }
    try {
      return JSON.parse(raw) as T | ApiError;
    } catch {
      if (prefix) {
        console.error(`${prefix} invalid JSON`, { url, body: snippet(raw) });
      }
      return { ok: false, error: "Research API returned invalid JSON" };
    }
  } catch (e) {
    if (prefix) {
      console.error(`${prefix} fetch failed`, {
        url,
        error: e instanceof Error ? e.message : e,
      });
    }
    if (e instanceof Error && e.name === "TimeoutError") {
      const secs = Math.round(fetchTimeoutMs(action) / 1000);
      return {
        ok: false,
        error: `Research API request timed out after ${secs}s (top10 can take ~2 min on cold start)`,
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
