import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StockNotFound() {
  return (
    <div className="py-20 text-center space-y-4">
      <h1 className="text-xl font-semibold">Symbol not found</h1>
      <p className="text-sm text-muted-foreground">
        Not on UNIVERSE or SCORING tabs — import universe and rebuild scoring.
      </p>
      <Link href="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
