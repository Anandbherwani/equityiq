"use client";

import { useEffect, useState } from "react";
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

export function SettingsClient() {
  const [url, setUrl] = useState("");
  const [demo, setDemo] = useState(false);
  const [theme, setTheme] = useState<UiTheme>("dark");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(getStoredApiUrl() || process.env.NEXT_PUBLIC_SHEETS_API_URL || "");
    const demoOn = isDemoMode();
    setDemo(demoOn);
    if (demoOn) setDemoMode(demoOn);
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
    setTimeout(() => setSaved(false), 2000);
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

      <Card className="border-violet-500/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Demo mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Preview recommendations and stock pages without an API.
          </p>
          <Button
            type="button"
            variant={demo ? "default" : "outline"}
            onClick={toggleDemo}
            className={demo ? "bg-violet-600 hover:bg-violet-500" : ""}
          >
            {demo ? "On" : "Off"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">API URL</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/.../exec"
              className="font-mono text-xs"
            />
            <Button type="submit" size="sm">
              {saved ? "Saved" : "Save"}
            </Button>
          </form>
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
