import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function ApiBanner({ message }: { message?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
      <div>
        <p className="font-medium text-amber-200">Research API not connected</p>
        <p className="text-muted-foreground mt-1">
          {message ||
            "Add your Google Apps Script Web App URL in Settings, or enable Demo mode to explore the interface."}
        </p>
        <Link href="/settings" className="text-cyan-400 hover:underline text-xs mt-2 inline-block">
          Open Settings →
        </Link>
      </div>
    </div>
  );
}
