import { Suspense } from "react";
import { PeersClient } from "./peers-client";
import { CardSkeleton } from "@/components/shared/skeletons";

export default function PeersPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <PeersClient />
    </Suspense>
  );
}
