import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-block mt-4 text-sm text-primary hover:underline font-medium"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
