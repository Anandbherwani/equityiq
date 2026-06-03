import { DashboardSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
      <DashboardSkeleton />
    </div>
  );
}
