import { Suspense } from "react";
import { PeersClient } from "./peers-client";
import { PeersTable } from "@/components/peers/peers-table";
import { CardSkeleton } from "@/components/shared/skeletons";

export default function PeersPage() {
  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Peer comparison</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Default groups: Banking (SBIN vs HDFCBANK vs ICICIBANK) · IT · Metal.
          Search any symbol below to get custom sector peer comparison from the research engine.
        </p>
      </div>

      {/* Default peer group table */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Banking sector — default group</h2>
        <Suspense fallback={<CardSkeleton />}>
          <PeersTable />
        </Suspense>
      </section>

      {/* Symbol lookup */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Custom symbol comparison</h2>
        <Suspense fallback={<CardSkeleton />}>
          <PeersClient />
        </Suspense>
      </section>
    </div>
  );
}
