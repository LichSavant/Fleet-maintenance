import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useFleetData } from "../../hooks/useFleetData";
import { dashboardService } from "../../services/dashboardService";
import { formatDate } from "../../utils/formatDate";

export default function AdminDashboardPage() {
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading) {
    return <ManagementLoadingState label="Loading administrator dashboard" />;
  }

  if (error || !data) {
    return (
      <ErrorState
        description={error || "The fleet records are unavailable."}
        onRetry={() => void reload()}
        title="Administrator dashboard unavailable"
      />
    );
  }

  const dashboard = dashboardService.getAdminDashboard(data);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Administrator" }, { label: "Dashboard" }]}
        eyebrow="System oversight"
        subtitle="Calculated from the current browser-persisted demonstration records; this is not live server data."
        title="Administrator dashboard"
      />

      <section
        aria-label="Administrator summaries"
        className="dashboard-metrics-grid"
      >
        <DashboardMetric label="Total users" value={dashboard.totalUsers} />
        <DashboardMetric label="Active users" value={dashboard.activeUsers} />
        <DashboardMetric
          label="Total vehicles"
          value={dashboard.totalVehicles}
        />
        <DashboardMetric
          label="Available vehicles"
          value={dashboard.availableVehicles}
        />
        <DashboardMetric
          label="Assigned vehicles"
          value={dashboard.assignedVehicles}
        />
        <DashboardMetric
          label="Under maintenance"
          value={dashboard.underMaintenanceVehicles}
        />
        <DashboardMetric
          label="Due-soon services"
          value={dashboard.dueSoonServices}
        />
        <DashboardMetric
          label="Overdue services"
          value={dashboard.overdueServices}
        />
      </section>

      <DashboardList
        emptyDescription="Audit events will appear when fleet records change."
        emptyTitle="No audit activity"
        eyebrow="Audit trail"
        items={dashboard.recentActivity.map((activity) => ({
          description: `${activity.actorName} · ${activity.description}`,
          id: activity.id,
          meta: formatDate(activity.createdAt),
          title: activity.action,
        }))}
        title="Recent audit activity"
      />
    </div>
  );
}
