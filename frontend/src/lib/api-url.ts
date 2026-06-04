/** Cookie name for user-saved Sheets Web App URL (mirrors localStorage). */
export const API_URL_COOKIE = "isi_sheets_api_url";

/** Client-side path for server-only Sheets Web App proxy (no exec URL in bundle). */
export const SHEETS_API_PROXY_PATH = "/api/sheets";

export function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** Server-only exec URL (preferred in production). */
export function getServerSheetsApiUrlFromEnv(): string | null {
  const url = (process.env.SHEETS_API_URL || "").trim();
  return url ? normalizeApiUrl(url) : null;
}

/** Public exec URL — embedded in client bundle when set; use SHEETS_API_URL + proxy instead. */
export function getApiUrlFromEnv(): string | null {
  const url = (process.env.NEXT_PUBLIC_SHEETS_API_URL || "").trim();
  return url ? normalizeApiUrl(url) : null;
}

/** Resolve exec URL on the server: SHEETS_API_URL, then NEXT_PUBLIC_SHEETS_API_URL. */
export function getConfiguredSheetsApiUrl(): string | null {
  return getServerSheetsApiUrlFromEnv() || getApiUrlFromEnv();
}
