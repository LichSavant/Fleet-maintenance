import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { useFleetData } from "../../hooks/useFleetData";
import { reportService } from "../../services/reportService";

interface ReportItem {
  label: string;
  value: number;
}

interface ReportCardProps {
  items: readonly ReportItem[];
  title: string;
}

function ReportCard({ items, title }: ReportCardProps) {
  const largestValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="report-card" title={title}>
      <dl className="report-list">
        {items.map((item) => (
          <div key={item.label}>
            <div className="report-value-row">
              <dt>{item.label}</dt>
              <dd>{item.value.toLocaleString()}</dd>
            </div>
            <span
              aria-hidden="true"
              className="report-meter"
              style={{
                width: `${Math.max((item.value / largestValue) * 100, 2)}%`,
              }}
            />
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function ReportsPage() {
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading)
    return <ManagementLoadingState label="Loading fleet reports" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Reports could not be calculated"
      />
    );
  if (!data) return null;

  const reports = reportService.getReports(data);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Reports" }]}
        eyebrow="Operational reporting"
        subtitle="Live summaries calculated from the Supabase records authorized for your account."
        title="Fleet reports"
      />
      <div className="reports-grid">
        <ReportCard
          items={reports.vehicleStatus}
          title="Vehicle status summary"
        />
        <ReportCard
          items={reports.maintenanceStatus}
          title="Maintenance status summary"
        />
        <ReportCard
          items={reports.assignmentSummary}
          title="Assignment summary"
        />
        <ReportCard items={reports.mileageSummary} title="Mileage summary" />
        <ReportCard items={reports.userRoleSummary} title="User-role summary" />
      </div>
    </div>
  );
}
