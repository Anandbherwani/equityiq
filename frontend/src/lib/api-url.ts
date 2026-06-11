/** Cookie name for user-saved Sheets Web App URL (mirrors localStorage). */
export const API_URL_COOKIE = "isi_sheets_api_url";

/** Client-side path for server-only Sheets Web App proxy (no exec URL in bundle). */
export const SHEETS_API_PROXY_PATH = "/api/sheets";

/**
 * Hardcoded production Sheets Web App URL.
 * Acts as compile-time fallback so demo mode never auto-enables when
 * env vars aren't available (NEXT_PUBLIC_ vars require a rebuild to update).
 */
export const DEFAULT_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbwJZ30G6hSpuGEGJHqC2xVl4zALnNgazfHS0c-bkxUAPo0Y7tyThlFqkBjk-h-Ud-_h4A/exec";

export function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** Server-only exec URL (preferred in production). */
export function getServerSheetsApiUrlFromEnv(): string | null {
  const url = (process.env.SHEETS_API_URL || "").trim();
  return url ? normalizeApiUrl(url) : normalizeApiUrl(DEFAULT_SHEETS_URL);
}

/** Public exec URL — embedded in client bundle; falls back to DEFAULT_SHEETS_URL. */
export function getApiUrlFromEnv(): string | null {
  const url = (process.env.NEXT_PUBLIC_SHEETS_API_URL || "").trim();
  return normalizeApiUrl(url || DEFAULT_SHEETS_URL);
}

/** Resolve exec URL on the server: SHEETS_API_URL, then NEXT_PUBLIC_SHEETS_API_URL, then hardcoded default. */
export function getConfiguredSheetsApiUrl(): string | null {
  return getServerSheetsApiUrlFromEnv() || getApiUrlFromEnv();
}
