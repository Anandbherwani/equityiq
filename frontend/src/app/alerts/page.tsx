import { AlertsClient } from "./alerts-client";
import { AlertsConfigured } from "@/components/alerts/alerts-configured";

export default function AlertsPage() {
  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <AlertsConfigured />
      <AlertsClient />
    </div>
  );
}
