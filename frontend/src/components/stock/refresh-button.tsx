"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    toast.promise(
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Refreshing analysis…",
        success: "Analysis refreshed",
        error: "Refresh failed",
      }
    );
    setTimeout(() => setRefreshing(false), 1500);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={refreshing}
      className="h-8 gap-1.5 px-3 text-xs"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing…" : "Refresh analysis"}
    </Button>
  );
}
