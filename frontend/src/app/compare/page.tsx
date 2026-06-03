import { Suspense } from "react";
import { CompareClient } from "./compare-client";
import { DashboardSkeleton } from "@/components/shared/skeletons";

export default function ComparePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CompareClient />
    </Suspense>
  );
}
