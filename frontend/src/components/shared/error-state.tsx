import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
}: {
  title?: string;
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/5 px-6 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{message}</p>
      <div className="flex gap-2 mt-4">
        {retry ? (
          <Button variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        ) : null}
        <Link href="/settings">
          <Button variant="outline" size="sm">
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}
