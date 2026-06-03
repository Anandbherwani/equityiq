import { DataSourceNotice } from "@/components/shared/data-source-notice";
import { loadRecommendationValidation } from "@/lib/server-preview";
import { ValidationDashboard } from "./validation-dashboard";

export default async function ValidationPage() {
  const { validation, coverage } = await loadRecommendationValidation();

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Validation dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Scorecards by recommendation category — issued count, hit rate, average return and
          alpha, plus best and worst picks since entry. Built from permanent Tab 37 history.
        </p>
      </div>

      <DataSourceNotice source={validation.source} error={validation.error} />

      {validation.data?.ok ? (
        <ValidationDashboard
          data={validation.data}
          coverage={coverage.data?.ok ? coverage.data : null}
        />
      ) : null}
    </div>
  );
}
