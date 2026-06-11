"use client";

import type { Holding, WatchlistEntry } from "./types";

const PORTFOLIO_KEY = "isi_portfolio_v1";
const WATCHLIST_KEY = "isi_watchlist_v1";
import { API_URL_COOKIE, normalizeApiUrl } from "./api-url";

const API_URL_KEY = "isi_sheets_api_url";
const RECENT_KEY = "isi_recent_searches_v1";
const DEMO_KEY = "isi_demo_mode";
const THEME_KEY = "isi_theme";

export type UiTheme = "dark" | "light";

export function getStoredTheme(): UiTheme {
  if (typeof window === "undefined") return "dark";
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" ? "light" : "dark";
}

export function setStoredTheme(theme: UiTheme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function getStoredApiUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_URL_KEY) || "";
}

export function setStoredApiUrl(url: string): void {
  const normalized = normalizeApiUrl(url);
  localStorage.setItem(API_URL_KEY, normalized);
  if (typeof document !== "undefined") {
    if (normalized) {
      document.cookie = `${API_URL_COOKIE}=${encodeURIComponent(normalized)};path=/;max-age=31536000;SameSite=Lax`;
    } else {
      document.cookie = `${API_URL_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
    }
  }
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const explicit = localStorage.getItem(DEMO_KEY);
  if (explicit === "0") return false; // user explicitly disabled demo
  if (explicit === "1") return true;  // user explicitly enabled demo
  // Auto-demo: serve sample data when no API URL is configured
  const stored = localStorage.getItem(API_URL_KEY) || "";
  const envUrl = (process.env.NEXT_PUBLIC_SHEETS_API_URL || "").trim();
  return !stored && !envUrl;
}

export function setDemoMode(on: boolean): void {
  localStorage.setItem(DEMO_KEY, on ? "1" : "0");
  if (typeof document !== "undefined") {
    document.cookie = `isi_demo_mode=${on ? "1" : "0"};path=/;max-age=31536000;SameSite=Lax`;
  }
}

export function syncThemeCookie(theme: UiTheme): void {
  if (typeof document !== "undefined") {
    document.cookie = `isi_theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
  }
}

export function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(symbol: string): void {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return;
  const prev = loadRecentSearches().filter((s) => s !== sym);
  const next = [sym, ...prev].slice(0, 12);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function loadPortfolio(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    return raw ? (JSON.parse(raw) as Holding[]) : [];
  } catch {
    return [];
  }
}

export function savePortfolio(holdings: Holding[]): void {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(holdings));
}

export function loadWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(entries: WatchlistEntry[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
}
