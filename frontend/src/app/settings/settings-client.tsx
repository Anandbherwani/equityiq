"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getStoredApiUrl,
  getStoredTheme,
  isDemoMode,
  setDemoMode,
  setStoredApiUrl,
  setStoredTheme,
  syncThemeCookie,
  type UiTheme,
} from "@/lib/storage";
import { DEFAULT_SHEETS_URL, getApiUrlFromEnv } from "@/lib/api-url";

type TestStatus = "idle" | "testing" | "ok" | "error";

export function SettingsClient() {
  const [url, setUrl] = useState("");
  const [demo, setDemo] = useState(false);
  const [theme, setTheme] = useState<UiTheme>("dark");
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    const envUrl = getApiUrlFromEnv() || DEFAULT_SHEETS_URL;
    const stored = getStoredApiUrl();
    setUrl(stored || envUrl);
    setDemo(isDemoMode());
    const t = getStoredTheme();
    setTheme(t);
    syncThemeCookie(t);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(t);
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setStoredApiUrl(url);
    setSaved(true);
    setTestStatus("idle");
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    const target = url.trim();
    if (!target) {
      setTestStatus("error");
      setTestMsg("No URL configured. Enter a Sheets Web App URL first.");
      return;
    }
    setTestStatus("testing");
    setTestMsg("");
    try {
      const endpoint = `/api/sheets?action=health&url=${encodeURIComponent(target)}`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.ok) {
        setTestStatus("ok");
        setTestMsg(`Connected — ${data.spreadsheetName || "Sheets"} (${data.tab10Rows ?? "?"} rows)`);
        if (demo) {
          setDemoMode(false);
          setDemo(false);
        }
      } else {
        throw new Error(data?.error || "API returned ok=false");
      }
    } catch (err) {
      setTestStatus("error");
      const msg = err instanceof Error ? err.message : "Connection failed";
      setTestMsg(msg);
    }
  }

  function toggleDemo() {
    const next = !demo;
    setDemo(next);
    setDemoMode(next);
    window.location.reload();
  }

  function applyTheme(next: UiTheme) {
    setTheme(next);
    setStoredTheme(next);
    syncThemeCookie(next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  }

  function refreshData() {
    window.location.reload();
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connection, appearance, and refresh — nothing else.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sheets Web App URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Paste your Apps Script Web App{" "}
            <span className="font-mono">/exec</span> URL. Leave empty when the
            host sets <span className="font-mono">SHEETS_API_URL</span>.
          </p>
          <form onSubmit={save} className="space-y-3">
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestStatus("idle");
              }}
              placeholder="https://script.google.com/.../exec"
              className="font-mono text-xs"
            />
            <div className="flex gap-2 flex-wrap items-center">
              <Button type="submit" size="sm">
                {saved ? "Saved ✓" : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={testConnection}
                disabled={testStatus === "testing"}
              >
                {testStatus === "testing" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Testing…
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
            {testStatus !== "idle" && (
              <div
                className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs border ${
                  testStatus === "ok"
                    ? "border-gain/30 bg-gain/10 text-gain"
                    : testStatus === "error"
                    ? "border-loss/30 bg-loss/10 text-loss"
                    : "border-border/50 bg-muted/30 text-muted-foreground"
                }`}
              >
                {testStatus === "ok" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                {testStatus === "error" && <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                {testStatus === "testing" && <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5 animate-spin" />}
                <span>{testMsg || "Checking connection…"}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Demo mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Preview recommendations and stock pages with sample Indian market data.
          </p>
          <Button
            type="button"
            variant={demo ? "default" : "outline"}
            onClick={toggleDemo}
            className={demo ? "bg-primary/80 hover:bg-primary" : ""}
            size="sm"
          >
            {demo ? "On" : "Off"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Theme</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => applyTheme("dark")}
          >
            Dark
          </Button>
          <Button
            type="button"
            size="sm"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => applyTheme("light")}
          >
            Light
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Refresh</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Reload data from your research API.</p>
          <Button type="button" variant="outline" size="sm" onClick={refreshData}>
            Refresh now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
