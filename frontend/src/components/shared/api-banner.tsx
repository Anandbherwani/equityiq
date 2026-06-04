import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

type ApiBannerProps = {
  message?: string;
  variant?: "connect" | "error";
};

export function ApiBanner({ message, variant = "connect" }: ApiBannerProps) {
  const isError = variant === "error";

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isError
          ? "border-rose-500/30 bg-rose-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      {isError ? (
        <Loader2 className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
      )}
      <div>
        <p className={`font-medium ${isError ? "text-rose-200" : "text-amber-200"}`}>
          {isError ? "Research API error" : "Research API not connected"}
        </p>
        <p className="text-muted-foreground mt-1">
          {message ||
            (isError
              ? "Could not load recommendations from your research engine."
              : "Add your Google Apps Script Web App URL in Settings, or enable Demo mode to explore the interface.")}
        </p>
        <Link href="/settings" className="text-cyan-400 hover:underline text-xs mt-2 inline-block">
          Open Settings →
        </Link>
      </div>
    </div>
  );
}
